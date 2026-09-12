<template>
  <div class="auth-container">
    <h2>Create an Account</h2>
    <form @submit.prevent="handlePasswordReset">
			<div>
				<label for="email">Email</label>
				<input
					id="email"
					v-model="form.email"
					type="text"
					placeholder="Enter email"
					:disabled="isLoading"
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
        {{ isLoading ? 'Resetting password...' : 'Reset password' }}
      </button>
    </form>
    <router-link to="/login">Remember your password? Log in</router-link>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '../../services/api.js'

const router = useRouter()

const isLoading = ref(false)
const errorMessage = ref('')

const form = reactive({
  email: '',
  password: ''
})

async function handlePasswordReset() {
  errorMessage.value = ''
  
  isLoading.value = true

  try {
    const response = await request('/auth/resetPassword', {
      method: 'POST',
      body: JSON.stringify(form)
    })

    router.push({
      name: 'registered',
      query: {
        username: response.username,
        email: form.email
      }
    })
  } catch (err) {
    errorMessage.value = err.message || 'Password reset failed. Please try again.'
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