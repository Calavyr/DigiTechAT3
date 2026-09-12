<template>
  <div class="confirmation-container">
    <h2>Verify Your Account</h2>
    
    <p>
      A verification email for <strong>{{ username }}</strong> 
      has been sent to <strong>{{ email }}</strong>.
    </p>

    <p>Please check your inbox and click the link to activate your account.</p>
    
    <router-link to="/login" class="btn">Back to Login</router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Safely extract parameters from the active URL query string
// Use fallback text if someone navigates to the URL manually without parameters
const username = computed(() => route.query.username || 'your account')
const email = computed(() => route.query.email || 'your inbox')
</script>

<style scoped>
.confirmation-container {
  max-width: 400px;
  margin: 50px auto;
  text-align: center;
}
strong {
  color: #42b983; /* Vue green or your primary app theme colour */
}
</style>