<template>
  <div id="app-shell">    
    <NavBar v-if="route?.name && route.name !== 'login' && route.name !== 'register' && route.name !== 'registered' && route.name !== 'reset-password'"></NavBar>

    <!-- Main Container where views are loaded dynamically -->
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'

// This creates a reactive reference to the current route layout safely
const route = useRoute()
</script>

<style>
/* App global layouts go here */
</style>