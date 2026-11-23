<template>
  <div id="app">
    <!-- App Layout (authenticated) -->
    <div v-if="isAuthenticated" class="app-layout">
      <!-- Sidebar -->
      <AppSidebar />
      
      <!-- Main area -->
      <div class="main-content">
        <!-- Topbar -->
        <AppTopbar />
        
        <!-- Page content with route transitions -->
        <div class="page-content">
          <RouterView v-slot="{ Component }">
            <Transition name="fade" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </div>
      </div>
    </div>

    <!-- Login page (not authenticated) -->
    <RouterView v-else />
  </div>
</template>

<script setup>
// ============================================================
// LEARN: Vue 3 Composition API with <script setup>
// 
// <script setup> is "syntactic sugar" - it automatically:
// 1. Makes everything you define available in the template
// 2. No need to return() anything
// 3. Works great with TypeScript
// ============================================================
import { computed } from 'vue';
import { RouterView } from 'vue-router';
import { useAuthStore } from './stores/auth.store';
import AppSidebar from './components/AppSidebar.vue';
import AppTopbar from './components/AppTopbar.vue';

const authStore = useAuthStore();

// computed() = reactive value that auto-updates when its dependencies change
const isAuthenticated = computed(() => authStore.isAuthenticated);
</script>
