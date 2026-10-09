<template>
  <main class="study-groups-page">
    <header>
      <h2>Study groups</h2>
      <h3>{{ todayDate }}</h3>
    </header>
  </main>
</template>

<script setup>
const todayDate = new Date().toLocaleDateString('en-GB')
</script>

<style scoped>
.study-groups-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: Arial, sans-serif;
}

header h2 {
  margin: 0;
  font-size: 32px;
}

header h3 {
  margin: 6px 0 0;
  color: #666;
  font-weight: normal;
}
</style>
