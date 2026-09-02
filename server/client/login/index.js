const emailInput = document.getElementById('emailInput')
const passwordInput = document.getElementById('passwordInput')
const togglePasswordButton = document.getElementById('togglePasswordButton')
const loginButton = document.getElementById('loginButton')

togglePasswordButton.onclick = () => {
    if (passwordInput.type == 'password') {
        passwordInput.type = 'text'
    } else {
        passwordInput.type = 'password'
    }
}

loginButton.onclick = async () => {
    const email = emailInput.value
    const password = passwordInput.value

    const url = '/api/auth/login'
    try {
        const fetchOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({ email: email, password: password })
        }
        const response = await apiFetch(url, fetchOptions)
        
        if (response.ok) {
            alert('Succesfully logged in. You are being redirected.')
            window.location.href = '../bookings'
        } else {
            alert('There was an error on the server. Please try again.')
        }
    } catch (err) {
        console.error('Error logging in: ', err)
    }
}