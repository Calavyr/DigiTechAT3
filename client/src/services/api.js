const API_BASE = '/api'

export async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`

    options.credentials = 'include'
    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers
    }

    try {
        const response = await fetch(url, options)
        const data = await response.json().catch(() => ({}))

        if (!response.ok && endpoint != '/auth/me') {
            throw new Error(data.message || `HTTP error. Status ${response.status}`)
        }
        return data
    } catch (err) {
        if (endpoint != '/auth/me') console.error('API request failure: ', err)
        throw err
    }
}