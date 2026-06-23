const mongoose = require("mongoose");
require("dotenv").config();

const Quiz = require("./models/Quiz");
const Result = require("./models/Result");

async function run() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const results = await Result.find();
    console.log(`Found ${results.length} total result documents.`);

    let updatedCount = 0;
    for (const result of results) {
      if (result.quizId) {
        const quiz = await Quiz.findById(result.quizId);
        if (quiz) {
          result.examName = quiz.examName || "";
          await result.save();
          updatedCount++;
        } else {
          console.log(`No Quiz found for quizId: ${result.quizId} (Result ID: ${result._id})`);
        }
      } else {
        console.log(`Result has no quizId: ${result._id}`);
      }
    }

    console.log(`Backfill finished. Successfully updated ${updatedCount} documents.`);
  } catch (error) {
    console.error("Backfill Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

run();
