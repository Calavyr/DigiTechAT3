import HomePage from '@/components/HomePage.vue'
import ProgressPage from '@/components/ProgressPage.vue'
import SettingsPage from '@/components/SettingsPage.vue'
import StudyPage from '@/components/StudyPage.vue'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage
  },
  {
    path: '/study',
    name: 'study',
    component: StudyPage
  },
  {
    path: '/progress',
    name: 'progress',
    component: ProgressPage
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router