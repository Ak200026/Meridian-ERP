<template>
  <header class="topbar">
    <div class="topbar-title">
      <span style="color: var(--text-muted); font-size: 13px; font-weight: 500">Meridian</span>
      <span style="color: var(--border); font-size: 12px">/</span>
      <span>{{ pageTitle }}</span>
    </div>
    
    <!-- Search Bar (Linear / Ramp style) -->
    <div class="topbar-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); flex-shrink: 0">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input 
        v-model="searchQuery"
        type="text" 
        placeholder="Search products, orders, SKUs..."
        @keyup.enter="handleSearch"
      />
      <kbd class="kbd">↵</kbd>
    </div>

    <!-- Actions -->
    <div class="topbar-actions">
      <!-- Notifications -->
      <button class="topbar-btn" title="System Notifications" type="button">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <span class="notification-dot"></span>
      </button>

      <!-- AI Assistant Quick Launch -->
      <RouterLink to="/ai-assistant" class="topbar-btn" title="Launch MeriBot AI" style="border-color: rgba(99,102,241,0.3); color: var(--primary-light)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
        </svg>
      </RouterLink>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const searchQuery = ref('');

const pageTitles = {
  '/': 'Dashboard',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/sales': 'Sales Invoices',
  '/suppliers': 'Suppliers',
  '/purchase': 'Purchase Invoices',
  '/ai-assistant': 'AI Assistant'
};

const pageTitle = computed(() => pageTitles[route.path] || 'Enterprise System');

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/inventory', query: { search: searchQuery.value } });
  }
};
</script>
