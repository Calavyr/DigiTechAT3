const emailInput = document.getElementById('emailInput')
const passwordInput = document.getElementById('passwordInput')
const togglePasswordButton = document.getElementById('togglePasswordButton')
const registerAccountButton = document.getElementById('registerAccountButton')

togglePasswordButton.onclick = () => {
    if (passwordInput.type == 'password') {
        passwordInput.type = 'text'
    } else {
        passwordInput.type = 'password'
    }
}

registerAccountButton.onclick = async () => {
    const email = emailInput.value
    const password = passwordInput.value

    const url = '/api/auth/register'
    try {
        const fetchOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({ email, password })
        }
        const response = await apiFetch(url, fetchOptions)
        if (response.ok) {
            alert('Check your email to verify the login. If you don\'t get an email within 5 minutes, try again.')
            window.location.href = '../login'
        } else {
            alert('There was an error on the server. Please try again.')
        }
    } catch (err) {
        console.error('Error registering account: ', err)
    }
}