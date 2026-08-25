const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try {
    // 1. Create the "Postman" (Transporter)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      family: 4, // Force IPv4
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // 2. Define the letter
    const mailOptions = {
      from: `Teaching Pariksha <${process.env.MAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.message, // We use 'html' instead of 'text' so you can send pretty UI cards!
      attachments: options.attachments || []
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