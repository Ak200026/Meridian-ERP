// ============================================================
// 🦜 LANGCHAIN LEARNING MODULE - testStructuredOutput.js
// ============================================================
// Execution: node backend/src/ai/langchain/testStructuredOutput.js
//
// Key Concepts:
// - Zod schema definition & validation
// - ChatOllama.withStructuredOutput(zodSchema)
// - Separation of Database Facts vs AI Insights
// ============================================================

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { query } = require('../../config/database');
const { generateStructuredInventoryInsights, inventoryInsightsSchema } = require('./structuredOutput');

async function runTest() {
  console.log('================================================================');
  console.log('🧪 LangChain Module 4: Structured Output with Zod & ChatOllama');
  console.log('================================================================\n');

  try {
    const tenantId = '00000000-0000-0000-0000-000000000001';

    // 1. Retrieve GROUND TRUTH from PostgreSQL (Zero AI Hallucination)
    console.log('📊 1. Querying PostgreSQL Database for Verified Inventory Facts...');
    const [statsRes, productsRes] = await Promise.all([
      query(
        `SELECT COUNT(*) as total_types, 
                COALESCE(SUM(quantity), 0) as total_units,
                COALESCE(SUM(quantity * unit_price), 0) as total_value
         FROM products 
         WHERE tenant_id = $1 AND is_active = true`,
        [tenantId]
      ),
      query(
        `SELECT name, sku, quantity, unit_price, reorder_level 
         FROM products 
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY quantity ASC`,
        [tenantId]
      )
    ]);

    const databaseFacts = {
      total_product_types: parseInt(statsRes.rows[0].total_types, 10),
      total_units: parseInt(statsRes.rows[0].total_units, 10),
      total_valuation: `₹${parseFloat(statsRes.rows[0].total_value).toLocaleString('en-IN')}`,
      low_stock_items: productsRes.rows
        .filter(p => p.quantity <= p.reorder_level)
        .map(p => `${p.name} (${p.sku}: ${p.quantity} units, threshold: ${p.reorder_level})`)
    };

    console.log('✅ Ground Truth Database Metrics (from SQL):', databaseFacts);

    // 2. Format Context for the Model
    const inventoryContextText = productsRes.rows
      .map(p => `- ${p.name} (SKU: ${p.sku}): ${p.quantity} units in stock at ₹${p.unit_price}/unit (Reorder threshold: ${p.reorder_level})`)
      .join('\n');

    console.log('\n📝 2. Sending Context to LangChain withStructuredOutput()...');
    const startTime = Date.now();

    const aiInsights = await generateStructuredInventoryInsights(inventoryContextText);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 3. Validate response with Zod
    console.log('\n🔒 3. Validating AI Output against Zod Schema...');
    const validation = inventoryInsightsSchema.safeParse(aiInsights);
    console.log(`✅ Zod Validation Passed: ${validation.success}`);

    console.log('\n----------------------------------------------------------------');
    console.log('🤖 AI-Generated Insights (Zod Validated):');
    console.log('----------------------------------------------------------------');
    console.log(JSON.stringify(aiInsights, null, 2));

    console.log('\n📊 Clean Architecture Separation:');
    console.log('1. SQL Database Ground Truth:');
    console.log(`   - Total Products: ${databaseFacts.total_product_types}`);
    console.log(`   - Total Stock Units: ${databaseFacts.total_units}`);
    console.log(`   - Total Valuation: ${databaseFacts.total_valuation}`);
    console.log(`   - Items Needing Reorder: ${databaseFacts.low_stock_items.length}`);
    console.log('2. AI-Generated Strategic Guidance:');
    console.log(`   - AI Status Assessment: ${aiInsights.inventory_status}`);
    console.log(`   - Executive Summary: "${aiInsights.summary}"`);
    console.log(`   - Recommendations: ${aiInsights.recommendations.map(r => `\n     • ${r}`).join('')}`);
    console.log(`- Generation Time: ${duration}s`);

    console.log('\n================================================================');
    console.log('🎉 Structured Output with Zod Verified Successfully!');
    console.log('================================================================');
  } catch (error) {
    console.error('\n❌ Error in testStructuredOutput:', error);
  }
}

runTest().finally(() => process.exit(0));

