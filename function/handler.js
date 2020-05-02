"use strict"

const fs = require("fs")
const nodemailer = require('nodemailer')
const Yup = require('yup')
const dotenv = require('dotenv')

module.exports = async (event, context) => {
  const {from_name, from_email, message} = event.body

  const schema = Yup.object().shape({
    from_name: Yup.string()
      .trim()
      .min(2, 'from_name must be at min 2 chars long')
      .max(50, 'from_name must be at max 50 chars long')
      .required('from_name is required'),
    from_email: Yup.string()
      .trim()
      .email('from_email is not valid')
      .required('from_email is required'),
    message: Yup.string()
      .trim()
      .min(2, 'message must be at min 2 chars long')
      .max(2000, 'message must be at max 2000 chars long')
      .required('message is required'),
  })

  await schema.validate(event.body)
  return sendEmail(from_name, from_email, message)
}


const sendEmail = (from_name, from_email, message) => {
  const config = fs.readFileSync('/var/openfaas/secrets/config', 'utf8')
  const {EMAIL, SMTP_GMAIL_PASS} = dotenv.parse(config)

  const mailOptions = {
    from: `"${from_name}" <${from_email}>`,
    to: 'bitcoin-studio@protonmail.com',
    subject: 'Bitcoin Studio Website Form',
    text: message
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: EMAIL,
      pass: SMTP_GMAIL_PASS,
    }
  })

  return transporter.sendMail(mailOptions)
}
