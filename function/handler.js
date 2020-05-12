import fs from 'fs'
import nodemailer from 'nodemailer'
import yup from 'yup'
import dotenv from 'dotenv'

export default async (event) => {
  const {from_name, from_email, to_email, message, subject} = event.body

  const schema = yup.object().shape({
    from_name: yup.string()
      .trim()
      .min(2, 'from_name must be at min 2 chars long')
      .max(50, 'from_name must be at max 50 chars long')
      .required('from_name is required'),
    from_email: yup.string()
      .trim()
      .email('from_email is not valid')
      .required('from_email is required'),
    to_email: yup.string()
      .trim()
      .email('to_email is not valid')
      .required('to_email is required'),
    message: yup.string()
      .trim()
      .min(2, 'message must be at min 2 chars long')
      .max(2000, 'message must be at max 2000 chars long')
      .required('message is required'),
    subject: yup.string()
      .trim()
      .min(2, 'subject must be at min 2 chars long')
      .max(200, 'subject must be at max 200 chars long')
      .required('subject is required')
  })

  await schema.validate(event.body)
  return sendEmail(from_name, from_email, to_email, message, subject)
}

const sendEmail = (from_name, from_email, to_email, message, subject) => {
  const config = fs.readFileSync('/var/openfaas/secrets/config', 'utf8')
  const {EMAIL, SMTP_GMAIL_PASS} = dotenv.parse(config)

  const mailOptions = {
    from: `"${from_name}" <${from_email}>`,
    to: to_email,
    subject: subject,
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
