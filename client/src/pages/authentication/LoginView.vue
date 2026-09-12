<template>
  <div class="auth-container">
    <h2>Login</h2>
    <form @submit.prevent="handleLogin">
		<div>
			<label for="login">Username or Email</label>
			<input
				id="login"
				v-model="form.login"
				type="text"
				placeholder="Enter username or email"
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

      <button type="submit" :disabled="isLoading">{{ isLoading ? 'Signing in...' : 'Sign in' }}</button>
    </form>
    <router-link to="/register">Don't have an account? Register</router-link>
	<router-link to="/register">Forgot your password? Reset password</router-link>
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
	login: '',
	password: ''
})

async function handleLogin() {
	errorMessage.value = ''
	isLoading.value = true

	try {
		const response = await request('/auth/login', {
			method: 'POST',
			body: JSON.stringify(form)
		})

		router.push('/dashboard')
	} catch (err) {
		errorMessage.value = err.message || 'Login failed. Please try again.'
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