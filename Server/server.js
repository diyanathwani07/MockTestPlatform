const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ✅ Correct answers
const answers = [
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

// ✅ HOME
app.get("/", (req, res) => {
  res.send("Server Running 🚀");
});

// ✅ SUBMIT QUIZ (NO DATABASE)
app.post("/submit", (req, res) => {
  const { userAnswers } = req.body;

  if (!userAnswers) {
    return res.status(400).json({ error: "No answers received" });
  }

  let score = 0;

  answers.forEach((correct, i) => {
    if (userAnswers[i] === correct) {
      score++;
    }
  });

  const total = answers.length;
  const percentage = (score / total) * 100;

  res.json({
    success: true,
    score,
    total,
    percentage,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});