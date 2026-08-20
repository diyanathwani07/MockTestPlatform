const mongoose = require("mongoose");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
const AuditLog = require("../models/AuditLog");

const runMigration = async () => {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect("mongodb+srv://diyanathwani_db_user:9876543210@cluster1.5j2chbp.mongodb.net/?appName=Cluster1");
    console.log("Connected Successfully!");

    const users = await User.find();
    console.log(`Found ${users.length} users in database. Checking purchase histories...`);

    let examLogsCreated = 0;
    let practiceLogsCreated = 0;

    for (const user of users) {
      // 1. Migrate Exam Purchases
      if (user.purchasedExams && user.purchasedExams.length > 0) {
        for (const examId of user.purchasedExams) {
          // Check if an audit log for this purchase already exists to prevent duplicate runs
          const targetStr = `Exam ID: ${examId}`;
          const examObj = await Quiz.findById(examId);
          const examTitle = examObj ? examObj.title : targetStr;

          const existingLog = await AuditLog.findOne({
            action: "PURCHASE_EXAM",
            performedBy: user.fullName,
            details: examTitle
          });

          if (!existingLog) {
            await AuditLog.create({
              action: "PURCHASE_EXAM",
              performedBy: user.fullName,
              details: examTitle,
              target: examTitle,
              module: "Purchase",
              ipAddress: "127.0.0.1",
              createdAt: user.updatedAt || new Date()
            });
            examLogsCreated++;
          }
        }
      }

      // 2. Migrate Practice Purchases
      if (user.purchasedPractice && user.purchasedPractice.length > 0) {
        for (const practiceId of user.purchasedPractice) {
          const targetStr = `Practice ID: ${practiceId}`;
          const practiceObj = await PracticeQuiz.findById(practiceId);
          const practiceTitle = practiceObj ? practiceObj.title : targetStr;

          const existingLog = await AuditLog.findOne({
            action: "PURCHASE_PRACTICE",
            performedBy: user.fullName,
            details: practiceTitle
          });

          if (!existingLog) {
            await AuditLog.create({
              action: "PURCHASE_PRACTICE",
              performedBy: user.fullName,
              details: practiceTitle,
              target: practiceTitle,
              module: "Purchase",
              ipAddress: "127.0.0.1",
              createdAt: user.updatedAt || new Date()
            });
            practiceLogsCreated++;
          }
        }
      }
    }

    console.log(`Migration Complete: Generated ${examLogsCreated} exam purchase logs, and ${practiceLogsCreated} practice logs.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration Error:", error);
    process.exit(1);
  }
};

runMigration();
