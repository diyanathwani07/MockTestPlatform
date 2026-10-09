const fs = require('fs');
const p = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/admin/ManageQuizzes.jsx';
let t = fs.readFileSync(p, 'utf-8');
t = t.replace(/whiteSpace:\s*"nowrap"\s*\}\}>\s*\{quiz\.subject\}/, 'whiteSpace: "normal", maxWidth: "250px", wordWrap: "break-word" }}>\n                            {quiz.subject}');
fs.writeFileSync(p, t);
console.log("Done");
