<template>
  <div class="profile-container">
    <header class="page-header">
      <h2>Profile</h2>
      <h3>{{ todayDate }}</h3>
    </header>

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
      <button type="button" :disabled="isLoggingOut || isDeletingAccount" @click="logout">
        {{ isLoggingOut ? 'Logging out…' : 'Log out' }}
      </button>
    </section>

    <section class="profile-section danger-section">
      <h3>Delete account</h3>
      <p>This permanently deletes your account and personal study data.</p>
      <p v-if="deleteErrorMessage" class="error-message" role="alert">{{ deleteErrorMessage }}</p>
      <button type="button" :disabled="isLoggingOut || isDeletingAccount" @click="deleteAccount">
        {{ isDeletingAccount ? 'Deleting account…' : 'Delete account' }}
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
const isDeletingAccount = ref(false)
const errorMessage = ref('')
const deleteErrorMessage = ref('')
const todayDate = new Date().toLocaleDateString('en-GB')

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

async function deleteAccount() {
  const confirmed = confirm(
    'Delete your account permanently? Your account and personal study data will be removed.'
  )
  if (!confirmed) return

  isDeletingAccount.value = true
  deleteErrorMessage.value = ''

  try {
    await request('/auth/account', { method: 'DELETE' })
    authState.logout()
    await router.replace('/login')
  } catch (error) {
    deleteErrorMessage.value = error.message || 'Could not delete your account.'
  } finally {
    isDeletingAccount.value = false
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

.page-header h2 {
  margin: 0;
  font-size: 32px;
}

.page-header h3 {
  margin: 6px 0 0;
  color: #666;
  font-weight: normal;
}

.profile-section {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.danger-section button {
  background: #fdecea;
  color: #8c1d18;
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
