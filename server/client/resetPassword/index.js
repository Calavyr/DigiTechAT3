const emailInput = document.getElementById('emailInput')
const passwordInput = document.getElementById('passwordInput')
const togglePasswordButton = document.getElementById('togglePasswordButton')
const resetPasswordButton = document.getElementById('resetPasswordButton')

togglePasswordButton.onclick = () => {
    if (passwordInput.type == 'password') {
        passwordInput.type = 'text'
    } else {
        passwordInput.type = 'password'
    }
}

resetPasswordButton.onclick = async () => {
    const email = emailInput.value
    const password = passwordInput.value

    const url = '/api/auth/registerUser'
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
            alert('Check your email to verify the password reset. If you don\'t get an email within 5 minutes, try again.')
            window.location.href = '../login'
        } else {
            alert('There was an error on the server. Please try again.')
        }
    } catch (err) {
        console.error('Error resetting password: ', err)
    }
}