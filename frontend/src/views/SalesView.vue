<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Sales Invoices</h1>
        <p class="page-desc">Manage sales orders, customer invoices, and fulfillment tracking</p>
      </div>
      <div class="flex gap-2">
        <select v-model="statusFilter" class="form-control" style="max-width: 150px" @change="load">
          <option value="">All Status</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ capitalize(s) }}</option>
        </select>
        <button 
          v-if="authStore.isManager" 
          @click="openCreateModal" 
          class="btn btn-primary"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>+ New Sale Invoice</span>
        </button>
        <RouterLink to="/customers">
          <button class="btn btn-secondary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
            <span>Customers →</span>
          </button>
        </RouterLink>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid-4 mb-6">
      <div class="stat-card">
        <div class="stat-icon purple">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <div class="stat-value">{{ store.orders.length }}</div>
        <div class="stat-label">Total Invoices</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon orange">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="stat-value">{{ store.orders.filter(o => o.status === 'pending').length }}</div>
        <div class="stat-label">Pending Approval</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="stat-value">{{ store.orders.filter(o => o.status === 'delivered').length }}</div>
        <div class="stat-label">Delivered &amp; Paid</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon red">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <div class="stat-value">{{ store.orders.filter(o => o.status === 'cancelled').length }}</div>
        <div class="stat-label">Cancelled Invoices</div>
      </div>
    </div>

    <!-- Orders Table -->
    <div class="card" style="padding: 0; overflow: hidden">
      <div class="card-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border); margin-bottom: 0">
        <div class="card-title">Sales Orders &amp; Invoices</div>
        <button @click="load" class="btn btn-secondary btn-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div v-if="store.loading" class="loading-overlay">
        <div class="spinner" style="width: 26px; height: 26px; border-width: 2.5px"></div>
        <span>Loading sales invoices...</span>
      </div>

      <div v-else class="table-wrapper" style="border: none; border-radius: 0">
        <table>
          <thead>
            <tr>
              <th>Invoice / Order #</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th v-if="authStore.isManager">Update Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in store.orders" :key="order.id">
              <td class="td-primary">
                <span class="font-mono" style="font-size: 12px; font-weight: 600">{{ order.order_number }}</span>
              </td>
              <td>
                <div class="td-primary">{{ order.customer_name || 'Unknown' }}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 1px">{{ order.customer_email }}</div>
              </td>
              <td class="td-primary font-mono font-bold">₹{{ formatAmount(order.total_amount) }}</td>
              <td>
                <span class="badge" :class="statusBadge(order.status)">
                  <span style="width: 5px; height: 5px; border-radius: 50%; background: currentColor"></span>
                  <span>{{ order.status }}</span>
                </span>
              </td>
              <td style="font-size: 12px; color: var(--text-muted)">{{ formatDate(order.created_at) }}</td>
              <td v-if="authStore.isManager">
                <select 
                  class="form-control" 
                  style="max-width: 130px; padding: 4px 8px; font-size: 11.5px"
                  :value="order.status"
                  @change="updateStatus(order.id, $event.target.value)"
                  :disabled="['delivered', 'cancelled'].includes(order.status)"
                >
                  <option v-for="s in statuses" :key="s" :value="s">{{ capitalize(s) }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!store.orders.length" class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <h3>No sales orders found</h3>
          <p>Click "+ New Sale Invoice" to create your first order</p>
        </div>
      </div>
    </div>

    <!-- Create Sale Invoice Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal" style="max-width: 680px; width: 95%">
          <div class="modal-header">
            <div class="modal-title">Create New Sale Invoice</div>
            <button class="modal-close" @click="showCreateModal = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Customer Selection -->
            <div class="form-group">
              <label class="form-label">Select Customer *</label>
              <select v-model="orderForm.customer_id" class="form-control" required>
                <option value="">-- Choose Customer --</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">
                  {{ c.name }} {{ c.email ? `(${c.email})` : '' }}
                </option>
              </select>
            </div>

            <!-- Line Items -->
            <div class="form-group" style="margin-top: 18px">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
                <label class="form-label" style="margin-bottom: 0">Invoice Line Items *</label>
                <button type="button" class="btn btn-secondary btn-sm" @click="addItem">
                  + Add Line Item
                </button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px">
                <div 
                  v-for="(item, idx) in orderForm.items" 
                  :key="idx"
                  style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 8px; align-items: center; background: var(--bg-surface); padding: 8px; border-radius: 6px; border: 1px solid var(--border)"
                >
                  <!-- Product dropdown -->
                  <div>
                    <select v-model="item.product_id" class="form-control" style="font-size: 12px; padding: 6px 10px" @change="onProductChange(item)">
                      <option value="">-- Select Product --</option>
                      <option v-for="p in products" :key="p.id" :value="p.id">
                        {{ p.name }} (Stock: {{ p.quantity }})
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

                  <!-- Unit Price -->
                  <div>
                    <input 
                      v-model.number="item.unit_price" 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      class="form-control font-mono" 
                      placeholder="Price (₹)" 
                      style="font-size: 12px; padding: 6px 10px" 
                    />
                  </div>

                  <!-- Line Total -->
                  <div class="font-mono" style="font-size: 12px; font-weight: 600; color: var(--text-primary); text-align: right">
                    ₹{{ formatAmount(item.quantity * item.unit_price) }}
                  </div>

                  <!-- Remove item -->
                  <div>
                    <button 
                      type="button" 
                      class="btn btn-danger btn-sm" 
                      style="padding: 4px 8px"
                      @click="removeItem(idx)"
                      :disabled="orderForm.items.length <= 1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="form-group" style="margin-top: 14px">
              <label class="form-label">Order Notes / Terms</label>
              <textarea v-model="orderForm.notes" class="form-control" rows="2" placeholder="e.g. Standard 30-day payment term, dispatch via road logistics..."></textarea>
            </div>

            <!-- Total Preview -->
            <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 14px">
              <span style="font-size: 12.5px; font-weight: 600; color: var(--text-muted)">Grand Invoice Total:</span>
              <span class="font-mono" style="font-size: 18px; font-weight: 700; color: var(--success)">
                ₹{{ formatAmount(calculatedTotal) }}
              </span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCreateModal = false">Cancel</button>
            <button class="btn btn-primary" @click="submitOrder" :disabled="submitting">
              <span v-if="submitting" class="spinner"></span>
              <span>{{ submitting ? 'Generating Invoice...' : 'Generate Sale Invoice' }}</span>
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
import { useSalesStore } from '../stores/index';
import { useAuthStore } from '../stores/auth.store';
import api from '../api/axios';

const store = useSalesStore();
const authStore = useAuthStore();
const statusFilter = ref('');

const showCreateModal = ref(false);
const submitting = ref(false);
const customers = ref([]);
const products = ref([]);

const orderForm = ref({
  customer_id: '',
  items: [
    { product_id: '', quantity: 1, unit_price: 0 }
  ],
  notes: ''
});

const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const statusBadge = (s) => ({
  pending: 'badge-warning', confirmed: 'badge-info', shipped: 'badge-purple',
  delivered: 'badge-success', cancelled: 'badge-danger'
}[s] || 'badge-gray');

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const formatAmount = (v) => parseFloat(v || 0).toLocaleString('en-IN');
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const calculatedTotal = computed(() => {
  return orderForm.value.items.reduce((sum, item) => {
    return sum + (Number(item.quantity || 0) * Number(item.unit_price || 0));
  }, 0);
});

const load = () => {
  store.fetchOrders({ status: statusFilter.value });
};

const updateStatus = async (id, status) => {
  await store.updateOrderStatus(id, status);
};

const openCreateModal = async () => {
  orderForm.value = {
    customer_id: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0 }],
    notes: ''
  };
  showCreateModal.value = true;
  try {
    const [custRes, prodRes] = await Promise.all([
      api.get('/sales/customers'),
      api.get('/inventory/products')
    ]);
    customers.value = custRes.data.data || [];
    products.value = prodRes.data.data || [];
  } catch (e) {
    console.error('Failed to load customers or products:', e);
  }
};

const addItem = () => {
  orderForm.value.items.push({ product_id: '', quantity: 1, unit_price: 0 });
};

const removeItem = (idx) => {
  if (orderForm.value.items.length > 1) {
    orderForm.value.items.splice(idx, 1);
  }
};

const onProductChange = (item) => {
  const p = products.value.find(prod => prod.id === item.product_id);
  if (p) {
    item.unit_price = Number(p.unit_price || 0);
  }
};

const submitOrder = async () => {
  if (!orderForm.value.customer_id) {
    alert('Please select a customer');
    return;
  }
  const validItems = orderForm.value.items.filter(i => i.product_id && i.quantity > 0);
  if (!validItems.length) {
    alert('Please select at least one product with valid quantity');
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      customer_id: orderForm.value.customer_id,
      items: validItems.map(i => ({
        product_id: i.product_id,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price)
      })),
      notes: orderForm.value.notes
    };

    const res = await store.createOrder(payload);
    if (res.success) {
      alert(`Sale Invoice created successfully! (Ref: ${res.data.order_number})`);
      showCreateModal.value = false;
      await load();
    } else {
      alert(res.message || 'Failed to create sale invoice');
    }
  } catch (err) {
    alert(err.response?.data?.message || 'Error creating sale invoice');
  } finally {
    submitting.value = false;
  }
};

onMounted(load);
</script>
