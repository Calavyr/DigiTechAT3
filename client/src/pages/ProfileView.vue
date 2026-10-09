<template>
  <div class="profile-container">
    <h2>Profile</h2>

    <section class="profile-section">
      <h3>Account information</h3>
      <dl v-if="authState.user" class="account-info">
        <div>
          <dt>Username</dt>
          <dd>{{ authState.user.username || 'Not available' }}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{{ authState.user.email || 'Not available' }}</dd>
        </div>
      </dl>
      <p v-else>Account information could not be loaded.</p>
    </section>

    <section class="profile-section">
      <h3>Account settings</h3>
      <p>To change your password, use the password reset page.</p>
      <router-link to="/reset-password">Reset password</router-link>
    </section>

    <section class="profile-section">
      <h3>Sign out</h3>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
      <button type="button" :disabled="isLoggingOut" @click="logout">
        {{ isLoggingOut ? 'Logging out…' : 'Log out' }}
      </button>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '@/services/api.js'
import { authState } from '@/services/authState.js'

const router = useRouter()
const isLoggingOut = ref(false)
const errorMessage = ref('')

async function logout() {
  isLoggingOut.value = true
  errorMessage.value = ''

  try {
    const response = await request('/auth/logout', {
      method: 'POST'
    })

    if (response.status === 200) {
      authState.logout()
      router.push('/login')
    }
  } catch (error) {
    errorMessage.value = error.message || 'Could not log out. Please try again.'
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: Arial, sans-serif;
}

.profile-section {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.account-info > div {
  margin-top: 12px;
}

.account-info dt {
  font-weight: bold;
}

.account-info dd {
  margin: 2px 0 0;
}

button {
  padding: 9px 14px;
  border: 0;
  border-radius: 6px;
  background: #eee;
  cursor: pointer;
}

button:disabled {
  opacity: .6;
  cursor: wait;
}

.error-message {
  color: #b42318;
}
</style>