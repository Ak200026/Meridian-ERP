// ============================================================
// 🦜 LANGCHAIN LEARNING MODULE - Chat Models Test
// File: backend/src/ai/langchain/testChatModel.js
// ============================================================
// Execution: node backend/src/ai/langchain/testChatModel.js
//
// Key Concepts:
// - getChatModel(): Retrieves the initialized ChatOllama instance.
// - invoke(): Sends prompt to LLM and awaits structured response.
// ============================================================

const path = require('path');
// Load environment variables if available
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { getChatModel } = require('./chatModel');

async function runTest() {
  console.log('========================================================');
  console.log('🧪 LangChain Module 1: Testing ChatOllama with invoke()');
  console.log('========================================================\n');

  try {
    // 1. Get the initialized ChatOllama instance
    console.log('⏳ Initializing ChatOllama...');
    const chatModel = await getChatModel();

    // 2. Prepare the prompt message
    const promptMessage = 'What is the difference between SQL and NoSQL databases?';
    console.log(`💬 User Prompt: "${promptMessage}"\n`);
    console.log('⏳ Sending message to Ollama via LangChain invoke()...\n');

    const startTime = Date.now();

    // 3. Call invoke() on the Chat Model
    const response = await chatModel.invoke(promptMessage);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 4. Output the response details
    console.log('--------------------------------------------------------');
    console.log('🤖 AI Response (content):');
    console.log('--------------------------------------------------------');
    console.log(response.content);
    console.log('--------------------------------------------------------\n');

    console.log('📊 Execution Metadata:');
    console.log(`- Model Used: ${chatModel.model}`);
    console.log(`- Response Time: ${duration}s`);
    console.log(`- Response Type: ${response.constructor.name} (AIMessage)`);
    console.log('\n🎉 LangChain Chat Model executed successfully!');
  } catch (error) {
    console.error('\n❌ Error executing LangChain testChatModel:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Hint: Is Ollama running on http://127.0.0.1:11434? Start it using: ollama serve');
    }
  }
}

// Execute test
runTest();

