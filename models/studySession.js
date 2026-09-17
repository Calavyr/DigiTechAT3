const mongoose = require('mongoose')

const studySessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Subject'
    },
    topic: {
        type: String
    },
    startedAt: {
        type: Date,
        required: true
    },
    endedAt: {
        type: Date,
        default: null
    },
    duration: { // in seconds
        type: Number,
        default: null
    }
})

module.exports = mongoose.model('StudySession', studySessionSchema)