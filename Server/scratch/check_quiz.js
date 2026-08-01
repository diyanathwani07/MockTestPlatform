const mongoose = require('mongoose');
require('dotenv').config();
const Quiz = require('../models/Quiz');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const quizzes = await Quiz.find({}).select('title examName isPaid price detailedDescription plans');
  console.log('Quizzes in DB:');
  for (const q of quizzes) {
    console.log(`- Title: ${q.title} | examName: ${q.examName} | isPaid: ${q.isPaid} | price: ${q.price}`);
    console.log(`  detailedDescription: "${q.detailedDescription}"`);
    console.log(`  plans:`, q.plans);
  }
  process.exit(0);
});
