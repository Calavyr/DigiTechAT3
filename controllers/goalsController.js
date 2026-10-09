const mongoose = require('mongoose')
const StudyGoal = require('../models/studyGoal.js')
const StudyTask = require('../models/studyTask.js')
const StudySession = require('../models/studySession.js')
const Subject = require('../models/subject.js')

exports.fetchUserStudyGoals = async (req, res) => {
    try {
        const { userId } = req.user
        const studyGoals = await StudyGoal.find({ userId })
            .sort({ startDate: -1 })
            .lean({ virtuals: ['id'] })

        const goalsWithProgress = await Promise.all(
            studyGoals.map(addGoalProgress)
        )

        return res.status(200).json({ studyGoals: goalsWithProgress })
    } catch (err) {
        console.error('Error fetching study goals: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.createStudyGoal = async (req, res) => {
    try {
        const { userId } = req.user
        const { title, description, type, term, subjectId, targetDuration, startDate, endDate } = req.body
        const validationMessage = validateGoalFields(req.body)

        if (validationMessage) {
            return res.status(400).json({ message: validationMessage })
        }

        if (type === 'time') {
            const subject = await Subject.findOne({ _id: subjectId, userId })
            if (!subject) {
                return res.status(404).json({ message: 'Subject not found' })
            }
        }

        const studyGoal = new StudyGoal({
            userId,
            title: title.trim(),
            description: description?.trim() || '',
            type,
            term,
            subjectId: type === 'time' ? subjectId : undefined,
            targetDuration: type === 'time' ? Number(targetDuration) : undefined,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : null
        })

        await studyGoal.save()
        return res.status(201).json({ studyGoal })
    } catch (err) {
        console.error('Error creating study goal: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.getStudyGoal = async (req, res) => {
    try {
        const { userId } = req.user
        const { goalId } = req.params

        if (!isValidId(goalId)) {
            return res.status(404).json({ message: 'Study goal not found' })
        }

        const studyGoal = await StudyGoal.findOne({ _id: goalId, userId })
            .lean({ virtuals: ['id'] })

        if (!studyGoal) {
            return res.status(404).json({ message: 'Study goal not found' })
        }

        return res.status(200).json({ studyGoal: await addGoalProgress(studyGoal) })
    } catch (err) {
        console.error('Error fetching study goal: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.editStudyGoal = async (req, res) => {
    try {
        const { userId } = req.user
        const { goalId } = req.params
        const studyGoal = await StudyGoal.findOne({ _id: goalId, userId })

        if (!studyGoal) {
            return res.status(404).json({ message: 'Study goal not found' })
        }

        const updatedFields = {
            title: req.body.title ?? studyGoal.title,
            description: req.body.description ?? studyGoal.description,
            type: req.body.type ?? studyGoal.type,
            term: req.body.term ?? studyGoal.term,
            subjectId: req.body.subjectId ?? studyGoal.subjectId,
            targetDuration: req.body.targetDuration ?? studyGoal.targetDuration,
            startDate: req.body.startDate ?? studyGoal.startDate,
            endDate: req.body.endDate === undefined ? studyGoal.endDate : req.body.endDate,
            completed: req.body.completed ?? studyGoal.completed
        }

        const validationMessage = validateGoalFields(updatedFields)
        if (validationMessage) {
            return res.status(400).json({ message: validationMessage })
        }

        if (updatedFields.type === 'time') {
            const subject = await Subject.findOne({ _id: updatedFields.subjectId, userId })
            if (!subject) {
                return res.status(404).json({ message: 'Subject not found' })
            }
        }

        studyGoal.title = updatedFields.title.trim()
        studyGoal.description = updatedFields.description?.trim() || ''
        studyGoal.type = updatedFields.type
        studyGoal.term = updatedFields.term
        studyGoal.subjectId = updatedFields.type === 'time' ? updatedFields.subjectId : undefined
        studyGoal.targetDuration = updatedFields.type === 'time'
            ? Number(updatedFields.targetDuration)
            : undefined
        studyGoal.startDate = new Date(updatedFields.startDate)
        studyGoal.endDate = updatedFields.endDate ? new Date(updatedFields.endDate) : null
        studyGoal.completed = updatedFields.completed

        await studyGoal.save()
        return res.status(200).json({ studyGoal })
    } catch (err) {
        console.error('Error editing study goal: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.deleteStudyGoal = async (req, res) => {
    try {
        const { userId } = req.user
        const { goalId } = req.params

        if (!isValidId(goalId)) {
            return res.status(404).json({ message: 'Study goal not found' })
        }

        const deletedGoal = await StudyGoal.deleteOne({ _id: goalId, userId })
        if (deletedGoal.deletedCount === 0) {
            return res.status(404).json({ message: 'Study goal not found' })
        }

        await StudyTask.deleteMany({ goalId, userId })
        return res.status(204).send()
    } catch (err) {
        console.error('Error deleting study goal: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.fetchGoalTasks = async (req, res) => {
    try {
        const { userId } = req.user
        const { goalId } = req.params

        if (!isValidId(goalId)) {
            return res.status(404).json({ message: 'Study goal not found' })
        }

        const goal = await StudyGoal.findOne({ _id: goalId, userId }).select('_id type')
        if (!goal) {
            return res.status(404).json({ message: 'Study goal not found' })
        }
        if (goal.type !== 'checklist') {
            return res.status(400).json({ message: 'Tasks can only be added to checklist goals' })
        }

        const studyTasks = await StudyTask.find({ userId, goalId })
            .sort({ _id: 1 })
            .lean({ virtuals: ['id'] })

        return res.status(200).json({ studyTasks })
    } catch (err) {
        console.error('Error fetching goal tasks: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.createGoalTask = async (req, res) => {
    try {
        const { userId } = req.user
        const { goalId } = req.params
        const { title, description } = req.body

        if (typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({ message: 'A task title is required' })
        }

        if (!isValidId(goalId)) {
            return res.status(404).json({ message: 'Study goal not found' })
        }

        const goal = await StudyGoal.findOne({ _id: goalId, userId }).select('_id type')
        if (!goal) {
            return res.status(404).json({ message: 'Study goal not found' })
        }
        if (goal.type !== 'checklist') {
            return res.status(400).json({ message: 'Tasks can only be added to checklist goals' })
        }

        const studyTask = new StudyTask({
            userId,
            goalId,
            title: title.trim(),
            description: typeof description === 'string' ? description.trim() : ''
        })

        await studyTask.save()
        return res.status(201).json({ studyTask })
    } catch (err) {
        console.error('Error creating study task: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.editStudyTask = async (req, res) => {
    try {
        const { userId } = req.user
        const { taskId } = req.params

        if (!isValidId(taskId)) {
            return res.status(404).json({ message: 'Study task not found' })
        }

        const studyTask = await StudyTask.findOne({ _id: taskId, userId })
        if (!studyTask) {
            return res.status(404).json({ message: 'Study task not found' })
        }

        if (req.body.title !== undefined) {
            if (typeof req.body.title !== 'string' || req.body.title.trim().length === 0) {
                return res.status(400).json({ message: 'Task title cannot be empty' })
            }
            studyTask.title = req.body.title.trim()
        }

        if (req.body.description !== undefined) {
            studyTask.description = typeof req.body.description === 'string'
                ? req.body.description.trim()
                : ''
        }

        if (req.body.completed !== undefined) {
            if (typeof req.body.completed !== 'boolean') {
                return res.status(400).json({ message: 'completed must be true or false' })
            }
            studyTask.completed = req.body.completed
            studyTask.completedAt = req.body.completed ? new Date() : null
        }

        await studyTask.save()
        return res.status(200).json({ studyTask })
    } catch (err) {
        console.error('Error editing study task: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.deleteStudyTask = async (req, res) => {
    try {
        const { userId } = req.user
        const { taskId } = req.params

        if (!isValidId(taskId)) {
            return res.status(404).json({ message: 'Study task not found' })
        }

        const deletedTask = await StudyTask.deleteOne({ _id: taskId, userId })
        if (deletedTask.deletedCount === 0) {
            return res.status(404).json({ message: 'Study task not found' })
        }

        return res.status(204).send()
    } catch (err) {
        console.error('Error deleting study task: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

async function addGoalProgress(studyGoal) {
    if (studyGoal.type === 'checklist') {
        const studyTasks = await StudyTask.find({ userId: studyGoal.userId, goalId: studyGoal._id })
            .sort({ _id: 1 })
            .lean({ virtuals: ['id'] })
        const completedTasks = studyTasks.filter(task => task.completed).length
        const allTasksComplete = studyTasks.length > 0 && completedTasks === studyTasks.length

        return {
            ...studyGoal,
            studyTasks,
            progress: completedTasks,
            taskCount: studyTasks.length,
            progressPercent: studyTasks.length
                ? Math.round((completedTasks / studyTasks.length) * 100)
                : (studyGoal.completed ? 100 : 0),
            isComplete: studyTasks.length ? allTasksComplete : studyGoal.completed
        }
    }

    const rangeStart = new Date(studyGoal.startDate).getTime()
    const rangeEnd = studyGoal.endDate
        ? new Date(studyGoal.endDate).getTime()
        : Date.now()
    const sessions = await StudySession.find({
        userId: studyGoal.userId,
        subjectId: studyGoal.subjectId,
        startedAt: { $lt: new Date(rangeEnd) },
        $or: [
            { endedAt: { $gt: new Date(rangeStart) } },
            { endedAt: null }
        ]
    }).select('startedAt endedAt').lean()

    const now = Date.now()
    const progress = sessions.reduce((total, session) => {
        const sessionStart = Math.max(new Date(session.startedAt).getTime(), rangeStart)
        const sessionEnd = Math.min(
            session.endedAt ? new Date(session.endedAt).getTime() : now,
            rangeEnd
        )
        return total + Math.max(0, (sessionEnd - sessionStart) / 1000)
    }, 0)

    return {
        ...studyGoal,
        progress,
        targetDuration: studyGoal.targetDuration,
        progressPercent: Math.min(100, Math.round((progress / studyGoal.targetDuration) * 100)),
        isComplete: progress >= studyGoal.targetDuration
    }
}

function validateGoalFields(fields) {
    if (typeof fields.title !== 'string' || fields.title.trim().length === 0) {
        return 'A goal title is required'
    }
    if (!['time', 'checklist'].includes(fields.type)) {
        return 'Goal type must be time or checklist'
    }
    if (!['short-term', 'long-term'].includes(fields.term)) {
        return 'Goal term must be short-term or long-term'
    }
    if (fields.description !== undefined && typeof fields.description !== 'string') {
        return 'Goal description must be text'
    }
    if (fields.type === 'time') {
        if (!fields.subjectId || !isValidId(fields.subjectId)) {
            return 'A valid subject is required for a time goal'
        }
        if (!Number.isFinite(Number(fields.targetDuration)) || Number(fields.targetDuration) <= 0) {
            return 'A positive targetDuration in seconds is required for a time goal'
        }
    }

    const startDate = fields.startDate ? new Date(fields.startDate) : new Date()
    const endDate = fields.endDate ? new Date(fields.endDate) : null
    if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
        return 'Goal dates must be valid timestamps'
    }
    if (endDate && startDate >= endDate) {
        return 'The goal end date must be after its start date'
    }
    if (fields.completed !== undefined && typeof fields.completed !== 'boolean') {
        return 'completed must be true or false'
    }

    return null
}

function isValidId(value) {
    return mongoose.Types.ObjectId.isValid(value)
}