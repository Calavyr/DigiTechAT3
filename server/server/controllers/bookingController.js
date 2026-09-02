const fs = require('fs')
const jwt = require('jsonwebtoken')
const Booking = require('../../models/booking')
const { liveUpdateBookingCreated, liveUpdateBookingDeleted } = require('./websocketController')

const publicKey = fs.readFileSync('public.pem', 'utf8')

// minutes from midnight inside school window, and start < end
function isMinutesWithinSchoolDay(startMinutes, endMinutes) {
    const SCHOOL_START = 8 * 60 + 15  // 08:15
    const SCHOOL_END   = 16 * 60      // 16:00

    if (startMinutes < SCHOOL_START) return false
    if (endMinutes > SCHOOL_END) return false
    if (endMinutes <= startMinutes) return false
    return true
}

function verifyAccessToken(req, res) {
    const token = req.signedCookies.accessToken
    if (!token) {
        res.status(401).send()
        return null
    }

    try {
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] })
        return decoded
    } catch (err) {
        console.error('Error verifying token: ', err)
        res.status(403).send()
        return null
    }
}

exports.fetchBookedTimes = async (req, res) => {
    try {
        const { date } = req.query
        if (!date) {
            return res.status(400).json({ code: 'NO_DATE' })
        }

        const decoded = verifyAccessToken(req, res)
        if (!decoded) return // response already sent

        const bookings = await Booking.find({ date })
        const email = decoded.sub

        res.status(200).json({ bookings, email })
    } catch (err) {
        console.error('Error fetching bookings: ', err)
        res.status(500).send()
    }
}

exports.createBooking = async (req, res) => {
    try {
        const { startMinutes, endMinutes, printerNumber, date } = req.body
        if (
            typeof startMinutes !== 'number' ||
            typeof endMinutes !== 'number' ||
            typeof printerNumber !== 'number' ||
            typeof date !== 'string'
        ) {
            return res.status(400).send()
        }

        const min = 1
        const max = 6
        if (printerNumber < min || printerNumber > max) {
            return res.status(400).send()
        }

        if (!isMinutesWithinSchoolDay(startMinutes, endMinutes)) {
            return res.status(400).send()
        }

        const decoded = verifyAccessToken(req, res)
        if (!decoded) return

        const email = decoded.sub

        const overlapping = await Booking.findOne({
            date,
            printerNumber,
            startMinutes: { $lt: endMinutes },
            endMinutes: { $gt: startMinutes }
        })

        if (overlapping) {
            return res.status(409).json({ code: 'BOOKING_OVERLAP' })
        }

        const bookingId = generateID()

        const booking = new Booking({
            email,
            printerNumber,
            startMinutes,
            endMinutes,
            bookingId,
            date
        })

        await booking.save()

        liveUpdateBookingCreated({
            email,
            printerNumber,
            startMinutes,
            endMinutes,
            bookingId,
            date
        })

        res.status(201).send()
    } catch (err) {
        console.error('Error creating booking: ', err)
        res.status(500).send()
    }
}

exports.deleteBooking = async (req, res) => {
    try {
        const { bookingId } = req.body

        if (!bookingId) {
            return res.status(400).send()
        }

        const decoded = verifyAccessToken(req, res)
        if (!decoded) return // response already sent

        const email = decoded.sub

        const booking = await Booking.findOneAndDelete({ bookingId, email })

        if (!booking) {
            return res.status(404).send()
        }
        liveUpdateBookingDeleted({
            bookingId: booking.bookingId,
            date: booking.date
        })

        res.status(200).send()
    } catch (err) {
        console.error('Error deleting booking: ', err)
        res.status(500).send()
    }
}

let counter = 0
function generateID() {
    counter++
    counter %= 100
    return Date.now() * 100 + counter
}