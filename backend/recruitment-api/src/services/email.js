
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export const emailConfigured = Boolean(resend);

export async function verifyEmailConnection() {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return true;
}

export async function sendEmail({ to, subject, text }) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "HireMind <onboarding@resend.dev>",
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
  });

  if (error) {
    console.error("Resend delivery failure:", error);
    throw new Error(error.message || "Email delivery failed.");
  }

  console.log("Email sent successfully:", data?.id);
  return { messageId: data?.id };
}
