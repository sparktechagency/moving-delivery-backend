import nodemailer from 'nodemailer';
import config from '../app/config';

const sendEmail = async (to: string, html: string, subject?: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com.',
    port: 587,
    secure: config.NODE_ENV?.includes('production'),
    auth: {
      user: config.send_email.nodemailer_email,
      pass: config.send_email.nodemailer_password,
    },
  });

  await transporter.sendMail({
    from: config.send_email.nodemailer_email,
    to,
    subject: subject ? subject : 'User Varification Email',
    text: 'Varify Email with in 10 mins',
    html,
  });
};

export default sendEmail;
