const fs = require('fs')
const Booking = require('../models/booking')
const Booking = require('..')
const Habit = require('../models/habit')
const { liveUpdateBookingCreated, liveUpdateBookingDeleted } = require('./websocketController')
const { verifyAccessToken } = require('./authController')

exports.fetchUserHabits = async (req, res) => {
    try {
        const { userId } = req.query
        if (!userId) {
            return res.status(400).json({ code: 'NO_USER_ID' })
        }
        const decoded = verifyAccessToken(req, res)
        if (!decoded) return // Already responded if failed
        const habits = Habit.find({userId})
        if (!habits) {
            
        }
    } catch (err) {
        console.error('Error fetching user habits: ', err)
        res.status(500).send()
    }
    
}