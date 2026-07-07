const mongoose = require('mongoose');
require('dotenv').config();
const PracticeQuiz = require('./models/PracticeQuiz');
const User = require('./models/User');
const connectDB = require('./config/db');

async function seed() {
  await connectDB();
  const admin = await User.findOne();
  if (!admin) {
    console.log("No users found to attach to quiz");
    process.exit(1);
  }

  const quiz = new PracticeQuiz({
    title: "Basic JavaScript Practice",
    subject: "JavaScript",
    description: "A simple practice test for JS fundamentals",
    createdBy: admin._id,
    questions: [
      {
        questionEnglish: "Which of the following is NOT a JavaScript data type?",
        options: ["String", "Boolean", "Float", "Undefined"],
        correctAnswer: "Float",
        aiGenerated: false
      },
      {
        questionEnglish: "What does HTML stand for?",
        options: ["Hyper Text Markup Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language", "Hyper Tool Markup Language"],
        correctAnswer: "Hyper Text Markup Language",
        aiGenerated: false
      }
    ]
  });

  await quiz.save();
  console.log("Seeded practice quiz:", quiz._id);
  process.exit(0);
}

seed();
