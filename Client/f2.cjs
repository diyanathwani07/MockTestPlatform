const fs = require("fs");
const p = "c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/QuizDetailsModal.jsx";
console.log(fs.readFileSync(p, "utf-8").split("\n").map((l, i) => `${i+1}: ${l}`).filter((l, i) => i > 170 && i < 210).join("\n"));
