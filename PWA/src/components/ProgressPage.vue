<script setup lang="ts">
import BottomNav from './BottomNav.vue';

</script>

<template>
  <div class="progress-view">
    <main class="progress-content">
      <h1>Progress</h1>
    </main>

    <BottomNav></BottomNav>
  </div>
</template>

<style scoped>
.progress-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.progress-content {
  flex: 1;
}
</style>