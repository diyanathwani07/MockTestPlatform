const fetch = require("node-fetch");
require("dotenv").config({ path: "./.env" });

async function testEmail() {
  console.log("Using API Key:", process.env.BREVO_API_KEY ? "EXISTS" : "MISSING");
  console.log("Sender:", process.env.BREVO_SENDER_EMAIL);
  
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "PrepMark Test",
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: process.env.BREVO_SENDER_EMAIL }],
      subject: "Test Email from Backend",
      htmlContent: "<p>This is a test.</p>",
    }),
  });

  const data = await response.json();
  console.log("Status:", response.status);
  console.log("Response:", data);
}
testEmail();
