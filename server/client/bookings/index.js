const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
const tooltip = document.getElementById('tooltip')

const datePicker = document.getElementById('datePicker')

let userEmail = null
let bookings = []

function printerIndexToNumber(printerIndex) {
    return printerIndex + 1
}

function rangeOverlapsBooking(printerIndex, startMinutes, endMinutes) {
    const printerNumber = printerIndexToNumber(printerIndex)

    const s = Math.min(startMinutes, endMinutes)
    const e = Math.max(startMinutes, endMinutes)

    return bookings.some(b => {
        if (b.printerNumber !== printerNumber) return false
        return e > b.startMinutes && s < b.endMinutes
    })
}

function pointInsideBooking(printerIndex, minute) {
    const printerNumber = printerIndexToNumber(printerIndex)
    return bookings.some(b => {
        if (b.printerNumber !== printerNumber) return false
        return minute >= b.startMinutes && minute < b.endMinutes
    })
}

function findBookingAt(printerIndex, minutes) {
    const printerNumber = printerIndex + 1  // convert 0-based to 1-based

    return bookings.find(b =>
        b.printerNumber === printerNumber &&
        minutes >= b.startMinutes &&
        minutes <  b.endMinutes
    ) || null
}


const TIMETABLE_CONFIG = {
    headerHeight: 40,
    sideBarWidth: 80,
    minTime: '08:00',
    maxTime: '16:00',
    columnPadding: 4,
    columnCount: 6 
}

function dateObjectToString(dateObject) {
    const year = dateObject.getFullYear()
    const month = String(dateObject.getMonth() + 1).padStart(2, '0')
    const day = String(dateObject.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}` // YYYY-MM-DD
}

function dateStringToObject(dateString) {
    return new Date(dateString)
}

function timeStringToMinutes(t) {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
}

function computeLayout(canvas, config = TIMETABLE_CONFIG) {
    const minMinutes = timeStringToMinutes(config.minTime)
    const maxMinutes = timeStringToMinutes(config.maxTime)
    const minutesSpan = maxMinutes - minMinutes

    const headerHeight = config.headerHeight
    const sideBarWidth = config.sideBarWidth
    const usableHeight = canvas.height - headerHeight

    const columnWidth = (canvas.width - sideBarWidth) / config.columnCount
    const pixelsPerMinute = usableHeight / minutesSpan

    return {
        headerHeight,
        sideBarWidth,
        minMinutes,
        maxMinutes,
        minutesSpan,
        columnWidth,
        pixelsPerMinute,
        columnPadding: config.columnPadding,
        columnCount: config.columnCount,

        printerToX(index) {
            return sideBarWidth + index * columnWidth
        },

        timeToY(minutes) {
            return headerHeight + (minutes - minMinutes) * pixelsPerMinute
        },

        yToMinutes(y) {
            return minMinutes + (y - headerHeight) / pixelsPerMinute
        }
    }
}

let layout = null
let drag = null
let dragging = false
let currentDateString = null   // "YYYY-MM-DD"

function setDateInUrl(newDate) {
    const params = new URLSearchParams(window.location.search)
    params.set('date', newDate)

    const newUrl = window.location.pathname + '?' + params.toString()
    history.pushState({}, '', newUrl)
}

function getDateFromUrlOrToday() {
    const params = new URLSearchParams(window.location.search)
    return params.get('date') || dateObjectToString(new Date())
}

const socket = io()

socket.on('bookingCreated', (booking) => {
    bookings.push(booking)
    drawTimetable()
})

socket.on('bookingDeleted', (booking) => {
    bookings = bookings.filter(b => b.bookingId !== booking.bookingId)
    drawTimetable()
})


async function loadTimetable(dateString) {
    currentDateString = dateString
    socket.emit('changeDate', dateString)

    const url = '/api/bookings?date=' + encodeURIComponent(dateString)
    try {
        const fetchOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'GET'
        }
        const response = await apiFetch(url, fetchOptions)
        if (response.ok) {
            const data = await response.json()
            bookings = data.bookings || []
            userEmail = data.email || null
            drawTimetable()
        } else {
            console.error('Failed to fetch bookings, status:', response.status)
        }
    } catch (err) {
        console.error('Error fetching bookings: ', err)
    }    
}

canvas.addEventListener('mousedown', (e) => {
    if (!layout) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    let minutes = layout.yToMinutes(y)
    const printerIndex = Math.floor((x - layout.sideBarWidth) / layout.columnWidth)

    if (pointInsideBooking(printerIndex, minutes)) {
        let booking = findBookingAt(printerIndex, minutes)
        if (booking.email != userEmail) {
            return
        }
        if (confirm(`Delete booking for printer ${booking.printerNumber}?`)) {
            deleteBooking(booking.bookingId)
        }
        return
    }

    if (y < layout.headerHeight) return

    if (printerIndex < 0 || printerIndex >= layout.columnCount) {
        return
    }

    minutes = Math.max(layout.minMinutes, Math.min(layout.maxMinutes, minutes))

    const roundedMinutes = Math.floor(minutes / 15) * 15

    if (pointInsideBooking(printerIndex, roundedMinutes)) {
        return
    }

    drag = {
        printerIndex,
        startMinutes: roundedMinutes,
        endMinutes: roundedMinutes
    }
    dragging = true
})

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let minutes = layout.yToMinutes(y)
    let printerIndex = Math.floor((x - layout.sideBarWidth) / layout.columnWidth)

    if (!dragging && pointInsideBooking(printerIndex, minutes)) {
        if (findBookingAt(printerIndex, minutes).email != userEmail) {
            tooltip.style.visibility = 'hidden'
            return
        }
        tooltip.style.visibility = 'visible'
        tooltip.style.left = e.clientX + 8 + 'px'
        tooltip.style.top = e.clientY + 8 + 'px'
        return
    }

    tooltip.style.visibility = 'hidden'
    if (!drag || !layout || !dragging) return

    minutes = Math.max(layout.minMinutes, Math.min(layout.maxMinutes, minutes))
    const roundedMinutes = Math.round(minutes / 15) * 15

    const candidateStart = drag.startMinutes
    const candidateEnd = roundedMinutes

    if (rangeOverlapsBooking(drag.printerIndex, candidateStart, candidateEnd)) {
        return
    }

    drag.endMinutes = roundedMinutes
    drawTimetable()
})


document.addEventListener('mouseup', () => {
    if (!drag || !layout) return
    dragging = false

    if (drag.startMinutes === drag.endMinutes) {
        drag = null
        drawTimetable()
        return
    }

    const initialStart = drag.startMinutes
    const initialEnd = drag.endMinutes

    drag.startMinutes = Math.min(initialStart, initialEnd)
    drag.endMinutes = Math.max(initialStart, initialEnd)

    createNewBooking(drag)

    drag = null
    drawTimetable()
})

datePicker.addEventListener('change', (e) => {
    const newDate = e.target.value
    setDateInUrl(newDate)
    loadTimetable(newDate)
})

function prevDay() {
    const current = new Date(datePicker.value)
    if (isNaN(current.getTime())) {
        return
    }
    current.setDate(current.getDate() - 1)
    const newDateStr = dateObjectToString(current)

    datePicker.value = newDateStr
    setDateInUrl(newDateStr)
    loadTimetable(newDateStr)
}

function nextDay() {
    const current = new Date(datePicker.value)
    if (isNaN(current.getTime())) {
        return
    }
    current.setDate(current.getDate() + 1)
    const newDateStr = dateObjectToString(current)

    datePicker.value = newDateStr
    setDateInUrl(newDateStr)
    loadTimetable(newDateStr)
}

window.addEventListener('popstate', () => {
    const date = getDateFromUrlOrToday()
    datePicker.value = date
    loadTimetable(date)
})


function resizeCanvasAndLayout() {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    layout = computeLayout(canvas, TIMETABLE_CONFIG)
    drawTimetable()
}

window.addEventListener('resize', resizeCanvasAndLayout)

async function createNewBooking(booking) {
    const { printerIndex, startMinutes, endMinutes } = booking

    const printerNumber = printerIndex + 1

    const startTimeString = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`
    const endTimeString = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

    if (!confirm(`Create a booking ${startTimeString}-${endTimeString} for printer ${printerNumber}?`)) {
        drag = null
        drawTimetable()
        return
    }

    const url = '/api/bookings'
    try {
        const fetchOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({ startMinutes, endMinutes, printerNumber, date: currentDateString })
        }
        const response = await apiFetch(url, fetchOptions)
        if (response.ok) {
            alert('Succesfully created booking.')
        } else {
            alert('There was an error on the server. Please try again.')
        }
    } catch (err) {
        console.error('Error creating booking: ', err)
    }
}

async function deleteBooking(bookingId) {
    const url = '/api/bookings'
    try {
        const fetchOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'DELETE',
            body: JSON.stringify({ bookingId })
        }
        const response = await apiFetch(url, fetchOptions)
        if (response.ok) {
            alert('Succesfully deleted booking.')
        } else {
            alert('There was an error on the server. Please try again.')
        }
    } catch (err) {
        console.error('Error deleting booking: ', err)
    }
}


function init() {
    const initialDate = getDateFromUrlOrToday()
    setDateInUrl(initialDate)
    datePicker.value = initialDate

    resizeCanvasAndLayout()
    loadTimetable(initialDate)
}
init()



function drawTimetable() {}