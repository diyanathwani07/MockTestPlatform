const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    const data = await resend.emails.send({
      from: 'PrepMark <onboarding@resend.dev>',
      to: options.email,
      subject: options.subject,
      html: options.message,
    });

    console.log(`✉️ Email successfully dispatched to: ${options.email}`, data);
    return true;
  } catch (error) {
    console.error("Email Delivery Crash:", error.message);
    return false;
  }
};

module.exports = sendEmail;