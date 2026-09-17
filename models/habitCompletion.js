const mongoose = require('mongoose')

const habitCompletionSchema = new mongoose.Schema({
    habitId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Habit'
    },

    completedAt: {
        type: Date,
        required: true,
        default: Date.now
    }
})

habitCompletionSchema.index({
    habitId: 1,
    completedAt: 1
})

module.exports = mongoose.model('HabitCompletion', habitCompletionSchema)