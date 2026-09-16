const express = require('express')
const router = express.Router()
const { fetchUserHabitsByDate, fetchUserHabits, createHabit, getHabit, editHabit, deleteHabit, completeHabit, deleteHabitCompletion } = require('./controllers/habitController')
const { registerUser, login, logout, refreshToken, resetPassword } = require('./controllers/authController')

router.get('/habits/date/:date', fetchUserHabitsByDate)
router.get('/habits', fetchUserHabits)
router.post('/habits', createHabit)
router.get('/habits/:habitId', getHabit)
router.patch('/habits/:habitId', editHabit)
router.delete('/habits/:habitId', deleteHabit)

router.post('/habits/:habitId/completions', completeHabit)
router.delete('/habits/:habitId/completions/:date', deleteHabitCompletion)

router.post('/auth/register', registerUser)
router.post('/auth/resetPassword', resetPassword)
router.post('/auth/login', login)
router.post('/auth/logout', logout)
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