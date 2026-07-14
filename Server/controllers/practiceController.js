const PracticeQuiz = require("../models/PracticeQuiz");
const PracticeSession = require("../models/PracticeSession");
const { GoogleGenAI, Type } = require("@google/genai");

// Initialize Gemini API Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// @desc    Get all practice quizzes
// @route   GET /api/practice
// @access  Private
const getPracticeQuizzes = async (req, res) => {
  try {
    const quizzes = await PracticeQuiz.find().populate("createdBy", "fullName email").sort({ createdAt: -1 });
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

    // Convert Mongoose Map to plain object for explanations.incorrect
    // so frontend can access it as explanations.incorrect[optionText]
    const quizObj = quiz.toObject();
    quizObj.questions = quizObj.questions.map(q => {
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
    const { title, subject, description, questions, shuffleQuestions, shuffleOptions, randomSelection, questionsPerAttempt } = req.body;

    const quiz = new PracticeQuiz({
      title,
      subject,
      description,
      questions: questions || [],
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      randomSelection: randomSelection || false,
      questionsPerAttempt: questionsPerAttempt || 20,
      createdBy: req.user._id,
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

    if (req.body.questions) {
      quiz.questions = req.body.questions;
    }

    const updatedQuiz = await quiz.save();
    res.json(updatedQuiz);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Delete a practice quiz
// @route   DELETE /api/practice/:id
// @access  Private/Admin
const deletePracticeQuiz = async (req, res) => {
  try {
    const quiz = await PracticeQuiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Practice Quiz not found" });

    await quiz.deleteOne();
    res.json({ message: "Practice Quiz removed" });
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

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "GEMINI_API_KEY is not configured on the server." });
    }

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

    let session = await PracticeSession.findOne({ userId, practiceQuizId: id });

    if (session && restart === "true") {
      await session.deleteOne();
      session = null;
    }

    if (!session) {
      let questionIndices = Array.from({ length: quiz.questions.length }, (_, i) => i);

      if (quiz.randomSelection) {
        questionIndices = shuffle(questionIndices);
        const limit = quiz.questionsPerAttempt || 20;
        questionIndices = questionIndices.slice(0, limit);
      } else if (quiz.shuffleQuestions) {
        questionIndices = shuffle(questionIndices);
      }

      const optionsOrder = {};
      questionIndices.forEach((qIdx) => {
        const originalOptionsLength = quiz.questions[qIdx].options.length;
        let optIndices = Array.from({ length: originalOptionsLength }, (_, i) => i);
        if (quiz.shuffleOptions) {
          optIndices = shuffle(optIndices);
        }
        optionsOrder[qIdx] = optIndices;
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
  generateAIExplanations,
  getOrCreatePracticeSession,
  convertToExam
};