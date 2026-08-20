const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const Quiz = require('../models/Quiz');
const ExamSeries = require('../models/ExamSeries');

const dbUri = process.env.MONGO_URI;
console.log('Connecting to:', dbUri);

mongoose.connect(dbUri).then(async () => {
  const quizzes = await Quiz.find({ 
    $or: [{ published: true }, { status: 'Published' }]
  });
  console.log('Quizzes Count:', quizzes.length);
  for (const q of quizzes) {
    const series = await ExamSeries.findById(q.examSeriesId);
    console.log('- Title:', q.title, '| examSeriesId:', q.examSeriesId, '| SeriesTitle:', series ? series.title : 'None', '| quizType:', q.quizType, '| published:', q.published, '| status:', q.status);
  }
  
  console.log('\n--- Exam Series ---');
  const seriesList = await ExamSeries.find({});
  for (const s of seriesList) {
    console.log('- Title:', s.title, '| _id:', s._id, '| isPublished:', s.isPublished);
  }
  process.exit(0);
}).catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});
