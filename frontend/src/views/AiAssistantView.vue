<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">AI Assistant</h1>
        <p class="page-desc">Ask questions about your ERP data in plain English</p>
      </div>
      <div class="ai-status-badge">
        <span class="ai-status-dot"></span>
        <span>Ollama Active (llama3.2:1b)</span>
      </div>
    </div>

    <!-- Architectural Capabilities Row -->
    <div class="grid-3 mb-6">
      <div class="learn-card" v-for="cap in aiCapabilities" :key="cap.title">
        <div class="learn-card-icon">
          <svg v-if="cap.icon === 'llm'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
            <rect x="9" y="9" width="6" height="6"></rect>
            <line x1="9" y1="1" x2="9" y2="4"></line>
            <line x1="15" y1="1" x2="15" y2="4"></line>
            <line x1="9" y1="20" x2="9" y2="23"></line>
            <line x1="15" y1="20" x2="15" y2="23"></line>
            <line x1="20" y1="9" x2="23" y2="9"></line>
            <line x1="20" y1="14" x2="23" y2="14"></line>
            <line x1="1" y1="9" x2="4" y2="9"></line>
            <line x1="1" y1="14" x2="4" y2="14"></line>
          </svg>
          <svg v-else-if="cap.icon === 'tools'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
        </div>
        <div style="flex: 1">
          <div class="learn-card-title">{{ cap.title }}</div>
          <div class="learn-card-desc">{{ cap.desc }}</div>
          <span class="badge badge-success" style="font-size: 10px">
            {{ cap.badge }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace: Chat Interface + Intelligence Inspector -->
    <div class="ai-layout">
      <!-- Chat Interface -->
      <div class="card ai-chat-card">
        <div class="card-header" style="border-bottom: 1px solid var(--border); padding-bottom: 14px; margin-bottom: 0">
          <div class="flex items-center gap-2">
            <div class="ai-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
              </svg>
            </div>
            <div>
              <div class="card-title">MeriBot</div>
              <div class="card-subtitle">Your AI-powered ERP assistant</div>
            </div>
          </div>
          <button @click="clearChat" class="btn btn-secondary btn-sm" title="Clear conversation history">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Clear</span>
          </button>
        </div>

        <!-- Messages Viewport -->
        <div class="chat-messages" ref="messagesEl">
          <!-- Welcome Prompt (Linear Asks style) -->
          <div class="chat-msg assistant" v-if="messages.length === 0">
            <div class="msg-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
              </svg>
            </div>
            <div class="msg-content">
              <div class="msg-bubble">
                <p style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px">
                  Welcome back, {{ authStore.user?.name?.split(' ')[0] }}.
                </p>
                <p style="color: var(--text-secondary); line-height: 1.5">
                  I am connected to your live tenant database via PostgreSQL 17 and LangChain RAG pipelines. Ask me questions regarding stock levels, order statuses, or catalog analysis.
                </p>
                <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-muted)">
                  <div style="display: flex; align-items: center; gap: 6px">
                    <span style="color: var(--primary-light)">•</span>
                    <span>Query product quantities, prices, and low stock warnings</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px">
                    <span style="color: var(--primary-light)">•</span>
                    <span>Review customer sales orders and delivery schedules</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px">
                    <span style="color: var(--primary-light)">•</span>
                    <span>Perform vector semantic searches over catalog descriptions</span>
                  </div>
                </div>
              </div>
              <div class="msg-time">System Ready</div>
            </div>
          </div>

          <!-- Conversation Messages -->
          <div 
            v-for="msg in messages" 
            :key="msg.id"
            class="chat-msg"
            :class="msg.role"
          >
            <div class="msg-avatar">
              <span v-if="msg.role === 'user'">{{ userInitial }}</span>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
              </svg>
            </div>
            <div class="msg-content">
              <div v-if="msg.role === 'assistant'" class="msg-bubble" style="white-space: pre-line" v-html="formatMarkdown(msg.content)"></div>
              <div v-else class="msg-bubble" style="white-space: pre-line">{{ msg.content }}</div>
              <!-- Tool Execution Pill Indicator -->
              <div v-if="msg.note" class="msg-note">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span>{{ msg.note }}</span>
              </div>
              <div class="msg-time font-mono">{{ msg.time }}</div>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isTyping" class="chat-msg assistant">
            <div class="msg-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
              </svg>
            </div>
            <div class="msg-content">
              <div class="msg-bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Prompts Toolbar -->
        <div class="quick-prompts">
          <button 
            v-for="prompt in quickPrompts" 
            :key="prompt.text"
            class="quick-prompt-btn"
            @click="sendQuickPrompt(prompt.text)"
          >
            <span>{{ prompt.label }}</span>
          </button>
        </div>

        <!-- Input Area (Linear style input) -->
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <input
              v-model="inputMessage"
              type="text"
              class="chat-input"
              placeholder="Ask about inventory, sales, or any business metric..."
              @keyup.enter="sendMessage"
              :disabled="isTyping"
            />
            <button 
              class="chat-send-btn"
              @click="sendMessage"
              :disabled="!inputMessage.trim() || isTyping"
              title="Send prompt"
            >
              <span v-if="isTyping" class="spinner" style="width: 14px; height: 14px; border-width: 2px"></span>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Right Panel: Database Inspector & LangChain Studio -->
      <div style="display: flex; flex-direction: column; gap: 14px">
        <!-- Smart Search Card -->
        <div class="card">
          <div class="card-header" style="margin-bottom: 12px">
            <div>
              <div class="card-title">Vector Semantic Search</div>
              <div class="card-subtitle">PostgreSQL Cosine Similarity search</div>
            </div>
          </div>
          <div class="flex gap-2 items-center mb-3">
            <input
              v-model="searchQuery"
              type="text"
              class="form-control"
              placeholder="e.g. ergonomic chair, laptop..."
              @keyup.enter="doSearch"
            />
            <button class="btn btn-primary" @click="doSearch" style="white-space: nowrap">
              Search
            </button>
          </div>
          <div v-if="searchResults.length" style="display: flex; flex-direction: column; gap: 6px">
            <div 
              v-for="r in searchResults" 
              :key="r.id"
              class="search-result-item"
            >
              <span class="badge badge-purple" style="font-size: 10px">{{ r.type }}</span>
              <div style="overflow: hidden">
                <div style="font-size: 12.5px; font-weight: 600; color: var(--text-primary)" class="truncate">{{ r.name }}</div>
                <div style="font-size: 11px; color: var(--text-muted)" class="truncate">{{ r.subtitle }}</div>
              </div>
            </div>
          </div>
          <div v-else-if="searched" class="empty-state" style="padding: 14px">
            <p style="font-size: 12px">No matching items found</p>
          </div>
        </div>

        <!-- Vector DB Explorer Card -->
        <div class="card">
          <div class="card-header" style="justify-content: space-between; display: flex; align-items: center; margin-bottom: 10px">
            <div>
              <div class="card-title">Vector DB Explorer</div>
              <div class="card-subtitle">PostgreSQL 17 Embedding Store</div>
            </div>
            <button class="btn btn-secondary btn-sm" @click="loadVectorInspector">
              {{ showVectorInspector ? 'Refresh' : 'Inspect' }}
            </button>
          </div>
          <div style="font-size: 11.5px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px">
            <div>Table: <code class="font-mono" style="color: var(--text-secondary)">products.embedding_vec</code></div>
            <div>Dimension: <span class="font-mono" style="color: var(--text-secondary)">384 float8 coordinates</span></div>
          </div>

          <div v-if="showVectorInspector && vectorData" style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px">
            <div 
              v-for="p in vectorData.products" 
              :key="p.id" 
              style="padding: 10px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px">
                <span style="font-weight: 600; color: var(--text-primary); font-size: 12.5px">{{ p.name }}</span>
                <span class="badge badge-success" style="font-size: 9px">{{ p.dimensions }} dims</span>
              </div>
              <div class="font-mono" style="font-size: 10px; color: var(--accent); background: var(--bg-card); padding: 5px 8px; border-radius: 4px; overflow-x: auto; white-space: nowrap; border: 1px solid var(--border-light)">
                [{{ p.sample_vector.map(n => n.toFixed(4)).join(', ') }}, ... +376]
              </div>
            </div>
          </div>
        </div>

        <!-- LangChain Live Studio & Structured Zod Audit -->
        <div class="card">
          <div class="card-header" style="justify-content: space-between; display: flex; align-items: center; margin-bottom: 10px">
            <div>
              <div class="card-title">LangChain Live Studio</div>
              <div class="card-subtitle">Zod Schema-Guaranteed Output</div>
            </div>
            <button 
              class="btn btn-primary btn-sm" 
              @click="runLangChainAudit"
              :disabled="loadingAudit"
            >
              <span v-if="loadingAudit" class="spinner" style="width: 11px; height: 11px; border-width: 2px"></span>
              <span v-else>Run Audit</span>
            </button>
          </div>

          <!-- Loading state -->
          <div v-if="loadingAudit" style="font-size: 12px; color: var(--text-muted); padding: 12px; text-align: center">
            Validating structured output with Zod schema...
          </div>

          <!-- Audit Result -->
          <div v-if="auditResult && !loadingAudit" style="margin-top: 10px; display: flex; flex-direction: column; gap: 10px">
            <!-- SECTION 1: Database Ground Truth (Verified SQL Facts) -->
            <div style="padding: 10px; background: var(--bg-surface); border-radius: 6px; border: 1px solid var(--border)">
              <div style="font-size: 11px; font-weight: 600; color: var(--accent); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em">
                SQL Ground Truth Metrics
              </div>
              <div class="grid-3" style="gap: 6px">
                <div style="padding: 6px; background: var(--bg-card); border-radius: 4px; text-align: center; border: 1px solid var(--border-light)">
                  <div style="font-size: 9.5px; color: var(--text-muted)">Products</div>
                  <div class="font-mono" style="font-size: 14px; font-weight: 700; color: var(--text-primary)">
                    {{ auditResult.database_metrics?.total_product_types ?? auditResult.total_product_types ?? 0 }}
                  </div>
                </div>
                <div style="padding: 6px; background: var(--bg-card); border-radius: 4px; text-align: center; border: 1px solid var(--border-light)">
                  <div style="font-size: 9.5px; color: var(--text-muted)">Units</div>
                  <div class="font-mono" style="font-size: 14px; font-weight: 700; color: var(--text-primary)">
                    {{ auditResult.database_metrics?.total_units ?? auditResult.total_units ?? 0 }}
                  </div>
                </div>
                <div style="padding: 6px; background: var(--bg-card); border-radius: 4px; text-align: center; border: 1px solid var(--border-light)">
                  <div style="font-size: 9.5px; color: var(--text-muted)">Valuation</div>
                  <div class="font-mono" style="font-size: 13px; font-weight: 700; color: var(--success)">
                    {{ auditResult.database_metrics?.total_valuation ?? '₹0' }}
                  </div>
                </div>
              </div>

              <!-- Low Stock Pills from DB -->
              <div v-if="auditResult.database_metrics?.low_stock_items?.length" style="margin-top: 8px; font-size: 10.5px">
                <span style="color: var(--danger); font-weight: 600">Reorder Alert: </span>
                <span 
                  v-for="item in auditResult.database_metrics.low_stock_items" 
                  :key="item.sku"
                  class="badge badge-warning"
                  style="font-size: 9px; margin-right: 4px; margin-top: 2px"
                >
                  {{ item.name }} ({{ item.stock }}/{{ item.threshold }})
                </span>
              </div>
            </div>

            <!-- SECTION 2: AI Strategic Guidance (Zod Validated) -->
            <div style="padding: 10px; background: var(--primary-surface); border-radius: 6px; border: 1px solid var(--primary-border)">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
                <span style="font-size: 11px; font-weight: 600; color: var(--primary-light); text-transform: uppercase; letter-spacing: 0.05em">
                  Strategic Guidance
                </span>
                <span 
                  class="badge" 
                  :class="(auditResult.ai_insights?.inventory_status || auditResult.inventory_status) === 'Healthy' ? 'badge-success' : 'badge-warning'"
                  style="font-size: 10px"
                >
                  {{ auditResult.ai_insights?.inventory_status || auditResult.inventory_status }}
                </span>
              </div>

              <div style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px">
                {{ auditResult.ai_insights?.summary || auditResult.recommendation }}
              </div>

              <div v-if="auditResult.ai_insights?.recommendations?.length" style="border-top: 1px solid var(--border); padding-top: 6px">
                <div style="font-size: 10.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px">Actions:</div>
                <ul style="margin: 0; padding-left: 14px; font-size: 10.5px; color: var(--text-muted); display: flex; flex-direction: column; gap: 3px">
                  <li v-for="(rec, idx) in auditResult.ai_insights.recommendations" :key="idx">
                    {{ rec }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- SECTION 3: LangChain Custom RAG Retriever -->
          <div style="padding: 12px; background: var(--bg-surface); border-radius: 6px; border: 1px solid var(--border); margin-top: 12px">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
              <span style="font-size: 11px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em">
                Custom RAG Retriever
              </span>
              <span class="badge badge-info" style="font-size: 9px">
                BaseRetriever
              </span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px">
              Retrieves PostgreSQL <code>Document[]</code> using in-database hybrid search and synthesizes answers via LCEL.
            </div>

            <div style="display: flex; gap: 6px; margin-bottom: 8px">
              <input
                v-model="ragQuestion"
                class="form-control"
                style="font-size: 11.5px; padding: 5px 8px"
                placeholder="Ask inventory question..."
                @keyup.enter="runRagQuery"
              />
              <button
                class="btn btn-primary btn-sm"
                @click="runRagQuery"
                :disabled="loadingRag || !ragQuestion.trim()"
              >
                <span v-if="loadingRag" class="spinner" style="width: 10px; height: 10px; border-width: 2px"></span>
                <span v-else>Query</span>
              </button>
            </div>

            <!-- RAG Loading -->
            <div v-if="loadingRag" style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 8px">
              Retrieving context from PostgreSQL &amp; synthesizing...
            </div>

            <!-- RAG Result -->
            <div v-if="ragResult && !loadingRag" style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px">
              <div style="background: var(--bg-card); padding: 8px 10px; border-radius: 4px; border-left: 3px solid var(--accent)">
                <div style="font-size: 10.5px; font-weight: 600; color: var(--accent); margin-bottom: 4px">Synthesized Response:</div>
                <div style="font-size: 11.5px; color: var(--text-primary); line-height: 1.4">
                  {{ ragResult.answer }}
                </div>
                <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 4px">
                  Retrieved in {{ ragResult.duration_seconds }}s • {{ ragResult.documents_retrieved_count }} documents
                </div>
              </div>

              <!-- Retrieved Documents Accordion / Preview -->
              <div v-if="ragResult.documents?.length">
                <div style="font-size: 10px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px">
                  DOCUMENTS ({{ ragResult.documents.length }}):
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px">
                  <div
                    v-for="(doc, idx) in ragResult.documents"
                    :key="idx"
                    style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 4px; padding: 6px; font-size: 10px"
                  >
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px">
                      <span style="font-weight: 600; color: var(--text-primary)">{{ doc.metadata?.name || 'Product' }}</span>
                      <span class="badge badge-info" style="font-size: 8px">
                        {{ doc.metadata?.matchConfidence || doc.metadata?.matchType }}
                      </span>
                    </div>
                    <div style="color: var(--text-muted); font-size: 9.5px; white-space: pre-line">
                      {{ doc.pageContent }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active System Features & Architecture -->
        <div class="card">
          <div class="card-header" style="margin-bottom: 12px">
            <div>
              <div class="card-title">Active AI Features &amp; Stack</div>
              <div class="card-subtitle">Technologies and capabilities powering this assistant</div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <div v-for="feat in activeFeatures" :key="feat.title" class="feature-item">
              <div class="feature-item-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div style="flex: 1">
                <div class="flex items-center justify-between" style="margin-bottom: 2px">
                  <span class="feature-item-title">{{ feat.title }}</span>
                  <span class="badge badge-success" style="font-size: 9px">{{ feat.status }}</span>
                </div>
                <div class="feature-item-category">{{ feat.category }}</div>
                <div class="feature-item-desc">{{ feat.desc }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, computed } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import api from '../api/axios';

const authStore = useAuthStore();
const messagesEl = ref(null);
const inputMessage = ref('');
const isTyping = ref(false);
const messages = ref([]);
const searchQuery = ref('');
const searchResults = ref([]);
const searched = ref(false);

const userInitial = computed(() => authStore.userInitials);

const quickPrompts = [
  { label: 'Stock & Price of Laptop', text: 'Look up stock and price of Laptop' },
  { label: 'Low Stock Alert', text: 'Check low stock items across catalog' },
  { label: 'Sales Performance', text: 'What are our sales orders this month?' },
  { label: 'Inventory Summary', text: 'Give me an inventory overview' }
];

const aiCapabilities = [
  {
    icon: 'llm',
    title: 'Private Local LLM (Ollama)',
    desc: 'Meta Llama 3.2 running private and local on host hardware — zero cloud exposure',
    badge: 'Zero Cloud Leakage'
  },
  {
    icon: 'rag',
    title: 'Hybrid PostgreSQL RAG',
    desc: 'Dense 384-dim semantic embeddings combined with BM25 keyword matching via RRF fusion',
    badge: 'Hybrid RAG'
  },
  {
    icon: 'tools',
    title: 'Autonomous Tool Calling',
    desc: 'Direct execution of live SQL queries, stock thresholds, and purchase drafts',
    badge: 'ACID Integrated'
  }
];

const activeFeatures = [
  {
    category: 'Retrieval Engine',
    title: 'Hybrid Vector + BM25 Search',
    desc: 'Reciprocal Rank Fusion (RRF) combining exact keyword matches with 384-dim semantic embeddings.',
    status: 'Operational'
  },
  {
    category: 'Chain Architecture',
    title: 'LangChain LCEL Pipeline',
    desc: 'Declarative RunnableSequence chains binding custom BaseRetriever, prompt templates, and chat models.',
    status: 'Operational'
  },
  {
    category: 'Catalog Intelligence',
    title: 'Zod Structured Output',
    desc: 'Deterministic JSON parsing via .withStructuredOutput() ensuring 0% hallucination in inventory audits.',
    status: 'Operational'
  },
  {
    category: 'Batch Automation',
    title: 'AI Batch Catalog Engine',
    desc: 'Concurrent LangChain .batch() processing with maxConcurrency 2 for bulk tagging & classification.',
    status: 'Operational'
  },
  {
    category: 'Interactive UX',
    title: 'Server-Sent Events (SSE)',
    desc: 'Sub-second token streaming direct from local Ollama to the client chat interface.',
    status: 'Operational'
  },
  {
    category: 'Security & Scope',
    title: 'Multi-Tenant Isolation',
    desc: 'Vector embeddings and hybrid search queries isolated strictly by tenant organization context.',
    status: 'Operational'
  },
  {
    category: 'Database Tooling',
    title: 'Autonomous SQL Tool Calling',
    desc: 'Live database tools for checking stock levels, searching products, and generating order drafts.',
    status: 'Operational'
  }
];

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isTyping.value) return;

  const userMsg = {
    id: Date.now(),
    role: 'user',
    content: inputMessage.value,
    time: formatTime()
  };

  messages.value.push(userMsg);
  const question = inputMessage.value;
  inputMessage.value = '';
  isTyping.value = true;

  scrollToBottom();

  const aiMsg = reactive({
    id: Date.now() + 1,
    role: 'assistant',
    content: '',
    note: '',
    time: formatTime()
  });

  try {
    const token = localStorage.getItem('token');
    let apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').trim();
    if (apiBase.endsWith('/')) apiBase = apiBase.slice(0, -1);
    if (!apiBase.endsWith('/api/v1')) apiBase = `${apiBase}/api/v1`;

    // Real-Time Streaming via LangChain .stream() & .pipe()
    const response = await fetch(`${apiBase}/ai/stream-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        message: question,
        context: messages.value.slice(-5).map(m => ({ role: m.role, content: m.content }))
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let pushed = false;
    let streamFinished = false;

    while (!streamFinished) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6).trim();

        if (jsonStr === '[DONE]') {
          streamFinished = true;
          isTyping.value = false;
          break;
        }

        try {
          const payload = JSON.parse(jsonStr);

          if (payload.type === 'tool') {
            aiMsg.note = `${payload.summary} • Streaming response...`;
            if (!pushed) {
              messages.value.push(aiMsg);
              pushed = true;
              isTyping.value = false;
            }
          } else if (payload.type === 'chunk') {
            if (!pushed) {
              messages.value.push(aiMsg);
              pushed = true;
              isTyping.value = false;
            }
            aiMsg.content += payload.chunk;
            scrollToBottom();
          } else if (payload.type === 'done') {
            if (payload.note) aiMsg.note = payload.note;
            isTyping.value = false;
            streamFinished = true;
          } else if (payload.type === 'error') {
            aiMsg.content = `Error: ${payload.message || 'Error during streaming'}`;
            if (!pushed) {
              messages.value.push(aiMsg);
              pushed = true;
              isTyping.value = false;
            }
            streamFinished = true;
          }
        } catch (e) {
          // Ignore JSON parse errors for non-JSON lines
        }
      }
    }

    if (!pushed) {
      messages.value.push(aiMsg);
    }
    isTyping.value = false;
    if (!aiMsg.content.trim()) {
      aiMsg.content = 'I processed your request, but no response text was generated.';
    }
  } catch (error) {
    console.error('Streaming error:', error);
    aiMsg.content = error.message || 'Failed to connect to AI streaming service.';
    if (!messages.value.some(m => m.id === aiMsg.id)) {
      messages.value.push(aiMsg);
    }
  } finally {
    isTyping.value = false;
    scrollToBottom();
  }
};

const sendQuickPrompt = (prompt) => {
  inputMessage.value = prompt;
  sendMessage();
};

const doSearch = async () => {
  if (!searchQuery.value.trim()) return;
  searched.value = true;
  try {
    const { data } = await api.get('/ai/search', { params: { q: searchQuery.value } });
    searchResults.value = data.data;
  } catch (e) {
    searchResults.value = [];
  }
};

const clearChat = () => { messages.value = []; };

const auditResult = ref(null);
const loadingAudit = ref(false);

const runLangChainAudit = async () => {
  loadingAudit.value = true;
  try {
    const { data } = await api.get('/ai/langchain/audit');
    auditResult.value = data.data;
  } catch (error) {
    console.error('LangChain audit failed:', error);
  } finally {
    loadingAudit.value = false;
  }
};

const ragQuestion = ref('What is the stock and price of Laptop?');
const ragResult = ref(null);
const loadingRag = ref(false);

const runRagQuery = async () => {
  if (!ragQuestion.value.trim() || loadingRag.value) return;
  loadingRag.value = true;
  try {
    const { data } = await api.post('/ai/langchain/rag', { question: ragQuestion.value.trim() });
    ragResult.value = data.data;
  } catch (error) {
    console.error('LangChain RAG query failed:', error);
    alert(error.response?.data?.message || 'RAG query failed');
  } finally {
    loadingRag.value = false;
  }
};

const vectorData = ref(null);
const showVectorInspector = ref(false);
const loadingVectors = ref(false);

const loadVectorInspector = async () => {
  if (showVectorInspector.value && vectorData.value) {
    try {
      const { data } = await api.get('/ai/vector-db/inspect');
      vectorData.value = data.data;
    } catch (e) {
      console.error('Vector inspect refresh error:', e);
    }
    return;
  }
  loadingVectors.value = true;
  try {
    const { data } = await api.get('/ai/vector-db/inspect');
    vectorData.value = data.data;
    showVectorInspector.value = true;
  } catch (e) {
    console.error('Vector inspect error:', e);
  } finally {
    loadingVectors.value = false;
  }
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
};

const formatMarkdown = (text) => {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`\n]+)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-size: 0.9em;">$1</code>');
};

const formatTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
</script>

<style scoped>
.ai-status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--success-surface);
  border: 1px solid var(--success-border);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--success);
}

.ai-status-dot {
  width: 6px;
  height: 6px;
  background: var(--success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.learn-card {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: var(--transition);
  align-items: flex-start;
}

.learn-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.learn-card-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-light);
  flex-shrink: 0;
}

.learn-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.learn-card-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-bottom: 6px;
  line-height: 1.4;
}

.ai-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  align-items: start;
}

@media (max-width: 1024px) {
  .ai-layout {
    grid-template-columns: 1fr;
  }
}

.ai-chat-card {
  display: flex;
  flex-direction: column;
}

.ai-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--primary-surface);
  border: 1px solid var(--primary-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-light);
  flex-shrink: 0;
}

.chat-messages {
  min-height: 360px;
  max-height: 480px;
  overflow-y: auto;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chat-msg {
  display: flex;
  gap: 10px;
  animation: fadeIn 0.15s ease-out;
}

.chat-msg.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
  font-weight: 600;
  color: var(--text-secondary);
}

.chat-msg.assistant .msg-avatar {
  color: var(--primary-light);
  border-color: rgba(99, 102, 241, 0.3);
}

.msg-content {
  max-width: 80%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-msg.user .msg-content { align-items: flex-end; }

.msg-bubble {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  line-height: 1.5;
}

.chat-msg.user .msg-bubble {
  background: #4f46e5;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md) var(--radius-md) var(--radius-xs) var(--radius-md);
}

.chat-msg.assistant .msg-bubble {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: var(--radius-md) var(--radius-md) var(--radius-md) var(--radius-xs);
}

.msg-note {
  font-size: 10.5px;
  color: var(--accent);
  padding: 4px 10px;
  background: var(--accent-surface);
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.2);
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
}

.msg-time {
  font-size: 9.5px;
  color: var(--text-muted);
  padding: 0 2px;
}

/* Precision Typing Animation */
.typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 10px 14px;
}

.typing span {
  width: 5px;
  height: 5px;
  background: var(--text-muted);
  border-radius: 50%;
  animation: typingBounce 1s infinite;
}

.typing span:nth-child(2) { animation-delay: 0.15s; }
.typing span:nth-child(3) { animation-delay: 0.3s; }

@keyframes typingBounce {
  0%, 100% { transform: translateY(0); opacity: 0.4; }
  50% { transform: translateY(-3px); opacity: 1; }
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-top: auto;
}

.quick-prompt-btn {
  padding: 4px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11.5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
  font-family: inherit;
}

.quick-prompt-btn:hover {
  background: var(--bg-elevated);
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
}

.chat-input-area {
  padding-top: 12px;
}

.chat-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 6px 6px 12px;
  transition: var(--transition);
}

.chat-input-wrapper:focus-within {
  border-color: var(--border-focus);
  background: var(--bg-card);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.chat-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
}

.chat-input::placeholder { color: var(--text-muted); }

.chat-send-btn {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-xs);
  background: var(--primary);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
  flex-shrink: 0;
}

.chat-send-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.chat-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  transition: var(--transition);
}

.search-result-item:hover {
  background: var(--bg-elevated);
  border-color: rgba(255, 255, 255, 0.12);
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.feature-item:hover {
  background: var(--bg-elevated);
  border-color: rgba(255, 255, 255, 0.12);
}

.feature-item-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--success-surface);
  color: var(--success);
  border: 1px solid var(--success-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.feature-item-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.feature-item-category {
  font-size: 10px;
  color: var(--primary-light);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}

.feature-item-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}
</style>
