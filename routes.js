const express = require('express')
const router = express.Router()

const {
    fetchUserHabits,
    createHabit,
    getHabit,
    editHabit,
    deleteHabit,
    completeHabit,
    deleteHabitCompletion
} = require('./controllers/habitController')

const {
    registerUser,
    login,
    logout,
    refreshToken,
    resetPassword
} = require('./controllers/authController')

const {
    fetchUserSubjects,
    createSubject,
    getSubject,
    editSubject,
    deleteSubject
} = require('./controllers/subjectController')

const {
    startStudySession,
    endStudySession,
    fetchUserStudySessions,
    fetchActiveStudySession
} = require('./controllers/studySessionController')


// Habits

// Fetch habits and completions within a UTC timestamp range
router.get('/habits', fetchUserHabits)

router.post('/habits', createHabit)

router.get('/habits/:habitId', getHabit)

router.patch('/habits/:habitId', editHabit)

router.delete('/habits/:habitId', deleteHabit)


// Habit completions

router.post('/habits/:habitId/completions', completeHabit)

router.delete(
    '/habits/:habitId/completions/:completionId',
    deleteHabitCompletion
)


// Subjects

router.get('/subjects', fetchUserSubjects)

router.post('/subjects', createSubject)

router.get('/subjects/:subjectId', getSubject)

router.patch('/subjects/:subjectId', editSubject)

router.delete('/subjects/:subjectId', deleteSubject)


// Study sessions
router.post('/study/sessions', startStudySession)

router.post('/study/sessions/:sessionId/end', endStudySession)

router.get('/study/sessions', fetchUserStudySessions)


router.get(
    '/study/sessions/active',
    fetchActiveStudySession
)


// Authentication

router.post('/auth/register', registerUser)

router.post('/auth/resetPassword', resetPassword)

router.post('/auth/login', login)

router.post('/auth/logout', logout)

router.post('/auth/refresh', refreshToken)

router.get('/auth/me', (req, res) => {
    if (req.user) {
        return res.json({
            authenticated: true,
            user: {
                userId: req.user.userId,
                username: req.user.username,
                email: req.user.email
            }
        })
    }

    return res.status(401).json({
        authenticated: false,
        message: 'Unauthorised'
    })
})


module.exports = router