require("dotenv").config();

const quizRoutes = require("./routes/quizRoutes");
const authRoutes = require("./routes/authRoutes");
const adminResultRoutes = require("./routes/adminResultRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const presetRoutes = require("./routes/presetRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const Quiz = require("./models/Quiz");


const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const resultRoutes = require("./routes/resultRoutes");

const app = express();
const PORT = 5000;
const dns = require("dns");

// Change DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// MongoDB Connection
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Home Route
app.get("/", (req, res) => {
  res.send("Teaching Pariksha API Running 🚀");
});

// 🧠 THE DYNAMIC GRADER: Grades any test in the database instantly
app.post("/submit", (req, res) => {
  const { userAnswers, questions } = req.body;

  if (!userAnswers || !questions) {
    return res.status(400).json({
      error: "Missing exam data packets",
    });
  }

  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const total = questions.length;

  questions.forEach((q, index) => {
    const userAns = userAnswers[index];
    const actualAnswer = q.correctAnswer; // <-- Pulled directly out of MongoDB's question object!

    if (userAns === undefined || userAns === null || userAns === "") {
      unanswered++;
    } else if (
      String(userAns).trim().toLowerCase() === String(actualAnswer).trim().toLowerCase()
    ) {
      score++;
      correct++;
    } else {
      incorrect++;
    }
  });

  const percentage = total > 0 ? ((score / total) * 100).toFixed(2) : "0.00";

  res.json({
    success: true,
    score,
    total,
    correct,
    incorrect,
    unanswered,
    percentage,
    questions, // Already contains the real correctAnswer inside it for the Review Page!
    userAnswers,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/results", adminResultRoutes);
app.use("/api/presets", presetRoutes);
app.use("/api/audit-logs", auditLogRoutes);
// Background Scheduler: Checks every 30 seconds for due scheduled quizzes and publishes them
setInterval(async () => {
  try {
    const now = new Date();
    const scheduledQuizzes = await Quiz.find({
      status: "Scheduled",
      published: false,
      scheduledDate: { $lte: now }
    });

    if (scheduledQuizzes.length > 0) {
      console.log(`[Scheduler] Found ${scheduledQuizzes.length} scheduled quiz(zes) to publish.`);
      for (const quiz of scheduledQuizzes) {
        quiz.status = "Published";
        quiz.published = true;
        await quiz.save();
        console.log(`[Scheduler] Successfully published quiz: "${quiz.title}" (ID: ${quiz._id})`);
      }
    }
  } catch (error) {
    console.error("[Scheduler Error] Failed to process scheduled quizzes:", error);
  }
}, 30000);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});