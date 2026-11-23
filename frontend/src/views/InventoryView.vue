<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Inventory</h1>
        <p class="page-desc">Manage products, stock levels, and categories</p>
      </div>
      <div class="flex gap-2">
        <button 
          @click="openBatchModal" 
          class="btn btn-secondary" 
          v-if="authStore.isManager"
          style="display: flex; align-items: center; gap: 6px; border-color: rgba(99,102,241,0.3); color: var(--primary-light)"
          title="Run LangChain .batch() catalog enrichment"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>⚡ AI Batch Studio</span>
        </button>
        <button @click="showAddModal = true" class="btn btn-primary" v-if="authStore.isManager">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>+ Add Product</span>
        </button>
      </div>
    </div>

    <!-- Filters Toolbar -->
    <div class="card mb-4" style="padding: 14px 18px">
      <div class="flex gap-3 items-center" style="flex-wrap: wrap">
        <div class="flex gap-2 items-center" style="flex: 1; min-width: 220px; position: relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); position: absolute; left: 12px; pointer-events: none">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="search"
            type="text"
            class="form-control"
            style="padding-left: 34px"
            placeholder="Search products by title, SKU, or keywords..."
            @input="debounceSearch"
          />
        </div>
        <select v-model="filterCategory" class="form-control" style="max-width: 170px" @change="loadProducts">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <span class="badge badge-warning" v-if="lowStockCount > 0" style="padding: 6px 10px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>{{ lowStockCount }} Low Stock</span>
        </span>
      </div>
    </div>

    <!-- Products Table -->
    <div class="card" style="padding: 0; overflow: hidden">
      <!-- Loading State -->
      <div v-if="store.loading" class="loading-overlay">
        <div class="spinner" style="width: 26px; height: 26px; border-width: 2.5px"></div>
        <span>Retrieving inventory records...</span>
      </div>

      <template v-else>
        <div class="table-wrapper" style="border: none; border-radius: 0">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Current Stock</th>
                <th>Stock Status</th>
                <th v-if="authStore.isManager" style="text-align: right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in store.products" :key="product.id">
                <td>
                  <div class="td-primary">{{ product.name }}</div>
                  <div class="truncate" style="font-size: 11px; color: var(--text-muted); margin-top: 2px; max-width: 280px">
                    {{ product.description || 'No description entered' }}
                  </div>
                </td>
                <td>
                  <span class="font-mono" style="background: var(--bg-surface); border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; font-size: 11px; color: var(--text-secondary)">
                    {{ product.sku }}
                  </span>
                </td>
                <td>
                  <span class="badge badge-purple" style="font-size: 11px">{{ product.category }}</span>
                </td>
                <td class="td-primary font-mono">₹{{ formatPrice(product.unit_price) }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="stock-bar" :style="{ '--pct': stockPct(product) + '%', '--color': stockColor(product) }"></div>
                    <span class="font-mono" :style="{ color: stockColor(product), fontWeight: 600, fontSize: '12px' }">
                      {{ product.quantity }} {{ product.unit }}
                    </span>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="product.quantity <= product.reorder_level ? 'badge-danger' : 'badge-success'">
                    <span style="width: 5px; height: 5px; border-radius: 50%; background: currentColor"></span>
                    <span>{{ product.quantity <= product.reorder_level ? 'Low Stock' : 'In Stock' }}</span>
                  </span>
                </td>
                <td v-if="authStore.isManager" style="text-align: right">
                  <div class="flex gap-1 justify-between" style="justify-content: flex-end">
                    <button class="btn btn-secondary btn-sm" @click="openEdit(product)" title="Edit product">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button class="btn btn-danger btn-sm" @click="confirmDelete(product)" v-if="authStore.isAdmin" title="Delete product">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="!store.products.length" class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h3>No products found</h3>
          <p>No inventory items match the current search filters</p>
        </div>
      </template>
    </div>

    <!-- Add/Edit Product Modal -->
    <Teleport to="body">
      <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">{{ showEditModal ? 'Edit Product' : 'Add New Product' }}</div>
            <button class="modal-close" @click="closeModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Product Name *</label>
                <input v-model="form.name" class="form-control" placeholder="e.g. Dell XPS 15 Laptop" required />
              </div>
              <div class="form-group">
                <label class="form-label">SKU Code *</label>
                <input v-model="form.sku" class="form-control" placeholder="e.g. ELEC-001" :disabled="showEditModal" />
              </div>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Category</label>
                <select v-model="form.category" class="form-control">
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Inventory Unit</label>
                <select v-model="form.unit" class="form-control">
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="ltr">ltr (Liters)</option>
                  <option value="box">box (Boxes)</option>
                  <option value="ream">ream (Reams)</option>
                </select>
              </div>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Unit Price (₹) *</label>
                <input v-model="form.unit_price" type="number" class="form-control" placeholder="0.00" min="0" />
              </div>
              <div class="form-group">
                <label class="form-label">Current Quantity *</label>
                <input v-model="form.quantity" type="number" class="form-control" placeholder="0" min="0" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Reorder Level Threshold</label>
              <input v-model="form.reorder_level" type="number" class="form-control" placeholder="10" min="0" />
            </div>
            <div class="form-group" style="margin-bottom: 0">
              <label class="form-label">Catalog Description</label>
              <textarea v-model="form.description" class="form-control" rows="3" placeholder="Enter detailed product specifications and notes..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeModal">Cancel</button>
            <button class="btn btn-primary" @click="saveProduct" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              <span>{{ saving ? 'Saving...' : (showEditModal ? 'Update Product' : 'Create Product') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- AI Batch Catalog Studio Modal (Linear / Ramp Enterprise Modal) -->
    <Teleport to="body">
      <div v-if="showBatchModal" class="modal-overlay" @click.self="closeBatchModal">
        <div class="modal" style="max-width: 980px; width: 95%">
          <!-- Modal Header -->
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 10px">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; color: var(--primary-light)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
              <div>
                <div class="modal-title" style="display: flex; align-items: center; gap: 8px">
                  AI Batch Catalog Studio
                  <span class="badge badge-purple" style="font-size: 10px">Parallel Concurrency = 2</span>
                </div>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px">
                  Automated product catalog classification, description optimization, and stock health auditing
                </div>
              </div>
            </div>
            <button class="modal-close" @click="closeBatchModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body" style="max-height: 72vh; overflow-y: auto; padding: 18px 20px">
            <!-- Batch Execution Summary Metrics -->
            <div v-if="batchData" class="grid-4 mb-4">
              <div style="background: var(--bg-surface); padding: 12px; border-radius: 6px; border: 1px solid var(--border)">
                <div style="font-size: 10.5px; color: var(--text-muted); font-weight: 500">Products Processed</div>
                <div class="font-mono" style="font-size: 20px; font-weight: 700; color: var(--text-primary); margin-top: 2px">{{ batchData.items_processed }}</div>
              </div>
              <div style="background: var(--bg-surface); padding: 12px; border-radius: 6px; border: 1px solid var(--border)">
                <div style="font-size: 10.5px; color: var(--text-muted); font-weight: 500">Execution Duration</div>
                <div class="font-mono" style="font-size: 20px; font-weight: 700; color: var(--accent); margin-top: 2px">{{ batchData.duration_seconds }}s</div>
              </div>
              <div style="background: var(--bg-surface); padding: 12px; border-radius: 6px; border: 1px solid var(--border)">
                <div style="font-size: 10.5px; color: var(--text-muted); font-weight: 500">Discovered Refinements</div>
                <div style="font-size: 13px; font-weight: 600; color: var(--warning); margin-top: 6px">
                  {{ changedNameCount }} Names • {{ changedCategoryCount }} Categories
                </div>
              </div>
              <div style="background: var(--bg-surface); padding: 12px; border-radius: 6px; border: 1px solid var(--border)">
                <div style="font-size: 10.5px; color: var(--text-muted); font-weight: 500">Inference Engine</div>
                <div style="font-size: 12.5px; font-weight: 600; color: var(--success); margin-top: 6px">ChatOllama (1b)</div>
              </div>
            </div>

            <!-- Pre-run Empty State -->
            <div v-if="!batchData && !runningBatch" style="text-align: center; padding: 48px 16px; border: 1px dashed var(--border); border-radius: 8px; background: rgba(255,255,255,0.01)">
              <div style="width: 44px; height: 44px; border-radius: 8px; background: var(--bg-surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: var(--primary-light)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
              <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px">Run Automated Catalog Audit</div>
              <p style="font-size: 12.5px; color: var(--text-muted); max-width: 500px; margin: 0 auto 20px auto; line-height: 1.5">
                MeriBot will evaluate {{ store.products.length }} inventory catalog items in parallel, classifying categories, optimizing descriptions for search, and auditing restock thresholds.
              </p>
              <button class="btn btn-primary btn-lg" @click="runBatchAnalysis">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Start Batch Analysis</span>
              </button>
            </div>

            <!-- Running Analysis State -->
            <div v-if="runningBatch" style="text-align: center; padding: 50px 16px">
              <div class="spinner" style="width: 34px; height: 34px; border-width: 3px; margin: 0 auto 16px auto"></div>
              <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px">Auditing {{ store.products.length }} products in parallel...</div>
              <div style="font-size: 12.5px; color: var(--text-muted)">
                Evaluating product taxonomy, enhancing descriptions, and calculating restock risk...
              </div>
            </div>

            <!-- Batch Results Table -->
            <div v-if="batchData && !runningBatch">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
                <div style="font-size: 12.5px; font-weight: 600; color: var(--text-primary)">
                  Recommended Catalog Refinements:
                </div>
                <button class="btn btn-secondary btn-sm" @click="runBatchAnalysis">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  <span>Re-run Analysis</span>
                </button>
              </div>

              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 36px">
                        <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
                      </th>
                      <th>Product</th>
                      <th>Category (Current ➔ Suggested)</th>
                      <th>Optimized Catalog Description</th>
                      <th>Stock Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in batchData.results" :key="item.id">
                      <td>
                        <input type="checkbox" v-model="selectedItems[item.id]" />
                      </td>
                      <td>
                        <div v-if="item.has_name_change" style="margin-bottom: 3px">
                          <div style="font-size: 11px; color: var(--text-muted); text-decoration: line-through">{{ item.name }}</div>
                          <div class="td-primary" style="color: var(--accent); font-weight: 600">{{ item.suggested_name }}</div>
                          <span class="badge" style="background: rgba(56,189,248,0.1); color: var(--accent); font-size: 9px; padding: 1px 5px">
                            Name Refinement
                          </span>
                        </div>
                        <div v-else class="td-primary">{{ item.name }}</div>
                        <span class="font-mono" style="background: var(--bg-surface); padding: 1px 4px; border-radius: 3px; font-size: 10px; color: var(--text-muted)">
                          {{ item.sku }}
                        </span>
                        <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px">₹{{ item.unit_price }} • {{ item.quantity }} {{ item.unit }}</div>
                      </td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px">
                          <span class="badge badge-gray">{{ item.current_category }}</span>
                          <span style="color: var(--text-muted)">➔</span>
                          <span class="badge badge-purple" style="font-weight: 600">{{ item.suggested_category }}</span>
                        </div>
                        <div v-if="item.has_category_change" style="font-size: 9.5px; color: var(--warning); margin-top: 3px; font-weight: 500">
                          Re-categorization suggested
                        </div>
                      </td>
                      <td>
                        <div style="font-size: 11.5px; line-height: 1.4; color: var(--text-secondary); max-width: 280px">
                          {{ item.catalog_description }}
                        </div>
                      </td>
                      <td>
                        <div>
                          <span class="badge" :class="item.stock_status === 'Healthy' ? 'badge-success' : 'badge-danger'" style="font-size: 10px">
                            {{ item.stock_status }}
                          </span>
                        </div>
                        <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 4px; line-height: 1.3">
                          {{ item.recommendation }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer" style="justify-content: space-between">
            <div style="font-size: 12px; color: var(--text-muted)">
              <span v-if="batchData">{{ selectedCount }} of {{ batchData.items_processed }} product(s) selected</span>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-secondary" @click="closeBatchModal">Close</button>
              <button
                v-if="batchData"
                class="btn btn-primary"
                @click="applyBatchSuggestions"
                :disabled="applyingBatch || selectedCount === 0"
              >
                <span v-if="applyingBatch" class="spinner" style="width: 12px; height: 12px; border-width: 2px"></span>
                <span>{{ applyingBatch ? 'Applying Updates...' : `Apply Selected (${selectedCount}) to Database` }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useInventoryStore } from '../stores/index';
import { useAuthStore } from '../stores/auth.store';
import api from '../api/axios';

const store = useInventoryStore();
const authStore = useAuthStore();
const route = useRoute();

// State
const search = ref(route.query.search || '');
const filterCategory = ref('');
const showAddModal = ref(false);
const showEditModal = ref(false);
const saving = ref(false);
const editingId = ref(null);

// AI Batch Studio State
const showBatchModal = ref(false);
const runningBatch = ref(false);
const applyingBatch = ref(false);
const batchData = ref(null);
const selectedItems = ref({});
const selectAll = ref(true);

const form = ref({
  name: '', sku: '', category: 'electronics', unit: 'pcs',
  unit_price: '', quantity: '', reorder_level: 10, description: ''
});

const categories = ['electronics', 'furniture', 'office-supplies', 'it-hardware', 'raw-materials'];

const lowStockCount = computed(() => store.lowStockProducts.length);

const formatPrice = (val) => parseFloat(val || 0).toLocaleString('en-IN');

const stockPct = (p) => Math.min(100, (p.quantity / (p.reorder_level * 5)) * 100);
const stockColor = (p) => {
  if (p.quantity <= p.reorder_level) return 'var(--danger)';
  if (p.quantity <= p.reorder_level * 2) return 'var(--warning)';
  return 'var(--success)';
};

let searchTimer;
const debounceSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, 350);
};

const loadProducts = () => {
  store.fetchProducts({ search: search.value, category: filterCategory.value });
};

const openEdit = (product) => {
  form.value = { ...product };
  editingId.value = product.id;
  showEditModal.value = true;
};

const closeModal = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  editingId.value = null;
  form.value = { name: '', sku: '', category: 'electronics', unit: 'pcs', unit_price: '', quantity: '', reorder_level: 10, description: '' };
};

const saveProduct = async () => {
  saving.value = true;
  let result;
  if (showEditModal.value) {
    result = await store.updateProduct(editingId.value, form.value);
  } else {
    result = await store.createProduct(form.value);
  }
  saving.value = false;
  if (result?.success) closeModal();
  else alert(result?.message || 'Failed to save product');
};

const confirmDelete = async (product) => {
  if (confirm(`Delete "${product.name}"?`)) {
    await store.deleteProduct(product.id);
  }
};

const openBatchModal = () => {
  showBatchModal.value = true;
};

const closeBatchModal = () => {
  showBatchModal.value = false;
};

const selectedCount = computed(() => {
  return Object.values(selectedItems.value).filter(Boolean).length;
});

const changedCategoryCount = computed(() => {
  if (!batchData.value?.results) return 0;
  return batchData.value.results.filter(r => r.has_category_change).length;
});

const changedNameCount = computed(() => {
  if (!batchData.value?.results) return 0;
  return batchData.value.results.filter(r => r.has_name_change).length;
});

const toggleSelectAll = () => {
  if (!batchData.value?.results) return;
  for (const item of batchData.value.results) {
    selectedItems.value[item.id] = selectAll.value;
  }
};

const runBatchAnalysis = async () => {
  runningBatch.value = true;
  try {
    const { data } = await api.post('/inventory/ai-batch-analyze', {});
    batchData.value = data.data;
    selectedItems.value = {};
    for (const item of data.data.results) {
      selectedItems.value[item.id] = true;
    }
    selectAll.value = true;
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to run AI batch analysis');
  } finally {
    runningBatch.value = false;
  }
};

const applyBatchSuggestions = async () => {
  if (!batchData.value?.results) return;
  const updates = batchData.value.results
    .filter(item => selectedItems.value[item.id])
    .map(item => ({
      id: item.id,
      name: item.suggested_name,
      category: item.suggested_category,
      description: item.catalog_description
    }));

  if (updates.length === 0) return;

  applyingBatch.value = true;
  try {
    const { data } = await api.post('/inventory/ai-batch-apply', { updates });
    alert(`Success: ${data.message || 'Updated successfully!'}`);
    await store.fetchProducts();
    closeBatchModal();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to apply batch updates');
  } finally {
    applyingBatch.value = false;
  }
};

onMounted(() => loadProducts());
</script>

<style scoped>
.stock-bar {
  width: 44px;
  height: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.stock-bar::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: var(--pct);
  background: var(--color);
  border-radius: 2px;
  transition: width 0.4s ease;
}
</style>
