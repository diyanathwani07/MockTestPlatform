const PracticeQuiz = require("../models/PracticeQuiz");
const PracticeSession = require("../models/PracticeSession");
const { GoogleGenAI, Type } = require("@google/genai");

// @desc    Get all practice quizzes
// @route   GET /api/practice
// @access  Private
const getPracticeQuizzes = async (req, res) => {
  try {
    const filter = {};
    if (req.query.deleted === "true") {
      filter.isDeleted = true;
    } else {
      filter.isDeleted = { $ne: true };
    }

    // Only show published practice tests to regular students
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
      filter.status = "Published";
    }

    let quizzes = await PracticeQuiz.find(filter).populate("createdBy", "fullName email").sort({ createdAt: -1 });

    if (req.user) {
      const User = require("../models/User");
      const user = await User.findById(req.user._id).select("purchasedPractice");
      const purchasedPracticeIds = (user?.purchasedPractice || []).map((id) => id.toString());
      quizzes = quizzes.map((quiz) => {
        const qObj = quiz.toObject();
        qObj.isPurchased = purchasedPracticeIds.includes(qObj._id.toString());
        return qObj;
      });
    }

    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get single practice quiz
// @route   GET /api/practice/:id
// @access  Private
const getPracticeQuizById = async (req, res) => {
  try {
    const quiz = await PracticeQuiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Practice Quiz not found" });

    let quizObj = quiz.toObject();

    // If modular, fetch sections
    if (quiz.hasModularSections && quiz.hasModularSections()) {
      const Section = require("../models/Section");
      const populatedSections = [];
      const sortedRefs = [...quiz.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      for (const ref of sortedRefs) {
        const section = await Section.findById(ref.sectionId)
          .populate("questions")
          .populate("subsections.easy")
          .populate("subsections.medium")
          .populate("subsections.hard");
        
        if (section) {
          const sec = section.toObject();
          populatedSections.push({
            _id: sec._id,
            title: sec.title,
            description: sec.description,
            type: sec.type,
            duration: sec.duration,
            marksPerQuestion: sec.marksPerQuestion,
            negativeMarking: sec.negativeMarking,
            questionLimit: sec.questionLimit,
            randomizeOptions: sec.randomizeOptions,
            questions: sec.questions || [],
            subsections: sec.subsections || { easy: [], medium: [], hard: [] },
            mode: ref.mode,
            order: ref.order,
          });
        }
      }
      quizObj.sections = populatedSections;
    }

    // Convert Mongoose Map to plain object for explanations.incorrect
    // so frontend can access it as explanations.incorrect[optionText]
    quizObj.questions = (quizObj.questions || []).map(q => {
      const incorrectRaw = q.explanations?.incorrect;
      let incorrectPlain = {};
      if (incorrectRaw instanceof Map) {
        incorrectPlain = Object.fromEntries(incorrectRaw);
      } else if (incorrectRaw && typeof incorrectRaw === "object") {
        incorrectPlain = Object.fromEntries(Object.entries(incorrectRaw));
      }
      return {
        ...q,
        explanations: {
          ...q.explanations,
          incorrect: incorrectPlain
        }
      };
    });

    res.json(quizObj);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Create a practice quiz
// @route   POST /api/practice
// @access  Private/Admin
const createPracticeQuiz = async (req, res) => {
  try {
    const { 
      title, 
      subject, 
      description, 
      questions, 
      shuffleQuestions, 
      shuffleOptions, 
      randomSelection, 
      questionsPerAttempt, 
      status,
      isPaid,
      price,
      detailedDescription,
      plans
    } = req.body;

    const quiz = new PracticeQuiz({
      title,
      subject,
      description,
      questions: questions || [],
      isModular: req.body.isModular || false,
      sections: req.body.sections || [],
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      randomSelection: randomSelection || false,
      questionsPerAttempt: questionsPerAttempt || 20,
      createdBy: req.user._id,
      status: status || "Draft",
      publishedAt: status === "Published" ? Date.now() : null,
      isPaid: isPaid || false,
      price: price || 0,
      detailedDescription: detailedDescription || "",
      plans: plans || [],
    });

    const createdQuiz = await quiz.save();
    res.status(201).json(createdQuiz);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update a practice quiz
// @route   PUT /api/practice/:id
// @access  Private/Admin
const updatePracticeQuiz = async (req, res) => {
  try {
    const quiz = await PracticeQuiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Practice Quiz not found" });

    quiz.title = req.body.title || quiz.title;
    quiz.subject = req.body.subject || quiz.subject;
    quiz.description = req.body.description !== undefined ? req.body.description : quiz.description;
    quiz.shuffleQuestions = req.body.shuffleQuestions ?? quiz.shuffleQuestions;
    quiz.shuffleOptions = req.body.shuffleOptions ?? quiz.shuffleOptions;
    quiz.randomSelection = req.body.randomSelection ?? quiz.randomSelection;
    quiz.questionsPerAttempt = req.body.questionsPerAttempt ?? quiz.questionsPerAttempt;
    
    if (req.body.isModular !== undefined) quiz.isModular = req.body.isModular;
    if (req.body.sections) quiz.sections = req.body.sections;

    if (req.body.questions) {
      quiz.questions = req.body.questions;
    }

    if (req.body.isPaid !== undefined) quiz.isPaid = req.body.isPaid;
    if (req.body.price !== undefined) quiz.price = req.body.price;
    if (req.body.detailedDescription !== undefined) quiz.detailedDescription = req.body.detailedDescription;
    if (req.body.plans !== undefined) quiz.plans = req.body.plans;

    if (req.body.status) {
      if (req.body.status === "Published" && quiz.status !== "Published") {
        quiz.publishedAt = Date.now();
      } else if (req.body.status === "Draft") {
        quiz.publishedAt = null;
      }
      quiz.status = req.body.status;
    }

    const updatedQuiz = await quiz.save();
    res.json(updatedQuiz);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Delete a practice quiz (soft delete)
// @route   DELETE /api/practice/:id
// @access  Private/Admin
const deletePracticeQuiz = async (req, res) => {
  try {
    const quiz = await PracticeQuiz.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ message: "Practice Quiz not found" });

    res.json({ message: "Practice Quiz moved to recycle bin" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Restore a practice quiz
// @route   PUT /api/practice/:id/restore
// @access  Private/Admin
const restorePracticeQuiz = async (req, res) => {
  try {
    const quiz = await PracticeQuiz.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ message: "Practice Quiz not found" });
    res.json({ message: "Practice Quiz restored successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Permanently delete a practice quiz
// @route   DELETE /api/practice/:id/permanent
// @access  Private/Admin
const permanentlyDeletePracticeQuiz = async (req, res) => {
  try {
    const quiz = await PracticeQuiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Practice Quiz not found" });
    res.json({ message: "Practice Quiz permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Generate AI Explanations for ungenerated questions in a quiz
// @route   POST /api/practice/:id/generate-ai
// @access  Private/Admin
const generateAIExplanations = async (req, res) => {
  try {
    const quiz = await PracticeQuiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Practice Quiz not found" });

    const pendingQuestions = quiz.questions.filter(q => !q.aiGenerated);

    if (pendingQuestions.length === 0) {
      return res.json({ message: "All questions already have AI explanations generated.", quiz });
    }

    // Force Gemini AI Studio mode by temporarily clearing Google Cloud credentials env vars
    const tempCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const tempGha = process.env.GOOGLE_GHA_CREDS_PATH;
    const tempVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_GHA_CREDS_PATH;
    delete process.env.GOOGLE_GENAI_USE_VERTEXAI;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Restore them if needed
    if (tempCreds) process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCreds;
    if (tempGha) process.env.GOOGLE_GHA_CREDS_PATH = tempGha;
    if (tempVertex) process.env.GOOGLE_GENAI_USE_VERTEXAI = tempVertex;

    let updatedCount = 0;
    const batchSize = 3;

    for (let i = 0; i < pendingQuestions.length; i += batchSize) {
      const batch = pendingQuestions.slice(i, i + batchSize);

      const promptText = `
You are an expert educator. I will provide a batch of multiple-choice practice questions.
For each question, I will provide the question text, options, and the correct answer.

For EACH question, I need:
1. "correct": A concise, single-sentence (one-line) explanation of why the correct answer is correct. Keep it extremely brief.
2. "incorrect": Concise, single-sentence (one-line) explanations for WHY each of the other options is incorrect. Keep each explanation extremely brief.
3. "conceptSummary": A brief 1-2 sentence summary of the core concept being tested.

Here are the questions:
${JSON.stringify(batch.map(q => ({
  id: q._id,
  questionEnglish: q.questionEnglish,
  options: q.options,
  correctAnswer: q.correctAnswer
})), null, 2)}
`;

      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            correct: { type: Type.STRING, description: "Strictly a single-sentence/one-line explanation of the correct answer" },
            incorrect: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  option: { type: Type.STRING, description: "The text of the incorrect option (exactly matching one of the options)" },
                  explanation: { type: Type.STRING, description: "Strictly a single-sentence/one-line explanation of why this option is incorrect" }
                },
                required: ["option", "explanation"]
              }
            },
            conceptSummary: { type: Type.STRING }
          },
          required: ["id", "correct", "incorrect", "conceptSummary"]
        }
      };

      try {
        const { generateContentWithFallback } = require("../utils/geminiHelper");
        const response = await generateContentWithFallback(ai, promptText, {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.3,
        });

        const generatedData = JSON.parse(response.text);

        generatedData.forEach(genData => {
          const qIndex = quiz.questions.findIndex(q => q._id.toString() === genData.id);
          if (qIndex !== -1) {
            const incorrectMap = new Map();
            if (Array.isArray(genData.incorrect)) {
              genData.incorrect.forEach(item => {
                if (item.option && item.explanation) {
                  incorrectMap.set(item.option, item.explanation);
                }
              });
            }

            quiz.questions[qIndex].explanations = {
              correct: genData.correct || "",
              incorrect: incorrectMap,
              conceptSummary: genData.conceptSummary || ""
            };
            quiz.questions[qIndex].aiGenerated = true;
            updatedCount++;
          }
        });
      } catch (batchError) {
        console.error("Error generating batch:", batchError);
      }
    }

    await quiz.save();
    res.json({ message: `Successfully generated AI explanations for ${updatedCount} questions.`, quiz });

  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ── SESSION HELPERS ──

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// @desc    Get or create a practice session (handles shuffle/randomization)
// @route   GET /api/practice/:id/session
// @access  Private
const getOrCreatePracticeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { restart } = req.query;
    const userId = req.user._id;

    const quiz = await PracticeQuiz.findById(id);
    if (!quiz) return res.status(404).json({ message: "Practice Quiz not found" });

    let allQuestions = [];
    if (quiz.hasModularSections && quiz.hasModularSections()) {
      const Section = require("../models/Section");
      for (const ref of [...quiz.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        const section = await Section.findById(ref.sectionId).populate("questions").populate("subsections.easy").populate("subsections.medium").populate("subsections.hard");
        if (section) {
          if (section.questions) allQuestions.push(...section.questions);
          if (section.subsections) {
            allQuestions.push(...(section.subsections.easy || []));
            allQuestions.push(...(section.subsections.medium || []));
            allQuestions.push(...(section.subsections.hard || []));
          }
        }
      }
    } else {
      allQuestions = quiz.questions || [];
    }

    let session = await PracticeSession.findOne({ userId, practiceQuizId: id });

    if (session && restart === "true") {
      await session.deleteOne();
      session = null;
    }

    if (!session) {
      let questionIndices = Array.from({ length: allQuestions.length }, (_, i) => i);

      if (quiz.randomSelection && !quiz.isModular) {
        questionIndices = shuffle(questionIndices);
        const limit = quiz.questionsPerAttempt || 20;
        questionIndices = questionIndices.slice(0, limit);
      } else if (quiz.shuffleQuestions && !quiz.isModular) {
        questionIndices = shuffle(questionIndices);
      }

      const optionsOrder = {};
      questionIndices.forEach((qIdx) => {
        const q = allQuestions[qIdx];
        if (q && q.options) {
          const originalOptionsLength = q.options.length;
          let optIndices = Array.from({ length: originalOptionsLength }, (_, i) => i);
          if (quiz.shuffleOptions) {
            optIndices = shuffle(optIndices);
          }
          optionsOrder[qIdx] = optIndices;
        }
      });

      session = new PracticeSession({
        userId,
        practiceQuizId: id,
        questionsOrder: questionIndices,
        optionsOrder
      });

      await session.save();
    }

    res.json(session);
  } catch (error) {
    console.error("Session Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Convert a Practice Quiz into a real Exam (Quiz model)
// @route   POST /api/practice/:id/convert-to-exam
// @access  Private (Admin)
const convertToExam = async (req, res) => {
  try {
    const { id } = req.params;
    const practiceQuiz = await PracticeQuiz.findById(id);
    if (!practiceQuiz) {
      return res.status(404).json({ message: "Practice Quiz not found" });
    }

    const Quiz = require("../models/Quiz");
    
    // Map practice questions to legacy question schema format for the Exam
    const questions = practiceQuiz.questions.map(q => ({
      questionEnglish: q.questionEnglish,
      questionHindi: q.questionHindi,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanations?.correct || ""
    }));

    const newQuiz = new Quiz({
      title: `${practiceQuiz.title} (Exam)`,
      subject: practiceQuiz.subject,
      description: practiceQuiz.description,
      duration: 30, // Default duration, admin can edit later
      marksPerQuestion: 1,
      questions: questions,
      status: "Draft",
      published: false,
      quizType: "exam",
      createdBy: req.user._id
    });

    await newQuiz.save();
    res.status(201).json({ message: "Successfully converted to Real Quiz", quizId: newQuiz._id });
  } catch (error) {
    console.error("Convert to Exam Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  getPracticeQuizzes,
  getPracticeQuizById,
  createPracticeQuiz,
  updatePracticeQuiz,
  deletePracticeQuiz,
  restorePracticeQuiz,
  permanentlyDeletePracticeQuiz,
  generateAIExplanations,
  getOrCreatePracticeSession,
  convertToExam
};