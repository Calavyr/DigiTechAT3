import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './pages/authentication/LoginView.vue'
import NotFoundView from './pages/NotFoundView.vue'
import { authState } from './services/authState.js'

const routes = [
    {
        path: '/',
        redirect: '/login'
    },
    {
        path: '/login',
        name: 'login',
        component: LoginView,
        meta: { requiresAuth: false }
    },
    {
        path: '/register',
        name: 'register',
        component: () => import('./pages/authentication/RegisterView.vue'), // Lazy loaded for faster PWA initial loads
        meta: { requiresAuth: false }
    },
    {
        path: '/reset-password',
        name: 'resetPassword',
        component: () => import('./pages/authentication/PasswordResetView.vue'), // Lazy loaded for faster PWA initial loads
        meta: { requiresAuth: false }
    },
    {
        path: '/registered',
        name: 'registered',
        component: () => import('./pages/authentication/EmailVerificationView.vue'), // Lazy loaded for faster PWA initial loads
        meta: { requiresAuth: false }
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('./pages/DashboardView.vue'),
        meta: { requiresAuth: true }
    },
    { 
        path: '/habits', 
        name: 'habits', 
        component: () => import('./pages/HabitsView.vue'), 
        meta: { requiresAuth: true } 
    },
    { 
        path: '/study', 
        name: 'study', 
        component: () => import('./pages/StudyView.vue'), 
        meta: { requiresAuth: true } 
    },
    { 
        path: '/goals', 
        name: 'goals', 
        component: () => import('./pages/GoalsView.vue'), 
        meta: { requiresAuth: true } 
    },
    { 
        path: '/profile', 
        name: 'profile', 
        component: () => import('./pages/ProfileView.vue'), 
        meta: { requiresAuth: true } 
    },
    {
        path: '/:pathMatch(.*)*', // Catch-all 404 route for client paths
        name: 'not-found',
        component: NotFoundView
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})
router.beforeEach(async (to, from, next) => {
    const isAuthenticated = await authState.checkAuth()

    if (to.meta.requiresAuth && !isAuthenticated) {
        next({ name: 'login' })
    } else if (!to.meta.requiresAuth && isAuthenticated && (to.name === 'login' || to.name === 'register')) {
        next({ name: 'dashboard' })
    } else {
        next()
    }
})

export default router