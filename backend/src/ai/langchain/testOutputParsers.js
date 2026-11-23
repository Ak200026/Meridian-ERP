// ============================================================
// 🦜 LANGCHAIN LEARNING MODULE - Output Parsers
// File: backend/src/ai/langchain/testOutputParsers.js
// ============================================================
// Demonstrates:
// 1. StringOutputParser: Unwraps AIMessage directly into a clean string.
// 2. JsonOutputParser: Enforces & parses JSON into a real JavaScript object.
// Uses LCEL: prompt.pipe(model).pipe(parser)
// ============================================================

const path = require('path');
// Load environment variables if available
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { getChatModel } = require('./chatModel');
const { getPromptTemplate } = require('./promptTemplate');

async function runOutputParsersDemo() {
  console.log('================================================================');
  console.log('🧪 LangChain Module 3: Output Parsers (String & JSON)');
  console.log('================================================================\n');

  try {
    // Dynamically import parsers and prompts for CommonJS compatibility
    const { StringOutputParser, JsonOutputParser } = await import('@langchain/core/output_parsers');
    const { ChatPromptTemplate } = await import('@langchain/core/prompts');

    // 1. Load the shared ChatModel and PromptTemplate from previous modules
    console.log('⏳ Initializing shared Chat Model and Prompt Template...');
    const [chatModel, meriBotPrompt] = await Promise.all([
      getChatModel(),
      getPromptTemplate()
    ]);

    // ============================================================
    // 🔤 PART 1: StringOutputParser
    // ============================================================
    console.log('\n----------------------------------------------------------------');
    console.log('▶️ PART 1: StringOutputParser with LCEL .pipe()');
    console.log('----------------------------------------------------------------');
    console.log('🔗 Chain Construction: meriBotPrompt.pipe(chatModel).pipe(new StringOutputParser())');

    // Build the LangChain Expression Language (LCEL) chain
    const stringChain = meriBotPrompt
      .pipe(chatModel)
      .pipe(new StringOutputParser());

    const sampleQuestion = 'What is an SKU (Stock Keeping Unit) in an ERP system? Answer in one sentence.';
    console.log(`💬 Input Question: "${sampleQuestion}"`);
    console.log('⏳ Invoking stringChain...\n');

    const stringStartTime = Date.now();
    const stringResult = await stringChain.invoke({ question: sampleQuestion });
    const stringDuration = ((Date.now() - stringStartTime) / 1000).toFixed(2);

    console.log('🤖 String Output:');
    console.log(`"${stringResult.trim()}"\n`);
    console.log('📊 Verification & Metadata:');
    console.log(`- Type: ${typeof stringResult} (Notice: It is a raw primitive string, NOT an AIMessage object!)`);
    console.log(`- Duration: ${stringDuration}s`);

    // ============================================================
    // 📦 PART 2: JsonOutputParser
    // ============================================================
    console.log('\n----------------------------------------------------------------');
    console.log('▶️ PART 2: JsonOutputParser with Structured ERP Inventory Data');
    console.log('----------------------------------------------------------------');

    // Instantiate JsonOutputParser
    const jsonParser = new JsonOutputParser();

    // Create a specialized prompt that requests structured JSON
    // Note: Literal curly braces inside ChatPromptTemplate must be escaped as {{ and }}
    const jsonPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are an expert ERP Inventory Analyst. Analyze the provided warehouse inventory data and return a JSON object with this exact structure:\n' +
        '{{\n' +
        '  "total_product_types": <number>,\n' +
        '  "total_units": <number>,\n' +
        '  "low_stock_alerts": [<names of products with low stock>],\n' +
        '  "inventory_status": "Healthy" | "Attention Needed" | "Critical",\n' +
        '  "recommendation": <brief advice string>\n' +
        '}}\n' +
        'Respond ONLY with valid JSON. Do not include markdown codeblocks or conversational text.\n{format_instructions}'
      ],
      [
        'human',
        '{inventory_data}'
      ]
    ]);

    // Build the JSON Chain: prompt -> model -> jsonParser
    console.log('🔗 Chain Construction: jsonPrompt.pipe(chatModel).pipe(jsonParser)');
    const jsonChain = jsonPrompt
      .pipe(chatModel)
      .pipe(jsonParser);

    const sampleInventoryData =
      'Current Inventory in Warehouse:\n' +
      '- Case (SKU: cse01): 10 units in stock (Unit price: ₹50.00, Reorder threshold: 10)\n' +
      '- Cheese (SKU: Elec01): 15 units in stock (Unit price: ₹50.00, Reorder threshold: 10)\n' +
      '- Wireless Mouse (SKU: ms01): 2 units in stock (Unit price: ₹299.00, Reorder threshold: 10 - LOW STOCK ALERT)';

    console.log('\n📋 Raw Input Data:');
    console.log(sampleInventoryData);
    console.log('\n⏳ Invoking jsonChain (Ollama generates text -> JsonOutputParser parses into JS Object)...');

    const jsonStartTime = Date.now();
    const jsonResult = await jsonChain.invoke({
      inventory_data: sampleInventoryData,
      format_instructions: jsonParser.getFormatInstructions()
    });
    const jsonDuration = ((Date.now() - jsonStartTime) / 1000).toFixed(2);

    console.log('\n🤖 Parsed JavaScript Object Output:');
    console.dir(jsonResult, { depth: null, colors: true });

    console.log('\n📊 Object Property Access Verification:');
    console.log(`- Type: ${typeof jsonResult} (Is Array: ${Array.isArray(jsonResult)})`);
    console.log(`- Total Product Types: ${jsonResult.total_product_types}`);
    console.log(`- Total Units in Warehouse: ${jsonResult.total_units}`);
    console.log(`- Low Stock Alerts: ${JSON.stringify(jsonResult.low_stock_alerts)}`);
    console.log(`- Overall Status: ${jsonResult.inventory_status}`);
    console.log(`- Recommendation: ${jsonResult.recommendation}`);
    console.log(`- Duration: ${jsonDuration}s`);

    // ============================================================
    // ⚡ PART 3: Real-Time Word-by-Word Streaming with StringOutputParser
    // ============================================================
    console.log('\n----------------------------------------------------------------');
    console.log('▶️ PART 3: Real-Time Live Streaming with stringChain.stream()');
    console.log('----------------------------------------------------------------');
    console.log('💬 Question: "Give 3 quick tips for managing ERP inventory stock."');
    console.log('⏳ Streaming words live to the terminal as Ollama generates them:\n');

    process.stdout.write('🤖 Live Output: ');
    const stream = await stringChain.stream({
      question: 'Give 3 quick tips for managing ERP inventory stock.'
    });

    for await (const chunk of stream) {
      process.stdout.write(chunk); // Prints in real-time token-by-token!
    }
    console.log('\n');

    console.log('================================================================');
    console.log('🎉 All Output Parsers & Real-Time Streaming Executed Successfully!');
    console.log('================================================================');
  } catch (error) {
    console.error('\n❌ Output Parser Error:', error);
  }
}

// Execute demo
runOutputParsersDemo();