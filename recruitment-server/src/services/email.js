import nodemailer from "nodemailer";
import { config } from "../config.js";

export const emailConfigured = Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

export async function sendEmail({ to, subject, text }) {
  if (!emailConfigured) throw new Error("Email delivery is not configured. Add SMTP settings to the recruitment server environment.");
  const transporter = nodemailer.createTransport({ host: config.smtp.host, port: config.smtp.port, secure: config.smtp.port === 465, auth: { user: config.smtp.user, pass: config.smtp.pass } });
  const result = await transporter.sendMail({ from: config.smtp.from, to, subject, text });
  return { messageId: result.messageId };
}
