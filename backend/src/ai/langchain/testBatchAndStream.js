// ============================================================
// 🦜 LANGCHAIN REAL APPLICATION TEST - .pipe(), .stream() & .batch()
// File: backend/src/ai/langchain/testBatchAndStream.js
// ============================================================
// This file demonstrates the 3 core LangChain execution patterns:
// 1. .pipe()   - Composing LCEL chains (Prompt -> Model -> Parser)
// 2. .batch()  - Real-world Batch processing used in Meridian's Inventory Page
// 3. .stream() - Real-time word-by-word streaming used in MeriBot AI Chat
// ============================================================

const { getChatModel } = require('./chatModel');
const { runInventoryBatchAnalysis } = require('./inventoryBatch');
const { DEFAULT_TENANT_ID } = require('../embeddings');

async function runDemonstration() {
  console.log('================================================================');
  console.log('🦜 Meridian ERP - LangChain Execution Patterns Demonstration');
  console.log('================================================================\n');

  try {
    const chatModel = await getChatModel();
    const { ChatPromptTemplate } = await import('@langchain/core/prompts');
    const { StringOutputParser } = await import('@langchain/core/output_parsers');

    // ============================================================
    // 🔗 PART 1: .pipe() - Composing the Pipeline
    // ============================================================
    console.log('----------------------------------------------------------------');
    console.log('▶️ PART 1: LangChain .pipe()');
    console.log('----------------------------------------------------------------');
    console.log('Connecting components: ChatPromptTemplate ➔ .pipe(ChatOllama) ➔ .pipe(StringOutputParser)');

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', 'You are MeriBot, the AI assistant for Meridian ERP. Answer concisely in under 20 words.'],
      ['human', '{question}']
    ]);

    const chain = prompt.pipe(chatModel).pipe(new StringOutputParser());
    console.log('✅ Pipeline successfully constructed with .pipe()!\n');

    // ============================================================
    // ⚡ PART 2: .stream() - Real-time Word-by-Word Streaming in MeriBot
    // ============================================================
    console.log('----------------------------------------------------------------');
    console.log('▶️ PART 2: LangChain .stream() in MeriBot');
    console.log('----------------------------------------------------------------');
    console.log('Prompt: "What are the key benefits of real-time inventory tracking in ERP?"');
    console.log('⏳ Streaming tokens live to stdout as Ollama generates them:\n');

    process.stdout.write('🤖 Live Stream: ');
    const streamStartTime = Date.now();
    const stream = await chain.stream({
      question: 'What are the key benefits of real-time inventory tracking in ERP?'
    });

    let tokenCount = 0;
    for await (const chunk of stream) {
      process.stdout.write(chunk);
      tokenCount++;
    }
    const streamDuration = ((Date.now() - streamStartTime) / 1000).toFixed(2);
    console.log(`\n\n✅ Streamed in ${streamDuration}s (${tokenCount} chunks received)!\n`);

    // ============================================================
    // 📦 PART 3: .batch() - Concurrent Processing in Inventory Page
    // ============================================================
    console.log('----------------------------------------------------------------');
    console.log('▶️ PART 3: LangChain .batch() in Inventory Page');
    console.log('----------------------------------------------------------------');
    console.log('Executing runInventoryBatchAnalysis() across live PostgreSQL inventory items...');
    console.log('Concurrency limit: maxConcurrency = 2 (Local CPU protection)');

    const batchStartTime = Date.now();
    const batchResult = await runInventoryBatchAnalysis(DEFAULT_TENANT_ID);
    const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);

    console.log(`\n✅ Batch processing completed in ${batchDuration}s!`);
    console.log(`- Items Processed: ${batchResult.items_processed}`);
    console.log(`- Pipeline: ${batchResult.pipeline}`);
    console.log('\n📊 Batch Enriched Catalog Results:');
    batchResult.results.forEach((item, idx) => {
      console.log(`\n[Product ${idx + 1}] ${item.name} (${item.sku})`);
      console.log(`  • Category: ${item.current_category} ➔ Suggested: ${item.suggested_category}`);
      console.log(`  • Stock: ${item.quantity} ${item.unit} (${item.stock_status})`);
      console.log(`  • AI Catalog Description: "${item.catalog_description}"`);
      console.log(`  • Action: ${item.recommendation}`);
    });

    console.log('\n================================================================');
    console.log('🎉 .pipe(), .stream(), and .batch() All Executed Successfully!');
    console.log('================================================================');
  } catch (error) {
    console.error('❌ Demonstration error:', error);
  }
}

runDemonstration();

