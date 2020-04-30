/**
 * Send Emails
 *
 * curl --header "Content-Type: application/json" --request POST
 * --data '{ "from_name": "Amir", "from_email": "amir.gholzam@gmail.com", "message": "Hello World"}'
 * http://127.0.0.1:8080/function/bitcoin-studio-api
 */

"use strict"

const fs = require("fs")
const nodemailer = require('nodemailer')
const Yup = require('yup')
const dotenv = require('dotenv')

module.exports = async (event, context) => {

  // Validate event.body
  console.log('event.body', event.body)

  const {from_name, from_email, message} = event.body

  let schema = Yup.object().shape({
    from_name: Yup.string()
      .trim()
      .min(2, 'must be at min 2 chars long')
      .max(50, 'must be at max 50 chars long')
      .required('from_name is required'),
    from_email: Yup.string()
      .trim()
      .email('from_email is not valid')
      .required('from_email is required'),
    message: Yup.string()
      .trim()
      .max(2000, 'must be at max 2000 chars long')
      .required('message is required'),
  })

  schema.validate(event.body)
    .then(() => sendEmail(from_name, from_email, message))
    .then((emailResult) => {
      console.log('emailResult', emailResult)

      /*
      if (!emailResult.error) {
        context
          .status(200)
          .succeed(emailResult)
      }
      */
    })
}


const sendEmail = async (from_name, from_email, message) => {
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

  try {
    const info = await transporter.sendMail(mailOptions)
    return info

    /*
    return {
      message: "Email has been sent: " + info.messageId + ' : ' + info.response,
      success: true
    }
    */
  } catch (error) {
    console.log('L92 error', error)
    return error
  }
}