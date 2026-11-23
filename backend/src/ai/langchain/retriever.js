// ============================================================
// 🦜 LANGCHAIN REAL-WORLD MODULE - Custom RAG Retriever
// File: backend/src/ai/langchain/retriever.js
// ============================================================
// Features:
// - Extends LangChain's BaseRetriever from @langchain/core/retrievers
// - Implements _getRelevantDocuments() powered by PostgreSQL Hybrid Search (Lexical + Vector)
// - Transforms database rows into standardized LangChain Document objects ({ pageContent, metadata })
// - Strict Multi-Tenant Isolation: Every retriever instance requires tenantId
// - Factory helper createInventoryRAGChain() to build complete LCEL RAG pipelines with .pipe()
// ============================================================

const { performHybridProductSearch } = require('../tools');
const { getChatModel } = require('./chatModel');

/**
 * Creates and returns an initialized ERPInventoryRetriever class instance.
 * Uses dynamic imports for CommonJS compatibility with @langchain/core.
 *
 * @param {string} tenantId - Organization tenant UUID (strictly required)
 * @param {object} [options] - Configuration options ({ limit: 4, minSimilarity: 0.15 })
 * @returns {Promise<import('@langchain/core/retrievers').BaseRetriever>}
 */
async function getInventoryRetriever(tenantId, options = {}) {
  if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
    throw new Error('Tenant context missing: Valid tenantId is required to instantiate ERPInventoryRetriever.');
  }

  const { BaseRetriever } = await import('@langchain/core/retrievers');
  const { Document } = await import('@langchain/core/documents');

  const limit = options.limit || 4;

  class ERPInventoryRetriever extends BaseRetriever {
    lc_namespace = ['meridian', 'retrievers'];

    constructor(config) {
      super(config);
      this.tenantId = config.tenantId;
      this.limit = config.limit || 4;
    }

    /**
     * Core LangChain Retriever method:
     * Receives a search query string and retrieves relevant Document[] from PostgreSQL.
     *
     * @param {string} query - Natural language query or product search string
     * @returns {Promise<Array<import('@langchain/core/documents').Document>>}
     */
    async _getRelevantDocuments(query) {
      if (!query || !query.trim()) {
        return [];
      }

      console.log(`🦜 [LangChain Retriever] Querying inventory for: "${query}" (Tenant: ${this.tenantId.substring(0, 8)}...)`);

      // 1. Run PostgreSQL Hybrid Search (Keyword + Vector Semantic Fusion)
      let products = await performHybridProductSearch(query, this.tenantId, this.limit);

      // If full natural-language sentence had no match, clean conversational stop words and retry
      if (!products || products.length === 0) {
        const keywords = query
          .replace(/[?!.,;:'"()]/g, ' ')
          .replace(/\b(what|is|are|the|our|tell|me|about|how|much|many|do|we|have|check|find|lookup|show|in|stock|inventory|price|cost|of|for|a|an|and)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (keywords && keywords !== query.trim()) {
          console.log(`🦜 [LangChain Retriever] Retrying with extracted keywords: "${keywords}"`);
          products = await performHybridProductSearch(keywords, this.tenantId, this.limit);
        }
      }

      if (!products || products.length === 0) {
        return [];
      }

      // 2. Convert database records into standardized LangChain Document objects
      return products.map((p) => {
        const pageContent = [
          `Product: ${p.name}`,
          `SKU: ${p.sku}`,
          `Category: ${p.category}`,
          `Price: ₹${p.price}`,
          `Available Stock: ${p.stock} ${p.unit || 'pcs'} (${p.is_low_stock ? 'LOW STOCK ALERT' : 'In Stock'})`,
          `Catalog Description: ${p.description || 'No description provided'}`
        ].join('\n');

        return new Document({
          pageContent,
          metadata: {
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            price: p.price,
            stock: p.stock,
            unit: p.unit || 'pcs',
            is_low_stock: p.is_low_stock,
            matchType: p.matchType || 'hybrid',
            matchConfidence: p.match_confidence || `${p.matchPercentage || 0}%`,
            tenantId: this.tenantId
          }
        });
      });
    }
  }

  return new ERPInventoryRetriever({ tenantId: tenantId.trim(), limit });
}

/**
 * Builds an end-to-end RAG (Retrieval-Augmented Generation) pipeline using LCEL and .pipe().
 *
 * Pipeline Architecture:
 *   Input ({ question })
 *     ➔ Retriever.invoke(question) [fetches LangChain Document[] from PostgreSQL]
 *     ➔ Format Documents as ground-truth context
 *     ➔ ChatPromptTemplate
 *     ➔ ChatOllama (.pipe)
 *     ➔ StringOutputParser (.pipe)
 *
 * @param {string} tenantId - Tenant UUID
 * @param {object} [options]
 * @returns {Promise<Object>} Executable RAG chain wrapper
 */
async function createInventoryRAGChain(tenantId, options = {}) {
  const retriever = await getInventoryRetriever(tenantId, options);
  const chatModel = await getChatModel();

  const { ChatPromptTemplate } = await import('@langchain/core/prompts');
  const { StringOutputParser } = await import('@langchain/core/output_parsers');

  const ragPrompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are MeriBot, an intelligent and precise AI assistant for Meridian ERP.
Answer the user's question using ONLY the retrieved inventory records provided below.
Rules:
1. Base all facts, stock numbers, prices, and categories strictly on the retrieved documents.
2. If the user asks about an item that does not exist in the retrieved records, state clearly: "I could not find that item in your organization's inventory catalog."
3. Keep answers concise, clear, and professional.

RETRIEVED INVENTORY RECORDS:
{context}`
    ],
    ['human', '{question}']
  ]);

  const formatDocs = (docs) => {
    if (!docs || docs.length === 0) {
      return 'No relevant inventory records found in the database.';
    }
    return docs
      .map((doc, idx) => `[Inventory Record #${idx + 1}]\n${doc.pageContent}`)
      .join('\n\n---\n\n');
  };

  // Construct LCEL pipeline using .pipe()
  const generationChain = ragPrompt.pipe(chatModel).pipe(new StringOutputParser());

  return {
    retriever,
    ragPrompt,
    /**
     * Executes the complete RAG query.
     * @param {string} question - User's query
     * @returns {Promise<{ question: string, answer: string, documents: Array }>}
     */
    async query(question) {
      const startTime = Date.now();

      // Step 1: Retrieval
      const docs = await retriever.invoke(question);

      // Step 2: Context Formatting
      const context = formatDocs(docs);

      // Step 3: Generation via LangChain .pipe() chain
      const answer = await generationChain.invoke({ context, question });
      const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

      return {
        question,
        answer: answer.trim(),
        documents: docs,
        documents_retrieved_count: docs.length,
        duration_seconds: parseFloat(durationSeconds),
        pipeline: 'ERPInventoryRetriever.pipe(PromptTemplate).pipe(ChatOllama).pipe(StringOutputParser)'
      };
    }
  };
}

module.exports = {
  getInventoryRetriever,
  createInventoryRAGChain
};
