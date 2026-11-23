// ============================================================
// 🦜 LANGCHAIN REAL-WORLD MODULE - Batch Processing (.batch & .pipe)
// File: backend/src/ai/langchain/inventoryBatch.js
// ============================================================
// Features:
// - Uses LangChain's .pipe() to compose ChatPromptTemplate -> ChatOllama with Zod Structured Output
// - Uses LangChain's .batch() with concurrency control (maxConcurrency: 2)
// - Resilient Error Handling: returnExceptions: true prevents single item LLM failures from failing entire batch
// - Strict Multi-Tenant Isolation & Ownership verification in PostgreSQL
// - Explicit Embedding Synchronization tracking (no swallowed errors)
// - Standardized Product Title correction, Category Classification & Stock Health Auditing
// ============================================================

const { getChatModel } = require('./chatModel');
const { query } = require('../../config/database');
const { syncProductEmbedding } = require('../embeddings');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const ALLOWED_CATEGORIES = new Set([
  'electronics',
  'furniture',
  'office-supplies',
  'it-hardware',
  'raw-materials'
]);

/**
 * Runs LangChain .batch() processing on the tenant's inventory products.
 *
 * @param {string} tenantId - Organization tenant ID (strictly required)
 * @param {Array<string>} [productIds] - Optional subset of product IDs to analyze
 * @returns {Promise<Object>} Batch processing results and timing metrics
 */
async function runInventoryBatchAnalysis(tenantId, productIds = null) {
  // 1. Strict Tenant Context Enforcement
  if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
    throw new Error('Tenant context missing: Valid tenantId is required for inventory batch analysis.');
  }

  // 2. Validate productIds if provided
  if (productIds !== null && productIds !== undefined) {
    if (!Array.isArray(productIds)) {
      throw new Error('Invalid input: productIds must be an array of UUIDs.');
    }
    for (const id of productIds) {
      if (typeof id !== 'string' || !UUID_REGEX.test(id.trim())) {
        throw new Error(`Invalid product ID format: "${id}". Expected a valid UUID.`);
      }
    }
  }

  // 3. Fetch products from PostgreSQL with strict tenant boundary
  let sql = `
    SELECT id, name, sku, category, unit_price, quantity, reorder_level, unit, description
    FROM products
    WHERE tenant_id = $1 AND is_active = true
  `;
  const params = [tenantId];

  if (productIds && productIds.length > 0) {
    sql += ` AND id = ANY($2)`;
    params.push(productIds);
  }

  sql += ` ORDER BY name ASC LIMIT 20`; // Concurrency limit safety

  const dbRes = await query(sql, params);
  const products = dbRes.rows;

  if (products.length === 0) {
    return {
      success: true,
      total_requested: 0,
      analyzed_count: 0,
      items_processed: 0,
      failed_analysis_count: 0,
      duration_seconds: 0,
      pipeline: 'ChatPromptTemplate.pipe(ChatOllama.withStructuredOutput(schema)).batch()',
      results: []
    };
  }

  // 4. Load LangChain modules dynamically for CommonJS compatibility
  const { ChatPromptTemplate } = await import('@langchain/core/prompts');
  const { z } = await import('zod');
  const chatModel = await getChatModel();

  // 5. Define the strict Zod schema for each product's analysis
  const productAnalysisSchema = z.object({
    suggested_name: z.string().describe('Standardized, professional commercial product title with correct spelling and title capitalization. If the current name is already proper and clear, retain it.'),
    suggested_category: z.enum([
      'electronics',
      'furniture',
      'office-supplies',
      'it-hardware',
      'raw-materials'
    ]).describe('The most accurate ERP category for this item'),
    catalog_description: z.string().describe('Clear, professional 1-sentence product catalog description'),
    stock_status: z.enum(['Healthy', 'Reorder Required', 'Overstocked']).describe('Stock health assessment'),
    recommendation: z.string().describe('Actionable inventory recommendation (e.g. order qty or healthy status)')
  });

  // 6. Create the ChatPromptTemplate
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are an expert ERP Catalog Specialist & Supply Chain Analyst.
For each product provided, analyze its name, current category, SKU, stock quantity, reorder threshold, and price.
Provide:
1. suggested_name: Fix any spelling typos, informal shorthand, or unclear naming to create a polished commercial product title (e.g. 'laptp' -> 'Laptop', 'cse' -> 'Protective Storage Case'). If the current name is already clear and proper, retain it.
2. suggested_category: Choose the best matching category from: 'electronics', 'furniture', 'office-supplies', 'it-hardware', 'raw-materials'.
3. catalog_description: A clear, concise, professional 1-sentence product description suitable for an ERP catalog.
4. stock_status: Assessment of stock ('Healthy', 'Reorder Required', or 'Overstocked').
5. recommendation: Actionable inventory advice (e.g., 'Stock is optimal' or 'Reorder 20 units soon').`
    ],
    [
      'human',
      `Product Name: {name}
SKU: {sku}
Current Category: {category}
Unit Price: ₹{price}
Current Stock: {quantity} {unit}
Reorder Threshold: {reorder_level}
Current Description: {description}`
    ]
  ]);

  // 7. Construct the LangChain Pipeline using .pipe()
  const batchChain = prompt.pipe(
    chatModel.withStructuredOutput(productAnalysisSchema)
  );

  // 8. Format inputs for LangChain's .batch() method
  const batchInputs = products.map((p) => ({
    name: p.name,
    sku: p.sku,
    category: p.category || 'electronics',
    price: p.unit_price,
    quantity: p.quantity,
    unit: p.unit || 'pcs',
    reorder_level: p.reorder_level || 10,
    description: p.description || 'No description provided'
  }));

  // 9. Execute LangChain .batch() with concurrency control and fault tolerance
  console.log(`🦜 [LangChain] Starting .batch() execution for ${batchInputs.length} inventory products (maxConcurrency: 2)...`);
  const startTime = Date.now();

  const batchResults = await batchChain.batch(batchInputs, {
    maxConcurrency: 2, // Concurrency limit to prevent local CPU overload on Ollama
    returnExceptions: true // Protects against single-item LLM failures without aborting the batch
  });

  const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ [LangChain] .batch() completed ${batchResults.length} items in ${durationSeconds}s`);

  // 10. Process batch results with individual failure tracking
  let successfulAnalysisCount = 0;
  let failedAnalysisCount = 0;

  const enrichedProducts = products.map((prod, index) => {
    const ai = batchResults[index];
    const isError = ai instanceof Error || !ai || typeof ai !== 'object';

    if (isError) {
      failedAnalysisCount++;
      console.warn(`⚠️ [LangChain] Item ${prod.id} (${prod.name}) analysis failed:`, ai?.message || 'Unknown error');
      return {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        unit_price: prod.unit_price,
        quantity: prod.quantity,
        unit: prod.unit,
        reorder_level: prod.reorder_level,
        current_category: prod.category,
        current_description: prod.description,
        suggested_name: prod.name,
        has_name_change: false,
        suggested_category: prod.category,
        has_category_change: false,
        catalog_description: prod.description || '',
        stock_status: prod.quantity <= prod.reorder_level ? 'Reorder Required' : 'Healthy',
        recommendation: 'Analysis unavailable for this item. Please review manually.',
        analysis_status: 'failed',
        error: ai?.message || 'LLM parsing failed'
      };
    }

    successfulAnalysisCount++;
    const suggestedName = (ai.suggested_name && typeof ai.suggested_name === 'string' && ai.suggested_name.trim())
      ? ai.suggested_name.trim()
      : prod.name;
    const hasNameChange = Boolean(suggestedName.toLowerCase() !== prod.name.trim().toLowerCase());
    const suggestedCategory = (ai.suggested_category && ALLOWED_CATEGORIES.has(ai.suggested_category))
      ? ai.suggested_category
      : prod.category;
    const hasCategoryChange = Boolean(suggestedCategory !== prod.category);

    return {
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      unit_price: prod.unit_price,
      quantity: prod.quantity,
      unit: prod.unit,
      reorder_level: prod.reorder_level,
      current_category: prod.category,
      current_description: prod.description,
      suggested_name: suggestedName,
      has_name_change: hasNameChange,
      suggested_category: suggestedCategory,
      has_category_change: hasCategoryChange,
      catalog_description: ai.catalog_description || prod.description || '',
      stock_status: ai.stock_status || (prod.quantity <= prod.reorder_level ? 'Reorder Required' : 'Healthy'),
      recommendation: ai.recommendation || 'Maintain current stock level.',
      analysis_status: 'success'
    };
  });

  return {
    success: true,
    total_requested: products.length,
    analyzed_count: successfulAnalysisCount,
    items_processed: successfulAnalysisCount, // UI backwards compatibility
    failed_analysis_count: failedAnalysisCount,
    duration_seconds: parseFloat(durationSeconds),
    pipeline: 'ChatPromptTemplate.pipe(ChatOllama.withStructuredOutput(schema)).batch()',
    results: enrichedProducts
  };
}

/**
 * Applies selected AI batch suggestions directly to PostgreSQL with strict
 * tenant ownership enforcement, field validation, and embedding sync tracking.
 *
 * @param {string} tenantId - Organization tenant ID
 * @param {Array<{ id: string, name?: string, category?: string, description?: string }>} updates
 * @returns {Promise<Object>} Detailed update and synchronization metrics
 */
async function applyBatchUpdates(tenantId, updates) {
  // 1. Strict Tenant Context Enforcement
  if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
    throw new Error('Tenant context missing: Valid tenantId is required for applying batch updates.');
  }

  // 2. Validate updates array
  if (!Array.isArray(updates) || updates.length === 0) {
    return {
      success: false,
      message: 'No updates provided. An array of product updates is required.'
    };
  }

  if (updates.length > 50) {
    throw new Error('Batch limit exceeded: Cannot update more than 50 items in a single operation.');
  }

  // 3. Strict Input & Field Validation
  const validatedUpdates = [];
  for (let i = 0; i < updates.length; i++) {
    const item = updates[i];
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid update object at index ${i}.`);
    }

    if (!item.id || typeof item.id !== 'string' || !UUID_REGEX.test(item.id.trim())) {
      throw new Error(`Invalid or missing product UUID at index ${i}: "${item.id}".`);
    }

    // Name validation
    let cleanName = null;
    if (item.name !== undefined && item.name !== null) {
      if (typeof item.name !== 'string' || item.name.trim().length === 0) {
        throw new Error(`Product name for item ${item.id} cannot be empty.`);
      }
      if (item.name.trim().length > 255) {
        throw new Error(`Product name for item ${item.id} exceeds 255 characters.`);
      }
      cleanName = item.name.trim();
    }

    // Category validation against ERP taxonomy
    let cleanCategory = null;
    if (item.category !== undefined && item.category !== null) {
      if (typeof item.category !== 'string' || !ALLOWED_CATEGORIES.has(item.category.trim())) {
        throw new Error(`Invalid category "${item.category}" for item ${item.id}. Allowed categories: ${Array.from(ALLOWED_CATEGORIES).join(', ')}`);
      }
      cleanCategory = item.category.trim();
    }

    // Description validation
    let cleanDescription = null;
    if (item.description !== undefined && item.description !== null) {
      if (typeof item.description !== 'string') {
        throw new Error(`Product description for item ${item.id} must be a string.`);
      }
      cleanDescription = item.description.trim().substring(0, 1000);
    }

    validatedUpdates.push({
      id: item.id.trim(),
      name: cleanName,
      category: cleanCategory,
      description: cleanDescription
    });
  }

  // 4. Enforce Tenant Ownership
  // Verify that all submitted product IDs actually belong to this tenant
  const submittedIds = validatedUpdates.map((u) => u.id);
  const ownershipRes = await query(
    'SELECT id FROM products WHERE tenant_id = $1 AND id = ANY($2) AND is_active = true',
    [tenantId, submittedIds]
  );
  const ownedIdSet = new Set(ownershipRes.rows.map((r) => r.id));

  // 5. Apply Updates & Track Embedding Synchronization
  let updatedCount = 0;
  let failedUpdateCount = 0;
  let embeddingSyncedCount = 0;
  let embeddingFailedCount = 0;
  const embeddingErrors = [];

  for (const item of validatedUpdates) {
    if (!ownedIdSet.has(item.id)) {
      console.warn(`[applyBatchUpdates] Tenant ownership violation: Product ${item.id} does not belong to tenant ${tenantId}`);
      failedUpdateCount++;
      continue;
    }

    const res = await query(
      `UPDATE products
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5 AND is_active = true
       RETURNING id, name, category, description`,
      [item.name, item.category, item.description, item.id, tenantId]
    );

    if (res.rows.length > 0) {
      updatedCount++;
      const updated = res.rows[0];

      // Explicitly track vector embedding synchronization
      try {
        await syncProductEmbedding(
          updated.id,
          updated.name,
          updated.description,
          updated.category,
          tenantId
        );
        embeddingSyncedCount++;
      } catch (embErr) {
        embeddingFailedCount++;
        console.error(`[Embedding Sync Error] Product ${updated.id}:`, embErr.message);
        embeddingErrors.push({
          product_id: updated.id,
          product_name: updated.name,
          error: embErr.message || 'Vector embedding generation failed'
        });
      }
    } else {
      failedUpdateCount++;
    }
  }

  return {
    success: true,
    data: {
      total_submitted: updates.length,
      updated_count: updatedCount,
      failed_updates_count: failedUpdateCount,
      embedding_synced_count: embeddingSyncedCount,
      embedding_failed_count: embeddingFailedCount,
      embedding_errors: embeddingErrors
    },
    updated_count: updatedCount, // UI backwards compatibility
    message: `Successfully updated ${updatedCount} product(s) in database (${embeddingSyncedCount} embeddings synced${embeddingFailedCount > 0 ? `, ${embeddingFailedCount} embedding failed` : ''}).`
  };
}

module.exports = {
  runInventoryBatchAnalysis,
  applyBatchUpdates
};
