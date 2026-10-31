const { GoogleGenAI, Type } = require("@google/genai");

const chatSupport = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Chatbot Error] GEMINI_API_KEY is not defined in environment variables.");
      return res.status(500).json({ success: false, message: "Server configuration error: Missing API Key." });
    }

    // Explicitly delete any environment variables that might force the SDK into Vertex AI/ADC mode
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_GHA_CREDS_PATH;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GOOGLE_GENAI_USE_VERTEXAI;

    let ai;
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey,
      });
    } catch (initError) {
      console.error("[Chatbot Error] Failed to initialize GoogleGenAI SDK:", initError.message);
      return res.status(500).json({ success: false, message: "AI initialization failed." });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "Messages array is required." });
    }

    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);

    // 1. Define a strict System Prompt based on role
    let systemInstruction = "";
    let responseSchema = {};

    if (isAdmin) {
      systemInstruction = `
        You are the official AI Admin Assistant for 'PrepMark' (formerly Teaching Pariksha) — an enterprise-grade AI-powered online examination, mock test, practice, and assessment platform.
        Your job is to assist administrators in navigating the admin dashboard, managing platform modules, understanding PrepMark features, and performing administrative actions.
        
        ABOUT PREPMARK:
        PrepMark is a comprehensive examination & learning platform featuring:
        - Multi-Section Modular Assessments with independent section timers, negative marking, and section navigation rules.
        - Real-Time Live Examinations with candidate tracking, live lobbies, and instant rankings.
        - Self-Paced Practice Modules for continuous student revision with comprehensive answer explanations.
        - Spaced Repetition Flashcard Decks for quick memorization.
        - Massive Question Bank with multi-lingual support, LaTeX math formulas, rich text formatting, and Excel/Docx bulk import.
        - Voice Settings: AI Word-to-Speech question reader, customizable speech rate/pitch, voice reminders, and language pronunciation.
        - AI Subscription Plans with customizable pricing tiers, discounts, and payment gateway integration.
        - In-depth Performance Analytics, score distribution charts, candidate attempt reviews, and detailed audit logging.
        - Granular Role-Based Access Control (Admin, Super Admin, Teacher/Faculty, Staff).
        - Dedicated Student Support Helpdesk and ticket management.

        ADMIN SIDE PANEL & DASHBOARD NAVIGATION PATHS:
        1. "/admin/dashboard": Main administrative dashboard with platform overview, key metrics, and activity summary.
        2. "/admin/create-quiz": Create a new single-section quiz or assessment.
        3. "/admin/create-quiz-multi": Create a new multi-section modular assessment (with section-specific rules, duration, and marks).
        4. "/admin/manage-quizzes": Manage Quizzes — view list, search, filter, preview, edit, duplicate, schedule, publish/unpublish, or delete quizzes.
        5. "/admin/live-exams": Live Examinations — schedule, monitor, and manage active real-time exams and lobby countdowns.
        6. "/admin/exams": Manage Exams — configure Exam Series categories (e.g., BPSC, CTET, Super TET, SSC, State PCS) and hierarchies.
        7. "/admin/practice": Practice Modules — manage student self-paced practice quizzes and question sets.
        8. "/admin/create-practice": Create a new practice test module.
        9. "/admin/flashcards": Flashcards — create, edit, organize, and manage flashcard sets and study decks.
        10. "/admin/questions": Questions Bank — search, create, filter, bulk import (Word/Excel), and manage questions.
        11. "/admin/users": Users — view and manage registered students, faculty/teachers, admins, block/unblock, and verify accounts.
        12. "/admin/banners": Banners — manage promotional, marketing, and announcement banners on dashboards.
        13. "/admin/ai-plans": AI Plans — configure AI subscription tiers, pricing, feature allowances, and promotional discounts.
        14. "/admin/ai-subscribers": AI Subscribers — view active subscriber profiles, subscriptions, and renewal status.
        15. "/admin/revenue": Revenue Dashboard — track financial revenue, payment transactions, and subscription analytics.
        16. "/admin/results": Results — review student exam submissions, scores, answer sheets, and question analytics.
        17. "/admin/reports": Reports — platform-wide analytics, candidate performance trends, and exportable data.
        18. "/admin/audit-log": Audit Log — chronological activity log of all admin operations, quiz updates, and security events.
        19. "/admin/tickets": Support Tickets — review, reply to, and resolve student helpdesk tickets.
        20. "/admin/voice-settings": Voice Settings — configure Word-to-Speech audio reader, voice reminders, speech synthesis, language accents, and volume/pitch.
        21. "/admin/roles": Roles & Permissions — manage team roles, permission matrix, and access levels.
        22. "/admin/settings": System & Platform Settings.

        RULES:
        1. If the admin asks where a section is located, or how to navigate anywhere (e.g., "Where is voice settings?", "Take me to users", "Show reports", "Manage exams", "Open AI plans"), explain concisely and provide the exact React Router path in 'navigateTo'.
        2. Specifically, when asked about Voice Settings or speech features, always provide navigateTo: "/admin/voice-settings" and explain that Voice Settings manages Word-to-Speech, TTS question reading, and audio reminders.
        3. When asked about PrepMark, provide an enthusiastic, professional overview highlighting its key capabilities (modular assessments, live exams, AI plans, question bank, voice reader, flashcards).
        4. If no navigation is required (e.g., general explanation or question), set 'navigateTo' to null.
        5. Keep responses concise, clear, and professional.
      `;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "The response message to the admin."
          },
          navigateTo: {
            type: Type.STRING,
            description: "The React Router path to navigate to, or null if no navigation is required.",
            nullable: true
          }
        },
        required: ["text"]
      };
    } else {
      systemInstruction = `
        You are the official AI Support Assistant for 'PrepMark' (formerly Teaching Pariksha) — an all-in-one AI-powered exam preparation, practice, and learning platform.
        Your job is to assist students with their questions about PrepMark, navigating their dashboard, taking tests, checking results, and preparing for competitive exams (BPSC, CTET, Super TET, State PCS, etc.).
        
        ABOUT PREPMARK FOR STUDENTS:
        - Comprehensive Mock Tests & Exam Series with realistic exam timers, sectional cutoffs, and negative marking.
        - Self-Paced Practice Modules categorized by subjects and topics, complete with detailed answer reviews and explanations.
        - Custom Quiz Creator: allows students to design personalized practice quizzes by choosing subjects, question counts, and difficulty.
        - Live Scheduled Examinations with lobby countdowns, candidate tracking, and instant platform leaderboards.
        - Instant Results & Score Analytics: in-depth attempt analysis, accuracy percentage, time taken per question, and comparative rankings.
        - Interactive Flashcard Decks for rapid revision and spaced repetition memorization.
        - Daily Streak Tracker to build and maintain consistent study habits.
        - Word-to-Speech Question Reader: voice audio accessibility built right into tests to read questions aloud in multiple languages and accents.
        - AI Premium Plans: affordable subscription tiers to unlock unlimited practice tests, AI explanations, and performance metrics.
        - Helpdesk Support: 24/7 ticket submission for technical issues, billing, or test questions.

        VALID STUDENT NAVIGATION PATHS:
        - "/dashboard": Student Home Dashboard
        - "/dashboard/exams": Available Exam Series & Mock Tests
        - "/dashboard/practice": Self-paced Practice Modules
        - "/dashboard/create-custom-quiz": Create Custom Practice Quiz
        - "/dashboard/results": My Results & Performance Analytics
        - "/dashboard/live-exams": Live Examinations Lobby
        - "/dashboard/flashcards": Flashcards & Study Decks
        - "/dashboard/leaderboard": Student Leaderboard & Top Rankings
        - "/dashboard/streak": Daily Study Streak Tracker
        - "/dashboard/pricing": AI Subscription Plans & Pricing
        - "/dashboard/subscriptions": My Active Subscriptions
        - "/dashboard/profile": Student Profile & Account Details
        - "/dashboard/help": Help & Support Center
        
        RULES:
        1. When students ask where a feature is located or how to access tests, results, practice, live exams, flashcards, or custom quizzes, explain concisely and set the exact navigation path in 'navigateTo'.
        2. When asked about PrepMark, provide a warm, encouraging overview highlighting how it helps them excel in their exams.
        3. When asked about audio or voice reading, explain that PrepMark supports in-test Word-to-Speech reading to listen to questions.
        4. If the student has an unresolved issue, technical bug, or asks for human support, politely suggest submitting a ticket and set 'offerTicket' to true.
        5. If the question is completely unrelated to education or PrepMark (e.g. general news, coding), politely redirect them back to exam preparation.
        6. If no navigation is needed, set 'navigateTo' to null.
        7. Keep responses concise, supportive, and friendly.
      `;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "The response message to the user."
          },
          offerTicket: {
            type: Type.BOOLEAN,
            description: "Set to true if the user needs human support, has an issue you can't solve, or asks an unrelated question. Otherwise false."
          },
          navigateTo: {
            type: Type.STRING,
            description: "The React Router path to navigate the student to, or null if no navigation is required.",
            nullable: true
          }
        },
        required: ["text", "offerTicket"]
      };
    }

    // 2. Format messages for GenAI (convert sender "bot"/"user" to role "model"/"user")
    const formattedHistory = messages.slice(0, -1).map(msg => ({
      role: msg.sender === "bot" ? "model" : "user",
      parts: [{ text: msg.text }]
    }));

    const latestMessage = messages[messages.length - 1].text;

    // 3. Call Gemini API
    const CHAT_MODEL = "gemini-2.5-flash";
    console.log(`[Chatbot Debug] Initiating API call in chatController.js`);
    console.log(`  -> API Key Loaded: ${apiKey ? "true" : "false"}`);
    console.log(`  -> Model Name: ${CHAT_MODEL}`);
    console.log(`  -> Authentication Mode: Google AI Studio API Key`);

    let response;
    try {
      // Try with structured JSON output first
      response = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: [
          ...formattedHistory,
          { role: "user", parts: [{ text: latestMessage }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });
    } catch (structuredError) {
      // Fallback: Gemma may not support structured JSON output, so request plain text
      console.warn(`[Chatbot] Structured output failed for ${CHAT_MODEL}, falling back to plain text mode:`, structuredError.message);
      const fallbackInstruction = systemInstruction + "\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON.";
      response = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: [
          ...formattedHistory,
          { role: "user", parts: [{ text: latestMessage }] }
        ],
        config: {
          systemInstruction: fallbackInstruction,
        }
      });
    }

    console.log(`[Chatbot Debug] API call successful. Content generated.`);

    // 4. Parse the structured JSON response
    let rawText = response.text || "";
    // Strip markdown code fences if present
    rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const result = JSON.parse(rawText);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("[Chatbot Error] An error occurred while generating content:");
    console.error(`  -> Source File: chatController.js`);
    console.error(`  -> Model: gemini-2.5-flash`);
    if (error.message && error.message.includes("API key")) {
      console.error("  -> Type: Authentication Error (Invalid/Expired API Key)");
    } else if (error.message && error.message.includes("model")) {
      console.error("  -> Type: Model Reference Error");
    } else if (error.code === "ENOTFOUND" || (error.message && error.message.includes("fetch"))) {
      console.error("  -> Type: Network/Connectivity Error");
    } else if (error instanceof SyntaxError) {
      console.error("  -> Type: Structured JSON Parsing Error");
    } else {
      console.error("  -> Detail:", error.message);
    }
    console.error("  -> Stack Trace:", error.stack);

    // Fallback: If AI generation fails (e.g. quota/network), attempt smart keyword matching
    const fallbackData = getSmartFallback(req.body?.messages?.[req.body.messages.length - 1]?.text, isAdmin);
    if (fallbackData) {
      return res.json({
        success: true,
        data: fallbackData
      });
    }

    res.status(500).json({ 
      success: false, 
      message: "Failed to generate AI response.", 
      error: error.message 
    });
  }
};

function getSmartFallback(query, isAdmin) {
  const q = (query || "").toLowerCase();
  if (isAdmin) {
    if (q.includes("voice") || q.includes("speech") || q.includes("audio") || q.includes("tts")) {
      return {
        text: "Navigating to Voice Settings. Here you can configure Word-to-Speech audio reading, voice reminders, speech synthesis, and pronunciation rules.",
        navigateTo: "/admin/voice-settings"
      };
    }
    if (q.includes("prepmark") || q.includes("platform") || q.includes("about")) {
      return {
        text: "PrepMark is an advanced AI-powered online examination and learning platform. It supports multi-section modular assessments, real-time live exams, question banks, flashcards, AI subscription plans, voice reading, and comprehensive student analytics.",
        navigateTo: null
      };
    }
    if (q.includes("multi") || q.includes("section assessment")) {
      return {
        text: "Navigating to Create Multi-Section Assessment.",
        navigateTo: "/admin/create-quiz-multi"
      };
    }
    if (q.includes("create quiz") || q.includes("new quiz") || q.includes("new test")) {
      return {
        text: "Navigating to Create Quiz.",
        navigateTo: "/admin/create-quiz"
      };
    }
    if (q.includes("manage quiz") || q.includes("quizzes") || q.includes("all quiz")) {
      return {
        text: "Navigating to Manage Quizzes.",
        navigateTo: "/admin/manage-quizzes"
      };
    }
    if (q.includes("live exam") || q.includes("live test")) {
      return {
        text: "Navigating to Live Examinations.",
        navigateTo: "/admin/live-exams"
      };
    }
    if (q.includes("exam") || q.includes("series")) {
      return {
        text: "Navigating to Manage Exams.",
        navigateTo: "/admin/exams"
      };
    }
    if (q.includes("practice")) {
      return {
        text: "Navigating to Practice Modules.",
        navigateTo: "/admin/practice"
      };
    }
    if (q.includes("flashcard")) {
      return {
        text: "Navigating to Flashcards.",
        navigateTo: "/admin/flashcards"
      };
    }
    if (q.includes("question")) {
      return {
        text: "Navigating to Question Bank.",
        navigateTo: "/admin/questions"
      };
    }
    if (q.includes("user") || q.includes("student") || q.includes("teacher") || q.includes("faculty")) {
      return {
        text: "Navigating to User Management.",
        navigateTo: "/admin/users"
      };
    }
    if (q.includes("banner")) {
      return {
        text: "Navigating to Banners.",
        navigateTo: "/admin/banners"
      };
    }
    if (q.includes("ai plan") || q.includes("subscription")) {
      return {
        text: "Navigating to AI Plans.",
        navigateTo: "/admin/ai-plans"
      };
    }
    if (q.includes("revenue") || q.includes("earning") || q.includes("financial")) {
      return {
        text: "Navigating to Revenue Dashboard.",
        navigateTo: "/admin/revenue"
      };
    }
    if (q.includes("result") || q.includes("attempt") || q.includes("score")) {
      return {
        text: "Navigating to Results.",
        navigateTo: "/admin/results"
      };
    }
    if (q.includes("report") || q.includes("analytic")) {
      return {
        text: "Navigating to Reports.",
        navigateTo: "/admin/reports"
      };
    }
    if (q.includes("audit") || q.includes("log")) {
      return {
        text: "Navigating to Audit Log.",
        navigateTo: "/admin/audit-log"
      };
    }
    if (q.includes("ticket") || q.includes("support") || q.includes("helpdesk")) {
      return {
        text: "Navigating to Support Tickets.",
        navigateTo: "/admin/tickets"
      };
    }
    if (q.includes("role") || q.includes("permission")) {
      return {
        text: "Navigating to Roles & Permissions.",
        navigateTo: "/admin/roles"
      };
    }
    if (q.includes("dashboard") || q.includes("home")) {
      return {
        text: "Navigating to Dashboard.",
        navigateTo: "/admin/dashboard"
      };
    }
  } else {
    if (q.includes("prepmark") || q.includes("platform") || q.includes("about")) {
      return {
        text: "PrepMark is your all-in-one exam preparation platform! You can take realistic mock tests, practice by topic, create custom quizzes, participate in live exams, and study with flashcards.",
        offerTicket: false,
        navigateTo: null
      };
    }
    if (q.includes("voice") || q.includes("audio") || q.includes("read") || q.includes("listen")) {
      return {
        text: "PrepMark provides built-in Word-to-Speech audio reading inside tests so you can listen to questions read aloud.",
        offerTicket: false,
        navigateTo: null
      };
    }
    if (q.includes("custom") || q.includes("create quiz")) {
      return {
        text: "Navigating to Create Custom Quiz.",
        offerTicket: false,
        navigateTo: "/dashboard/create-custom-quiz"
      };
    }
    if (q.includes("live") || q.includes("real time")) {
      return {
        text: "Navigating to Live Exams Lobby.",
        offerTicket: false,
        navigateTo: "/dashboard/live-exams"
      };
    }
    if (q.includes("exam") || q.includes("test series") || q.includes("mock")) {
      return {
        text: "Navigating to Available Exams & Mock Tests.",
        offerTicket: false,
        navigateTo: "/dashboard/exams"
      };
    }
    if (q.includes("practice")) {
      return {
        text: "Navigating to Practice Modules.",
        offerTicket: false,
        navigateTo: "/dashboard/practice"
      };
    }
    if (q.includes("result") || q.includes("score") || q.includes("attempt") || q.includes("analysis")) {
      return {
        text: "Navigating to your Results & Analytics.",
        offerTicket: false,
        navigateTo: "/dashboard/results"
      };
    }
    if (q.includes("flashcard") || q.includes("card") || q.includes("deck")) {
      return {
        text: "Navigating to Flashcards.",
        offerTicket: false,
        navigateTo: "/dashboard/flashcards"
      };
    }
    if (q.includes("leaderboard") || q.includes("rank") || q.includes("top")) {
      return {
        text: "Navigating to Leaderboard.",
        offerTicket: false,
        navigateTo: "/dashboard/leaderboard"
      };
    }
    if (q.includes("streak") || q.includes("daily")) {
      return {
        text: "Navigating to Daily Study Streak.",
        offerTicket: false,
        navigateTo: "/dashboard/streak"
      };
    }
    if (q.includes("price") || q.includes("plan") || q.includes("subscription") || q.includes("buy")) {
      return {
        text: "Navigating to AI Plans & Pricing.",
        offerTicket: false,
        navigateTo: "/dashboard/pricing"
      };
    }
    if (q.includes("profile") || q.includes("account")) {
      return {
        text: "Navigating to your Profile.",
        offerTicket: false,
        navigateTo: "/dashboard/profile"
      };
    }
    if (q.includes("help") || q.includes("support") || q.includes("ticket")) {
      return {
        text: "Navigating to Help & Support.",
        offerTicket: true,
        navigateTo: "/dashboard/help"
      };
    }
    if (q.includes("dashboard") || q.includes("home")) {
      return {
        text: "Navigating to Dashboard.",
        offerTicket: false,
        navigateTo: "/dashboard"
      };
    }
  }
  return null;
}

module.exports = {
  chatSupport,
  getSmartFallback
};
