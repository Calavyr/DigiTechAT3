<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

interface NavItem {
  label: string
  path: string
  icon: string
}

const router = useRouter()
const route = useRoute()

const navItems: NavItem[] = [
  { label: 'Home', path: '/', icon: '🏠' },
  { label: 'Study', path: '/study', icon: '📚' },
  { label: 'Progress', path: '/progress', icon: '📈' },
  { label: 'Settings', path: '/settings', icon: '⚙️' },
]

function navigateTo(path: string): void {
  router.push(path)
}
</script>

<template>
  <nav class="bottom-nav">
    <button
      v-for="item in navItems"
      :key="item.path"
      class="nav-button"
      :class="{ active: (!route) || route.path === item.path }"
      @click="navigateTo(item.path)"
    >
      <span class="nav-icon">{{ item.icon }}</span>
      <span class="nav-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #e0e0e0;
  background: #fff;
  padding: 8px 0;
  padding-bottom: env(safe-area-inset-bottom, 8px);
}

.nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 6px 12px;
  cursor: pointer;
  color: #888;
  font-size: 12px;
}

.nav-button.active {
  color: #4f46e5;
}

.nav-icon {
  font-size: 20px;
}

.nav-label {
  font-size: 11px;
}
</style>