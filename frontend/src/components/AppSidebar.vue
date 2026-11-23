<template>
  <aside class="sidebar">
    <!-- Brand Header -->
    <div class="sidebar-logo">
      <div class="logo-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
      </div>
      <div class="logo-text">
        <div class="logo-name">
          <span>Bizosuite</span>
          <span style="font-size: 9px; padding: 1px 4px; background: rgba(99,102,241,0.12); color: #818cf8; border-radius: 3px; font-weight: 600; letter-spacing: 0.05em">ERP</span>
        </div>
        <span class="logo-tagline">Enterprise Operating System</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <span class="nav-section-label">Main</span>

      <RouterLink 
        to="/" 
        class="nav-item"
        :class="{ active: route.path === '/' }"
      >
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </span>
        <span>Dashboard</span>
      </RouterLink>

      <RouterLink 
        to="/inventory" 
        class="nav-item"
        :class="{ active: route.path === '/inventory' }"
      >
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </span>
        <span>Inventory</span>
      </RouterLink>

      <RouterLink 
        to="/customers" 
        class="nav-item"
        :class="{ active: route.path === '/customers' }"
      >
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </span>
        <span>Customers</span>
      </RouterLink>

      <RouterLink 
        to="/sales" 
        class="nav-item"
        :class="{ active: route.path === '/sales' }"
      >
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </span>
        <span>Sales Invoices</span>
      </RouterLink>

      <RouterLink 
        to="/suppliers" 
        class="nav-item"
        :class="{ active: route.path === '/suppliers' }"
      >
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        </span>
        <span>Suppliers</span>
      </RouterLink>

      <RouterLink 
        to="/purchase" 
        class="nav-item"
        :class="{ active: route.path === '/purchase' }"
      >
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </span>
        <span>Purchase Invoices</span>
      </RouterLink>

      <span class="nav-section-label" style="margin-top: 14px">AI Features</span>

      <RouterLink 
        to="/ai-assistant" 
        class="nav-item"
        :class="{ active: route.path === '/ai-assistant' }"
      >
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
          </svg>
        </span>
        <span>AI Assistant</span>
        <span class="nav-badge accent">NEW</span>
      </RouterLink>
    </nav>

    <!-- User Profile Footer -->
    <div class="sidebar-footer">
      <div class="user-card" @click="handleLogout" title="Click to sign out">
        <div class="user-avatar">{{ authStore.userInitials }}</div>
        <div class="user-info">
          <div class="user-name">{{ authStore.user?.name || 'Authorized User' }}</div>
          <div class="user-role">{{ authStore.user?.role || 'Operator' }}</div>
        </div>
        <div style="color: var(--text-muted); display: flex; align-items: center" title="Log Out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>
