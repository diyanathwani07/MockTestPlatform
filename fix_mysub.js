const fs = require("fs");
let code = fs.readFileSync("Client/src/Pages/MySubscriptions.jsx", "utf8");

code = code.replace(/aiCreditsGranted: userProfile\?\.aiCredits \|\| 100,/g, "maxAITests: fallbackPlan?.maxAITests || 10,\n        aiTestsUsed: 0,");
code = code.replace(/aiCredits: storedUser\.aiCredits \|\| 100,/g, "maxAITests: 10,\n            aiTestsUsed: 0,\n            aiTestsRemaining: 10,");

fs.writeFileSync("Client/src/Pages/MySubscriptions.jsx", code);

