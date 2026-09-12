const jwt = require('jsonwebtoken')
const fs = require('fs')
const User = require('../models/user')
const { createAccessToken, createRefreshToken, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } = require('../controllers/authController')

const publicKey = fs.readFileSync('public.pem', 'utf8')

async function tryRefreshFromCookies(req, res) {
    const refreshToken = req.signedCookies.refreshToken
    if (!refreshToken) return false

    try {
        const decoded = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] })
        const userId = decoded.sub

        const newAccessToken  = createAccessToken(userId)
        const newRefreshToken = createRefreshToken(userId)
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
        
        let user
        try {
            user = User.findById(userId)
            if (!user) {
                throw new Error(`User not found from userId ${userId}`)
            }
        } catch (err) {
            console.error('Error fetching user: ', err)
        }
        
        req.user = { userId: userId, email: user?.email, username: user?.username }
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

        const userId = decoded.sub

        let user
        try {
            user = await User.findById(userId)
            if (!user) {
                throw new Error(`User not found from userId ${userId}`)
            }
        } catch (err) {
            console.error('Error fetching user: ', err)
        }
        
        req.user = { userId: userId, email: user?.email, username: user?.username }
        next()
    })
}