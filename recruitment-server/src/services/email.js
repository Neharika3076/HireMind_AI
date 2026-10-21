
import nodemailer from "nodemailer";
import { config } from "../config.js";

export const emailConfigured = Boolean(
  config.smtp.host &&
  config.smtp.user &&
  config.smtp.pass &&
  config.smtp.from
);

const transporter = emailConfigured
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  : null;

export async function verifyEmailConnection() {
  if (!transporter) {
    throw new Error(
      "SMTP configuration missing. Check SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM in recruitment-server/.env"
    );
  }

  await transporter.verify();
  return true;
}

export async function sendEmail({ to, subject, text }) {
  if (!transporter) {
    throw new Error(
      "SMTP is not configured. Check recruitment-server/.env"
    );
  }

  try {
    const result = await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
    });

    return { messageId: result.messageId };
  } catch (error) {
    console.error("Nodemailer delivery failure:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });

    throw error;
  }
}
if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error("SMTP verification failed:", error.message);
    } else {
      console.log("SMTP server is ready");
    }
  });
} else {
  console.log("SMTP is not configured; email features are disabled.");
}