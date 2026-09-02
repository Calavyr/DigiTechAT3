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
        await mongoose.connect(MONGO_URI, {
        })
        console.log("MongoDB connected succesfully")
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

app.use(gatekeeper)

app.use(express.static(path.join(__dirname, '..', 'client')))
app.get('/', (req, res) => {
    res.redirect('/login')
})

app.get('/verify/:id', (req, res, next) => {
    const id = req.params.id
    if (verificationEmailIds[id]) {
        const userData = verificationEmailIds[id]
        const email = userData.email
        const password = userData.password
        createUser(email, password)
        deleteVerificationEmailId(id)
    }
    res.redirect('/login')
})

app.get('/:page', (req, res, next) => {
    const page = req.params.page
    const pagePath = path.join(__dirname, '..', 'client', page, 'index.html')

    res.sendFile(pagePath, (err) => {
        if (err) {
            next()
        }
    })
})

app.use('/api', routes)

require('./controllers/websocketController').setupWebsockets(io)

app.use((req, res) => {
    res.status(404).send('Page not found')
})

const PORT = process.env.PORT
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))