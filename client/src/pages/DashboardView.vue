<template>
  <div class="dashboard-container">
    <h2>Welcome {{ authState.user ? authState.user.username : 'user' }}</h2>
    
    <div>

    </div>
    <div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '@/services/api'
import { authState } from '@/services/authState'

const router = useRouter()


</script>

<style scoped>
div#navBar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 5vh;
  background-color: '#4a4359'
}
</style>