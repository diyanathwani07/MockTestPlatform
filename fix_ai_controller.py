import re

with open('Server/controllers/aiTestController.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(
    r"// Atomic credit reservation.*?(?:const refundCredits = async \(\) => \{.*?\n\s*\};\n)",
    re.DOTALL
)

replacement = '''// Atomic usage reservation
    const activeSub = await Subscription.findOneAndUpdate(
      {
        studentId: req.user._id,
        status: "active",
        expr: { lt: ["aiTestsUsed", "maxAITests"] }
      },
      {
        inc: { aiTestsUsed: 1 }
      },
      { new: true }
    );

    if (!activeSub) {
      const checkUser = await User.findById(req.user._id);
      if (!checkUser || !checkUser.isPremium) {
        return res.status(403).json({
          message: "Premium access required. Please upgrade to use the AI Test Builder.",
          code: "PREMIUM_REQUIRED"
        });
      }
      return res.status(402).json({
        message: "You have used all AI test generations included in your plan.",
        code: "INSUFFICIENT_ALLOWANCE"
      });
    }

    let allowanceReserved = true;

    const refundAllowance = async () => {
      if (allowanceReserved) {
        await Subscription.findByIdAndUpdate(activeSub._id, { inc: { aiTestsUsed: -1 } });
        allowanceReserved = false;
      }
    };
'''

content = pattern.sub(replacement, content)

content = content.replace("refundCredits()", "refundAllowance()")
content = content.replace("refundCredits", "refundAllowance")
content = content.replace("creditsRemaining: updatedUser.aiCredits", "aiTestsRemaining: activeSub.maxAITests - activeSub.aiTestsUsed")

with open('Server/controllers/aiTestController.js', 'w', encoding='utf-8') as f:
    f.write(content)
