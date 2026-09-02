const express = require('express')
const router = express.Router()
const { fetchBookedTimes, createBooking, deleteBooking } = require('./controllers/bookingController')
const { registerUser, login, refreshToken } = require('./controllers/authController')


router.get('/bookings', fetchBookedTimes)
router.post('/bookings', createBooking)
router.delete('/bookings', deleteBooking)

router.post('/auth/register', registerUser)
router.post('/auth/login', login)
router.post('/auth/refresh', refreshToken)

module.exports = router