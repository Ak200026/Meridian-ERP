// ============================================================
// LEARN: Pinia = Vue 3's official state management library
// 
// WHAT IS STATE MANAGEMENT?
// When multiple components need the same data (e.g., current user),
// instead of passing it via props everywhere, we store it in a "store"
// that any component can access directly.
//
// Pinia vs Vuex: Pinia is simpler, no mutations, TypeScript-friendly
// 
// A store has:
// - state: the data (like component's data())
// - getters: computed values from state
// - actions: methods that can be async (call APIs, update state)
// ============================================================

import { defineStore } from 'pinia';
import api from '../api/axios';

export const useAuthStore = defineStore('auth', {
  // STATE: the single source of truth for auth data
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null
  }),

  // GETTERS: computed values (auto-update when state changes)
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isManager: (state) => ['admin', 'manager'].includes(state.user?.role),
    userInitials: (state) => {
      if (!state.user?.name) return 'U';
      return state.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
  },

  // ACTIONS: async methods that modify state
  actions: {
    async login(email, password) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post('/auth/login', { email, password });
        
        if (data.success) {
          this.user = data.data.user;
          this.token = data.data.token;
          
          // Persist to localStorage (survives page refresh)
          localStorage.setItem('token', this.token);
          localStorage.setItem('user', JSON.stringify(this.user));
          
          return { success: true };
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'Login failed';
        return { success: false, message: this.error };
      } finally {
        this.loading = false;
      }
    },

    async register(userData) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post('/auth/register', userData);
        if (data.success) {
          this.user = data.data.user;
          this.token = data.data.token;
          localStorage.setItem('token', this.token);
          localStorage.setItem('user', JSON.stringify(this.user));
          return { success: true, message: data.message };
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'Registration failed';
        return { success: false, message: this.error };
      } finally {
        this.loading = false;
      }
    },

    async forgotPassword(email) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post('/auth/forgot-password', { email });
        return { success: true, message: data.message };
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to request password reset';
        return { success: false, message: this.error };
      } finally {
        this.loading = false;
      }
    },

    async resetPassword(payload) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post('/auth/reset-password', payload);
        return { success: true, message: data.message };
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to reset password';
        return { success: false, message: this.error };
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
});
