<template>
  <div class="auth-container">
    <h2>Create an Account</h2>
    <form @submit.prevent="handleRegistration">
      <div>
        <label for="email">Email</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          placeholder="Enter email"
          :disabled="isLoading"
          required
        />
      </div>

      <div>
        <label for="username">Username</label>
        <input
          id="username"
          v-model="form.username"
          type="text"
          placeholder="Enter username"
          :disabled="isLoading"
          @input="sanitizeUsername"
          required
        />
      </div>

      <div>
        <label for="password">Password</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          placeholder="Enter password"
          :disabled="isLoading"
          required
        />
      </div>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'Registering account...' : 'Register' }}
      </button>
    </form>
    <router-link to="/login">Already have an account? Log in</router-link>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '@/services/api.js'

const router = useRouter()

const isLoading = ref(false)
const errorMessage = ref('')

const form = reactive({
  email: '',
  username: '',
  password: ''
})

// 1. Proactive Input Filter: Strip spaces and symbols dynamically as they type
function sanitizeUsername(event) {
  // Replace anything that isn't a letter, number, or underscore with nothing
  form.username = event.target.value.replace(/[^a-zA-Z0-9_]/g, '')
}

async function handleRegistration() {
  errorMessage.value = ''
  
  // 2. Strict Pre-flight Check: Ensure username is valid before hitting network
  const usernameRegex = /^[a-zA-Z0-9_]+$/
  if (!usernameRegex.test(form.username)) {
    errorMessage.value = 'Username can only contain alphanumeric characters and underscores.'
    return
  }

  isLoading.value = true

  try {
    const response = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(form)
    })

    router.push({
      name: 'registered',
      query: {
        username: form.username,
        email: form.email
      }
    })
  } catch (err) {
    errorMessage.value = err.message || 'Registration failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.error-text {
  color: #ff3333;
  font-size: 0.9rem;
  margin: 10px 0;
}
input:disabled, button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>