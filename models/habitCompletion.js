const mongoose = require('mongoose')

const habitCompletionSchema = new mongoose.Schema({
    habitId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Habit'
    },
    date: {
        type: String,
        required: true
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
})
habitCompletionSchema.index( // Index by both habitId and date uniquely so no duplicates of habits on the same date
    { habitId: 1, date: 1 },
    { unique: true }
)

module.exports = mongoose.model('HabitCompletion', habitCompletionSchema)