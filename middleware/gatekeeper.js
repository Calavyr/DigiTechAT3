const authMiddleware = require('./authMiddleware')

const EXACT_PUBLIC_API_PATHS = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh'
]

const PUBLIC_VUE_ROUTES = [
    '/',
    '/login',
    '/register',
    '/registered',
    '/resetPassword'
]

module.exports = (req, res, next) => {
    const path = req.path

    // 1. Always allow compiled Vite assets, manifest, and service workers through
    if (
        path.startsWith('/assets/') || 
        path.startsWith('/workbox-') ||
        path === '/sw.js' || 
        path === '/registerSW.js' || 
        path === '/manifest.webmanifest' || 
        path === '/favicon.ico' ||
        path === '/icon.png' ||
        path.startsWith('/icons/')
    ) {
        return next()
    }

    if (path.startsWith('/verify/')) {
        return next()
    }

    if (EXACT_PUBLIC_API_PATHS.includes(path)) {
        return next()
    }

    if (path.startsWith('/socket.io/')) {
        return next()
    }

    const isPublicVueRoute = PUBLIC_VUE_ROUTES.some(p => path === p || path.startsWith(p + '/'))
    if (isPublicVueRoute) {
        return next()
    }

    return authMiddleware(req, res, next)
}
