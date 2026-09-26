/**
 * Email utility using Brevo (formerly Sendinblue) HTTP API.
 * 
 * Why Brevo instead of Resend?
 * - Resend free tier only delivers to the account owner's email.
 * - Brevo free tier (300 emails/day) delivers to ANY email address.
 * - Uses HTTP API so it works on Render (which blocks SMTP ports).
 * 
 * Setup:
 * 1. Sign up free at https://brevo.com
 * 2. Go to SMTP & API → API Keys → Generate a new key
 * 3. Add BREVO_API_KEY to your .env and Render env vars
 * 4. Your signup email is auto-verified as a sender
 */

const sendEmail = async (options) => {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "PrepMark",
          email: process.env.BREVO_SENDER_EMAIL || "prepmark.platform@gmail.com",
        },
        to: [{ email: options.email }],
        subject: options.subject,
        htmlContent: options.message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo API Error:", data);
      return false;
    }

    console.log(`✉️ Email successfully dispatched to: ${options.email}`, data);
    return true;
  } catch (error) {
    console.error("Email Delivery Crash:", error.message);
    return false;
  }
};

module.exports = sendEmail;