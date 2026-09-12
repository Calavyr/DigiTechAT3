const nodemailer = require('nodemailer')
const fs = require('fs')

require('dotenv').config({ path: 'config.env' })

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    },
})

sendVerificationEmail = async (address, verificationId) => { // Done
    let emailHtml = fs.readFileSync('verificationEmailTemplate.html').toString()
    let emailPlaintext = fs.readFileSync('verificationEmailPlaintextTemplate.txt').toString()
    const domain = process.env.DOMAIN
    emailHtml = emailHtml.replace('LINKGOESHERE', `https://google.com`)
    emailPlaintext = emailPlaintext.replace('LINKGOESHERE', `${domain}/verify/${verificationId}`)

    const mailOptions = {
        from: "EMAIL",
        to: address,
        subject: "Email Verification",
        text: emailPlaintext,
        html: emailHtml
    }
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending verification email: ", error)
        } else {
            console.log("Succesfully sent email: ", info)
        }
    })
}

sendVerificationEmail('thomas.elson@gihs.sa.edu.au', 'VERIFICATION_ID_HERE')