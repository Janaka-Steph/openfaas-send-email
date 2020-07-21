import crypto from 'crypto'
import dotenv from 'dotenv'
import fs from 'fs'
import nodemailer from 'nodemailer'
import yup from 'yup'
import {promisify} from 'util'

const readFile = promisify(fs.readFile)

export default async (event) => {
  const body = parseBody(event.body)

  // Check HMAC
  const hmacKey = await readFile('/var/openfaas/secrets/hmac-cluster', 'utf8')
  const messageMAC = event.headers['hmac']
  if (!validateHMAC(JSON.stringify(body), hmacKey, messageMAC)) {
    throw new Error('HMAC validation failed')
  }

  let {from_name, from_email, to_email, message, subject} = body

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

  if (subject === 'CSP Violation Report') {
    const payload = JSON.parse(message.payload)
    const msg = {...payload, ...message.headers}
    message = JSON.stringify(msg,null, 2)
  }

  return sendEmail(from_name, from_email, to_email, message, subject)
}

const sendEmail = async (from_name, from_email, to_email, message, subject) => {
  const config = await readFile('/var/openfaas/secrets/send-email-config', 'utf8')
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

const parseBody = (str) => {
  try {
    return JSON.parse(str)
  } catch (e) {
    return str
  }
}

const validateHMAC = (message, hmacKey, hash) => {
  const receivedHash = getHash(hash)
  const createdHash = crypto.createHmac('sha256', hmacKey)
   .update(message)
   .digest('hex')
  return receivedHash === createdHash
}

// GitHub and the sign flag prefix the hash with "sha1="
const getHash = (hash) => {
  if (hash) {
    if (hash.startsWith('sha1=')) {
      return hash.substring(5)
    } else if (hash.startsWith('sha256=')) {
      return hash.substring(7)
    } else {
      return hash
    }
  } else {
    throw new Error('HMAC should be provided in the request header')
  }
}