const StudyGroup = require('../models/studyGroup.js')
const User = require('../models/user.js')
const StudySession = require('../models/studySession.js')
const Subject = require('../models/subject.js')

exports.fetchStudyGroups = async (req, res) => {
    try {
        const { userId } = req.user
        const studyGroups = await StudyGroup.find({ memberIds: userId })
            .select('name joinCode creatorId memberIds createdAt')
            .lean({ virtuals: ['id'] })

        return res.status(200).json({ studyGroups })
    } catch (err) {
        console.error('Error fetching study groups: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.fetchStudyGroupMembers = async (req, res) => {
    try {
        const { userId } = req.user
        const { groupId } = req.params
        const studyGroup = await StudyGroup.findOne({ _id: groupId, memberIds: userId })

        if (!studyGroup) {
            return res.status(404).json({ message: 'Study group not found' })
        }

        const now = new Date()
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const [members, sessions] = await Promise.all([
            User.find({ _id: { $in: studyGroup.memberIds } }).select('_id username').lean(),
            StudySession.find({
                userId: { $in: studyGroup.memberIds },
                startedAt: { $lt: now },
                $or: [
                    { endedAt: { $gt: weekStart } },
                    { endedAt: null }
                ]
            }).sort({ startedAt: 1 }).lean()
        ])

        const subjectIds = [...new Set(sessions.map(session => session.subjectId.toString()))]
        const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('_id name').lean()
        const subjectNames = new Map(subjects.map(subject => [subject._id.toString(), subject.name]))
        const statsByMember = new Map(studyGroup.memberIds.map(memberId => [memberId.toString(), {
            weeklyStudyTime: 0,
            sessionCount: 0,
            activeStudySession: null
        }]))

        for (const session of sessions) {
            const memberStats = statsByMember.get(session.userId.toString())
            if (!memberStats) continue

            const startedAt = new Date(session.startedAt)
            const endedAt = session.endedAt ? new Date(session.endedAt) : now
            const clippedStart = Math.max(startedAt.getTime(), weekStart.getTime())
            const clippedEnd = Math.min(endedAt.getTime(), now.getTime())
            if (clippedEnd <= clippedStart) continue

            memberStats.weeklyStudyTime += (clippedEnd - clippedStart) / 1000
            memberStats.sessionCount += 1

            if (!session.endedAt) {
                memberStats.activeStudySession = {
                    subjectName: subjectNames.get(session.subjectId.toString()) || 'Deleted subject',
                    topic: session.topic || '',
                    startedAt: session.startedAt
                }
            }
        }

        const memberStats = members
            .map(member => ({
                userId: member._id.toString(),
                username: member.username,
                ...statsByMember.get(member._id.toString())
            }))
            .sort((first, second) => first.username.localeCompare(second.username))

        return res.status(200).json({
            studyGroup: {
                id: studyGroup._id.toString(),
                name: studyGroup.name,
                joinCode: studyGroup.joinCode,
                creatorId: studyGroup.creatorId.toString()
            },
            weekStart,
            weekEnd: now,
            members: memberStats
        })
    } catch (err) {
        console.error('Error fetching study group members: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.createStudyGroup = async (req, res) => {
    try {
        const { userId } = req.user
        const name = cleanGroupName(req.body.name)
        if (!name) {
            return res.status(400).json({ message: 'A group name is required' })
        }

        const studyGroup = new StudyGroup({
            name,
            joinCode: await createUniqueJoinCode(),
            creatorId: userId,
            memberIds: [userId]
        })
        await studyGroup.save()

        return res.status(201).json({ studyGroup })
    } catch (err) {
        console.error('Error creating study group: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.joinStudyGroup = async (req, res) => {
    try {
        const { userId } = req.user
        const joinCode = cleanJoinCode(req.body.joinCode)
        if (!joinCode || joinCode.length !== 6) {
            return res.status(400).json({ message: 'Enter a valid 6 character group code' })
        }

        const studyGroup = await StudyGroup.findOne({ joinCode })
        if (!studyGroup) {
            return res.status(404).json({ message: 'Study group not found' })
        }
        if (!studyGroup.memberIds.some(memberId => memberId.toString() === userId.toString())) {
            studyGroup.memberIds.push(userId)
            await studyGroup.save()
        }

        return res.status(200).json({ studyGroup })
    } catch (err) {
        console.error('Error joining study group: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.editStudyGroup = async (req, res) => {
    try {
        const { userId } = req.user
        const { groupId } = req.params
        const name = cleanGroupName(req.body.name)
        if (!name) {
            return res.status(400).json({ message: 'A group name is required' })
        }

        const studyGroup = await StudyGroup.findById(groupId)
        if (!studyGroup) {
            return res.status(404).json({ message: 'Study group not found' })
        }
        if (studyGroup.creatorId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the group creator can rename this group' })
        }

        studyGroup.name = name
        await studyGroup.save()
        return res.status(200).json({ studyGroup })
    } catch (err) {
        console.error('Error editing study group: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.leaveStudyGroup = async (req, res) => {
    try {
        const { userId } = req.user
        const { groupId } = req.params
        const studyGroup = await StudyGroup.findOneAndUpdate(
            { _id: groupId, memberIds: userId },
            { $pull: { memberIds: userId } },
            { new: true }
        )

        if (!studyGroup) {
            return res.status(404).json({ message: 'Study group not found' })
        }
        if (studyGroup.memberIds.length === 0) {
            await StudyGroup.deleteOne({ _id: studyGroup._id })
        }

        return res.status(204).send()
    } catch (err) {
        console.error('Error leaving study group: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.deleteStudyGroup = async (req, res) => {
    try {
        const { userId } = req.user
        const { groupId } = req.params
        const studyGroup = await StudyGroup.findOneAndDelete({ _id: groupId, creatorId: userId })

        if (!studyGroup) {
            const exists = await StudyGroup.exists({ _id: groupId })
            return res.status(exists ? 403 : 404).json({
                message: exists ? 'Only the group creator can delete this group' : 'Study group not found'
            })
        }

        return res.status(204).send()
    } catch (err) {
        console.error('Error deleting study group: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

function cleanGroupName(name) {
    return typeof name === 'string' ? name.trim().slice(0, 80) : ''
}

function cleanJoinCode(joinCode) {
    return typeof joinCode === 'string' ? joinCode.trim().toUpperCase() : ''
}

async function createUniqueJoinCode() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

    for (let attempt = 0; attempt < 10; attempt += 1) {
        let joinCode = ''
        for (let index = 0; index < 6; index += 1) {
            joinCode += alphabet[Math.floor(Math.random() * alphabet.length)]
        }

        if (!await StudyGroup.exists({ joinCode })) {
            return joinCode
        }
    }

    throw new Error('Could not create a unique study group code')
}
