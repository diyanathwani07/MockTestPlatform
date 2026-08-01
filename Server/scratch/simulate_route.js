const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Quiz = require('../models/Quiz');
const ExamSeries = require('../models/ExamSeries');

const dbUri = process.env.MONGO_URI;
mongoose.connect(dbUri).then(async () => {
  const user = await User.findOne({ email: "diya.nathwani.ai@ghrce.raisoni.net" });
  console.log('User found:', user.fullName, 'ID:', user._id.toString());
  console.log('User purchasedExams:', user.purchasedExams);

  const series = await ExamSeries.findOne({ title: "UPTET" });
  console.log('Series found:', series.title, 'ID:', series._id.toString());

  const quizzes = await Quiz.find({ examSeriesId: series._id, isDeleted: { $ne: true } });
  console.log('Quizzes count:', quizzes.length);

  const purchasedExamIds = (user.purchasedExams || []).map(id => id.toString());
  console.log('Purchased Exam IDs as strings:', purchasedExamIds);

  const quizzesWithPurchaseStatus = quizzes.map(q => {
    const qObj = q.toObject();
    qObj.isPurchased = purchasedExamIds.includes(qObj._id.toString());
    console.log(`- Quiz: ${qObj.title} | isPurchased: ${qObj.isPurchased} | ID: ${qObj._id.toString()}`);
    return qObj;
  });

  process.exit(0);
});
