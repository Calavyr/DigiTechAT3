const fs = require('fs')
const Subject = require('../models/subject.js')

// router.get('/subjects', fetchUserSubjects)
// router.post('/subjects', createSubject)
// router.get('/subjects/:subjectId', getSubject)
// router.patch('/subjects/:subjectId', editSubject)
// router.delete('/subjects/:subjectId', deleteSubject)

exports.fetchUserSubjects = async (req, res) => {
    try {
        const { userId } = req.user
        const subjects = await Subject.find({ userId }).lean({ virtuals: ['id'] })

        return res.status(200).json({ subjects })
    } catch (err) {
        console.error('Error fetching user subjects: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}
exports.createSubject = async (req, res) => {
    try {
        const { userId } = req.user
        const { name } = req.body

        const newSubject = new Subject({ name, userId })
        await newSubject.save()

        return res.status(201).json({ subject: newSubject })
    } catch (err) {
        console.error('Error creating subject: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.getSubject = async (req, res) => {
    try {
        const { userId } = req.user
        const { subjectId } = req.params

        const subject = await Subject.findOne({ _id: subjectId, userId }).lean({ virtuals: ['id'] })

        return res.status(200).json({ subject })
    } catch (err) {
        console.error('Error getting subject: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.editSubject = async (req, res) => {
    try {
        const { userId } = req.user
        const { subjectId } = req.params
        const { name } = req.body

        const subject = await Subject.findOne({ _id: subjectId })
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' })
        }
        if (subject.userId.toString() != userId) {
            return res.status(401).json({ message: 'Unauthorised to edit this subject' })
        }
        subject.name = name
        await subject.save()

        return res.status(200).json({ subject })
    } catch (err) {
        console.error('Error editing subject: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}

exports.deleteSubject = async (req, res) => {
    try {
        const { userId } = req.user
        const { subjectId } = req.params
        
        const deletedSubject = Subject.deleteOne({ _id: subjectId, userId })
        
        if (deletedSubject.deletedCount > 0) {
            return res.status(204).send()
        } else {
            return res.status(404).json({ message: 'Subject not found' })
        }
    } catch (err) {
        console.error('Error deleting subject: ', err)
        return res.status(500).json({ message: 'Unexpected error on server' })
    }
}