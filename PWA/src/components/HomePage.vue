<script setup lang="ts">
import BottomNav from './BottomNav.vue';

</script>

<template>
  <div class="home-view">
    <main class="home-content">
      <h1>Home</h1>
    </main>

    <BottomNav></BottomNav>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.home-content {
  flex: 1;
}
</style>