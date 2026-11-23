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
  const model = await getChatModel();

  // Create a structured runnable model bound to our Zod schema
  const structuredModel = model.withStructuredOutput(inventoryInsightsSchema);

  const prompt =
    `You are an expert ERP Warehouse and Supply Chain Analyst for Meridian ERP.\n` +
    `Analyze the following warehouse inventory data and provide your assessment:\n\n` +
    `${inventoryContextText}\n\n` +
    `Assess whether stock is sufficient, identify low stock risks, and provide practical recommendations.`;

  // Invoke the structured model
  const rawResult = await structuredModel.invoke(prompt);

  // Validate the output strictly against the Zod schema
  const parsed = inventoryInsightsSchema.parse(rawResult);
  return parsed;
}

module.exports = {
  inventoryInsightsSchema,
  generateStructuredInventoryInsights
};
