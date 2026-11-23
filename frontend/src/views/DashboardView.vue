<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Good {{ greeting }}, {{ firstName }}</h1>
        <p class="page-desc">Operational overview and real-time enterprise performance metrics.</p>
      </div>
      <div class="flex gap-2">
        <button @click="refresh" class="btn btn-secondary" :disabled="store.loading">
          <span v-if="store.loading" class="spinner"></span>
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>{{ store.loading ? 'Loading...' : 'Refresh' }}</span>
        </button>
        <RouterLink to="/ai-assistant">
          <button class="btn btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
            <span>Ask AI</span>
          </button>
        </RouterLink>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="store.loading && !store.stats" class="loading-overlay">
      <div class="spinner" style="width: 28px; height: 28px; border-width: 2.5px"></div>
      <span>Loading dashboard data...</span>
    </div>

    <template v-else>
      <!-- KPI Stat Cards (Ramp / Linear under-stated elegance) -->
      <div class="grid-4 mb-6">
        <!-- Total Products -->
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div class="stat-value">{{ store.stats?.totalProducts ?? '—' }}</div>
          <div class="stat-label">Total Products</div>
          <div class="stat-trend neutral">
            <span>In inventory</span>
          </div>
        </div>

        <!-- Low Stock Items -->
        <div class="stat-card">
          <div class="stat-icon" :class="(store.stats?.lowStockItems || 0) > 0 ? 'red' : 'green'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="stat-value" :style="{ color: (store.stats?.lowStockItems || 0) > 0 ? 'var(--danger)' : 'var(--text-primary)' }">
            {{ store.stats?.lowStockItems ?? '—' }}
          </div>
          <div class="stat-label">Low Stock Items</div>
          <div class="stat-trend" :class="(store.stats?.lowStockItems || 0) > 0 ? 'down' : 'up'">
            <span>{{ (store.stats?.lowStockItems || 0) > 0 ? 'Needs restocking' : 'All stocked' }}</span>
          </div>
        </div>

        <!-- Today's Orders -->
        <div class="stat-card">
          <div class="stat-icon cyan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <div class="stat-value">{{ store.stats?.todaysOrders ?? '—' }}</div>
          <div class="stat-label">Today's Orders</div>
          <div class="stat-trend neutral">
            <span>Logged today</span>
          </div>
        </div>

        <!-- Monthly Revenue -->
        <div class="stat-card">
          <div class="stat-icon green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div class="stat-value">
            ₹{{ formatCurrency(store.stats?.monthlyRevenue) }}
          </div>
          <div class="stat-label">Monthly Revenue</div>
          <div class="stat-trend neutral">
            <span>Current calendar month</span>
          </div>
        </div>
      </div>

      <!-- Core Content Grid -->
      <div class="grid-2 mb-6">
        <!-- Recent Orders Table -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Recent Orders</div>
              <div class="card-subtitle">Latest sales activity</div>
            </div>
            <RouterLink to="/sales">
              <button class="btn btn-secondary btn-sm">
                <span>View All →</span>
              </button>
            </RouterLink>
          </div>

          <div v-if="store.stats?.recentOrders?.length" class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in store.stats.recentOrders" :key="order.id">
                  <td class="td-primary">
                    <span class="font-mono" style="font-size: 12px">{{ order.order_number }}</span>
                  </td>
                  <td>{{ order.customer_name || 'N/A' }}</td>
                  <td class="td-primary font-mono">₹{{ formatCurrency(order.total_amount) }}</td>
                  <td>
                    <span class="badge" :class="getStatusBadge(order.status)">{{ order.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="empty-state">
            <div class="empty-state-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h3>No orders yet</h3>
            <p>Create your first sales order to see it here</p>
          </div>
        </div>

        <!-- AI Insights Panel -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">
                <span style="color: var(--primary-light)">AI Insights</span>
              </div>
              <div class="card-subtitle">Powered by AI analysis</div>
            </div>
            <RouterLink to="/ai-assistant">
              <button class="btn btn-primary btn-sm">
                <span>Chat →</span>
              </button>
            </RouterLink>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px">
            <div 
              v-for="insight in store.insights" 
              :key="insight.title"
              class="insight-card"
            >
              <div class="insight-icon" :class="insight.type">
                <svg v-if="insight.type === 'warning'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <svg v-else-if="insight.type === 'success'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div style="flex: 1">
                <div style="font-size: 12.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px">
                  {{ insight.title }}
                </div>
                <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4">
                  {{ insight.description }}
                </div>
              </div>
              <span class="badge" :class="`badge-${insight.type === 'warning' ? 'warning' : insight.type === 'success' ? 'success' : 'info'}`" style="font-size: 10px">
                {{ insight.priority }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Revenue Chart -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Revenue Overview</div>
            <div class="card-subtitle">Last 6 months performance</div>
          </div>
          <span v-if="chartBars.length" class="badge badge-gray font-mono">
            ₹{{ formatCurrency(totalPeriodRevenue) }} total
          </span>
          <span v-else class="badge badge-gray">No activity</span>
        </div>
        
        <!-- Precision Chart Bars -->
        <div v-if="chartBars.length" class="chart-bars">
          <div 
            v-for="(bar, i) in chartBars" 
            :key="i" 
            class="chart-bar-wrapper"
          >
            <div class="chart-bar-container" :title="`${bar.label}: ₹${formatCurrency(bar.revenue)} (${bar.orders} order${bar.orders === 1 ? '' : 's'})`">
              <div class="chart-bar" :style="{ height: bar.height + '%' }"></div>
            </div>
            <div class="chart-bar-label">{{ bar.label }}</div>
            <div class="chart-bar-value font-mono">₹{{ formatCurrency(bar.revenue) }}</div>
          </div>
        </div>

        <div v-else class="empty-chart-state">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); opacity: 0.6">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>No historical revenue recorded in this 6-month window</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useDashboardStore } from '../stores/index';
import { useAuthStore } from '../stores/auth.store';

const store = useDashboardStore();
const authStore = useAuthStore();

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
});

const firstName = computed(() => authStore.user?.name?.split(' ')[0] || 'there');

const formatCurrency = (value) => {
  if (!value && value !== 0) return '—';
  return parseFloat(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const getStatusBadge = (status) => {
  const map = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    shipped: 'badge-purple',
    delivered: 'badge-success',
    cancelled: 'badge-danger'
  };
  return map[status] || 'badge-gray';
};

const chartBars = computed(() => {
  const revData = store.charts?.monthlyRevenue || [];
  if (!revData.length) return [];
  const maxRevenue = Math.max(...revData.map(r => Number(r.revenue) || 0), 1);
  return revData.map(r => ({
    label: r.month,
    revenue: Number(r.revenue) || 0,
    orders: Number(r.orders) || 0,
    height: Math.max(Math.round(((Number(r.revenue) || 0) / maxRevenue) * 100), 12)
  }));
});

const totalPeriodRevenue = computed(() => {
  const revData = store.charts?.monthlyRevenue || [];
  return revData.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0);
});

const refresh = () => store.fetchStats();

onMounted(() => {
  store.fetchStats();
});
</script>

<style scoped>
.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  height: 120px;
  padding: 16px 4px 0;
}

.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 100%;
}

.chart-bar-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px 4px 0 0;
  padding: 0 4px;
}

.chart-bar {
  width: 100%;
  background: #6366f1;
  border-radius: 3px 3px 0 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  min-height: 4px;
  opacity: 0.85;
}

.chart-bar:hover {
  opacity: 1;
  background: #818cf8;
  filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.4));
}

.chart-bar-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.chart-bar-value {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}

.empty-chart-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 36px 16px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
