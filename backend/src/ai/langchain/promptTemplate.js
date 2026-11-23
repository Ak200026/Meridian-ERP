// ============================================================
// 🦜 LANGCHAIN LEARNING MODULE - Prompt Templates
// File: backend/src/ai/langchain/promptTemplate.js
// ============================================================
// Module 2: ChatPromptTemplate
//
// Key Concepts:
// - ChatPromptTemplate: Defines structured message templates (system, human).
// - Parameterized Prompts: Uses placeholders like {question} for dynamic input.
// - Dynamic Import: Compatible with CommonJS module system.
// ============================================================

// Cached singleton instance
let promptTemplateInstance = null;

/**
 * Creates and returns a reusable ChatPromptTemplate instance.
 * Includes:
 * 1. A system message defining MeriBot as an ERP assistant.
 * 2. A human message containing the dynamic {question} placeholder.
 *
 * @returns {Promise<import('@langchain/core/prompts').ChatPromptTemplate>}
 */
async function getPromptTemplate() {
  if (promptTemplateInstance) {
    return promptTemplateInstance;
  }

  try {
    // Dynamic import for ES Module compatibility in CommonJS
    const { ChatPromptTemplate } = await import('@langchain/core/prompts');

    promptTemplateInstance = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are MeriBot, an intelligent and helpful AI assistant for Meridian ERP. Provide concise, accurate, and professional answers to assist business users with inventory management, sales, and operations.'
      ],
      [
        'human',
        '{question}'
      ]
    ]);

    return promptTemplateInstance;
  } catch (error) {
    console.error('❌ [LangChain] Failed to initialize ChatPromptTemplate:', error.message);
    throw new Error(`PromptTemplate initialization error: ${error.message}`);
  }
}

module.exports = {
  getPromptTemplate
};

