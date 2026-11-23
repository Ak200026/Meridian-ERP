<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Customers</h1>
        <p class="page-desc">Manage client accounts, billing information, and GST credentials</p>
      </div>
      <div class="flex gap-2">
        <button @click="showCustomerModal = true" class="btn btn-primary" v-if="authStore.isManager">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>+ Add Customer</span>
        </button>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid-3 mb-6">
      <div class="stat-card">
        <div class="stat-icon purple">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div class="stat-value">{{ store.customers.length }}</div>
        <div class="stat-label">Total Registered Customers</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="stat-value">{{ gstRegisteredCount }}</div>
        <div class="stat-label">GST Registered Clients</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon cyan">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </div>
        <div class="stat-value">{{ contactAvailableCount }}</div>
        <div class="stat-label">Phone Verified Contacts</div>
      </div>
    </div>

    <!-- Search Toolbar -->
    <div class="card mb-4" style="padding: 14px 18px">
      <div class="flex gap-3 items-center">
        <div class="flex gap-2 items-center" style="flex: 1; position: relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); position: absolute; left: 12px; pointer-events: none">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="form-control"
            style="padding-left: 34px"
            placeholder="Search customers by company name, email, phone, or GST number..."
          />
        </div>
        <button @click="load" class="btn btn-secondary btn-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Customers Table -->
    <div class="card" style="padding: 0; overflow: hidden">
      <div v-if="loading" class="loading-overlay">
        <div class="spinner" style="width: 26px; height: 26px; border-width: 2.5px"></div>
        <span>Loading customer accounts...</span>
      </div>

      <div v-else class="table-wrapper" style="border: none; border-radius: 0">
        <table>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Billing Email</th>
              <th>Phone Number</th>
              <th>GST Number</th>
              <th>Registered Address</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filteredCustomers" :key="c.id">
              <td class="td-primary font-bold">
                <div style="display: flex; align-items: center; gap: 8px">
                  <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--bg-surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: var(--primary-light)">
                    {{ c.name?.substring(0, 2).toUpperCase() }}
                  </div>
                  <span>{{ c.name }}</span>
                </div>
              </td>
              <td>{{ c.email || '—' }}</td>
              <td class="font-mono" style="font-size: 12px">{{ c.phone || '—' }}</td>
              <td>
                <span v-if="c.gst_number" class="font-mono" style="font-size: 11px; background: var(--bg-surface); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); color: var(--text-secondary)">
                  {{ c.gst_number }}
                </span>
                <span v-else class="text-muted" style="font-size: 11px">Not Registered</span>
              </td>
              <td style="font-size: 12px; color: var(--text-muted); max-width: 260px" class="truncate">
                {{ c.address || '—' }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!filteredCustomers.length" class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3>No customers found</h3>
          <p>Add your first customer account or try a different search filter</p>
        </div>
      </div>
    </div>

    <!-- Add Customer Modal -->
    <Teleport to="body">
      <div v-if="showCustomerModal" class="modal-overlay" @click.self="showCustomerModal = false">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">Add Customer</div>
            <button class="modal-close" @click="showCustomerModal = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Company Name *</label>
              <input v-model="customerForm.name" class="form-control" placeholder="e.g. Apex Global Tech Solutions" required />
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Billing Email</label>
                <input v-model="customerForm.email" type="email" class="form-control" placeholder="billing@apextech.com" />
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input v-model="customerForm.phone" class="form-control" placeholder="+91 9876543210" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">GST Number</label>
              <input v-model="customerForm.gst_number" class="form-control" placeholder="e.g. 29AAAAA0000A1Z5" />
            </div>
            <div class="form-group" style="margin-bottom: 0">
              <label class="form-label">Registered Office Address</label>
              <textarea v-model="customerForm.address" class="form-control" rows="2" placeholder="Corporate billing address..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCustomerModal = false">Cancel</button>
            <button class="btn btn-primary" @click="addCustomer" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              <span>{{ saving ? 'Saving...' : 'Add Customer' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useSalesStore } from '../stores/index';
import { useAuthStore } from '../stores/auth.store';
import api from '../api/axios';

const store = useSalesStore();
const authStore = useAuthStore();
const loading = ref(false);
const saving = ref(false);
const searchQuery = ref('');
const showCustomerModal = ref(false);
const customerForm = ref({ name: '', email: '', phone: '', address: '', gst_number: '' });

const gstRegisteredCount = computed(() => {
  return store.customers.filter(c => c.gst_number && c.gst_number.trim().length > 0).length;
});

const contactAvailableCount = computed(() => {
  return store.customers.filter(c => c.phone && c.phone.trim().length > 0).length;
});

const filteredCustomers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return store.customers;
  return store.customers.filter(c => 
    (c.name && c.name.toLowerCase().includes(q)) ||
    (c.email && c.email.toLowerCase().includes(q)) ||
    (c.phone && c.phone.toLowerCase().includes(q)) ||
    (c.gst_number && c.gst_number.toLowerCase().includes(q))
  );
});

const load = async () => {
  loading.value = true;
  try {
    await store.fetchCustomers();
  } finally {
    loading.value = false;
  }
};

const addCustomer = async () => {
  if (!customerForm.value.name.trim()) {
    alert('Please enter a company name');
    return;
  }
  saving.value = true;
  try {
    await api.post('/sales/customers', customerForm.value);
    showCustomerModal.value = false;
    customerForm.value = { name: '', email: '', phone: '', address: '', gst_number: '' };
    await store.fetchCustomers();
  } catch (e) {
    alert(e.response?.data?.message || 'Failed to add customer');
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

