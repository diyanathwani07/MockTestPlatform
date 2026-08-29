require("dotenv").config();
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

console.log("=== STARTUP DEBUG LOGS ===");
console.log("GEMINI_API_KEY Exists:", !!process.env.GEMINI_API_KEY);
console.log("API Key Length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log("Vertex Mode:", process.env.GOOGLE_GENAI_USE_VERTEXAI);
console.log("Google Credentials:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log("Cloud Project:", process.env.GOOGLE_CLOUD_PROJECT);
console.log("==========================");

const quizRoutes = require("./routes/quizRoutes");
const authRoutes = require("./routes/authRoutes");
const adminResultRoutes = require("./routes/adminResultRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const presetRoutes = require("./routes/presetRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const chatRoutes = require("./routes/chatRoutes");
const practiceRoutes = require("./routes/practiceRoutes");
const questionRoutes = require("./routes/questionRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const questionBankRoutes = require("./routes/questionBankRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const aiRoutes = require("./routes/aiRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const aiTestRoutes = require("./routes/aiTestRoutes");
const Quiz = require("./models/Quiz");
const seedDepartments = require("./scripts/seedDepartments");

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const resultRoutes = require("./routes/resultRoutes");
const examSeriesRoutes = require("./routes/examSeriesRoutes");
const ExamSeries = require("./models/ExamSeries");

const app = express();
const PORT = 5000;
const path = require("path");

// Trust proxy to properly capture real IP addresses behind load balancers/reverse proxies (e.g., AWS, Heroku, Nginx)
app.set("trust proxy", true);

// Change DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// MongoDB Connection
connectDB().then(async () => {
  seedDepartments();

  // One-time database migration backfill: Group existing unlinked quizzes under a default 'Ungrouped Mocks' parent series
  try {
    const unlinkedQuizzes = await Quiz.find({ examSeriesId: null, quizType: "exam" });
    if (unlinkedQuizzes.length > 0) {
      console.log(`[Migration] Found ${unlinkedQuizzes.length} unlinked quizzes. Creating default 'Ungrouped Mocks' series...`);
      let ungroupedSeries = await ExamSeries.findOne({ slug: "ungrouped-mocks" });
      if (!ungroupedSeries) {
        ungroupedSeries = await ExamSeries.create({
          title: "Ungrouped Mocks",
          slug: "ungrouped-mocks",
          description: "Quizzes that do not belong to any specific exam series.",
          category: "General",
          isPublished: true,
        });
      }
      const result = await Quiz.updateMany(
        { examSeriesId: null, quizType: "exam" },
        { $set: { examSeriesId: ungroupedSeries._id } }
      );
      console.log(`[Migration] Backfilled ${result.modifiedCount} quizzes to 'Ungrouped Mocks'.`);
    }
  } catch (err) {
    console.error("[Migration Error] Failed to backfill unlinked quizzes:", err);
  }
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Home Route
app.get("/", (req, res) => {
  res.send("Teaching Pariksha API Running 🚀");
});



app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/exam-series", examSeriesRoutes);
app.use("/api/users/upload-profile", uploadRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/departments", departmentRoutes);
app.use("/api/admin/results", adminResultRoutes);
app.use("/api/presets", presetRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/question-banks", questionBankRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ai/questions", require("./routes/aiQuestionRoutes"));
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai-tests", aiTestRoutes);
// Background Scheduler: Checks every 30 seconds for due scheduled quizzes and publishes them
setInterval(async () => {
  try {
    const now = new Date();
    const scheduledQuizzes = await Quiz.find({
      status: "Scheduled",
      published: false,
      scheduledDate: { $lte: now }
    });

    if (scheduledQuizzes.length > 0) {
      console.log(`[Scheduler] Found ${scheduledQuizzes.length} scheduled quiz(zes) to publish.`);
      for (const quiz of scheduledQuizzes) {
        quiz.status = "Published";
        quiz.published = true;
        await quiz.save();
        console.log(`[Scheduler] Successfully published quiz: "${quiz.title}" (ID: ${quiz._id})`);
      }
    }
  } catch (error) {
    console.error("[Scheduler Error] Failed to process scheduled quizzes:", error);
  }
}, 30000);

// Initialize monthly audit log email scheduler
const { startReportScheduler } = require("./services/reportScheduler");
startReportScheduler();

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});