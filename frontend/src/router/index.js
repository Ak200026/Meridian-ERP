// ============================================================
// LEARN: Vue Router - Handles navigation in Vue SPA
// SPA = Single Page Application (no full page reloads)
// Router maps URL paths to Vue components
//
// Navigation Guards = "middleware" for routes
// They run before navigating and can redirect/cancel navigation
// ============================================================

import { createRouter, createWebHistory } from 'vue-router';

// Lazy loading: components load only when needed (better performance!)
// LEARN: () => import() is dynamic import = code splitting
const LoginView = () => import('../views/LoginView.vue');
const DashboardView = () => import('../views/DashboardView.vue');
const InventoryView = () => import('../views/InventoryView.vue');
const CustomersView = () => import('../views/CustomersView.vue');
const SalesView = () => import('../views/SalesView.vue');
const SuppliersView = () => import('../views/SuppliersView.vue');
const PurchaseView = () => import('../views/PurchaseView.vue');
const AiAssistantView = () => import('../views/AiAssistantView.vue');

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false, title: 'Login — Bizosuite ERP' }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: { requiresAuth: true, title: 'Dashboard — Bizosuite ERP' }
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: InventoryView,
    meta: { requiresAuth: true, title: 'Inventory — Bizosuite ERP' }
  },
  {
    path: '/customers',
    name: 'Customers',
    component: CustomersView,
    meta: { requiresAuth: true, title: 'Customers — Bizosuite ERP' }
  },
  {
    path: '/sales',
    name: 'Sales',
    component: SalesView,
    meta: { requiresAuth: true, title: 'Sales Invoices — Bizosuite ERP' }
  },
  {
    path: '/suppliers',
    name: 'Suppliers',
    component: SuppliersView,
    meta: { requiresAuth: true, title: 'Suppliers — Bizosuite ERP' }
  },
  {
    path: '/purchase',
    name: 'Purchase',
    component: PurchaseView,
    meta: { requiresAuth: true, title: 'Purchase Invoices — Bizosuite ERP' }
  },
  {
    path: '/ai-assistant',
    name: 'AiAssistant',
    component: AiAssistantView,
    meta: { requiresAuth: true, title: 'AI Assistant — Bizosuite ERP' }
  },
  // Catch all - redirect to home
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(), // HTML5 history mode (clean URLs without #)
  routes
});

// NAVIGATION GUARD
// Runs before every route change
// If route requires auth AND no token → redirect to login
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  document.title = to.meta.title || 'Bizosuite ERP';

  if (to.meta.requiresAuth !== false && !token) {
    next('/login');
  } else if (to.path === '/login' && token) {
    next('/'); // Already logged in → redirect to dashboard
  } else {
    next();
  }
});

export default router;
