// ============================================================
// 🧠 VECTOR EMBEDDINGS & IN-DATABASE SEMANTIC SEARCH MODULE
// ============================================================
// Features:
// 1. In-Database Vector Similarity: PostgreSQL computes Cosine Similarity
//    natively on float8[] arrays using our compiled function.
// 2. Exponential Backoff & Retry: Fault-tolerant embedding calls.
// 3. Real-Time Telemetry & Monitoring: Tracks latency, success rates, and errors.
// 4. Multi-Tenant Isolation: Every query enforces tenant_id boundaries.
// ============================================================

const { query } = require('../config/database');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'all-minilm';
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ------------------------------------------------------------
// 📊 EMBEDDING TELEMETRY & HEALTH MONITORING
// ------------------------------------------------------------
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalRetries: 0,
  lastLatencyMs: 0,
  avgLatencyMs: 0,
  lastError: null,
  lastSuccessAt: null,
  model: EMBED_MODEL,
  status: 'healthy' // 'healthy' | 'degraded' | 'offline'
};

function getEmbeddingMetrics() {
  return {
    ...metrics,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  };
}

function resetEmbeddingMetrics() {
  metrics.totalRequests = 0;
  metrics.successfulRequests = 0;
  metrics.failedRequests = 0;
  metrics.totalRetries = 0;
  metrics.lastLatencyMs = 0;
  metrics.avgLatencyMs = 0;
  metrics.lastError = null;
  metrics.status = 'healthy';
}

// ------------------------------------------------------------
// 🔁 GENERATE EMBEDDING WITH RETRY & EXPONENTIAL BACKOFF
// ------------------------------------------------------------
/**
 * Generate a 384-dimensional vector embedding for text with retry and telemetry.
 * @param {string} text - Text to convert to vector.
 * @param {object} options - { retries: 3, timeoutMs: 8000 }
 * @returns {Promise<number[]|null>} Array of 384 floats or null on failure.
 */
  async function generateEmbedding(text, options = {}) {
    if (!text || !text.trim()) return null;

      const maxRetries = options.retries !== undefined ? options.retries : 3;
      const timeoutMs = options.timeoutMs || 8000;
      const cleanText = text.trim().substring(0, 1000);

        metrics.totalRequests++;
        const startTime = Date.now();

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const res = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: EMBED_MODEL,
                input: cleanText
              }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
              throw new Error(`Ollama embed returned HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            const vector = data.embeddings?.[0] || null;

            if (!vector || !Array.isArray(vector)) {
              throw new Error('Ollama returned empty or malformed embedding vector');
            }

            // Record successful metric
            const latency = Date.now() - startTime;
            metrics.successfulRequests++;
            metrics.lastLatencyMs = latency;
            metrics.avgLatencyMs = metrics.avgLatencyMs === 0
              ? latency
              : Math.round((metrics.avgLatencyMs * 0.8) + (latency * 0.2)); // Moving average
            metrics.lastSuccessAt = new Date().toISOString();
            metrics.status = 'healthy';

            return vector;
          } catch (err) {
            const isLastAttempt = attempt === maxRetries;
            metrics.lastError = {
              message: err.message,
              attempt,
              timestamp: new Date().toISOString()
            };

            if (!isLastAttempt) {
              metrics.totalRetries++;
              // Exponential backoff: 300ms, 600ms, 1200ms...
              const delay = 300 * Math.pow(2, attempt - 1);
              console.warn(`[Embeddings] Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              metrics.failedRequests++;
              metrics.status = 'degraded';
              console.error(`[Embeddings] All ${maxRetries} attempts to generate vector failed:`, err.message);
            }
          }
        }

      return null;
    }

// ------------------------------------------------------------
// 🧮 PURE JAVASCRIPT COSINE SIMILARITY (Utility/Testing)
// ------------------------------------------------------------
function cosineSimilarity(vecA, vecB) {
      if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }

      const denominator = Math.sqrt(normA) * Math.sqrt(normB);
      if (denominator === 0) return 0;

      return dotProduct / denominator;
    }

    // ------------------------------------------------------------
    // 💾 SYNC PRODUCT EMBEDDING (IN DATABASE)
    // ------------------------------------------------------------
    /**
     * Generates and stores 384-dimensional vector embedding in both
     * native float8[] (for in-database math) and JSONB in PostgreSQL.
     */
  async function syncProductEmbedding(productId, name, description = '', category = '', tenantId = DEFAULT_TENANT_ID) {
    try {
      const textToEmbed = `${name} ${description || ''} ${category || ''}`.trim();
      const vector = await generateEmbedding(textToEmbed, { retries: 3 });

      if (vector && vector.length > 0) {
        await query(
          `UPDATE products 
           SET embedding = $1::jsonb,
               embedding_vec = $2::float8[],
               updated_at = NOW()
           WHERE id = $3 AND tenant_id = $4`,
          [JSON.stringify(vector), vector, productId, tenantId]
        );
        return { success: true, product_id: productId };
      }
      throw new Error(`Embedding model returned an empty vector for product ${productId}`);
    } catch (err) {
      console.error(`Failed to sync embedding for product ${productId}:`, err.message);
      throw err;
    }
  }

// ------------------------------------------------------------
// ⚡ IN-DATABASE SEMANTIC SEARCH (PostgreSQL Does the Similarity Math!)
// ------------------------------------------------------------
/**
 * Performs Semantic Vector Search entirely inside PostgreSQL.
 * Node.js does NOT load all product vectors into memory; PostgreSQL calculates
 * Cosine Similarity, enforces multi-tenant isolation, orders and limits in SQL.
 * 
 * @param {string} searchQuery - Natural language concept/search phrase.
 * @param {object} options - { limit: 5, tenantId: UUID, minSimilarity: 0.20 }
 * @returns {Promise<Array>} Ranked matching products.
 */
          async function inDatabaseSemanticSearch(searchQuery, options = {}) {
            if (!searchQuery || !searchQuery.trim()) return [];

            const limit = options.limit || 5;
            const tenantId = options.tenantId || DEFAULT_TENANT_ID;
            const minSimilarity = options.minSimilarity !== undefined ? options.minSimilarity : 0.38;

            // 1. Generate query vector (with retry)
            const queryVector = await generateEmbedding(searchQuery);
            if (!queryVector) return [];

            // 2. Let PostgreSQL compute cosine similarity and sort in-database!
            const sql = `
    SELECT id, name, sku, category, unit_price, quantity, description,
           cosine_similarity(embedding_vec, $1::float8[]) as similarity
    FROM products
    WHERE embedding_vec IS NOT NULL 
      AND is_active = true
      AND tenant_id = $2
      AND cosine_similarity(embedding_vec, $1::float8[]) >= $3
    ORDER BY similarity DESC
    LIMIT $4
  `;

            const result = await query(sql, [queryVector, tenantId, minSimilarity, limit]);

              return result.rows.map(product => {
                const sim = parseFloat(product.similarity) || 0;
                const matchPercentage = Math.max(0, Math.round(sim * 100));

                return {
                  type: 'product',
                  id: product.id,
                  name: product.name,
                  sku: product.sku,
                  category: product.category,
                  price: product.unit_price,
                  stock: product.quantity,
                  description: product.description,
                  subtitle: `SKU: ${product.sku} | ₹${product.unit_price} (${matchPercentage}% match)`,
      similarity: sim,
                  matchPercentage,
                  matchType: 'semantic'
                };
              });
            }

            // Backward-compatible alias
            const semanticSearch = inDatabaseSemanticSearch;

          module.exports = {
            generateEmbedding,
            cosineSimilarity,
            syncProductEmbedding,
  inDatabaseSemanticSearch,
            semanticSearch,
            getEmbeddingMetrics,
            resetEmbeddingMetrics,
            DEFAULT_TENANT_ID
          };
