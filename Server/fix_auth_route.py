path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Server/routes/authRoutes.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_route = """
// SEND REGISTER OTP
router.post("/send-register-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // We can also allow phone, but the current DB uses email/phone interchangeably
    const user = await User.findOne({ 
      $or: [
        { email: email },
        { phone: email }
      ]
    });

    if (user) {
      return res.status(400).json({
        message: "An account with this email or phone already exists.",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    // Store OTP with email and expiry
    otpStore.set(email, { otp, expiresAt });
    console.log(`[REGISTER] OTP for ${email}: ${otp}`); 

    const isEmail = email.includes("@");
    
    // Only try to send email if it's an email address
    if (isEmail) {
      try {
        const emailPromise = sendEmail({
          email,
          subject: "PrepMark - Verify your email",
          message: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
              <div style="background: white; border-radius: 12px; padding: 24px 16px; text-align: center;">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Your Registration OTP</p>
                <div style="background: #f1f5f9; border-radius: 8px; padding: 20px 8px; margin-bottom: 24px;">
                  <h1 style="color: #6E3FF3; font-size: 32px; letter-spacing: 4px; margin: 0;">${otp}</h1>
                </div>
              </div>
            </div>
          `
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SMTP Connection or Send Timeout")), 15000)
        );

        await Promise.race([emailPromise, timeoutPromise]);
      } catch (mailError) {
        console.warn("Mail Send Failed or Timed Out:", mailError.message);
      }
    }
    
    res.json({
      message: "OTP sent successfully. (Check terminal in dev mode)",
    });

  } catch (error) {
    console.error("Send Register OTP Error:", error);
    res.status(500).json({
      message: "Failed to send OTP. Please try again.",
    });
  }
});
"""

content = content.replace("// FORGOT PASSWORD", new_route + "\n// FORGOT PASSWORD")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added /send-register-otp endpoint")
