// ============================================================
// 🤖 AI ROUTES - Real Local LLM Powered by Ollama with Tool Calling
// ============================================================
// Features:
// 1. In-Database Hybrid Search (Lexical + Vector Fusion in PostgreSQL)
// 2. Tenant Isolation & Role-Based Permissions in all queries
// 3. Retry-protected Vector Embeddings & Health Telemetry
// ============================================================

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { query } = require('../config/database');
const { tools, executeTool, performHybridProductSearch } = require('../ai/tools');
const {
  getEmbeddingMetrics,
  DEFAULT_TENANT_ID
} = require('../ai/embeddings');
const { getChatModel } = require('../ai/langchain/chatModel');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';

// ============================================================
// 1. CHAT WITH MERIBOT (Tool Calling Autonomous Agent)
// POST /api/v1/ai/chat
// ============================================================
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message, context = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const tenantId = req.user?.tenant_id || DEFAULT_TENANT_ID;
    const userRole = req.user?.role || 'viewer';
    const userName = req.user?.name || 'User';

    const systemPrompt = `You are MeriBot, an intelligent and helpful AI assistant for Meridian ERP.
You are running locally via Ollama (${OLLAMA_MODEL}) and have direct access to tools that query and manipulate the live PostgreSQL database.
Current active user: ${userName} (Role: ${userRole}).
Organization Tenant ID: ${tenantId.substring(0, 8)}...

Tools available to you:
- lookup_product: Hybrid search for products (combines exact keywords, SKU codes, and AI vector semantic meaning) to check stock quantity, price, and category.
- check_low_stock: Find any products in your organization that have low stock (stock <= reorder threshold).
- get_sales_summary: Retrieve current monthly sales revenue and recent sales orders (requires privileged role).
- add_new_product: Create and add a new product directly to the database (strictly requires admin or manager role).
- get_inventory_overview: Get a summary of all inventory products and total counts.
- semantic_search_products: Search products by concept, idea, or meaning using in-database vector embeddings.

Instructions:
1. When asked about products, stock levels, or sales, CALL THE APPROPRIATE TOOL rather than guessing.
2. When asked to create or add a product, CALL the add_new_product tool with the required arguments.
    3. When you receive tool results, provide a clear, friendly, and concise answer based on the tool's data.
    4. If a tool returns a Permission Denied or Access Denied error, politely explain to the user why their role cannot perform that action.
5. For general business questions that do not require database data, answer directly with practical advice.`;

    // Format conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      { role: 'user', content: message }
    ];

    const startTime = Date.now();
    let assistantMsg = null;
    let toolSummary = null;

    // Check if Groq Cloud API Key is configured
    if (process.env.GROQ_API_KEY) {
      try {
        const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: groqModel,
            messages,
            tools,
            temperature: 0.2
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const choice = groqData.choices?.[0]?.message;
          assistantMsg = choice;

          if (choice?.tool_calls && choice.tool_calls.length > 0) {
            const toolNames = [];
            const toolMessages = [];

            for (const call of choice.tool_calls) {
              const fnName = call.function?.name;
              let args = {};
              try {
                args = typeof call.function?.arguments === 'string'
                  ? JSON.parse(call.function.arguments)
                  : (call.function?.arguments || {});
              } catch (_) {}

              toolNames.push(fnName);
              const toolResult = await executeTool(fnName, args, req.user);
              toolMessages.push({
                role: 'tool',
                tool_call_id: call.id,
                name: fnName,
                content: JSON.stringify(toolResult)
              });
            }

            toolSummary = `🛠️ Tool called: ${toolNames.join(', ')}`;
            const followUpMessages = [...messages, choice, ...toolMessages];

            const secondGroqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: groqModel,
                messages: followUpMessages,
                temperature: 0.2
              })
            });

            if (secondGroqRes.ok) {
              const secondData = await secondGroqRes.json();
              if (secondData.choices?.[0]?.message?.content) {
                assistantMsg = secondData.choices[0].message;
              }
            }
          }
        }
      } catch (groqErr) {
        console.warn('⚠️ Groq Cloud chat error:', groqErr.message);
      }
    }

    // If Groq is not used or failed, try local Ollama
    if (!assistantMsg) {
      try {
        const firstTurnRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages,
            tools,
            stream: false,
            keep_alive: '1h',
            options: {
              temperature: 0.2,
              num_ctx: 2048,
              num_predict: 250
            }
          }),
          signal: AbortSignal.timeout(6000)
        });

        if (firstTurnRes.ok) {
          const firstData = await firstTurnRes.json();
          assistantMsg = firstData.message;

          if (assistantMsg?.tool_calls && assistantMsg.tool_calls.length > 0) {
            const toolNames = [];
            const toolMessages = [];

            for (const call of assistantMsg.tool_calls) {
              const fnName = call.function?.name;
              const args = call.function?.arguments || {};
              toolNames.push(fnName);

              const toolResult = await executeTool(fnName, args, req.user);
              toolMessages.push({
                role: 'tool',
                content: JSON.stringify(toolResult)
              });
            }

            toolSummary = `🛠️ Tool called: ${toolNames.join(', ')}`;
            const followUpMessages = [...messages, assistantMsg, ...toolMessages];

            const secondTurnRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: followUpMessages,
                stream: false,
                keep_alive: '1h',
                options: {
                  temperature: 0.2,
                  num_ctx: 2048,
                  num_predict: 250
                }
              }),
              signal: AbortSignal.timeout(6000)
            });

            if (secondTurnRes.ok) {
              const secondData = await secondTurnRes.json();
              if (secondData.message?.content?.trim()) {
                assistantMsg = secondData.message;
              }
            }
          }
        }
      } catch (ollamaErr) {
        console.warn('⚠️ Ollama chat error:', ollamaErr.message);
      }
    }

    // Direct Database Tool Fallback if no LLM is connected
    if (!assistantMsg) {
      const lowerMsg = message.toLowerCase();
      let fallbackText = "I am MeriBot, your AI Assistant for Meridian ERP. I'm connected to your live Supabase database.";

      if (lowerMsg.includes('stock') || lowerMsg.includes('reorder') || lowerMsg.includes('inventory')) {
        const stockData = await executeTool('check_low_stock', {}, req.user);
        if (stockData.low_stock_products?.length > 0) {
          fallbackText = `⚠️ **Low Stock Alert**: You have ${stockData.low_stock_products.length} product(s) that need reordering:\n\n` +
            stockData.low_stock_products.map(p => `• **${p.name}** (${p.sku}): ${p.quantity} ${p.unit} in stock (Reorder level: ${p.reorder_level})`).join('\n');
        } else {
          fallbackText = '✅ **Inventory Status**: All products currently meet or exceed their reorder thresholds.';
        }
      } else if (lowerMsg.includes('sales') || lowerMsg.includes('revenue')) {
        const salesData = await executeTool('get_sales_summary', {}, req.user);
        fallbackText = `📊 **Sales Summary**: Monthly revenue is **₹${salesData.monthly_revenue?.toLocaleString('en-IN') || 0}** across **${salesData.order_count || 0}** orders.`;
      } else {
        fallbackText += ` You can query products, check low stock, review sales revenue, or add your free Groq API key in Render to unlock full conversational reasoning.`;
      }

      assistantMsg = { content: fallbackText };
      toolSummary = '⚡ Direct PostgreSQL Tool Query (Fallback)';
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const note = toolSummary
      ? `${toolSummary} • Generated in ${duration} s(Local ${OLLAMA_MODEL})`
      : `⚡ Generated by local ${OLLAMA_MODEL} in ${duration} s(100 % Free & Private)`;

    res.json({
      success: true,
      data: {
        message: assistantMsg?.content || 'I completed the request.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        model: OLLAMA_MODEL,
        note
      }
    });
  } catch (error) {
    console.error('AI chat error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to communicate with local Ollama AI. Please ensure Ollama is running.',
      error: error.message
    });
  }
});

// ============================================================
// 1B. STREAMING CHAT WITH MERIBOT (LangChain .pipe() & .stream())
// POST /api/v1/ai/stream-chat
// ============================================================
router.post('/stream-chat', verifyToken, async (req, res) => {
  // Set SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const startTime = Date.now();

  try {
    const { message, context = [] } = req.body;

    if (!message || !message.trim()) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Message is required' })}\n\n`);
      res.end();
      return;
    }

    const tenantId = req.user?.tenant_id || DEFAULT_TENANT_ID;
    const userRole = req.user?.role || 'viewer';
    const userName = req.user?.name || 'User';

    // 1. Tool-check turn: Check if tools are needed for live ERP data
    let toolContextText = '';
    let toolSummary = null;

    try {
      const toolCheckRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are MeriBot AI for Meridian ERP. Active user: ${userName} (${userRole}), Tenant: ${tenantId.substring(0, 8)}. Decide if a tool call is needed to answer the user query.`
            },
            { role: 'user', content: message }
          ],
          tools,
          stream: false,
          keep_alive: '1h',
          options: { temperature: 0.1, num_predict: 150 }
        })
      });

      if (toolCheckRes.ok) {
        const checkData = await toolCheckRes.json();
        const toolCalls = checkData.message?.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
          const toolNames = [];
          const toolResults = [];

          for (const call of toolCalls) {
            const fnName = call.function?.name;
            const args = call.function?.arguments || {};
            toolNames.push(fnName);
            const resData = await executeTool(fnName, args, req.user);
            toolResults.push({ tool: fnName, result: resData });
          }

          toolSummary = `🛠️ Tool called: ${toolNames.join(', ')}`;
          // Inform frontend of tool execution immediately
          res.write(`data: ${JSON.stringify({ type: 'tool', summary: toolSummary })}\n\n`);

          toolContextText = `Live ERP Database Query Results:\n${JSON.stringify(toolResults, null, 2)}`;
        }
      }
    } catch (toolErr) {
      console.warn('Tool check error (falling back to direct LangChain stream):', toolErr.message);
    }

    // 2. Setup LangChain Streaming Pipeline using .pipe()
    const { ChatPromptTemplate } = await import('@langchain/core/prompts');
    const { StringOutputParser } = await import('@langchain/core/output_parsers');
    const chatModel = await getChatModel();

    const systemPrompt = `You are MeriBot, an intelligent and helpful AI assistant for Meridian ERP.
You are running locally via Ollama with real-time LangChain streaming.
Current active user: {user_name} (Role: {user_role}).
Organization Tenant ID: {tenant_id}...

{database_context}

Instructions:
- Provide clear, friendly, and practical business assistance.
- If Database Context is provided above, use it as your primary ground truth.
- Keep responses concise and well-formatted with markdown.`;

    // Helper to escape braces in user/assistant history turns for ChatPromptTemplate
    const escapeBraces = (str) => (str || '').replace(/\{/g, '{{').replace(/\}/g, '}}');

    // Build message array for LangChain prompt
    const promptMessages = [
      ['system', systemPrompt]
    ];

    // Include recent conversational turns (last 4)
    if (Array.isArray(context)) {
      for (const m of context.slice(-4)) {
        if (m.role === 'assistant') {
          promptMessages.push(['assistant', escapeBraces(m.content)]);
        } else if (m.role === 'user') {
          promptMessages.push(['human', escapeBraces(m.content)]);
        }
      }
    }

    promptMessages.push(['human', '{question}']);

    const prompt = ChatPromptTemplate.fromMessages(promptMessages);

    // LangChain LCEL Pipeline: Prompt -> ChatOllama -> StringOutputParser using .pipe()
    const stringChain = prompt.pipe(chatModel).pipe(new StringOutputParser());

    // 3. Stream chunks live via chain.stream()
    const stream = await stringChain.stream({
      question: message,
      database_context: toolContextText ? `DATABASE CONTEXT:\n${toolContextText}` : '',
      user_name: userName,
      user_role: userRole,
      tenant_id: tenantId.substring(0, 8)
    });

    for await (const chunk of stream) {
      if (chunk) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', chunk })}\n\n`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const note = toolSummary
      ? `${toolSummary} • Streamed in ${duration}s via LangChain .pipe() & .stream()`
      : `⚡ Streamed live via LangChain .pipe() & .stream() in ${duration}s (Local ${OLLAMA_MODEL})`;

    res.write(`data: ${JSON.stringify({ type: 'done', note, duration })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('LangChain stream-chat error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'Streaming failed' })}\n\n`);
    res.end();
  }
});

// ============================================================
// 2. CHECK OLLAMA STATUS & TOOLS
// GET /api/v1/ai/status
// ============================================================
router.get('/status', verifyToken, async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw new Error('Ollama not responding');
    const data = await response.json();
    const hasModel = data.models?.some(m => m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL.split(':')[0]));

    res.json({
      success: true,
      data: {
        online: true,
        model: OLLAMA_MODEL,
        hasModel,
        toolCallingEnabled: true,
        availableTools: tools.map(t => t.function.name)
      }
    });
  } catch (err) {
    res.json({
      success: false,
      data: {
        online: false,
        model: OLLAMA_MODEL,
        toolCallingEnabled: true,
        error: err.message
      }
    });
  }
});

// ============================================================
// 3. SMART INSIGHTS (Computed from live database with tenant isolation)
// GET /api/v1/ai/insights
// ============================================================
router.get('/insights', verifyToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id || DEFAULT_TENANT_ID;

    const [lowStock, revenueData, orderStats] = await Promise.all([
      query(
        'SELECT name, quantity, reorder_level FROM products WHERE quantity <= reorder_level AND tenant_id = $1 AND is_active = true LIMIT 5',
        [tenantId]
      ),
      query(
        "SELECT COALESCE(SUM(total_amount), 0) as total FROM sales_orders WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) AND tenant_id = $1",
        [tenantId]
      ),
      query(
        "SELECT COUNT(*) as count FROM sales_orders WHERE status = 'pending' AND tenant_id = $1",
        [tenantId]
      )
    ]);

    const insights = [];

    if (lowStock.rows.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Low Stock Alert',
        description: `${lowStock.rows.length} product(s)(including "${lowStock.rows[0].name}") have reached their reorder threshold.`,
        action: 'Create Purchase Order',
        priority: 'high'
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Inventory Healthy',
        description: 'All product stock levels are above their reorder thresholds.',
        action: 'View Inventory',
        priority: 'low'
      });
    }

    const monthlyRevenue = parseFloat(revenueData.rows[0].total);
    insights.push({
      type: 'success',
      title: 'Monthly Revenue',
      description: monthlyRevenue > 0
        ? `Monthly revenue is ₹${monthlyRevenue.toLocaleString('en-IN')}.`
        : 'No sales recorded yet this month.',
      action: 'View Sales',
      priority: 'medium'
    });

    const pendingOrders = parseInt(orderStats.rows[0].count, 10);
    if (pendingOrders > 0) {
      insights.push({
        type: 'info',
        title: 'Pending Orders',
        description: `You have ${pendingOrders} order(s) waiting for confirmation and shipping.`,
        action: 'Process Orders',
        priority: 'medium'
      });
    }

    insights.push({
      type: 'info',
      title: 'Hybrid Vector Search & RBAC Active',
      description: 'PostgreSQL computes vector similarity directly in-database with strict tenant boundary enforcement.',
      action: 'Search Products',
      priority: 'low'
    });

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate insights' });
  }
});

// ============================================================
// 4. IN-DATABASE HYBRID SEARCH (Keyword + Vector Semantic Fusion)
// GET /api/v1/ai/search?q=your+query
// ============================================================
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Query parameter q is required' });
    }

    const tenantId = req.user?.tenant_id || DEFAULT_TENANT_ID;

    // 1. Run In-Database Hybrid Search (Lexical + Vector Cosine in PostgreSQL)
    const hybridProducts = await performHybridProductSearch(q.trim(), tenantId, 5);

    // 2. Search customers by keyword scoped to tenant
    const customerRes = await query(
      `SELECT 'customer' as type, id, name, email as subtitle 
       FROM customers
    WHERE(name ILIKE $1 OR email ILIKE $1) 
         AND tenant_id = $2 
       LIMIT 3`,
      [`% ${q.trim()}% `, tenantId]
    );

    const productResults = hybridProducts.map(p => ({
      type: 'product',
      id: p.id,
      name: p.name,
      subtitle: `SKU: ${p.sku} | ${p.price} (${p.match_confidence || p.matchPercentage + '% match'})`,
      matchType: p.matchType,
      matchPercentage: p.matchPercentage
    }));

    res.json({
      success: true,
      data: [...productResults, ...customerRes.rows],
      engine: 'in_database_hybrid_search',
      tenantId
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// ============================================================
// 5. EMBEDDINGS HEALTH & METRICS MONITORING
// GET /api/v1/ai/embeddings/metrics
// ============================================================
router.get('/embeddings/metrics', verifyToken, async (req, res) => {
  try {
    const metricsData = getEmbeddingMetrics();
    res.json({ success: true, data: metricsData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve embedding metrics' });
  }
});

// ============================================================
// 6. VECTOR DB INSPECTOR & EXPLORER
// GET /api/v1/ai/vector-db/inspect
// ============================================================
router.get('/vector-db/inspect', verifyToken, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id || DEFAULT_TENANT_ID;
    const result = await query(
      `SELECT id, name, sku, category, unit_price, quantity,
              array_length(embedding_vec, 1) as dimensions,
              embedding_vec[1:8] as sample_vector,
              embedding_vec as full_vector,
              (embedding_vec IS NOT NULL) as is_vectorized
       FROM products 
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        database: 'PostgreSQL 17 (bizsuite_erp)',
        table: 'products',
        vectorColumn: 'embedding_vec (float8[])',
        vectorModel: 'Ollama all-minilm',
        dimensions: 384,
        totalProducts: result.rows.length,
        vectorizedCount: result.rows.filter(r => r.is_vectorized).length,
        products: result.rows.map(r => ({
          id: r.id,
          name: r.name,
          sku: r.sku,
          category: r.category,
          dimensions: r.dimensions || 0,
          sample_vector: r.sample_vector || [],
          full_vector: r.full_vector || [],
          is_vectorized: r.is_vectorized
        }))
      }
    });
  } catch (error) {
    console.error('Vector DB inspect error:', error);
    res.status(500).json({ success: false, message: 'Failed to inspect vector DB' });
  }
});

// ============================================================
// 7. LANGCHAIN STRUCTURED OUTPUT AUDIT (Using Zod & withStructuredOutput)
// GET /api/v1/ai/langchain/audit
// ============================================================
router.get('/langchain/audit', verifyToken, async (req, res) => {
  try {
    const { generateStructuredInventoryInsights } = require('../ai/langchain/structuredOutput');
    const tenantId = req.user?.tenant_id || DEFAULT_TENANT_ID;

    // 1. Fetch VERIFIED GROUND TRUTH from PostgreSQL (0% Hallucination)
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

    const databaseMetrics = {
      total_product_types: parseInt(statsRes.rows[0].total_types, 10),
      total_units: parseInt(statsRes.rows[0].total_units, 10),
      total_valuation: `₹${parseFloat(statsRes.rows[0].total_value).toLocaleString('en-IN')}`,
      low_stock_items: productsRes.rows
        .filter(p => p.quantity <= p.reorder_level)
        .map(p => ({
          name: p.name,
          sku: p.sku,
          stock: p.quantity,
          threshold: p.reorder_level
        }))
    };

    if (productsRes.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          database_metrics: databaseMetrics,
        ai_insights: {
          inventory_status: 'Healthy',
          summary: 'No active products found in warehouse inventory.',
          recommendations: ['Add products to your catalog to generate AI inventory insights.']
        }
      },
        engine: 'LangChain withStructuredOutput (Zod Schema + llama3.2:1b)'
      });
    }

const inventoryText = productsRes.rows
  .map(p => `- ${p.name} (SKU: ${p.sku}): ${p.quantity} units in stock at ₹${p.unit_price}/unit (Reorder threshold: ${p.reorder_level})`)
  .join('\n');

// 2. Generate Zod-validated Structured Output via ChatOllama withStructuredOutput()
const aiInsights = await generateStructuredInventoryInsights(inventoryText);

res.json({
  success: true,
      data: {
    database_metrics: databaseMetrics,
    ai_insights: aiInsights
  },
  engine: 'LangChain withStructuredOutput (Zod Schema + llama3.2:1b)'
});
  } catch (error) {
  console.error('LangChain structured audit error:', error);
  res.status(500).json({ success: false, message: 'LangChain audit failed', error: error.message });
}
});

// ============================================================
// 8. LANGCHAIN RAG RETRIEVER ENDPOINT (Custom BaseRetriever + LCEL)
// POST /api/v1/ai/langchain/rag
// ============================================================
router.post('/langchain/rag', verifyToken, async (req, res) => {
  try {
    const { createInventoryRAGChain } = require('../ai/langchain/retriever');
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Valid organization tenant context is required.' });
    }

    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, message: 'question is required and must be a non-empty string.' });
    }

    const ragPipeline = await createInventoryRAGChain(tenantId);
    const result = await ragPipeline.query(question.trim());

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('LangChain RAG retriever error:', error);
    res.status(500).json({ success: false, message: error.message || 'LangChain RAG query failed' });
  }
});

module.exports = router;
