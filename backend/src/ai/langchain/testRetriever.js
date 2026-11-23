// ============================================================
// 🦜 LANGCHAIN REAL-WORLD MODULE TEST - Custom RAG Retriever
// File: backend/src/ai/langchain/testRetriever.js
// ============================================================

const { getInventoryRetriever, createInventoryRAGChain } = require('./retriever');
const { query } = require('../../config/database');

async function runRetrieverDemo() {
  console.log('================================================================');
  console.log('🦜 Meridian ERP - LangChain Custom Retriever & RAG Test');
  console.log('================================================================\n');

  try {
    // 1. Get an active tenant ID from the database
    const tenantRes = await query('SELECT tenant_id FROM products WHERE is_active = true LIMIT 1');
    const tenantId = tenantRes.rows[0]?.tenant_id;

    if (!tenantId) {
      console.log('❌ No active tenant with products found in the database.');
      return;
    }

    console.log(`🏢 Active Tenant ID: ${tenantId}`);

    // ============================================================
    // 📦 PART 1: Standalone Retriever Testing (retriever.invoke)
    // ============================================================
    console.log('\n----------------------------------------------------------------');
    console.log('▶️ PART 1: Testing ERPInventoryRetriever.invoke()');
    console.log('----------------------------------------------------------------');

    const retriever = await getInventoryRetriever(tenantId, { limit: 3 });
    const searchQuery = 'storage case for electronics';

    console.log(`🔍 Search Query: "${searchQuery}"`);
    const t0 = Date.now();
    const retrievedDocs = await retriever.invoke(searchQuery);
    const retrieveDuration = ((Date.now() - t0) / 1000).toFixed(2);

    console.log(`\n✅ Retrieved ${retrievedDocs.length} LangChain Document(s) in ${retrieveDuration}s:`);
    retrievedDocs.forEach((doc, idx) => {
      console.log(`\n--- Document #${idx + 1} ---`);
      console.log('📄 pageContent:');
      console.log(doc.pageContent);
      console.log('🏷️ metadata:', doc.metadata);
    });

    // ============================================================
    // 🔗 PART 2: End-to-End RAG Chain Testing (.pipe() + ChatOllama)
    // ============================================================
    console.log('\n----------------------------------------------------------------');
    console.log('▶️ PART 2: End-to-End RAG Chain Execution with .pipe()');
    console.log('----------------------------------------------------------------');
    console.log('Architecture: ERPInventoryRetriever ➔ .pipe(Prompt) ➔ .pipe(ChatOllama) ➔ .pipe(StringOutputParser)');

    const ragPipeline = await createInventoryRAGChain(tenantId);
    const userQuestion = 'What is the stock and price of our Case?';

    console.log(`\n💬 User Question: "${userQuestion}"`);
    console.log('⏳ Generating RAG response grounded in retrieved PostgreSQL documents...\n');

    const ragResult = await ragPipeline.query(userQuestion);

    console.log('🤖 AI Grounded Answer:');
    console.log(ragResult.answer);

    console.log('\n📊 RAG Execution Metrics:');
    console.log(`- Documents Retrieved: ${ragResult.documents_retrieved_count}`);
    console.log(`- Total Duration: ${ragResult.duration_seconds}s`);
    console.log(`- Pipeline: ${ragResult.pipeline}`);

    console.log('\n================================================================');
    console.log('🎉 LangChain Custom Retriever & RAG Executed Successfully!');
    console.log('================================================================');
  } catch (error) {
    console.error('❌ Retriever test error:', error);
  }
}

runRetrieverDemo();

