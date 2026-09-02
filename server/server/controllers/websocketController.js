let ioInstance = null

function setupWebsockets(io) {
    ioInstance = io

    io.on('connection', (socket) => {
        let currentRoom = null
        
        socket.on('changeDate', (dateString) => {
            // dateString is "YYYY-MM-DD" from client

            if (currentRoom) {
                socket.leave(currentRoom)
            }

            socket.join(dateString)
            currentRoom = dateString
        })

        socket.on('disconnect', () => {
        })
    })
}

function liveUpdateBookingCreated(booking) {
    if (!ioInstance) return

    ioInstance.to(booking.date).emit('bookingCreated', booking)
}

function liveUpdateBookingDeleted(booking) {
    if (!ioInstance) return

    ioInstance.to(booking.date).emit('bookingDeleted', booking)
}

module.exports = {
    setupWebsockets,
    liveUpdateBookingCreated,
    liveUpdateBookingDeleted
}