const mongoose = require("mongoose");
require("dotenv").config();

const Quiz = require("./models/Quiz");
const Result = require("./models/Result");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d);
    }

    const startOfRange = new Date(dates[0]);
    startOfRange.setHours(0, 0, 0, 0);
    console.log("startOfRange:", startOfRange.toISOString());

    const quizzesByDay = await Quiz.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfRange }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);
    console.log("quizzesByDay aggregation:", JSON.stringify(quizzesByDay, null, 2));

    const attemptsByDay = await Result.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfRange }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);
    console.log("attemptsByDay aggregation:", JSON.stringify(attemptsByDay, null, 2));

    // Print all quizzes with their createdAt dates
    const quizzes = await Quiz.find().select("title createdAt");
    console.log("All Quizzes:");
    quizzes.forEach(q => {
      console.log(`- Title: "${q.title}", CreatedAt: ${q.createdAt ? q.createdAt.toISOString() : "undefined"}`);
    });

  } catch (error) {
    console.error("DB Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
