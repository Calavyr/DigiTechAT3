const mongoose = require('mongoose')

const habitSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    name: { type: String, required: true},
    description: { type: String },
    category: { type: String, required: true },
    daysOfWeek: {
        type: [Number], // 1 = Monday, 7 = Sunday
        required: true
    }
})

module.exports = mongoose.model('Habit', habitSchema)