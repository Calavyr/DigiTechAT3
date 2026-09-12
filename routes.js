const express = require('express')
const router = express.Router()
const { fetchBookedTimes, createBooking, deleteBooking } = require('./controllers/bookingController')
const { registerUser, login, refreshToken, verifyAccessToken, resetPassword } = require('./controllers/authController')


router.get('/bookings', fetchBookedTimes)
router.post('/bookings', createBooking)
router.delete('/bookings', deleteBooking)

router.post('/auth/register', registerUser)
router.post('/auth/resetPassword', resetPassword)
router.post('/auth/login', login)
router.post('/auth/refresh', refreshToken)
router.get('/auth/me', (req, res) => {
    if (req.user) {
        return res.json({
            authenticated: true,
            user: { userId: req.user.userId, username: req.user.username, email: req.user.email}
        })
    }

    return res.status(401).json({ authenticated: false, message: 'Unauthorised' })
})

module.exports = router