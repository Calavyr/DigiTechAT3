const mongoose = require('mongoose')

const subjectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Subject', subjectSchema)