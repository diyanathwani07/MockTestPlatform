const https = require("https");
https.get("https://mocktestplatform.onrender.com/api/quizzes/metadata/suggestions", {
    headers: { "Authorization": "Bearer fake" }
}, (res) => {
  console.log("Status Code:", res.statusCode);
  res.on("data", (d) => process.stdout.write(d));
}).on("error", (e) => console.error(e));
