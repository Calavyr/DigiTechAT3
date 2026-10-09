const mongoose = require('mongoose')

const studyGoalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
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
    type: {
        type: String,
        enum: ['time', 'checklist'],
        required: true
    },
    term: {
        type: String,
        enum: ['short-term', 'long-term'],
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: function () {
            return this.type === 'time'
        }
    },
    targetDuration: {
        type: Number,
        min: 1,
        required: function () {
            return this.type === 'time'
        }
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        default: null
    },
    completed: {
        type: Boolean,
        default: false
    }
})

studyGoalSchema.index({ userId: 1, startDate: 1, endDate: 1 })

module.exports = mongoose.model('StudyGoal', studyGoalSchema)