
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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
    from:
      process.env.EMAIL_FROM ||
      "HireMind <onboarding@resend.dev>",
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
  });

  if (error) {
    console.error("Resend delivery failure:", error);
    throw new Error(error.message || "Resend email delivery failed.");
  }

  console.log("Resend email sent successfully:", data?.id);

  return { messageId: data?.id };
}
