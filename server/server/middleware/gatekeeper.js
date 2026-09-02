const authMiddleware = require('./authMiddleware')

const PUBLIC_PATHS = [
    '/',
    '/login',
    '/register',
    '/resetPassword',
    '/verify',
    '/api/auth',
    '/common.js',
    '/authPage.css',
    '/socket.io'
]

module.exports = (req, res, next) => {
    const path = req.path

    const isPublic = 
        PUBLIC_PATHS.includes(path) || 
        PUBLIC_PATHS.some(p => path.startsWith(p + '/')) // For /verify/:id, etc.

    if (isPublic) {
        return next()
    }
    return authMiddleware(req, res, next)
}