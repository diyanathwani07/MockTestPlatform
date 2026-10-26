require("dotenv").config();
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const { validateStartupEnv } = require("./config/validateEnv");
validateStartupEnv();

console.log("=== STARTUP DEBUG LOGS ===");
console.log("GEMINI_API_KEY Exists:", !!process.env.GEMINI_API_KEY);
console.log("API Key Length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log("Vertex Mode:", process.env.GOOGLE_GENAI_USE_VERTEXAI);
console.log("Google Credentials:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log("Cloud Project:", process.env.GOOGLE_CLOUD_PROJECT);
console.log("==========================");

const quizRoutes = require("./routes/quizRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
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
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const revenueRoutes = require("./routes/revenueRoutes");
const Quiz = require("./models/Quiz");
const seedDepartments = require("./scripts/seedDepartments");
const { startSubscriptionExpiryCron } = require("./services/subscriptionExpiryCron");
const http = require("http");
const { initSocket } = require("./services/socketService");

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { initFirebaseAdmin } = require("./config/firebaseAdmin");
const { isSchedulerRunning, stopAiVoiceScheduler } = require("./services/aiVoiceSchedulerService");
const { verifyCallIndexSafety, isVoiceSubsystemReady } = require("./config/dbIntegrity");
const resultRoutes = require("./routes/resultRoutes");
const examSeriesRoutes = require("./routes/examSeriesRoutes");
const examStructureRoutes = require("./routes/examStructureRoutes");
const ExamSeries = require("./models/ExamSeries");

const app = express();
const httpServer = http.createServer(app);
const io = initSocket(httpServer);
const PORT = 5000;
const path = require("path");

// Trust proxy to properly capture real IP addresses behind load balancers/reverse proxies (e.g., AWS, Heroku, Nginx)
app.set("trust proxy", true);

// Change DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// MongoDB Connection & Startup Initialization Lifecycle
async function startServer() {
  try {
    // 1. Await database connection before accepting any application traffic
    await connectDB();

    // 2. Initialize dependent services & static seeds
    initFirebaseAdmin();
    seedDepartments();
    startSubscriptionExpiryCron();
    const { syncLegacySubscriptions } = require("./utils/subscriptionUtils");
    syncLegacySubscriptions();

    // 3. One-time database migration backfill: Group existing unlinked quizzes under a default 'Ungrouped Mocks' parent series
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

    // 4. Non-destructive safety scan & Call unique compound index verification
    const integrityCheck = await verifyCallIndexSafety();
    if (!integrityCheck.safe) {
      console.warn("[Startup Notice] AI Voice Reminder subsystem disabled due to integrity check findings.");
    } else {
      console.log("[Startup] Call unique compound index verified successfully ✅");
    }

    // 5. Initialize Schedulers
    const { startReportScheduler } = require("./services/reportScheduler");
    startReportScheduler();

    // Initialize AI Voice Reminder 1-minute background scheduler only if voice subsystem is verified safe
    const { initAiVoiceScheduler } = require("./services/aiVoiceSchedulerService");
    if (isVoiceSubsystemReady()) {
      initAiVoiceScheduler();
    } else {
      console.warn("[AiVoiceScheduler] Background scheduler skipped because voice subsystem is disabled.");
    }

    // 6. Start Server - only accept incoming HTTP and Socket.IO requests after initialization succeeds
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT} with Socket.IO initialized 🚀`);
    });
  } catch (fatalError) {
    console.error("[FATAL STARTUP ERROR] Server startup aborted:", fatalError.message || fatalError);
    process.exit(1);
  }
}

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost",
  "capacitor://localhost",
  "null",
  "file://",
  "https://mocktestplatform-lac.vercel.app",
  "https://prepmark.vercel.app",
  "https://prepmark.com",
  "https://www.prepmark.com",
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

const helmet = require("helmet");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const { apiLimiter } = require("./middleware/rateLimiter");
app.set("trust proxy", 1);
app.use(apiLimiter);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Home Route
app.get("/", (req, res) => {
  res.send("Teaching Pariksha API Running 🚀");
});

// Operational Visibility & Health Check Endpoints
app.get(["/health", "/api/health"], (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const schedulerStatus = isVoiceSubsystemReady()
    ? (isSchedulerRunning() ? "running" : "stopped")
    : "disabled_integrity_failure";
  const isHealthy = dbStatus === "connected" && isVoiceSubsystemReady();

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      aiVoiceScheduler: schedulerStatus
    }
  });
});


app.use("/api/devices", deviceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/exam-series", examSeriesRoutes);
app.use("/api/exam-structures", examStructureRoutes);
app.use("/api/flashcards", require("./routes/flashcardRoutes"));
app.use("/api/taxonomies", require("./routes/taxonomyRoutes"));
app.use("/api/banners", require("./routes/bannerRoutes"));
app.use("/api/users/upload-profile", uploadRoutes);
app.use("/api/upload", uploadRoutes);
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
app.use("/api/admin/ai-plans", require("./routes/aiPlanRoutes"));
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin/revenue", revenueRoutes);
app.use("/api/taxonomies", require("./routes/taxonomyRoutes"));
app.use("/api/live-exams", require("./routes/liveExamRoutes"));
app.use("/api/ai-voice", require("./routes/aiVoiceRoutes"));
app.use("/v1/api/ai-voice", require("./routes/aiVoiceRoutes"));
app.use("/api/voice-settings", require("./routes/voiceSettingRoutes"));
app.use("/api/admin/voice-settings", require("./routes/voiceSettingRoutes"));
app.use("/v1/api/voice-settings", require("./routes/voiceSettingRoutes"));
// Background Scheduler: Checks every 30 seconds for due scheduled quizzes to publish and expired quizzes to unpublish
const quizPublishInterval = setInterval(async () => {
  try {
    const now = new Date();

    // 1. Publish due scheduled quizzes
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

    // 2. Unpublish / Expire quizzes whose availability window has passed
    const expiredQuizzes = await Quiz.find({
      status: "Published",
      published: true,
      unpublishDate: { $ne: null, $lte: now }
    });

    if (expiredQuizzes.length > 0) {
      console.log(`[Scheduler] Found ${expiredQuizzes.length} quiz(zes) to unpublish/expire.`);
      for (const quiz of expiredQuizzes) {
        quiz.status = "Expired";
        quiz.published = false;
        await quiz.save();
        console.log(`[Scheduler] Successfully unpublished/expired quiz: "${quiz.title}" (ID: ${quiz._id})`);
      }
    }
  } catch (error) {
    console.error("[Scheduler Error] Failed to process scheduled/expired quizzes:", error);
  }
}, 30000);
quizPublishInterval.unref();

// Graceful shutdown handlers
process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received. Shutting down gracefully...");
  stopAiVoiceScheduler();
});
process.on("SIGINT", () => {
  console.log("[Server] SIGINT received. Shutting down gracefully...");
  stopAiVoiceScheduler();
});

// Start Server lifecycle only when executed directly as main process
if (require.main === module) {
  startServer();
}

module.exports = { app, httpServer, startServer };