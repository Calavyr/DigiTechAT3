const mongoose = require('mongoose')

const studyTaskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    goalId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'StudyGoal'
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    }
})

studyTaskSchema.index({ userId: 1, goalId: 1 })

module.exports = mongoose.model('StudyTask', studyTaskSchema)