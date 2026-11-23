// ============================================================
// 🦜 LANGCHAIN LEARNING MODULE - ChatPromptTemplate Test
// File: backend/src/ai/langchain/testPromptTemplate.js
// ============================================================
// Execution: node backend/src/ai/langchain/testPromptTemplate.js
//
// Key Concepts:
// - formatMessages(): Injects dynamic variables into the template.
// - ChatModel.invoke(messages): Sends structured messages to Ollama.
// ============================================================

const path = require('path');
// Load environment variables if present
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { getPromptTemplate } = require('./promptTemplate');
const { getChatModel } = require('./chatModel');

async function runTest() {
  console.log('================================================================');
  console.log('🧪 LangChain Module 2: Testing ChatPromptTemplate with formatMessages()');
  console.log('================================================================\n');

  try {
    // 1. Load the reusable Prompt Template and Chat Model
    console.log('⏳ Initializing Prompt Template and Chat Model...');
    const [promptTemplate, chatModel] = await Promise.all([
      getPromptTemplate(),
      getChatModel()
    ]);

    // 2. Question to inject (takes command line argument if provided, or uses default)
    const sampleQuestion = process.argv.slice(2).join(' ') || 'What is safety stock in inventory management, and why is it important for an ERP?';
    console.log(`💬 Input Question: "${sampleQuestion}"\n`);

    // 3. Format messages using formatMessages()
    console.log('⏳ Formatting messages using promptTemplate.formatMessages()...');
    const formattedMessages = await promptTemplate.formatMessages({
      question: sampleQuestion
    });

    console.log('\n📋 Formatted Messages Structure (Sent to LLM):');
    formattedMessages.forEach((msg, idx) => {
      console.log(`   [${idx + 1}] Role: ${msg._getType().toUpperCase()} (${msg.constructor.name})`);
      console.log(`       Content: "${msg.content}"`);
    });
    console.log('');

    // 4. Pass the formatted messages array to model.invoke()
    console.log('⏳ Sending formatted messages to Ollama via model.invoke()...\n');
    const startTime = Date.now();

    const response = await chatModel.invoke(formattedMessages);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 5. Output the generated response
    console.log('----------------------------------------------------------------');
    console.log('🤖 MeriBot Response:');
    console.log('----------------------------------------------------------------');
    console.log(response.content);
    console.log('----------------------------------------------------------------\n');

    console.log('📊 Execution Metadata:');
    console.log(`- Model: ${chatModel.model}`);
    console.log(`- Messages Processed: ${formattedMessages.length}`);
    console.log(`- Response Time: ${duration}s`);
    console.log(`- Output Type: ${response.constructor.name}`);

    console.log('\n🎉 LangChain ChatPromptTemplate executed successfully!');
  } catch (error) {
    console.error('\n❌ Error executing testPromptTemplate:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Hint: Ensure Ollama is running on http://127.0.0.1:11434');
    }
  }
}

// Execute test
runTest();

