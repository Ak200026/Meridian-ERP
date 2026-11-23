<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Purchase Invoices</h1>
        <p class="page-desc">Manage procurement orders, vendor invoices, and inward goods receipt</p>
      </div>
      <div class="flex gap-2">
        <button 
          v-if="authStore.isManager" 
          @click="openCreateModal" 
          class="btn btn-primary"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>+ New Purchase Invoice</span>
        </button>
        <RouterLink to="/suppliers">
          <button class="btn btn-secondary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>Suppliers →</span>
          </button>
        </RouterLink>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid-4 mb-6">
      <div class="stat-card">
        <div class="stat-icon purple">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </div>
        <div class="stat-value">{{ orders.length }}</div>
        <div class="stat-label">Total Purchase Orders</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon orange">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="stat-value">{{ pendingCount }}</div>
        <div class="stat-label">Awaiting Inbound Receipt</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="stat-value">{{ receivedCount }}</div>
        <div class="stat-label">Received &amp; Stocked</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon cyan">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div class="stat-value" style="font-size: 20px">₹{{ fmt(totalSpend) }}</div>
        <div class="stat-label">Total Procurement Value</div>
      </div>
    </div>

    <!-- PO Table -->
    <div class="card" style="padding: 0; overflow: hidden">
      <div class="card-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border); margin-bottom: 0">
        <div class="card-title">Purchase Orders &amp; Invoices</div>
        <button @click="load" class="btn btn-secondary btn-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div v-if="loading" class="loading-overlay">
        <div class="spinner" style="width: 26px; height: 26px; border-width: 2.5px"></div>
        <span>Loading purchase orders...</span>
      </div>

      <div v-else class="table-wrapper" style="border: none; border-radius: 0">
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Expected Date</th>
              <th v-if="authStore.isManager" style="text-align: right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="po in orders" :key="po.id">
              <td class="td-primary">
                <span class="font-mono" style="font-size: 12px; font-weight: 600">{{ po.order_number }}</span>
              </td>
              <td class="td-primary">{{ po.supplier_name }}</td>
              <td class="td-primary font-mono font-bold">₹{{ fmt(po.total_amount) }}</td>
              <td>
                <span class="badge" :class="statusBadge(po.status)">
                  <span style="width: 5px; height: 5px; border-radius: 50%; background: currentColor"></span>
                  <span>{{ po.status }}</span>
                </span>
              </td>
              <td style="font-size: 12px; color: var(--text-muted)">
                {{ po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }}
              </td>
              <td v-if="authStore.isManager" style="text-align: right">
                <button 
                  v-if="po.status !== 'received' && po.status !== 'cancelled'"
                  class="btn btn-success btn-sm"
                  @click="receiveGoods(po.id)"
                  title="Receive goods into inventory"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Receive</span>
                </button>
                <span v-else class="text-muted" style="font-size: 12px">
                  {{ po.status === 'received' ? 'Received' : 'Cancelled' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!orders.length" class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <h3>No purchase orders yet</h3>
          <p>Click "+ New Purchase Invoice" to generate an inward order</p>
        </div>
      </div>
    </div>

    <!-- Create Purchase Invoice Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal" style="max-width: 680px; width: 95%">
          <div class="modal-header">
            <div class="modal-title">Create New Purchase Invoice / PO</div>
            <button class="modal-close" @click="showCreateModal = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Supplier Selection & Date -->
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Select Vendor / Supplier *</label>
                <select v-model="poForm.supplier_id" class="form-control" required>
                  <option value="">-- Choose Supplier --</option>
                  <option v-for="s in suppliers" :key="s.id" :value="s.id">
                    {{ s.name }} {{ s.email ? `(${s.email})` : '' }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Expected Delivery Date</label>
                <input v-model="poForm.expected_date" type="date" class="form-control" />
              </div>
            </div>

            <!-- Line Items -->
            <div class="form-group" style="margin-top: 14px">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
                <label class="form-label" style="margin-bottom: 0">Purchase Order Items *</label>
                <button type="button" class="btn btn-secondary btn-sm" @click="addItem">
                  + Add Line Item
                </button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px">
                <div 
                  v-for="(item, idx) in poForm.items" 
                  :key="idx"
                  style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 8px; align-items: center; background: var(--bg-surface); padding: 8px; border-radius: 6px; border: 1px solid var(--border)"
                >
                  <!-- Product dropdown -->
                  <div>
                    <select v-model="item.product_id" class="form-control" style="font-size: 12px; padding: 6px 10px" @change="onProductChange(item)">
                      <option value="">-- Select Product --</option>
                      <option v-for="p in products" :key="p.id" :value="p.id">
                        {{ p.name }} (Current: {{ p.quantity }})
                      </option>
                    </select>
                  </div>

                  <!-- Quantity -->
                  <div>
                    <input 
                      v-model.number="item.quantity" 
                      type="number" 
                      min="1" 
                      class="form-control" 
                      placeholder="Qty" 
                      style="font-size: 12px; padding: 6px 10px" 
                    />
                  </div>

                  <!-- Unit Cost -->
                  <div>
                    <input 
                      v-model.number="item.unit_cost" 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      class="form-control font-mono" 
                      placeholder="Cost (₹)" 
                      style="font-size: 12px; padding: 6px 10px" 
                    />
                  </div>

                  <!-- Line Total -->
                  <div class="font-mono" style="font-size: 12px; font-weight: 600; color: var(--text-primary); text-align: right">
                    ₹{{ fmt(item.quantity * item.unit_cost) }}
                  </div>

                  <!-- Remove item -->
                  <div>
                    <button 
                      type="button" 
                      class="btn btn-danger btn-sm" 
                      style="padding: 4px 8px"
                      @click="removeItem(idx)"
                      :disabled="poForm.items.length <= 1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="form-group" style="margin-top: 14px">
              <label class="form-label">Procurement Terms / Notes</label>
              <textarea v-model="poForm.notes" class="form-control" rows="2" placeholder="e.g. Inbound freight included, payment due net 30 days upon receipt..."></textarea>
            </div>

            <!-- Total Preview -->
            <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 14px">
              <span style="font-size: 12.5px; font-weight: 600; color: var(--text-muted)">Total Procurement Commitment:</span>
              <span class="font-mono" style="font-size: 18px; font-weight: 700; color: var(--accent)">
                ₹{{ fmt(calculatedTotal) }}
              </span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCreateModal = false">Cancel</button>
            <button class="btn btn-primary" @click="submitPO" :disabled="submitting">
              <span v-if="submitting" class="spinner"></span>
              <span>{{ submitting ? 'Generating PO...' : 'Create Purchase Invoice' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import api from '../api/axios';

const authStore = useAuthStore();
const loading = ref(false);
const submitting = ref(false);
const orders = ref([]);
const suppliers = ref([]);
const products = ref([]);
const showCreateModal = ref(false);

const poForm = ref({
  supplier_id: '',
  items: [{ product_id: '', quantity: 1, unit_cost: 0 }],
  expected_date: '',
  notes: ''
});

const fmt = (v) => parseFloat(v || 0).toLocaleString('en-IN');

const pendingCount = computed(() => orders.value.filter(o => o.status === 'pending' || o.status === 'ordered').length);
const receivedCount = computed(() => orders.value.filter(o => o.status === 'received').length);
const totalSpend = computed(() => orders.value.reduce((acc, o) => acc + Number(o.total_amount || 0), 0));

const calculatedTotal = computed(() => {
  return poForm.value.items.reduce((sum, item) => {
    return sum + (Number(item.quantity || 0) * Number(item.unit_cost || 0));
  }, 0);
});

const statusBadge = (s) => ({
  pending: 'badge-warning', approved: 'badge-info', ordered: 'badge-purple',
  received: 'badge-success', cancelled: 'badge-danger'
}[s] || 'badge-gray');

const load = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/purchase/orders');
    orders.value = data.data || [];
  } catch (e) {
    console.error('Error fetching purchase orders:', e);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = async () => {
  poForm.value = {
    supplier_id: '',
    items: [{ product_id: '', quantity: 1, unit_cost: 0 }],
    expected_date: '',
    notes: ''
  };
  showCreateModal.value = true;
  try {
    const [supRes, prodRes] = await Promise.all([
      api.get('/purchase/suppliers'),
      api.get('/inventory/products')
    ]);
    suppliers.value = supRes.data.data || [];
    products.value = prodRes.data.data || [];
  } catch (e) {
    console.error('Failed to load suppliers or products:', e);
  }
};

const addItem = () => {
  poForm.value.items.push({ product_id: '', quantity: 1, unit_cost: 0 });
};

const removeItem = (idx) => {
  if (poForm.value.items.length > 1) {
    poForm.value.items.splice(idx, 1);
  }
};

const onProductChange = (item) => {
  const p = products.value.find(prod => prod.id === item.product_id);
  if (p) {
    // Default estimated cost (e.g. 70% of unit price or unit price)
    item.unit_cost = Number(p.unit_price || 0);
  }
};

const submitPO = async () => {
  if (!poForm.value.supplier_id) {
    alert('Please select a supplier');
    return;
  }
  const validItems = poForm.value.items.filter(i => i.product_id && i.quantity > 0);
  if (!validItems.length) {
    alert('Please select at least one product with valid quantity');
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      supplier_id: poForm.value.supplier_id,
      items: validItems.map(i => ({
        product_id: i.product_id,
        quantity: Number(i.quantity),
        unit_cost: Number(i.unit_cost)
      })),
      expected_date: poForm.value.expected_date || null,
      notes: poForm.value.notes
    };

    const { data } = await api.post('/purchase/orders', payload);
    if (data.success) {
      alert(`Purchase Invoice created successfully! (Ref: ${data.data.order_number})`);
      showCreateModal.value = false;
      await load();
    } else {
      alert(data.message || 'Failed to create purchase invoice');
    }
  } catch (err) {
    alert(err.response?.data?.message || 'Error creating purchase invoice');
  } finally {
    submitting.value = false;
  }
};

const receiveGoods = async (id) => {
  if (confirm('Mark this PO as received and update inventory?')) {
    try {
      await api.patch(`/purchase/orders/${id}/receive`);
      await load();
    } catch (e) {
      alert('Failed to receive goods');
    }
  }
};

onMounted(load);
</script>
