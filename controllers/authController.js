const jwt = require('jsonwebtoken')
const fs = require('fs')
const User = require('../models/user')
const { verificationEmailIds, addVerificationEmailId } = require('../shared/emailStore')
const { sendVerificationEmail } = require('./mailController')

exports.ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // Time-to-live: 15 Minutes
exports.REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60 // Time-to-live: 14 days

const baseCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    signed: true
}

exports.login = async (req, res) => {
    try {
        const { login, password } = req.body

        let user
        if (login.includes('@')) {
            user = await User.findOne({ email: login, password: password })
        } else {
            user = await User.findOne({ username: login, password: password })
        }

        if (!user) {
            return res.status(401).json({ message: 'Error fetching user from login details' })
        }

        const accessToken = this.createAccessToken(user.id)
        const refreshToken = this.createRefreshToken(user.id)

        res.cookie('accessToken', accessToken, {
            ...baseCookieOptions,
            maxAge: this.ACCESS_TOKEN_TTL_SECONDS * 1000
        })

        res.cookie('refreshToken', refreshToken, {
            ...baseCookieOptions,
            maxAge: this.REFRESH_TOKEN_TTL_SECONDS * 1000
        })
        res.status(200).json({ userId: user.id, username: user.username, email: user.email})
    } catch (err) {
        console.error('Error logging user in: ', err)
        res.status(500).json({ message: 'Unexpected error logging user in' })
    }
}

exports.logout = async (req, res) => {
    try {
        res.clearCookie('accessToken', baseCookieOptions)
        res.clearCookie('refreshToken', baseCookieOptions)
        
        res.status(200).json({ message: 'Logged out successfully' })
    } catch (err) {
        console.error('Error logging user out: , err')
        res.status(500).json({ message: 'Unexpected error logging user out' })
    }
}

exports.registerUser = async (req, res) => {
    try {
        const { email, username, password } = req.body

        // Enforce character constraints: letters, numbers, and underscores only
        const usernameRegex = /^[a-zA-Z0-9_]+$/
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ 
                message: 'Username can only contain alphanumeric characters and underscores. No spaces or special symbols allowed.' 
            })
        }

        let randomString = generateRandomString(20)
        while (verificationEmailIds[randomString]) {
            randomString = generateRandomString(20)
        }
        const verificationId = randomString

        addVerificationEmailId(verificationId, email, username, password)

        // Return a JSON confirmation block so client-side parsing doesn't break
        res.status(202).json({ message: 'Verification email processing initiated.' })
        
        let succesfullySentEmail = await sendVerificationEmail(email, verificationId)
    } catch (err) {
        console.error('Error registering user: ', err)
        res.status(500).json({ message: 'Internal server error during registration.' })
    }
}

exports.resetPassword = async (req, res) => {
    try {
        const { email, password } = req.body
        
        let user = User.findOne({ email: email })

        if (!user) {
            return res.status(404).json({ message: 'User account not found from email.' })
        }

        let username = user.username

        let randomString = generateRandomString(20)
        while (verificationEmailIds[randomString]) {
            randomString = generateRandomString(20)
        }
        const verificationId = randomString

        addVerificationEmailId(verificationId, email, username, newPassword)

        // Return a JSON confirmation block so client-side parsing doesn't break
        res.status(202).json({ message: 'Verification email processing initiated.', username: username })
        
        let succesfullySentEmail = await sendVerificationEmail(email, verificationId)
    } catch (err) {
        console.error('Error resetting user password: ', err)
        res.status(500).json({ message: 'Internal server error during password reset.' })
    }
}


exports.refreshToken = async (req, res) => {
    const refreshToken = req.signedCookies.refreshToken
    if (!refreshToken) {
        return res.status(401).json({ code: 'NO_REFRESH' })
    }
    
    try {
        const publicKey = fs.readFileSync('public.pem', 'utf8')
        const decoded = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] })

        const userId = decoded.sub

        const newAccessToken = this.createAccessToken(userId)
        const newRefreshToken = this.createRefreshToken(userId)

        res.cookie('accessToken', newAccessToken, {
            ...baseCookieOptions,
            maxAge: this.ACCESS_TOKEN_TTL_SECONDS * 1000
        })

        res.cookie('refreshToken', newRefreshToken, {
            ...baseCookieOptions,
            maxAge: this.REFRESH_TOKEN_TTL_SECONDS * 1000
        })
        res.status(200).send()
    } catch (err) {
        console.error('Error refreshing token: ', err)
        res.status(401).json({ code: 'REFRESH_INVALID' })
    }
}

function createToken(subject, ttlSeconds) { // Done
    const privateKey = fs.readFileSync('private.pem', 'utf8')
    const nowSeconds = Math.floor(Date.now() / 1000)

    const payload = {
        sub: subject,
        iat: nowSeconds,
        exp: nowSeconds + ttlSeconds
    }
    const signOptions = {
        algorithm: 'RS256'
    }
    
    return jwt.sign(payload, privateKey, signOptions);
}

exports.createAccessToken = (userId) => {
    return createToken(userId, this.ACCESS_TOKEN_TTL_SECONDS)
}

exports.createRefreshToken = (userId) => {
    return createToken(userId, this.REFRESH_TOKEN_TTL_SECONDS)
}

exports.createUser = async (email, username, password) => {
    try {
        // Overwrite password if user already exists
        let user = await User.findOne({ $or: [{email}, {username}] })

        if (user) {
            user.password = password
            await user.save()
        } else {
            let user = new User({
                email,
                username,
                password
            })
            await user.save()
        }

        return true
    } catch (err) {
        console.error('Error creating account: ', err)
        return false
    }
}

exports.verifyAccessToken = (req, res) => {
    const token = req.signedCookies.accessToken
    if (!token) {
        res.status(401).send()
        return null
    }

    try {
        const publicKey = fs.readFileSync('public.pem', 'utf8')
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] })
        return decoded
    } catch (err) {
        console.error('Error verifying token: ', err)
        res.status(403).send()
        return null
    }
}

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}