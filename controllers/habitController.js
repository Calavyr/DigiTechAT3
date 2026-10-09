const fs = require('fs')
const Habit = require('../models/habit.js')
const HabitCompletion = require('../models/habitCompletion.js')

exports.fetchUserHabits = async (req, res) => {
    try {
        const { userId } = req.user
        const { start, end, timezoneOffsetMinutes } = req.query

        if (!start || !end || timezoneOffsetMinutes === undefined) {
            return res.status(400).json({
                message: 'Start, end and timezoneOffsetMinutes are required'
            })
        }

        const startDate = new Date(start)
        const endDate = new Date(end)
        const numericTimezoneOffset = Number(timezoneOffsetMinutes)

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            !isValidTimezoneOffset(numericTimezoneOffset)
        ) {
            return res.status(400).json({
                message: 'Invalid timestamp or timezoneOffsetMinutes'
            })
        }

        if (startDate >= endDate) {
            return res.status(400).json({
                message: 'Start timestamp must be before end timestamp'
            })
        }

        const habits = await Habit.find({ userId }).lean({ virtuals: ['id'] })

        const completions = await HabitCompletion.find({
            habitId: { $in: habits.map(habit => habit._id) },
            completedAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).lean({ virtuals: ['id'] })

        const completionsByHabitId = new Map()

        for (const completion of completions) {
            completionsByHabitId.set(
                completion.habitId.toString(),
                completion
            )
        }

        const habitsWithCompletion = habits.map(habit => {
            const completion = completionsByHabitId.get(
                habit._id.toString()
            )

            return {
                ...habit,
                completed: Boolean(completion),
                completionId: completion ? completion._id : null,
                completedAt: completion ? completion.completedAt : null,
                isToday: habit.daysOfWeek.includes(
                    getDayOfWeekFromDateRange(startDate, numericTimezoneOffset)
                )
            }
        })

        return res.status(200).json({
            habits: habitsWithCompletion
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

        const habit = await Habit.findOne({
            _id: habitId,
            userId: userId
        }).lean({ virtuals: ['id'] })

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

        const habit = await Habit.findOne({
            _id: habitId,
            userId: userId
        })

        habit.name = name ? name : habit.name

        // Allows empty description
        habit.description = description ?? habit.description

        habit.category = category
            ? category
            : habit.category

        habit.daysOfWeek = daysOfWeek
            ? daysOfWeek.sort((a, b) => a - b)
            : habit.daysOfWeek

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

        const deletedHabit = await Habit.deleteOne({
            _id: habitId,
            userId: userId
        })

        if (deletedHabit.deletedCount > 0) {
            await HabitCompletion.deleteMany({
                habitId: habitId
            })

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
        const { start, end, completedAt, timezoneOffsetMinutes } = req.body
        const { userId } = req.user


        const habitExists = await Habit.findOne({
            _id: habitId,
            userId: userId
        })

        if (!habitExists) {
            return res.status(404).json({
                message: 'Habit not found or unauthorized'
            })
        }


        if (!start || !end || !completedAt || timezoneOffsetMinutes === undefined) {
            return res.status(400).json({
                message: 'Start, end, completedAt and timezoneOffsetMinutes are required'
            })
        }


        const startDate = new Date(start)
        const endDate = new Date(end)
        const completionDate = new Date(completedAt)
        const numericTimezoneOffset = Number(timezoneOffsetMinutes)

        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            Number.isNaN(completionDate.getTime()) ||
            !isValidTimezoneOffset(numericTimezoneOffset)
        ) {
            return res.status(400).json({
                message: 'Invalid start or end timestamp'
            })
        }

        if (startDate >= endDate) {
            return res.status(400).json({
                message: 'Start timestamp must be before end timestamp'
            })
        }

        if (completionDate < startDate || completionDate >= endDate) {
            return res.status(400).json({
                message: 'Completion timestamp must be within the requested local day'
            })
        }
        if (
            getLocalDateKey(completionDate, numericTimezoneOffset) !==
            getLocalDateKey(startDate, numericTimezoneOffset)
        ) {
            return res.status(400).json({
                message: 'Completion timestamp must match the requested local day'
            })
        }


        /*
         * Only allow one completion for this habit
         * within the requested local calendar day.
         */
        const existingCompletion = await HabitCompletion.findOne({
            habitId: habitId,
            completedAt: {
                $gte: startDate,
                $lt: endDate
            }
        })


        if (existingCompletion) {
            return res.status(409).json({
                message: 'Habit is already completed for this day',
                completion: existingCompletion
            })
        }


        /*
         * The server records the actual completion time.
         *
         * MongoDB stores this Date as a UTC timestamp.
         */
        const habitCompletion = new HabitCompletion({
            habitId: habitId,
            completedAt: completionDate
        })

        await habitCompletion.save()


        return res.status(201).json({
            completion: habitCompletion
        })
    } catch (err) {
        console.error('Error completing user habit: ', err)
        res.status(500).send()
    }
}


exports.deleteHabitCompletion = async (req, res) => {
    try {
        const { habitId, completionId } = req.params
        const { userId } = req.user


        const habitExists = await Habit.findOne({
            _id: habitId,
            userId: userId
        })

        if (!habitExists) {
            return res.status(404).json({
                message: 'Habit not found or unauthorized'
            })
        }


        const deletedHabitCompletion =
            await HabitCompletion.deleteOne({
                _id: completionId,
                habitId: habitId
            })


        if (deletedHabitCompletion.deletedCount > 0) {
            return res.status(204).send()
        } else {
            return res.status(404).send()
        }
    } catch (err) {
        console.error(
            'Error deleting user habit completion: ',
            err
        )

        res.status(500).send()
    }
}


/*
 * Convert the absolute start timestamp to the client's local calendar day.
 */
function getDayOfWeekFromDateRange(startDate, timezoneOffsetMinutes) {
    let dayOfWeek = new Date(
        startDate.getTime() + timezoneOffsetMinutes * 60 * 1000
    ).getUTCDay()

    if (dayOfWeek === 0) {
        dayOfWeek = 7
    }

    return dayOfWeek
}

function isValidTimezoneOffset(value) {
    return Number.isInteger(value) && value >= -840 && value <= 840
}

function getLocalDateKey(date, timezoneOffsetMinutes) {
    return new Date(date.getTime() + timezoneOffsetMinutes * 60 * 1000)
        .toISOString()
        .slice(0, 10)
}
