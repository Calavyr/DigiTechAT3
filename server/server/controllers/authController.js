const jwt = require('jsonwebtoken')
const fs = require('fs')
const User = require('../../models/user')
const { verificationEmailIds, addVerificationEmailId } = require('../shared/emailStore')
const { sendVerificationEmail } = require('./mailController')

exports.ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // Time-to-live: 15 Minutes
exports.REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60 // Time-to-live: 14 days

const COOKIE_SIGNED = true

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email: email, password: password })
        if (!user) {
            return res.status(401).send()
        }

        const accessToken = this.createAccessToken(email)
        const refreshToken = this.createRefreshToken(email)

        const baseCookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            signed: COOKIE_SIGNED
        }

        res.cookie('accessToken', accessToken, {
            ...baseCookieOptions,
            maxAge: this.ACCESS_TOKEN_TTL_SECONDS * 1000
        })

        res.cookie('refreshToken', refreshToken, {
            ...baseCookieOptions,
            maxAge: this.REFRESH_TOKEN_TTL_SECONDS * 1000
        })
        res.status(200).send()
    } catch (err) {
        console.error('Error logging user in: ', err)
        res.status(500).send()
    }
}

exports.registerUser = async (req, res) => { // Done
    try {
        const { email, password } = req.body
        
        let randomString = generateRandomString(20)
        while (verificationEmailIds[randomString]) {
            randomString = generateRandomString(20)
        }
        const verificationId = randomString

        addVerificationEmailId(verificationId, email, password)

        res.status(202).send()

        let succesfullySentEmail = await sendVerificationEmail(email, verificationId)
    } catch (err) {
        console.error('Error registering user: ', err)
        res.status(500).send()
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

        const email = decoded.sub

        const newAccessToken = this.createAccessToken(email)
        const newRefreshToken = this.createRefreshToken(email)

        const baseCookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            signed: COOKIE_SIGNED
        }

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

exports.createAccessToken = (email) => {
    return createToken(email, this.ACCESS_TOKEN_TTL_SECONDS)
}

exports.createRefreshToken = (email) => {
    return createToken(email, this.REFRESH_TOKEN_TTL_SECONDS)
}

exports.createUser = async (email, password) => {
    try {
        // Overwrite password if user already exists
        let user = await User.findOne({ email: email })

        if (user) {
            user.password = password
            await user.save()
        } else {
            let user = new User({
                email,
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

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}