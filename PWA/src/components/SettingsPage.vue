<script setup lang="ts">
import BottomNav from './BottomNav.vue';

</script>

<template>
  <div class="settings-view">
    <main class="settings-content">
      <h1>Settings</h1>
    </main>

    <BottomNav></BottomNav>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.settings-content {
  flex: 1;
}
</style>