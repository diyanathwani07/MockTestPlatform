const authRoutes = require("./routes/authRoutes");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

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

// Correct Answers
const Answers = [
  "Library",
  "Meta",
  "JavaScript XML",
  "Hook",
  "Side effects",
  "JavaScript",
  "Reusable UI",
  "Copy of real DOM",
  "Data passing",
  "useState",
  "Meta",
  "Single Page App",
  "Virtual DOM",
  "Data storage",
  "React Router",
  "JavaScript XML",
  "Package Manager",
  "Frontend Library",
  "Meta",
  "Unique ID",
  "State management",
  "useEffect",
  "User action",
  "Declarative",
  "Special function",
  "Compiler",
  "JSX",
  "Rendering based on condition",
  "Empty wrapper",
  "UI development",
];

// Home Route
app.get("/", (req, res) => {
  res.send("Teaching Pariksha API Running 🚀");
});

// Submit Quiz
app.post("/submit", (req, res) => {
  const { userAnswers, questions } = req.body;

  if (!userAnswers) {
    return res.status(400).json({
      error: "No answers received",
    });
  }

  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const total = Answers.length;

  Answers.forEach((correctAnswer, index) => {
    const userAns = userAnswers[index];

    if (userAns === undefined || userAns === null) {
      unanswered++;
    } else if (userAns === correctAnswer) {
      score++;
      correct++;
    } else {
      incorrect++;
    }
  });

  const percentage = ((score / total) * 100).toFixed(2);

  // attach correctAnswer to each question so Result page can show the review
  const questionsWithAnswers = (questions || []).map((q, i) => ({
    ...q,
    correctAnswer: Answers[i],
  }));

  res.json({
    success: true,
    score,
    total,
    correct,
    incorrect,
    unanswered,
    percentage,
    questions: questionsWithAnswers,
    userAnswers,
  });
});

app.use("/api/auth", authRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});