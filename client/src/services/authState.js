import { reactive } from 'vue'
import { request } from './api' // Your existing API fetch helper

export const authState = reactive({
  user: null,
  isInitialized: false, // Prevents checking the API on every single route change
  
  async checkAuth() {
    if (this.isInitialized) return this.user !== null

    try {
      // Call your Express backend to see if the current HttpOnly cookie is valid
      const data = await request('/auth/me', { method: 'GET' })
      this.user = data?.user || null // Expecting { user: { username: '...' } } or similar
    } catch (err) {
      this.user = null // Not logged in or expired cookie
    } finally {
      this.isInitialized = true
    }
    return this.user !== null
  },

  logout() {
    this.user = null
    this.isInitialized = false
  }
})
