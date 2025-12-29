// lib/auth/reset-email.ts
import 'server-only';
import nodemailer from 'nodemailer';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // 465 requires TLS
  auth: {
    user: process.env.EMAIL!,            // e.g. noreplystanfordreachlab@gmail.com
    pass: process.env.EMAIL_PASSWORD!,   // Gmail App Password (16 chars)
  },
});

function buildResetLink(token: string) {
  return `${APP_URL}/forgotPassword/resetPassword?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = buildResetLink(token);
  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? `REACH Lab <${process.env.EMAIL}>`,
    to,
    subject: 'Reset your password',
    html: `<p>Click <a href="${link}">this link</a> to reset your password. It expires in 1 hour.</p>`,
    text: `Reset your password: ${link}`,
  });
  return link;
}
