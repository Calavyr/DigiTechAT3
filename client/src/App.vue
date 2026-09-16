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

const route = useRoute()
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&display=swap');
* {
  font-family: 'Comfortaa';
}
</style>