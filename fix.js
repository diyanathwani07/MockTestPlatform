const fs = require("fs");
let code = fs.readFileSync("Server/controllers/aiTestController.js", "utf8");
code = code.replace(/`\$expr:/g, "$expr:");
code = code.replace(/`\$lt:/g, "$lt:");
code = code.replace(/`\$aiTestsUsed/g, "$aiTestsUsed");
code = code.replace(/`\$maxAITests/g, "$maxAITests");
code = code.replace(/`\$inc:/g, "$inc:");
fs.writeFileSync("Server/controllers/aiTestController.js", code);

