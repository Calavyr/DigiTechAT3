const cookieParser = require('cookie-parser')
const fs = require('fs')
const jwt = require('jsonwebtoken')
const StudyGroup = require('../models/studyGroup.js')
const StudyGroupMessage = require('../models/studyGroupMessage.js')
const User = require('../models/user.js')
const { buildStudyGroupActivity } = require('../services/studyGroupActivity.js')

let ioInstance = null
const CHAT_PAGE_SIZE = 50

function setupWebsockets(io) {
    ioInstance = io
    const publicKey = fs.readFileSync('public.pem', 'utf8')
    const cookieSecret = process.env.COOKIE_SIGNATURE

    io.use(async (socket, next) => {
        try {
            const cookies = parseCookies(socket.handshake.headers.cookie || '')
            const token = getValidToken(cookies, cookieSecret, publicKey)
            const userId = token.sub
            const user = await User.findById(userId).select('_id username')
            if (!user) {
                return next(new Error('Unauthorised'))
            }

            socket.data.userId = userId
            socket.data.username = user.username
            next()
        } catch {
            next(new Error('Unauthorised'))
        }
    })

    io.on('connection', (socket) => {
        let currentRoom = null
        let currentStudyGroupRoom = null
        let currentStudyGroupId = null
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
                currentStudyGroupId = studyGroup._id.toString()
                socket.join(currentStudyGroupRoom)
                socket.emit('studyGroupActivity', await buildStudyGroupActivity(studyGroup))
                await emitStudyGroupChatHistory(socket, studyGroup._id)
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
            if (currentStudyGroupRoom === room) {
                currentStudyGroupRoom = null
                currentStudyGroupId = null
            }
        })

        socket.on('sendStudyGroupMessage', async (payload, acknowledge = () => {}) => {
            if (typeof acknowledge !== 'function') acknowledge = () => {}

            const groupId = payload?.groupId
            const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
            if (!isValidGroupId(groupId) || groupId !== currentStudyGroupId) {
                acknowledge({ ok: false, message: 'Join this study group before sending a message' })
                return
            }
            if (!message || message.length > 500) {
                acknowledge({ ok: false, message: 'Messages must be between 1 and 500 characters' })
                return
            }

            try {
                const studyGroup = await StudyGroup.findOne({
                    _id: groupId,
                    memberIds: socket.data.userId
                }).select('_id')
                if (!studyGroup) {
                    acknowledge({ ok: false, message: 'You are not a member of this study group' })
                    return
                }

                const savedMessage = await StudyGroupMessage.create({
                    groupId,
                    userId: socket.data.userId,
                    message
                })
                const chatMessage = {
                    id: savedMessage._id.toString(),
                    userId: socket.data.userId,
                    username: socket.data.username,
                    message: savedMessage.message,
                    createdAt: savedMessage.createdAt
                }

                ioInstance.to(studyGroupRoom(groupId)).emit('studyGroupChatMessage', chatMessage)
                acknowledge({ ok: true, messageId: chatMessage.id })
            } catch (error) {
                console.error('Error saving study group message: ', error)
                acknowledge({ ok: false, message: 'Could not send message' })
            }
        })

        socket.on('loadStudyGroupChat', async (groupId) => {
            if (!isValidGroupId(groupId) || groupId !== currentStudyGroupId) return

            try {
                const isMember = await StudyGroup.exists({
                    _id: groupId,
                    memberIds: socket.data.userId
                })
                if (isMember) await emitStudyGroupChatHistory(socket, groupId)
            } catch (error) {
                console.error('Error loading study group chat: ', error)
            }
        })

        socket.on('loadOlderStudyGroupMessages', async (payload, acknowledge = () => {}) => {
            if (typeof acknowledge !== 'function') acknowledge = () => {}

            const groupId = payload?.groupId
            const beforeId = payload?.beforeId
            if (!isValidGroupId(groupId) || groupId !== currentStudyGroupId || !isValidGroupId(beforeId)) {
                acknowledge({ ok: false, message: 'Could not load older messages' })
                return
            }

            try {
                const isMember = await StudyGroup.exists({
                    _id: groupId,
                    memberIds: socket.data.userId
                })
                if (!isMember) {
                    acknowledge({ ok: false, message: 'You are not a member of this study group' })
                    return
                }

                const page = await getStudyGroupChatPage(groupId, beforeId)
                acknowledge({ ok: true, ...page })
            } catch (error) {
                console.error('Error loading older study group messages: ', error)
                acknowledge({ ok: false, message: 'Could not load older messages' })
            }
        })
    })
}

async function emitStudyGroupChatHistory(socket, groupId) {
    const page = await getStudyGroupChatPage(groupId)

    socket.emit('studyGroupChatHistory', {
        groupId: groupId.toString(),
        ...page
    })
}

async function getStudyGroupChatPage(groupId, beforeId) {
    const filter = { groupId }
    if (beforeId) filter._id = { $lt: beforeId }

    const results = await StudyGroupMessage.find(filter)
        .sort({ _id: -1 })
        .limit(CHAT_PAGE_SIZE + 1)
        .populate('userId', 'username')
        .lean()
    const hasMore = results.length > CHAT_PAGE_SIZE
    const messages = results.slice(0, CHAT_PAGE_SIZE).reverse().map(message => ({
        id: message._id.toString(),
        userId: message.userId?._id?.toString() || '',
        username: message.userId?.username || 'Former member',
        message: message.message,
        createdAt: message.createdAt
    }))

    return { messages, hasMore }
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

function notifyStudyGroupChatUpdated(groupId) {
    if (!ioInstance || groupId == null) return
    ioInstance.to(studyGroupRoom(groupId)).emit('studyGroupChatUpdated', {
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
    notifyStudyGroupChatUpdated,
    removeUserFromStudyGroup
}
