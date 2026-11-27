// ============================================================
// LangChain Chat Model Factory
// Supports Groq Cloud (Free Tier) and Local Ollama
// ============================================================

let chatModelInstance = null;

/**
 * Returns a configured, reusable Chat Model instance.
 * Automatically chooses Groq Cloud when GROQ_API_KEY is present,
 * otherwise connects to local Ollama.
 */
async function getChatModel() {
  if (chatModelInstance) {
    return chatModelInstance;
  }

  try {
    // 1. Cloud Production: Groq (100% Free, ultra-fast 300+ tok/s)
    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (groqKey) {
      const { ChatGroq } = await import('@langchain/groq');
      const model = (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
      chatModelInstance = new ChatGroq({
        apiKey: groqKey,
        model: model,
        temperature: 0.3
      });
      console.log(`✅ [LangChain] ChatGroq cloud model initialized (${model})`);
      return chatModelInstance;
    }

    // 2. Local Fallback: ChatOllama
    const { ChatOllama } = await import('@langchain/ollama');
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2:1b';
    const temperature = 0.3;

    chatModelInstance = new ChatOllama({
      baseUrl,
      model,
      temperature
    });

    console.log(`✅ [LangChain] ChatOllama initialized successfully (${model} @ ${baseUrl})`);
    return chatModelInstance;
  } catch (error) {
    console.error('❌ [LangChain] Failed to initialize chat model:', error.message);
    throw new Error(`ChatModel initialization error: ${error.message}`);
  }
}

module.exports = {
  getChatModel
};
