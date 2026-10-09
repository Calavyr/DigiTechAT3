const User = require('../models/user.js')
const StudySession = require('../models/studySession.js')
const Subject = require('../models/subject.js')

async function buildStudyGroupActivity(studyGroup, now = new Date()) {
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

    return {
        studyGroup: {
            id: studyGroup._id.toString(),
            name: studyGroup.name,
            joinCode: studyGroup.joinCode,
            creatorId: studyGroup.creatorId.toString()
        },
        weekStart,
        weekEnd: now,
        members: memberStats
    }
}

module.exports = { buildStudyGroupActivity }
