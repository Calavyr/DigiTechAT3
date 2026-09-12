const express = require('express')
const cookieParser = require('cookie-parser')
const http = require('http')
const socketIo = require('socket.io')
const routes = require('./routes')
const path = require('path')

const gatekeeper = require('./middleware/gatekeeper')

const mongoose = require('mongoose')
const { createUser } = require('./controllers/authController')

require('dotenv').config({ path: 'config.env' })

const MONGO_URI = process.env.MONGO_URI
const { verificationEmailIds, deleteVerificationEmailId } = require('./shared/emailStore')

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI, {})
        console.log("MongoDB connected successfully")
    } catch (error) {
        console.error("MongoDB connection error: ", error)
        process.exit(1)
    }
}
connectDB()

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

app.use(express.json())
app.use(cookieParser(process.env.COOKIE_SIGNATURE))

// Email verification path (Keep as an independent Express action)
app.get('/verify/:id', (req, res, next) => {
    const id = req.params.id
    if (verificationEmailIds[id]) {
        const userData = verificationEmailIds[id]
        const email = userData.email
        const username = userData.username
        const password = userData.password
        createUser(email, username, password)
        deleteVerificationEmailId(id)
    }
    // Redirect goes to /login, which will be caught by Vue Router down below
    res.redirect('/login')
})

// Gatekeeper placement: Protects the actual app shell, but ignores static files
app.use(gatekeeper)

// API routes must come before the Vue client static files and catch-all
app.use('/api', routes)

// Serve Vue asset files (JS, CSS, Manifest, Images)
app.use(express.static(path.join(__dirname, '.', 'client', 'dist'), {
    setHeaders: (res, filePath) => {
        // Essential PWA optimization: Prevent the Service Worker file from caching
        if (filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        }
    }
}))

// THE CATCH-ALL: Send the Vue single page shell for any other route
app.get('{*catchall}', (req, res) => {
    res.sendFile(path.join(__dirname, '.', 'client', 'dist', 'index.html'))
})


require('./controllers/websocketController').setupWebsockets(io)

// NOTE: The 404 handler is removed because the catch-all '*' fallback 
// passes page handling directly to Vue Router's own 404 pathing instead.

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))