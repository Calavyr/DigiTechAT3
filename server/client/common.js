const apiFetch = async (path, options = {}) => { // Fetch wrapper to auto-refresh access token
    const doFetch = () => fetch(path, { credentials: 'include', ...options})

    let res = await doFetch();

    if (res.status === 401) {
        let errorJson = null
        
        try {
            errorJson = await res.json()
        } catch (err) {

        }

        const expired = errorJson && (errorJson.code === 'TOKEN_EXPIRED' || errorJson.code === 'INVALID_TOKEN')

        if (expired) {
            const refreshRes = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include'
            })

            if (refreshRes.ok) {
                res = await doFetch()
            } else {
                window.location.href = '/login'
                return
            }
        }
    }

    return res
}