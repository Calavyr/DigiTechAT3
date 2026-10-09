const fs = require('fs')
const StudySession = require('../models/studySession.js')
const Subject = require('../models/subject.js')

exports.startStudySession = async (req, res) => {
    try {
        const { userId } = req.user
        const { subjectId } = req.body
        const topic = typeof req.body.topic === 'string' && req.body.topic.trim()
            ? req.body.topic.trim()
            : undefined

        if (!subjectId) {
            return res.status(400).json({ message: 'A subject is required to start a study session' })
        }

        const subject = await Subject.findOne({ _id: subjectId, userId })
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' })
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
        if (!studySession) {
            return res.status(404).json({ message: 'Study session not found' })
        }
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

exports.fetchStudyStats = async (req, res) => {
    try {
        const { userId } = req.user
        const { start, end } = req.query

        if (!start || !end) {
            return res.status(400).json({ message: 'Start and end are required' })
        }

        const rangeStart = new Date(start)
        const rangeEnd = new Date(end)
        if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
            return res.status(400).json({ message: 'Invalid timestamp' })
        }
        if (rangeStart >= rangeEnd) {
            return res.status(400).json({ message: 'Start timestamp must be before end timestamp' })
        }

        const sessions = await StudySession.find({
            userId,
            startedAt: { $lt: rangeEnd },
            $or: [
                { endedAt: { $gt: rangeStart } },
                { endedAt: null }
            ]
        }).sort({ startedAt: 1 }).lean()

        const userSubjects = await Subject.find({ userId }).select('_id name').lean()
        const subjectNames = new Map(userSubjects.map(subject => [subject._id.toString(), subject.name]))
        const now = new Date()
        const bySubject = new Map()
        const byDay = new Map()
        let totalStudyTime = 0
        let sessionCount = 0

        for (const session of sessions) {
            const clippedStart = Math.max(new Date(session.startedAt).getTime(), rangeStart.getTime())
            const actualEnd = session.endedAt ? new Date(session.endedAt).getTime() : now.getTime()
            const clippedEnd = Math.min(actualEnd, rangeEnd.getTime())
            if (clippedEnd <= clippedStart) continue

            const duration = (clippedEnd - clippedStart) / 1000
            const subjectId = session.subjectId.toString()
            const subjectName = subjectNames.get(subjectId) || 'Deleted subject'
            totalStudyTime += duration
            sessionCount += 1

            const subjectStats = bySubject.get(subjectId) || {
                subjectId,
                subjectName,
                totalStudyTime: 0,
                sessionCount: 0
            }
            subjectStats.totalStudyTime += duration
            subjectStats.sessionCount += 1
            bySubject.set(subjectId, subjectStats)

            let cursor = clippedStart
            while (cursor < clippedEnd) {
                const cursorDate = new Date(cursor)
                const dayStart = Date.UTC(
                    cursorDate.getUTCFullYear(),
                    cursorDate.getUTCMonth(),
                    cursorDate.getUTCDate()
                )
                const nextDay = dayStart + 24 * 60 * 60 * 1000
                const segmentEnd = Math.min(clippedEnd, nextDay)
                const day = new Date(dayStart).toISOString().slice(0, 10)
                const dayStats = byDay.get(day) || { date: day, totalStudyTime: 0, sessionCount: 0 }
                dayStats.totalStudyTime += (segmentEnd - cursor) / 1000
                dayStats.sessionCount += 1
                byDay.set(day, dayStats)
                cursor = segmentEnd
            }
        }

        return res.status(200).json({
            stats: {
                start: rangeStart.toISOString(),
                end: rangeEnd.toISOString(),
                totalStudyTime,
                sessionCount,
                averageSessionLength: sessionCount ? totalStudyTime / sessionCount : 0,
                bySubject: [...bySubject.values()].sort((a, b) => b.totalStudyTime - a.totalStudyTime),
                byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
            }
        })
    } catch (err) {
        console.error('Error fetching study stats: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
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
