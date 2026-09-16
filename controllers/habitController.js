const fs = require('fs')
const Habit = require('../models/habit.js')
const HabitCompletion = require('../models/habitCompletion.js')
const { liveUpdateBookingCreated, liveUpdateBookingDeleted } = require('./websocketController.js')

exports.fetchUserHabitsByDate = async (req, res) => {
    try {
        const { userId } = req.user
        const { date } = req.params

        const [year, month, day] = date.split('-')
        const dateObject = new Date(year, month-1, day)
        let dayOfWeek = dateObject.getDay()
        if (dayOfWeek == 0) { dayOfWeek = 7 }

        const habits = await Habit.find({ userId }).lean({ virtuals: ['id'] })

        const completions = await HabitCompletion.find({
            habitId: { $in: habits.map(habit => habit._id) },
            date: date
        }).lean({ virtuals: ['id'] })

        const completedHabitIds = new Set(
            completions.map(completion => completion.habitId.toString())
        )

        const habitsWithCompletion = habits.map(habit => ({
            ...habit,
            completed: completedHabitIds.has(habit._id.toString()),
            isToday: habit.daysOfWeek.includes(dayOfWeek)
        }))

        return res.status(200).json({
            habits: habitsWithCompletion
        })
    } catch (err) {
        console.error('Error fetching user habits: ', err)
        res.status(500).send()
    }
}

exports.fetchUserHabits = async (req, res) => {
    try {
        const { userId } = req.user
        const habits = await Habit.find({ userId }).lean({ virtuals: ['id'] })

        return res.status(200).json({
            habits: habits
        })
    } catch (err) {
        console.error('Error fetching user habits: ', err)
        res.status(500).send()
    }
}

exports.createHabit = async (req, res) => {
    try {
        const { name, description, category, daysOfWeek } = req.body
        const { userId, email, username } = req.user

        const habit = new Habit({
            userId: userId,
            name: name,
            description: description,
            category: category,
            daysOfWeek: daysOfWeek.sort((a, b) => a - b)
        })
        await habit.save()
        res.status(201).send()
    } catch (err) {
        console.error('Error creating user habit: ', err)
        res.status(500).send()
    }
}



exports.getHabit = async (req, res) => {
    try {
        const { habitId } = req.params
        const { userId } = req.user

        const habit = await Habit.findOne({ _id: habitId, userId: userId }).lean({ virtuals: ['id'] })

        return res.status(200).json({ habit })
    } catch (err) {
        console.error('Error fetching user habit: ', err)
        res.status(500).send()
    }
}

exports.editHabit = async (req, res) => {
    try {
        const { habitId } = req.params
        const { name, description, category, daysOfWeek } = req.body
        const { userId } = req.user

        const habit = await Habit.findOne(
            { _id: habitId, userId: userId }
        )
        habit.name = name ? name : habit.name
        habit.description = description ?? habit.description // Allows empty description
        habit.category = category ? category : habit.category
        habit.daysOfWeek = daysOfWeek ? daysOfWeek.sort((a, b) => a - b) : habit.daysOfWeek
        await habit.save()

        return res.status(204).send()
    } catch (err) {
        console.error('Error editing user habit: ', err)
        res.status(500).send()
    }
}

exports.deleteHabit = async (req, res) => {
    try {
        const { habitId } = req.params
        const { userId } = req.user

        const deletedHabit = await Habit.deleteOne({ _id: habitId, userId: userId })

        if (deletedHabit.deletedCount > 0) {
            const deletedHabitCompletions = await HabitCompletion.deleteMany({ habitId: habitId })
            return res.status(204).send()
        } else {
            return res.status(404).send()
        }
    } catch (err) {
        console.error('Error deleting user habit: ', err)
        res.status(500).send()
    }
}

exports.completeHabit = async (req, res) => {
    try {
        const { habitId } = req.params
        const { date } = req.body
        const { userId } = req.user

        const habitExists = await Habit.findOne({ _id: habitId, userId: userId })
        if (!habitExists) { //Habit doesn't exist or doesn't belong to user
            return res.status(404).json({ message: "Habit not found or unauthorized" })
        }
        
        const habitCompletion = new HabitCompletion({
            habitId: habitId,
            date: date
        })
        await habitCompletion.save()

        return res.status(201).send()
    } catch (err) {
        console.error('Error completing user habit: ', err)
        res.status(500).send()
    }
}
exports.deleteHabitCompletion = async (req, res) => {
    try {
        const { habitId, date } = req.params
        const { userId } = req.user

        const habitExists = await Habit.findOne({ _id: habitId, userId: userId })
        if (!habitExists) { //Habit doesn't exist or doesn't belong to user
            return res.status(404).json({ message: "Habit not found or unauthorized" })
        }
        
        const deletedHabitCompletion = await HabitCompletion.deleteOne({ habitId: habitId, date: date})
        
        if (deletedHabitCompletion.deletedCount > 0) {
            return res.status(204).send()
        } else {
            return res.status(404).send()
        }
        return res.status(201).send()
    } catch (err) {
        console.error('Error completing user habit: ', err)
        res.status(500).send()
    }
}