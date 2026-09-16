<template>
  <div class="profile-container">
    <h2>Profile View</h2>
    <p>This page requires authentication and works offline!</p>
    <button @click="logout">Log out</button>
  </div>
</template>

<script setup>
import { authState } from '@/services/authState';
import { useRouter } from 'vue-router'
import { request } from '@/services/api.js'

const router = useRouter()

async function logout() {
  try {
    const response = await request('/auth/logout', {
      method: 'POST'
    })
    if (response.status == 200) {
      authState.logout()
      router.push('/login')
    }
  } catch(err) {
    console.error('Error logging user out: ', err)
  }
}
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