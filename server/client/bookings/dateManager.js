const socket = io()

const datePicker = document.getElementById('datePicker')

const params = new URLSearchParams(window.location.search)
const date = params.get('date')|| dateObjectToString(new Date())
setDateInUrl(date)
computeLayout(canvas, TIMETABLE_CONFIG)
loadTimetable(date)

function dateObjectToString(dateObject) {
    const year = dateObject.getFullYear()
    const month = String(dateObject.getMonth() + 1).padStart(2, '0') // Month is zero-indexed
    const day = String(dateObject.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}` // YYYY-MM-DD
}

function dateStringToObject(dateString) {
    return new Date(dateString)
}

function setDateInUrl(newDate) {
    const params = new URLSearchParams(window.location.search)
    params.set('date', newDate)

    const newUrl = window.location.pathname + '?' + params.toString()

    history.pushState({}, '', newUrl)
}

window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search)
    const date = params.get('date') || dateObjectToString(new Date())
    loadTimetable(date)
})

datePicker.addEventListener('change', (e) => {
    const newDate = e.target.value

    setDateInUrl(newDate)
    loadTimetable(newDate)
})

window.addEventListener('resize', () => {
    computeLayout(canvas, TIMETABLE_CONFIG)
})