const fs = require("fs");
let code = fs.readFileSync("Client/src/Pages/CreateCustomQuiz.jsx", "utf8");

code = code.replace(/aiCredits: 0/g, "aiTestsRemaining: 0, maxAITests: 0, aiTestsUsed: 0");
code = code.replace(/aiCredits: response\.data\.creditsRemaining/g, "aiTestsRemaining: response.data.aiTestsRemaining, maxAITests: response.data.maxAITests, aiTestsUsed: response.data.aiTestsUsed");

code = code.replace(/1 AI Test<\/strong> will be consumed/g, "1 AI Test</strong> will be consumed from your plan limits");

fs.writeFileSync("Client/src/Pages/CreateCustomQuiz.jsx", code);

