import { defineStore } from 'pinia';
import api from '../api/axios';

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    products: [],
    categories: [],
    loading: false,
    error: null,
    pagination: { page: 1, limit: 20, total: 0 }
  }),

  getters: {
    lowStockProducts: (state) => state.products.filter(p => p.quantity <= p.reorder_level),
    totalProducts: (state) => state.pagination.total
  },

  actions: {
    async fetchProducts(params = {}) {
      this.loading = true;
      try {
        const { data } = await api.get('/inventory/products', { params });
        this.products = data.data;
        this.pagination = data.pagination || this.pagination;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch products';
      } finally {
        this.loading = false;
      }
    },

    async createProduct(productData) {
      try {
        const { data } = await api.post('/inventory/products', productData);
        if (data.success) {
          this.products.unshift(data.data);
          return { success: true };
        }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || 'Failed to create product' };
      }
    },

    async updateProduct(id, productData) {
      try {
        const { data } = await api.put(`/inventory/products/${id}`, productData);
        if (data.success) {
          const index = this.products.findIndex(p => p.id === id);
          if (index !== -1) this.products[index] = data.data;
          return { success: true };
        }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || 'Failed to update product' };
      }
    },

    async deleteProduct(id) {
      try {
        await api.delete(`/inventory/products/${id}`);
        this.products = this.products.filter(p => p.id !== id);
        return { success: true };
      } catch (error) {
        return { success: false, message: error.response?.data?.message || 'Failed to delete product' };
      }
    }
  }
});

export const useSalesStore = defineStore('sales', {
  state: () => ({
    orders: [],
    customers: [],
    loading: false
  }),

  actions: {
    async fetchOrders(params = {}) {
      this.loading = true;
      try {
        const { data } = await api.get('/sales/orders', { params });
        this.orders = data.data;
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchCustomers() {
      try {
        const { data } = await api.get('/sales/customers');
        this.customers = data.data;
      } catch (error) {
        console.error(error);
      }
    },

    async createOrder(orderData) {
      try {
        const { data } = await api.post('/sales/orders', orderData);
        if (data.success) {
          this.orders.unshift(data.data);
          return { success: true, data: data.data };
        }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || 'Failed to create order' };
      }
    },

    async updateOrderStatus(id, status) {
      try {
        const { data } = await api.patch(`/sales/orders/${id}/status`, { status });
        if (data.success) {
          const index = this.orders.findIndex(o => o.id === id);
          if (index !== -1) this.orders[index] = data.data;
          return { success: true };
        }
      } catch (error) {
        return { success: false };
      }
    }
  }
});

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    stats: null,
    charts: null,
    insights: [],
    loading: false
  }),

  actions: {
    async fetchStats() {
      this.loading = true;
      try {
        const [statsRes, chartsRes, insightsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/charts'),
          api.get('/ai/insights')
        ]);
        this.stats = statsRes.data.data;
        this.charts = chartsRes.data.data;
        this.insights = insightsRes.data.data;
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        this.loading = false;
      }
    }
  }
});
