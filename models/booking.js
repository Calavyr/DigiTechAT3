const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({
    email: { type: String, required: true },
    printerNumber: { type: Number, min: 1, max: 10, required: true},
    startMinutes: { type: Number, required: true },
    endMinutes: { type: Number, required: true },
    date: { type: String, required: true },
    bookingId: { type: Number, required: true, unique: true }
})

module.exports = mongoose.model('Booking', bookingSchema)