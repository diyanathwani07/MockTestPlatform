const mongoose = require("mongoose");
require("dotenv").config();
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/mocktest").then(async () => {
    const Quiz = require("./models/Quiz");
    const quizzes = await Quiz.find().limit(5);
    quizzes.forEach(q => console.log(`Title: ${q.title}, examName: '${q.examName}', subject: '${q.subject}'`));
    process.exit(0);
}).catch(console.error);
