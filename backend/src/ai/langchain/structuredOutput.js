// ============================================================
// 🦜 LANGCHAIN LEARNING MODULE - Structured Output with Zod
// File: backend/src/ai/langchain/structuredOutput.js
// ============================================================
// Module 4: withStructuredOutput()
//
// Key Concepts:
// - Zod Schema: Strongly-typed schema definition for AI output.
// - model.withStructuredOutput(schema): Enforces guaranteed JSON structure.
// - Schema Validation: Validates response against schema at runtime.
// ============================================================

const { z } = require('zod');
const { getChatModel } = require('./chatModel');

// 1. Define Zod Schema for AI Inventory Insights
const inventoryInsightsSchema = z.object({
  inventory_status: z
    .enum(['Healthy', 'Attention Needed', 'Critical'])
    .describe('Overall operational status of warehouse inventory'),
  summary: z
    .string()
    .describe('Executive summary assessing stock levels and business risks in 1-2 sentences'),
  recommendations: z
    .array(z.string())
    .describe('2-3 specific, actionable recommendations for procurement or operations')
});

/**
 * Analyzes live warehouse inventory text using ChatOllama.withStructuredOutput()
 * and validates the output with the Zod schema.
 *
 * @param {string} inventoryContextText - Text description of current inventory items and stock.
 * @returns {Promise<z.infer<typeof inventoryInsightsSchema>>}
 */
async function generateStructuredInventoryInsights(inventoryContextText) {
  try {
    const model = await getChatModel();
    const structuredModel = model.withStructuredOutput(inventoryInsightsSchema);

    const prompt =
      `You are an expert ERP Warehouse and Supply Chain Analyst for Meridian ERP.\n` +
      `Analyze the following warehouse inventory data and provide your assessment:\n\n` +
      `${inventoryContextText}\n\n` +
      `Assess whether stock is sufficient, identify low stock risks, and provide practical recommendations.`;

    const invokePromise = structuredModel.invoke(prompt);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Structured output generation timed out (5s)')), 5000)
    );
    const rawResult = await Promise.race([invokePromise, timeoutPromise]);
    return inventoryInsightsSchema.parse(rawResult);
  } catch (err) {
    console.warn('⚠️ [LangChain] LLM unreachable, generating rule-based structured insights fallback:', err.message);
    const hasLowStock = inventoryContextText.toLowerCase().includes('low') || inventoryContextText.toLowerCase().includes('reorder');
    return {
      inventory_status: hasLowStock ? 'Attention Needed' : 'Healthy',
      summary: hasLowStock
        ? 'Some inventory items have reached or fallen below reorder thresholds. Immediate replenishment recommended.'
        : 'Current warehouse inventory levels are balanced across product categories.',
      recommendations: [
        'Review products approaching low stock thresholds and generate purchase orders.',
        'Validate unit valuations against recent vendor invoices.'
      ]
    };
  }
}

module.exports = {
  inventoryInsightsSchema,
  generateStructuredInventoryInsights
};
