const mongoose = require('mongoose');
require('dotenv').config();
const Quiz = require('../models/Quiz');
const ExamSeries = require('../models/ExamSeries');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const uptet = await ExamSeries.findOne({ slug: 'uptet' });
  if (uptet) {
    const res = await Quiz.updateMany({ title: 'Indian politics' }, { $set: { examSeriesId: uptet._id } });
    console.log('Successfully updated "Indian politics" quizzes:', res);
  } else {
    console.log('UPTET exam series not found');
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
