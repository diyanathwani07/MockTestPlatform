const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const Quiz = require('../models/Quiz');

const dbUri = process.env.MONGO_URI;
mongoose.connect(dbUri).then(async () => {
  const quizzes = await Quiz.find({});
  for (const q of quizzes) {
    console.log('Quiz Title:', q.title, '| ID:', q._id.toString());
  }
  process.exit(0);
});
