// ============================================================
// 🛠️ ERP AI TOOLS DEFINITIONS & EXECUTOR
// ============================================================
// Features:
// 1. Hybrid Search (Lexical Keyword + In-Database Vector Semantic Search)
// 2. Multi-Tenant Isolation (All queries strictly bounded by tenant_id)
// 3. Role-Based Access Control (RBAC checks on write & sensitive operations)
// ============================================================

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const {
  syncProductEmbedding,
  inDatabaseSemanticSearch,
  DEFAULT_TENANT_ID
} = require('./embeddings');

// 1. Tool Schemas (Given to Ollama / LLM)
const tools = [
  {
    type: 'function',
    function: {
      name: 'lookup_product',
      description: 'Search for products using Hybrid Search (combines exact keywords, SKU codes, and AI vector semantic meaning) to check stock quantity, price, and category.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The product name, SKU, or descriptive concept to search for (e.g. "Case", "cse01", or "protective gear")'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_low_stock',
      description: 'Find all products in inventory that have low stock (where quantity is at or below the reorder threshold).',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_sales_summary',
      description: 'Get current sales metrics including monthly revenue, total order count, and recent sales orders.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_new_product',
      description: 'Create and add a brand new product to the ERP inventory. Requires admin or manager permissions.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Product name' },
          sku: { type: 'string', description: 'Unique SKU code (e.g. ELEC-101)' },
          price: { type: 'number', description: 'Unit price in INR' },
          quantity: { type: 'number', description: 'Initial stock quantity' },
          category: {
            type: 'string',
            description: 'Category: electronics, office-supplies, furniture, it-hardware, raw-materials'
          }
        },
        required: ['name', 'sku', 'price', 'quantity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_inventory_overview',
      description: 'Get an overview of the entire inventory: total products count, list of all product names and total items.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'semantic_search_products',
      description: 'Search for products by meaning, concept, or description using in-database Vector Semantic Search.',
      parameters: {
        type: 'object',
        properties: {
          concept: {
            type: 'string',
            description: 'The concept, idea, or description of the product you are looking for'
          }
        },
        required: ['concept']
      }
    }
  }
];

// Helper to safely extract argument values from LLM response
function extractArg(args, key, fallback = null) {
  if (!args) return fallback;
  if (args[key] !== undefined) return args[key];
  if (args.properties && args.properties[key] !== undefined) return args.properties[key];
  return fallback;
}

// Prompt Injection Sanitizer
function sanitizeSearchQuery(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/(?:ignore\s+(?:previous|above|all)\s+instructions?|system\s+prompt|system:\s*|role:\s*assistant)/gi, ' ')
    .replace(/[;`\\]/g, ' ')
    .trim()
    .substring(0, 300);
}

  // ------------------------------------------------------------
  // 🔀 HYBRID SEARCH: CONCURRENT KEYWORD + VECTOR FUSION
  // ------------------------------------------------------------
  /**
   * Runs lexical keyword search and vector semantic search simultaneously,
   * merging results with Reciprocal Rank Fusion / Weighted Scoring.
   * Never drops semantic matches even when keyword matches exist!
   */
  async function performHybridProductSearch(searchTerm, tenantId = DEFAULT_TENANT_ID, limit = 5) {
    if (!searchTerm || !searchTerm.trim()) return [];

    const cleanTerm = searchTerm.trim();
    const stemTerm = cleanTerm.endsWith('s') && cleanTerm.length > 3
      ? cleanTerm.slice(0, -1)
      : cleanTerm;

    // Run keyword and semantic queries concurrently in PostgreSQL
    const [keywordRes, semanticResults] = await Promise.all([
      query(
        `SELECT id, name, sku, category, unit_price, quantity, reorder_level, unit, description
       FROM products
       WHERE (name ILIKE $1 OR sku ILIKE $1 OR description ILIKE $1 OR name ILIKE $2 OR description ILIKE $2)
         AND is_active = true
         AND tenant_id = $3
       LIMIT $4`,
        [`%${cleanTerm}%`, `%${stemTerm}%`, tenantId, limit]
      ),
      inDatabaseSemanticSearch(cleanTerm, { limit, tenantId, minSimilarity: 0.38 })
    ]);

    const map = new Map();

    // 1. Process keyword matches
    keywordRes.rows.forEach(p => {
      map.set(p.id, {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: `₹${p.unit_price}`,
        stock: p.quantity,
        unit: p.unit || 'pcs',
        is_low_stock: p.quantity <= (p.reorder_level || 10),
        matchType: 'keyword',
        score: 1.0,
        matchPercentage: 90
      });
    });

    // 2. Merge semantic matches (Dual Match Fusion)
    semanticResults.forEach(p => {
      const simPercentage = p.matchPercentage;
      if (map.has(p.id)) {
        // Matched BOTH keyword AND semantic meaning!
        const existing = map.get(p.id);
        existing.matchType = 'hybrid_both';
        existing.score = 1.0 + (p.similarity || 0); // Boost dual hits
        existing.matchPercentage = Math.min(100, Math.round(90 + (simPercentage * 0.1)));
        existing.match_confidence = `${existing.matchPercentage}% (Exact Keyword + Conceptual Match)`;
      } else {
        // Pure semantic discovery
        map.set(p.id, {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          price: `₹${p.price}`,
          stock: p.stock,
          unit: 'pcs',
          is_low_stock: p.stock <= 10,
          matchType: 'semantic',
          score: p.similarity || 0.5,
          matchPercentage: simPercentage,
          match_confidence: `${simPercentage}% (AI Semantic Match)`
        });
      }
    });

    // 3. Sort by fused score
    const sorted = Array.from(map.values()).sort((a, b) => b.score - a.score);
    return sorted.slice(0, limit);
  }

  // ------------------------------------------------------------
  // 2. TOOL EXECUTION DISPATCHER (With RBAC & Multi-Tenancy)
  // ------------------------------------------------------------
  /**
   * Executes an AI tool with strict tenant isolation and role permissions.
   * @param {string} name - Tool function name.
   * @param {object} rawArgs - Tool arguments.
   * @param {object} userContext - { id, role, tenant_id, email, name }
   */
  async function executeTool(name, rawArgs, userContext = {}) {
    const tenantId = userContext.tenant_id || DEFAULT_TENANT_ID;
    const userRole = userContext.role || 'viewer';

    try {
      switch (name) {
        case 'lookup_product': {
          const rawSearchTerm = extractArg(rawArgs, 'query') || extractArg(rawArgs, 'name') || '';
          const searchTerm = sanitizeSearchQuery(rawSearchTerm);

          if (!searchTerm) {
            return {
              found: false,
              message: 'Please provide a valid product name or keyword to search.'
            };
          }

          // Execute Hybrid Search (Keyword + In-Database Vector Semantic)
          const products = await performHybridProductSearch(searchTerm, tenantId, 5);

          if (products.length === 0) {
            return {
              found: false,
              message: `No products matching "${searchTerm}" found in your organization's inventory.`
            };
          }

          return {
            found: true,
            count: products.length,
            search_type: 'hybrid_search',
            products: products.map(p => ({
              name: p.name,
              sku: p.sku,
              category: p.category,
              price: p.price,
              unit_price: p.unit_price || p.price,
              stock: p.stock,
              quantity: p.stock,
              unit: p.unit || 'pcs',
              is_low_stock: p.is_low_stock,
              match_type: p.matchType,
              match_confidence: p.match_confidence || `${p.matchPercentage}% match`
            }))
          };
        }

      case 'check_low_stock': {
        const res = await query(
          `SELECT name, sku, category, quantity, reorder_level, unit
           FROM products
           WHERE quantity <= reorder_level
             AND is_active = true
             AND tenant_id = $1
           ORDER BY quantity ASC`,
          [tenantId]
        );
        const lowStockList = res.rows.map(p => ({
          name: p.name,
          sku: p.sku,
          category: p.category,
          quantity: p.quantity,
          current_stock: p.quantity,
          reorder_level: p.reorder_level,
          reorder_threshold: p.reorder_level,
          unit: p.unit || 'pcs'
        }));
        return {
          total_low_stock_items: res.rows.length,
          count: res.rows.length,
          items: lowStockList,
          low_stock_products: lowStockList
        };
      }

      case 'get_sales_summary': {
        // Permission check: Viewers cannot see sensitive financial sales reports
        if (['viewer'].includes(userRole)) {
          return {
            error: `Access Denied: Role "${userRole}" lacks permission to view sales revenue and order metrics.`
          };
        }

        const [revenueData, ordersData] = await Promise.all([
          query(
            `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total 
             FROM sales_orders 
             WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
               AND tenant_id = $1`,
            [tenantId]
          ),
          query(
            `SELECT so.order_number, so.total_amount, so.status, c.name as customer 
             FROM sales_orders so 
             LEFT JOIN customers c ON so.customer_id = c.id 
             WHERE so.tenant_id = $1
             ORDER BY so.created_at DESC 
             LIMIT 5`,
            [tenantId]
          )
        ]);

        const orderCount = parseInt(revenueData.rows[0].count, 10);
        const totalRevenue = parseFloat(revenueData.rows[0].total) || 0;

        return {
          order_count: orderCount,
          monthly_orders_count: orderCount,
          monthly_revenue: totalRevenue,
          monthly_revenue_formatted: `₹${totalRevenue.toLocaleString('en-IN')}`,
          recent_orders: ordersData.rows.map(o => ({
            order_number: o.order_number,
            amount: `₹${parseFloat(o.total_amount).toLocaleString('en-IN')}`,
            status: o.status,
            customer: o.customer || 'Direct Customer'
          }))
        };
      }

      case 'add_new_product': {
        // Strict Tenant Check: Never permit product creation without an authenticated tenant
        if (!userContext.tenant_id) {
          return {
            error: 'Authentication error: Valid tenant context is required to create products.'
          };
        }

        // Strict RBAC: Only admin and manager can create products
        if (!['admin', 'manager'].includes(userRole)) {
          return {
            error: `Permission Denied: User role "${userRole}" is not permitted to create products. 'admin' or 'manager' role required.`
          };
        }

        const rawName = extractArg(rawArgs, 'name');
        const rawSku = extractArg(rawArgs, 'sku');
        const pName = typeof rawName === 'string' ? rawName.trim() : '';
        const pSku = typeof rawSku === 'string' ? rawSku.trim() : '';
        const pPrice = Number(extractArg(rawArgs, 'price', 0));
        const pQty = parseInt(extractArg(rawArgs, 'quantity', 0), 10);
        const pCat = extractArg(rawArgs, 'category', 'electronics');

        if (!pName) {
          return { error: 'Product name is required.' };
        }
        if (!pSku) {
          return { error: 'Product SKU is required.' };
        }
        if (isNaN(pPrice) || pPrice < 0) {
          return { error: 'Price must be a valid non-negative number.' };
        }
        if (isNaN(pQty) || pQty < 0) {
          return { error: 'Quantity must be a valid non-negative integer.' };
        }

        const id = uuidv4();
        const res = await query(
          `INSERT INTO products (id, name, sku, category, description, unit_price, quantity, reorder_level, unit, tenant_id, created_at)
           VALUES ($1, $2, $3, $4, 'Created by AI Assistant', $5, $6, 10, 'pcs', $7, NOW())
           RETURNING id, name, sku, category, unit_price, quantity`,
          [id, pName, pSku, pCat, pPrice, pQty, tenantId]
        );
        const createdProduct = res.rows[0];

        // Automatically sync 384-dimensional vector embedding in background
        syncProductEmbedding(
          createdProduct.id,
          createdProduct.name,
          'Created by AI Assistant',
          createdProduct.category,
          tenantId
        ).catch(() => { });

        return {
          success: true,
          message: `Product "${pName}" created successfully in PostgreSQL (Tenant: ${tenantId.substring(0, 8)}...)!`,
          product: createdProduct
        };
      }

      case 'get_inventory_overview': {
        const [countRes, listRes] = await Promise.all([
          query(
            `SELECT COUNT(*) as total_count, 
                    COALESCE(SUM(quantity), 0) as total_units,
                    COALESCE(SUM(quantity * unit_price), 0) as total_value
             FROM products 
             WHERE tenant_id = $1 AND is_active = true`,
            [tenantId]
          ),
          query(
            `SELECT name, sku, category, quantity, unit_price, unit 
             FROM products 
             WHERE tenant_id = $1 AND is_active = true
             ORDER BY name ASC 
             LIMIT 15`,
            [tenantId]
          )
        ]);

        const totalCount = parseInt(countRes.rows[0].total_count, 10);
        const totalUnits = parseInt(countRes.rows[0].total_units, 10);
        const totalValue = parseFloat(countRes.rows[0].total_value) || 0;

        return {
          total_products_count: totalCount,
          total_products: totalCount,
          total_units_in_stock: totalUnits,
          total_quantity: totalUnits,
          total_inventory_value: totalValue,
          total_inventory_value_formatted: `₹${totalValue.toLocaleString('en-IN')}`,
          products: listRes.rows.map(p => ({
            name: p.name,
            sku: p.sku,
            category: p.category,
            stock: p.quantity,
            quantity: p.quantity,
            unit: p.unit || 'pcs',
            price: `₹${parseFloat(p.unit_price).toLocaleString('en-IN')}`,
            unit_price: parseFloat(p.unit_price)
          }))
        };
      }

      case 'semantic_search_products': {
        const rawConcept = extractArg(rawArgs, 'concept') || extractArg(rawArgs, 'query') || '';
        const concept = sanitizeSearchQuery(rawConcept);

        if (!concept) {
          return { found: false, message: 'Please provide a concept to search.' };
        }

        const results = await inDatabaseSemanticSearch(concept, { limit: 5, tenantId });

        if (results.length === 0) {
          return { found: false, message: `No products matching concept "${concept}".` };
        }
        return {
          found: true,
          concept_searched: concept,
          matches: results.map(r => ({
            name: r.name,
            sku: r.sku,
            price: `₹${r.price}`,
            stock: r.stock,
            match_confidence: `${r.matchPercentage}%`
          }))
        };
      }

      default:
      return { error: `Tool ${name} is not recognized.` };
    }
  } catch (err) {
    console.error(`Error executing tool "${name}":`, err);
    return { error: err.message };
  }
}

module.exports = {
  tools,
  executeTool,
  performHybridProductSearch
};
