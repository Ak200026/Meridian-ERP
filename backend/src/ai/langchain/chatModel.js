// ============================================================
// LangChain Chat Model Factory
// Supports Groq Cloud (Free Tier) and Local Ollama
// ============================================================

let chatModelInstance = null;
let cachedChatModelName = null;
let cachedGroqModel = null;
let cachedGroqModelAt = 0;

const GROQ_PREFERRED_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct'
];

/**
 * Queries Groq's /openai/v1/models endpoint to dynamically discover
 * an active, accessible chat model for the configured API key.
 */
async function resolveGroqModel(groqKey, forceRefresh = false) {
  const envModel = process.env.GROQ_MODEL?.trim();
  const now = Date.now();

  if (!forceRefresh && cachedGroqModel && (now - cachedGroqModelAt < 30 * 60 * 1000)) {
    return cachedGroqModel;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${groqKey}` },
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const payload = await res.json();
      const allModels = Array.isArray(payload?.data) ? payload.data : [];
      const chatModels = allModels
        .filter(m => m && m.id && m.active !== false && !/whisper|tts|orpheus|guard|safeguard|embed/i.test(m.id))
        .map(m => m.id);

      if (envModel && chatModels.includes(envModel)) {
        cachedGroqModel = envModel;
      } else {
        const preferred = GROQ_PREFERRED_MODELS.find(id => chatModels.includes(id));
        const fallbackChat = chatModels.find(id => /gpt-oss|llama|qwen|gemma|mixtral|deepseek/i.test(id));
        cachedGroqModel = preferred || fallbackChat || chatModels[0] || envModel || 'openai/gpt-oss-20b';
      }

      cachedGroqModelAt = now;
      console.log(`✅ [Groq] Auto-selected active model: ${cachedGroqModel} (from ${chatModels.length} available chat models)`);
      return cachedGroqModel;
    }
  } catch (err) {
    console.warn('⚠️ [Groq] Model auto-discovery failed:', err.message);
  }

  return envModel || cachedGroqModel || 'openai/gpt-oss-20b';
}

/**
 * Returns a configured, reusable Chat Model instance.
 * Automatically chooses Groq Cloud when GROQ_API_KEY is present,
 * otherwise connects to local Ollama.
 */
async function getChatModel(overrideGroqModel = null) {
  try {
    // 1. Cloud Production: Groq (100% Free, ultra-fast)
    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (groqKey) {
      const model = overrideGroqModel || await resolveGroqModel(groqKey);
      if (chatModelInstance && cachedChatModelName === model) {
        return chatModelInstance;
      }
      const { ChatGroq } = await import('@langchain/groq');
      chatModelInstance = new ChatGroq({
        apiKey: groqKey,
        model: model,
        temperature: 0.3
      });
      cachedChatModelName = model;
      console.log(`✅ [LangChain] ChatGroq cloud model initialized (${model})`);
      return chatModelInstance;
    }

    if (chatModelInstance) {
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
  getChatModel,
  resolveGroqModel
};
