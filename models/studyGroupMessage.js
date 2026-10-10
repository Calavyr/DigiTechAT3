const mongoose = require('mongoose')

const studyGroupMessageSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'StudyGroup'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    }
}, { timestamps: true })

studyGroupMessageSchema.index({ groupId: 1, createdAt: -1 })
studyGroupMessageSchema.index({ groupId: 1, _id: -1 })

module.exports = mongoose.model('StudyGroupMessage', studyGroupMessageSchema)
