const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try {
    // 1. Create the "Postman" (Transporter)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,     // Your Gmail address
        pass: process.env.SMTP_PASSWORD,  // Your App Password (NOT your real Gmail password)
      },
    });

    // 2. Define the letter
    const mailOptions = {
      from: `Teaching Pariksha <${process.env.SMTP_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html: options.message, // We use 'html' instead of 'text' so you can send pretty UI cards!
    };

    // 3. Send it
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email successfully dispatched to: ${options.email}`);
    return true;

  } catch (error) {
    console.error("SMTP Delivery Crash:", error.message);
    return false;
  }
};

module.exports = sendEmail;