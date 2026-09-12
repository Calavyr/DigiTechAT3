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

exports.sendVerificationEmail = async (address, verificationId) => { // Done
    let emailHtml = fs.readFileSync('verificationEmailTemplate.html', 'utf8')
    let emailPlaintext = fs.readFileSync('verificationEmailPlaintextTemplate.txt', 'utf8')
    const domain = process.env.DOMAIN
    emailHtml = emailHtml.replaceAll('LINKGOESHERE', `${domain}/verify/${verificationId}`)
    emailPlaintext = emailPlaintext.replaceAll('LINKGOESHERE', `${domain}/verify/${verificationId}`)

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: address,
        subject: "Email Verification",
        text: emailPlaintext,
        html: emailHtml
    }
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending verification email: ", info)
            return false
        } else {
            return true
        }
    })
}