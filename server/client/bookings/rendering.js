/*
Booking
{
    printerNumber,
    startMinutes,
    endMinutes,
    email,
    bookingId
}
*/

/*
Layout
{
    headerHeight,
    minMinutes,
    maxMinutes,
    minutesSpan,
    columnWidth,
    pixelsPerMinute,
    columnPadding: config.columnPadding,
    columnCount: config.columnCount,

    printerToX(index) {
        return index * columnWidth
    },

    timeToY(minutes) {
        return headerHeight + (minutes - minMinutes) * pixelsPerMinute
    },

    yToMinutes(y) {
        return minMinutes + (y - headerHeight) / pixelsPerMinute
    }
}
*/

function drawTimetable() {
    if (!layout) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.font = '12px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#ffffff'
    ctx.fillStyle = '#ffffff'
    ctx.lineWidth = 1

    for (let i = 0; i < layout.columnCount; i++) {
        const x = layout.printerToX(i)
        const centerX = x + layout.columnWidth / 2
        const label = `P${i + 1}`
        const textWidth = ctx.measureText(label).width

        ctx.fillText(label, centerX - textWidth / 2, layout.headerHeight / 2)

        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
    }

    ctx.beginPath()
    ctx.moveTo(canvas.width, 0)
    ctx.lineTo(canvas.width, canvas.height)
    ctx.strokeStyle = '#ffffff'
    ctx.fillStyle = '#ffffff'
    ctx.stroke()

    if (currentDateString) {
        ctx.fillText(currentDateString, 8, layout.headerHeight / 2)
    }

    for (let mins = layout.minMinutes; mins <= layout.maxMinutes; mins += 15) {
        const y = layout.timeToY(mins)

        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()

        if (mins % 60 == 0) {
            const hours = Math.floor(mins / 60)
            const label = String(hours).padStart(2, '0') + ':00'
            ctx.fillSyle = '#ffffff'
            const textWidth = ctx.measureText(label).width
            ctx.fillText(label, layout.sideBarWidth - textWidth - 8, y)
        }
    }

    ctx.strokeStyle = '#55f75bff'
    ctx.fillStyle = '#4dc44fc0'

    bookings.forEach(b => {
        const { printerNumber, startMinutes, endMinutes, email } = b

        const printerIndex = printerNumber - 1

        if (printerIndex < 0 || printerIndex >= layout.columnCount) return
        if (endMinutes <= startMinutes) return
        
        const x = layout.printerToX(printerIndex) + layout.columnPadding / 2
        const y = layout.timeToY(startMinutes)
        const h = (endMinutes - startMinutes) * layout.pixelsPerMinute
        const w = layout.columnWidth - layout.columnPadding

        if (email == userEmail) {
            ctx.strokeStyle = '#34aeffff'
            ctx.fillStyle = '#386380c0'
        }

        ctx.fillRect(x, y, w, h)
        ctx.strokeRect(x, y, w, h)

        ctx.fillStyle = '#ffffff'
        const text = email || 'Booked'
        const textWidth = ctx.measureText(text).width
        const textX = x + 4
        const textY = y + Math.min(h / 2, 10)
        ctx.fillText(text, textX, textY)

        ctx.strokeStyle = '#58d15cff'
        ctx.fillStyle = '#419743c0'
    })

    if (drag) {
        const minMinutes = Math.min(drag.startMinutes, drag.endMinutes)
        const maxMinutes = Math.max(drag.startMinutes, drag.endMinutes)

        if (
            drag.printerIndex >= 0 &&
            drag.printerIndex < layout.columnCount &&
            maxMinutes > minMinutes
        ) {
            const x = layout.printerToX(drag.printerIndex) + layout.columnPadding / 2 - 1
            const y = layout.timeToY(minMinutes) + 1
            const h = (maxMinutes - minMinutes) * layout.pixelsPerMinute - 2
            const w = layout.columnWidth - layout.columnPadding + 2

            ctx.strokeStyle = '#2196f3'
            ctx.strokeRect(x, y, w, h)

            ctx.fillStyle = '#2196f333'
            ctx.fillRect(x, y, w, h)
        }
    }
}