const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const Quiz = require('./models/Quiz');
const ExamSeries = require('./models/ExamSeries');

const dbUri = process.env.MONGO_URI;

mongoose.connect(dbUri).then(async () => {
  const series = await ExamSeries.find({ isPublished: true }).sort({ createdAt: -1 });
  const seriesIds = series.map(s => s._id);

  const allQuizzes = await Quiz.find({
    examSeriesId: { $in: seriesIds },
    isDeleted: { $ne: true },
    $or: [{ published: true }, { status: "Published" }]
  }).select("_id title subject examSeriesId quizType updatedAt createdAt").sort({ createdAt: -1 });

  const quizMap = {};
  allQuizzes.forEach(q => {
    const sid = String(q.examSeriesId);
    if (!quizMap[sid]) quizMap[sid] = [];
    quizMap[sid].push(q);
  });

  series.forEach(s => {
    const qList = quizMap[String(s._id)] || [];
    console.log('Series:', s.title, '| PaperCount:', qList.length, '| Quizzes:', qList.map(q => q.title));
  });

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
