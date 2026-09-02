<script setup lang="ts">
import BottomNav from './BottomNav.vue';

</script>

<template>
  <div class="study-view">
    <main class="study-content">
      <h1>Study</h1>
    </main>

    <BottomNav></BottomNav>
  </div>
</template>

<style scoped>
.study-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.study-content {
  flex: 1;
}
</style>