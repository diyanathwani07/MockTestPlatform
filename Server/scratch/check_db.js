require('dotenv').config();
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const PracticeQuiz = require('../models/PracticeQuiz');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const quizzes = await Quiz.find({ title: /testing/i });
  console.log("=== EXAM QUIZZES ===");
  quizzes.forEach(q => {
    console.log({
      id: q._id,
      title: q.title,
      quizType: q.quizType,
      publishAs: q.publishAs,
      resultReleaseMode: q.resultReleaseMode,
      showResultAfterSubmission: q.showResultAfterSubmission,
      showCorrectAnswers: q.showCorrectAnswers,
      practiceShowCorrectAnswers: q.practiceShowCorrectAnswers
    });
  });

  const practices = await PracticeQuiz.find({ title: /testing/i });
  console.log("=== PRACTICE QUIZZES ===");
  practices.forEach(p => {
    console.log({
      id: p._id,
      title: p.title,
      linkedExamId: p.linkedExamId,
      showResultAfterSubmission: p.showResultAfterSubmission,
      showCorrectAnswers: p.showCorrectAnswers,
      practiceResultReleaseMode: p.practiceResultReleaseMode
    });
  });

  mongoose.connection.close();
});
