const cookieParser = require('cookie-parser')
const fs = require('fs')
const jwt = require('jsonwebtoken')
const StudyGroup = require('../models/studyGroup.js')
const User = require('../models/user.js')
const { buildStudyGroupActivity } = require('../services/studyGroupActivity.js')

let ioInstance = null

function setupWebsockets(io) {
    ioInstance = io
    const publicKey = fs.readFileSync('public.pem', 'utf8')
    const cookieSecret = process.env.COOKIE_SIGNATURE

    io.use(async (socket, next) => {
        try {
            const cookies = parseCookies(socket.handshake.headers.cookie || '')
            const token = getValidToken(cookies, cookieSecret, publicKey)
            const userId = token.sub
            if (!await User.exists({ _id: userId })) {
                return next(new Error('Unauthorised'))
            }

            socket.data.userId = userId
            next()
        } catch {
            next(new Error('Unauthorised'))
        }
    })

    io.on('connection', (socket) => {
        let currentRoom = null
        let currentStudyGroupRoom = null
        socket.join(userRoom(socket.data.userId))

        socket.on('changeDate', (dateString) => {
            if (currentRoom) socket.leave(currentRoom)
            socket.join(dateString)
            currentRoom = dateString
        })

        socket.on('joinStudyGroup', async (groupId, acknowledge = () => {}) => {
            if (typeof acknowledge !== 'function') acknowledge = () => {}
            if (!isValidGroupId(groupId)) {
                acknowledge({ ok: false, message: 'Invalid study group' })
                return
            }

            try {
                const studyGroup = await StudyGroup.findOne({
                    _id: groupId,
                    memberIds: socket.data.userId
                })

                if (!studyGroup) {
                    acknowledge({ ok: false, message: 'You are not a member of this study group' })
                    return
                }

                if (currentStudyGroupRoom) socket.leave(currentStudyGroupRoom)
                currentStudyGroupRoom = studyGroupRoom(studyGroup._id)
                socket.join(currentStudyGroupRoom)
                socket.emit('studyGroupActivity', await buildStudyGroupActivity(studyGroup))
                acknowledge({ ok: true, groupId: studyGroup._id.toString() })
            } catch (error) {
                console.error('Error joining study group socket room: ', error)
                acknowledge({ ok: false, message: 'Could not join study group updates' })
            }
        })

        socket.on('leaveStudyGroup', (groupId) => {
            if (!isValidGroupId(groupId)) return

            const room = studyGroupRoom(groupId)
            socket.leave(room)
            if (currentStudyGroupRoom === room) currentStudyGroupRoom = null
        })
    })
}

function notifyStudyGroupMembers(userId) {
    if (!ioInstance || userId == null) return

    StudyGroup.find({ memberIds: userId })
        .then(async studyGroups => {
            await Promise.all(studyGroups.map(async studyGroup => {
                const activity = await buildStudyGroupActivity(studyGroup)
                ioInstance.to(studyGroupRoom(studyGroup._id)).emit('studyGroupActivity', activity)
            }))
        })
        .catch(error => console.error('Error notifying study groups: ', error))
}

async function notifyStudyGroupUpdated(groupId) {
    if (!ioInstance || groupId == null) return

    try {
        const studyGroup = await StudyGroup.findById(groupId)
        if (!studyGroup) return
        const activity = await buildStudyGroupActivity(studyGroup)
        ioInstance.to(studyGroupRoom(groupId)).emit('studyGroupActivity', activity)
    } catch (error) {
        console.error('Error notifying study group: ', error)
    }
}

function notifyStudyGroupDeleted(groupId) {
    if (!ioInstance || groupId == null) return
    ioInstance.to(studyGroupRoom(groupId)).emit('studyGroupDeleted', {
        groupId: groupId.toString()
    })
}

function removeUserFromStudyGroup(userId, groupId) {
    if (!ioInstance || userId == null || groupId == null) return

    const groupRoom = studyGroupRoom(groupId)
    ioInstance.in(userRoom(userId)).socketsLeave(groupRoom)
    ioInstance.in(userRoom(userId)).emit('studyGroupAccessRemoved', {
        groupId: groupId.toString()
    })
}

function studyGroupRoom(groupId) {
    if (groupId == null) return null
    return `study-group:${groupId.toString()}`
}

function isValidGroupId(groupId) {
    return typeof groupId === 'string' && /^[a-f\d]{24}$/i.test(groupId)
}

function userRoom(userId) {
    return `user:${userId.toString()}`
}

function getValidToken(cookies, cookieSecret, publicKey) {
    for (const cookieName of ['accessToken', 'refreshToken']) {
        const token = cookieParser.signedCookie(cookies[cookieName], cookieSecret)
        if (typeof token !== 'string') continue

        try {
            return jwt.verify(token, publicKey, { algorithms: ['RS256'] })
        } catch {
            // Try the refresh token when the short-lived access token has expired.
        }
    }

    throw new Error('Unauthorised')
}

function parseCookies(cookieHeader) {
    const cookies = {}
    for (const item of cookieHeader.split(';')) {
        const separator = item.indexOf('=')
        if (separator < 0) continue

        const name = item.slice(0, separator).trim()
        const value = item.slice(separator + 1).trim()
        try {
            cookies[name] = decodeURIComponent(value)
        } catch {
            cookies[name] = value
        }
    }
    return cookies
}

module.exports = {
    setupWebsockets,
    notifyStudyGroupMembers,
    notifyStudyGroupUpdated,
    notifyStudyGroupDeleted,
    removeUserFromStudyGroup
}
