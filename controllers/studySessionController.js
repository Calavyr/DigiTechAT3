const fs = require('fs')
const StudySession = require('../models/studySession.js')

exports.startStudySession = async (req, res) => {
    try {
        const { userId } = req.user
        const { subjectId, topic } = req.body
        
        if (str.trim().length == 0) { // Empty or all whitespace
            topic = undefined
        }

        const activeStudySession = await StudySession.findOne({
            userId,
            endedAt: null
        })

        if (activeStudySession) {
            return res.status(409).json({
                message: 'You already have an active study session'
            })
        }

        const studySession = new StudySession({ userId, subjectId, topic, startedAt: new Date() })
        await studySession.save()

        return res.status(201).json({ studySession })
    } catch (err) {
        console.error('Error starting study session: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}
exports.endStudySession = async (req, res) => {
    try {
        const { userId } = req.user
        const { sessionId } = req.params
        
        const studySession = await StudySession.findOne({ _id: sessionId, userId })
        if (studySession.endedAt != null) {
            return res.status(400).json({ message: 'Study session already ended' })
        }
        studySession.endedAt = new Date()
        studySession.duration = (studySession.endedAt - studySession.startedAt)/1000
        await studySession.save()

        return res.status(200).json({ studySession })    
    } catch (err) {
        console.error('Error ending study session: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}
exports.fetchUserStudySessions = async (req, res) => {
    try {
        const { userId } = req.user
        const { start, end } = req.query

        if (!start || !end) {
            return res.status(400).json({
                message: 'Start and end are required'
            })
        }

        const startedAt = new Date(start)
        const endedAt = new Date(end)

        if (
            Number.isNaN(startedAt.getTime()) ||
            Number.isNaN(endedAt.getTime())
        ) {
            return res.status(400).json({
                message: 'Invalid timestamp'
            })
        }

        if (startedAt >= endedAt) {
            return res.status(400).json({
                message: 'Start timestamp must be before end timestamp'
            })
        }

        const studySessions = await StudySession.find({
            userId,

            // Session started before the requested range ended
            startedAt: {
                $lt: endedAt
            },

            // Session ended after the requested range started,
            // or has not ended yet
            $or: [
                {
                    endedAt: {
                        $gte: startedAt
                    }
                },
                {
                    endedAt: null
                }
            ]
        })
        .sort({ startedAt: 1 })
        .lean({ virtuals: ['id'] })

        return res.status(200).json({ studySessions })
    } catch (err) {
        console.error('Error fetching study sessions: ', err)
        return res.status(500).json({
            message: 'Unexpected error on server'
        })
    }
}
exports.fetchActiveStudySession = async (req, res) => {
    try {
        const { userId } = req.user

        const studySession = await StudySession.findOne({
            userId,
            endedAt: null
        })
        .lean({ virtuals: ['id'] })

        return res.status(200).json({ studySession })
    } catch (err) {
        console.error('Error fetching active study session: ', err)
        return res.status(500).json({
            message: 'Unexpected error on server'
        })
    }
}