const jwt = require('jsonwebtoken')
const fs = require('fs')
const { createAccessToken, createRefreshToken, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } = require('../controllers/authController')

const publicKey = fs.readFileSync('public.pem', 'utf8')

async function tryRefreshFromCookies(req, res) {
    const refreshToken = req.signedCookies.refreshToken
    if (!refreshToken) return false

    try {
        const decoded = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] })
        const email = decoded.sub

        const newAccessToken  = createAccessToken(email)
        const newRefreshToken = createRefreshToken(email)
        const baseCookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            signed: true
        }

        res.cookie('accessToken', newAccessToken, {
            ...baseCookieOptions,
            maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000
        })

        res.cookie('refreshToken', newRefreshToken, {
            ...baseCookieOptions,
            maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000
        })

        req.user = { email }
        return true
    } catch (err) {
        return false
    }
}

module.exports = async (req, res, next) => {
    const token = req.signedCookies.accessToken
    
    if (!token) {
        const refreshed = await tryRefreshFromCookies(req, res)

        if (refreshed) {
            return next()
        }

        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ code: 'NO_TOKEN' })
        }
        return res.redirect('/login')
    }

    jwt.verify(token, publicKey, { algorithms: ['RS256'] }, async (err, decoded) => {
        if (err) {
            if (req.originalUrl.startsWith('/api')) {
                const code = err.name === 'TokenExpiredError'
                    ? 'TOKEN_EXPIRED'
                    : 'INVALID_TOKEN'
                
                if (code === 'TOKEN_EXPIRED') {
                    const refreshed = await tryRefreshFromCookies(req, res)
                    if (refreshed) {
                        return next()
                    }
                }
                return res.status(401).json({ code })
            }
            return res.redirect('/login')
        }

        req.user = { email: decoded.sub }
        next()
    })
}