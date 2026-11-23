<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Suppliers</h1>
        <p class="page-desc">Manage approved vendors, procurement contacts, and trade credentials</p>
      </div>
      <div class="flex gap-2">
        <button @click="showSupModal = true" class="btn btn-primary" v-if="authStore.isManager">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>+ Add Supplier</span>
        </button>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid-3 mb-6">
      <div class="stat-card">
        <div class="stat-icon purple">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        </div>
        <div class="stat-value">{{ suppliers.length }}</div>
        <div class="stat-label">Total Approved Suppliers</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="stat-value">{{ gstRegisteredCount }}</div>
        <div class="stat-label">GST Registered Vendors</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon cyan">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </div>
        <div class="stat-value">{{ phoneAvailableCount }}</div>
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
            placeholder="Search suppliers by vendor name, email, phone, or GST number..."
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

    <!-- Suppliers Table -->
    <div class="card" style="padding: 0; overflow: hidden">
      <div v-if="loading" class="loading-overlay">
        <div class="spinner" style="width: 26px; height: 26px; border-width: 2.5px"></div>
        <span>Loading suppliers...</span>
      </div>

      <div v-else class="table-wrapper" style="border: none; border-radius: 0">
        <table>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>GST No.</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filteredSuppliers" :key="s.id">
              <td class="td-primary font-bold">
                <div style="display: flex; align-items: center; gap: 8px">
                  <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--bg-surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: var(--accent)">
                    {{ s.name?.substring(0, 2).toUpperCase() }}
                  </div>
                  <span>{{ s.name }}</span>
                </div>
              </td>
              <td>{{ s.email || '—' }}</td>
              <td class="font-mono" style="font-size: 12px">{{ s.phone || '—' }}</td>
              <td>
                <span v-if="s.gst_number" class="font-mono" style="font-size: 11px; background: var(--bg-surface); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); color: var(--text-secondary)">
                  {{ s.gst_number }}
                </span>
                <span v-else class="text-muted" style="font-size: 11px">Not Registered</span>
              </td>
              <td style="font-size: 12px; color: var(--text-muted); max-width: 260px" class="truncate">
                {{ s.address || '—' }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!filteredSuppliers.length" class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <h3>No suppliers found</h3>
          <p>Register approved suppliers to create purchase orders</p>
        </div>
      </div>
    </div>

    <!-- Add Supplier Modal -->
    <Teleport to="body">
      <div v-if="showSupModal" class="modal-overlay" @click.self="showSupModal = false">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">Add Supplier</div>
            <button class="modal-close" @click="showSupModal = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Company Name *</label>
              <input v-model="supForm.name" class="form-control" placeholder="e.g. Apex Industrial Supplies Ltd." required />
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Email</label>
                <input v-model="supForm.email" type="email" class="form-control" placeholder="procure@apexsupplies.com" />
              </div>
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input v-model="supForm.phone" class="form-control" placeholder="+91 98765 12345" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">GST Number</label>
              <input v-model="supForm.gst_number" class="form-control" placeholder="33AAAAA0000A1Z5" />
            </div>
            <div class="form-group" style="margin-bottom: 0">
              <label class="form-label">Address</label>
              <textarea v-model="supForm.address" class="form-control" rows="2" placeholder="Supplier corporate address..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showSupModal = false">Cancel</button>
            <button class="btn btn-primary" @click="addSupplier" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              <span>{{ saving ? 'Saving...' : 'Add Supplier' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import api from '../api/axios';

const authStore = useAuthStore();
const loading = ref(false);
const saving = ref(false);
const suppliers = ref([]);
const searchQuery = ref('');
const showSupModal = ref(false);
const supForm = ref({ name: '', email: '', phone: '', address: '', gst_number: '' });

const gstRegisteredCount = computed(() => {
  return suppliers.value.filter(s => s.gst_number && s.gst_number.trim().length > 0).length;
});

const phoneAvailableCount = computed(() => {
  return suppliers.value.filter(s => s.phone && s.phone.trim().length > 0).length;
});

const filteredSuppliers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return suppliers.value;
  return suppliers.value.filter(s => 
    (s.name && s.name.toLowerCase().includes(q)) ||
    (s.email && s.email.toLowerCase().includes(q)) ||
    (s.phone && s.phone.toLowerCase().includes(q)) ||
    (s.gst_number && s.gst_number.toLowerCase().includes(q))
  );
});

const load = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/purchase/suppliers');
    suppliers.value = data.data || [];
  } catch (e) {
    console.error('Failed to load suppliers:', e);
  } finally {
    loading.value = false;
  }
};

const addSupplier = async () => {
  if (!supForm.value.name.trim()) {
    alert('Please enter a supplier company name');
    return;
  }
  saving.value = true;
  try {
    await api.post('/purchase/suppliers', supForm.value);
    showSupModal.value = false;
    supForm.value = { name: '', email: '', phone: '', address: '', gst_number: '' };
    await load();
  } catch (e) {
    alert(e.response?.data?.message || 'Failed to add supplier');
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

