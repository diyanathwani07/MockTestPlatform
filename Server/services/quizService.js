const mongoose = require("mongoose");
const Quiz = require("../models/Quiz");
const Section = require("../models/Section");
const Question = require("../models/Question");
const PracticeQuiz = require("../models/PracticeQuiz");

const isModularSection = (section) => section && section.sectionId != null;

const mapIncorrectExplanations = (incorrect) => {
  if (!incorrect) return {};
  if (incorrect instanceof Map) return incorrect;
  if (typeof incorrect === "object") return incorrect;
  return {};
};

const createQuestionFromEmbedded = async (embeddedQ, extra = {}) => {
  const explanations = embeddedQ.explanations || {};
  return Question.create({
    questionEnglish: embeddedQ.questionEnglish,
    questionHindi: embeddedQ.questionHindi || "",
    options: embeddedQ.options,
    correctAnswer: embeddedQ.correctAnswer,
    explanation: embeddedQ.explanation || "",
    explanations: {
      correct: explanations.correct || "",
      incorrect: mapIncorrectExplanations(explanations.incorrect),
      conceptSummary: explanations.conceptSummary || "",
      didYouKnow: explanations.didYouKnow || "",
    },
    difficulty: embeddedQ.difficulty || "medium",
    tags: embeddedQ.tags || [],
    subject: extra.subject || "",
    aiGenerated: embeddedQ.aiGenerated || false,
    questionBankId: extra.questionBankId || null,
    createdBy: extra.createdBy || null,
  });
};

const cloneQuestion = async (question, createdBy) => {
  const q = question.toObject ? question.toObject() : question;
  const { _id, createdAt, updatedAt, __v, ...fields } = q;
  return Question.create({ ...fields, createdBy: createdBy || fields.createdBy });
};

const populateSectionQuestions = async (section) => {
  if (!section) return section;
  const populated = await Section.findById(section._id || section)
    .populate("questions")
    .populate("subsections.easy")
    .populate("subsections.medium")
    .populate("subsections.hard");
  return populated;
};

const createQuestion = async (data) => {
  if (!data.questionEnglish || !data.options?.length || !data.correctAnswer) {
    throw new Error("questionEnglish, options, and correctAnswer are required.");
  }
  return Question.create(data);
};

const createSection = async (data) => {
  if (!data.title) throw new Error("Section title is required.");
  return Section.create({
    title: data.title,
    description: data.description || "",
    type: data.type || "standard",
    duration: data.duration || 0,
    marksPerQuestion: data.marksPerQuestion || 1,
    negativeMarking: data.negativeMarking || 0,
    questionLimit: data.questionLimit || 0,
    randomizeOptions: data.randomizeOptions || false,
    questions: data.questions || [],
    subsections: data.subsections || { easy: [], medium: [], hard: [] },
    isStandalone: data.isStandalone ?? true,
    createdBy: data.createdBy || null,
  });
};

const cloneSection = async (sectionId, createdBy) => {
  const source = await Section.findById(sectionId);
  if (!source) throw new Error("Section not found.");

  const cloneQuestionIds = async (ids) => {
    const cloned = [];
    for (const id of ids || []) {
      const q = await Question.findById(id);
      if (q) {
        const newQ = await cloneQuestion(q, createdBy);
        cloned.push(newQ._id);
      }
    }
    return cloned;
  };

  const newQuestions = await cloneQuestionIds(source.questions);
  const newEasy = await cloneQuestionIds(source.subsections?.easy);
  const newMedium = await cloneQuestionIds(source.subsections?.medium);
  const newHard = await cloneQuestionIds(source.subsections?.hard);

  return Section.create({
    title: source.title,
    description: source.description,
    type: source.type,
    duration: source.duration,
    marksPerQuestion: source.marksPerQuestion,
    negativeMarking: source.negativeMarking,
    questionLimit: source.questionLimit,
    randomizeOptions: source.randomizeOptions,
    questions: newQuestions,
    subsections: { easy: newEasy, medium: newMedium, hard: newHard },
    isStandalone: false,
    clonedFrom: source._id,
    createdBy: createdBy || source.createdBy,
  });
};

const resolveSectionRefs = async (sectionEntries, createdBy) => {
  const resolved = [];
  for (let i = 0; i < sectionEntries.length; i++) {
    const entry = sectionEntries[i];
    let sectionId = entry.sectionId;

    if (entry.mode === "cloned") {
      const cloned = await cloneSection(sectionId, createdBy);
      sectionId = cloned._id;
    }

    resolved.push({
      sectionId,
      mode: entry.mode || "linked",
      order: entry.order ?? i,
    });
  }
  return resolved;
};

const createQuiz = async (data) => {
  if (!data.title || !data.subject || data.duration == null) {
    throw new Error("Title, subject, and duration are required.");
  }

  let sections = [];
  if (data.sections?.length) {
    sections = await resolveSectionRefs(data.sections, data.createdBy);
  }

  return Quiz.create({
    title: data.title,
    subject: data.subject,
    examName: data.examName || "",
    description: data.description || "",
    duration: data.duration,
    marksPerQuestion: data.marksPerQuestion ?? 1,
    negativeMarking: data.negativeMarking ?? 0,
    enablePerQuestionTimer: data.enablePerQuestionTimer || false,
    timePerQuestion: data.timePerQuestion || 0,
    lockPreviousQuestions: data.lockPreviousQuestions || false,
    status: data.status || "Draft",
    scheduledDate: data.scheduledDate || null,
    published: data.published || false,
    quizType: data.quizType || "exam",
    publishAs: data.publishAs || "exam",
    passPercentage: data.passPercentage ?? 50,
    isModular: sections.length > 0,
    shuffleQuestions: data.shuffleQuestions || false,
    shuffleOptions: data.shuffleOptions || false,
    randomSelection: data.randomSelection || false,
    questionsPerAttempt: data.questionsPerAttempt || 20,
    showResultAfterSubmission: data.showResultAfterSubmission ?? true,
    showCorrectAnswers: data.showCorrectAnswers ?? true,
    showExplanations: data.showExplanations ?? true,
    showAnswerReview: data.showAnswerReview ?? true,
    practiceShowResultAfterSubmission: data.practiceShowResultAfterSubmission ?? true,
    practiceShowCorrectAnswers: data.practiceShowCorrectAnswers ?? true,
    practiceShowExplanations: data.practiceShowExplanations ?? true,
    practiceShowAnswerReview: data.practiceShowAnswerReview ?? true,
    resultReleaseMode: data.resultReleaseMode || "immediate",
    resultReleaseDate: data.resultReleaseDate || null,
    practiceResultReleaseMode: data.practiceResultReleaseMode || "immediate",
    practiceResultReleaseDate: data.practiceResultReleaseDate || null,
    sections,
    questions: [],
    createdBy: data.createdBy || null,
    isPaid: data.isPaid || false,
    price: data.price || 0,
    isPracticePaid: data.isPracticePaid || false,
    practicePrice: data.practicePrice || 0,
    detailedDescription: data.detailedDescription || "",
    plans: data.plans || [],
  });
};

const linkSectionToQuiz = async (quizId, sectionId, mode = "linked") => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new Error("Quiz not found.");

  const section = await Section.findById(sectionId);
  if (!section) throw new Error("Section not found.");

  let resolvedSectionId = sectionId;
  let resolvedMode = mode;

  if (mode === "cloned") {
    const cloned = await cloneSection(sectionId, quiz.createdBy);
    resolvedSectionId = cloned._id;
    resolvedMode = "cloned";
  }

  const nextOrder = quiz.sections.length;
  quiz.sections.push({
    sectionId: resolvedSectionId,
    mode: resolvedMode,
    order: nextOrder,
  });
  quiz.isModular = true;
  await quiz.save();
  return quiz;
};

const flattenSectionForClient = (sectionRef, populatedSection) => {
  if (!populatedSection) return null;
  const sec = populatedSection.toObject ? populatedSection.toObject() : populatedSection;
  return {
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
    mode: sectionRef.mode,
    order: sectionRef.order,
  };
};

const formatQuestionForClient = (q) => {
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
};

const previewQuiz = async (quizId) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new Error("Quiz not found.");

  let result = quiz.toObject();

  if (result.questions && result.questions.length > 0) {
    result.questions = result.questions.map(formatQuestionForClient);
  }

  if (!quiz.hasModularSections()) {
    return result;
  }

  const populatedSections = [];
  const sortedRefs = [...quiz.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const ref of sortedRefs) {
    if (!ref || !ref.sectionId || !mongoose.Types.ObjectId.isValid(ref.sectionId)) {
      continue;
    }
    try {
      const section = await Section.findById(ref.sectionId)
        .populate("questions")
        .populate("subsections.easy")
        .populate("subsections.medium")
        .populate("subsections.hard");
      if (section) {
        const flattened = flattenSectionForClient(ref, section);
        if (flattened.questions && flattened.questions.length > 0) {
          flattened.questions = flattened.questions.map(formatQuestionForClient);
        }
        if (flattened.subsections) {
          ["easy", "medium", "hard"].forEach(level => {
            if (flattened.subsections[level] && flattened.subsections[level].length > 0) {
              flattened.subsections[level] = flattened.subsections[level].map(formatQuestionForClient);
            }
          });
        }
        populatedSections.push(flattened);
      }
    } catch (e) {
      console.error("Error populating section in previewQuiz:", ref.sectionId, e);
    }
  }

  result.sections = populatedSections.filter(Boolean);
  return result;
};

const extractSection = async (quizId, sectionIndex, createdBy) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new Error("Quiz not found.");
  if (!quiz.hasModularSections()) throw new Error("Quiz uses legacy format.");

  const ref = quiz.sections[sectionIndex];
  if (!ref) throw new Error("Section index out of range.");

  const section = await populateSectionQuestions(ref.sectionId);
  if (!section) throw new Error("Section not found.");

  let durationMins = section.duration ? Math.floor(section.duration / 60) : quiz.duration;
  if (durationMins <= 0) durationMins = 30;

  return createQuiz({
    title: section.title,
    subject: quiz.subject,
    examName: quiz.examName,
    description: section.description || `Extracted from "${quiz.title}".`,
    duration: durationMins,
    marksPerQuestion: section.marksPerQuestion || quiz.marksPerQuestion,
    negativeMarking: section.negativeMarking || quiz.negativeMarking,
    quizType: quiz.quizType,
    sections: [{ sectionId: section._id, mode: "linked", order: 0 }],
    createdBy,
  });
};

const convertSingleQuizToSection = async (quizId) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new Error("Quiz not found.");
  if (quiz.hasModularSections()) throw new Error("Quiz is already modular.");

  const questionIds = [];
  for (const q of quiz.questions || []) {
    const newQ = await createQuestionFromEmbedded(q, {
      subject: quiz.subject,
      createdBy: quiz.createdBy,
    });
    questionIds.push(newQ._id);
  }

  const section = await createSection({
    title: quiz.title,
    questions: questionIds,
    isStandalone: true,
    createdBy: quiz.createdBy,
  });

  quiz.sections = [{ sectionId: section._id, mode: "linked", order: 0 }];
  quiz.questions = [];
  quiz.isModular = true;
  await quiz.save();
  return { quiz, section };
};

const duplicateQuiz = async (quizId, createdBy) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new Error("Quiz not found.");

  if (!quiz.hasModularSections()) {
    const newQuiz = await Quiz.create({
      ...quiz.toObject(),
      _id: undefined,
      title: `${quiz.title} (Copy)`,
      published: false,
      status: "Draft",
      createdBy: createdBy || quiz.createdBy,
    });
    return newQuiz;
  }

  const clonedRefs = [];
  for (let i = 0; i < quiz.sections.length; i++) {
    const ref = quiz.sections[i];
    const cloned = await cloneSection(ref.sectionId, createdBy);
    clonedRefs.push({ sectionId: cloned._id, mode: "cloned", order: ref.order ?? i });
  }

  return Quiz.create({
    title: `${quiz.title} (Copy)`,
    subject: quiz.subject,
    examName: quiz.examName,
    description: quiz.description,
    duration: quiz.duration,
    marksPerQuestion: quiz.marksPerQuestion,
    negativeMarking: quiz.negativeMarking,
    enablePerQuestionTimer: quiz.enablePerQuestionTimer,
    timePerQuestion: quiz.timePerQuestion,
    lockPreviousQuestions: quiz.lockPreviousQuestions,
    status: "Draft",
    published: false,
    quizType: quiz.quizType,
    isModular: true,
    sections: clonedRefs,
    questions: [],
    createdBy: createdBy || quiz.createdBy,
  });
};

const countSectionQuestions = (section) => {
  if (!section) return 0;
  if (section.type === "coding") {
    return (
      (section.subsections?.easy?.length || 0) +
      (section.subsections?.medium?.length || 0) +
      (section.subsections?.hard?.length || 0)
    );
  }
  return section.questions?.length || 0;
};

const countQuizQuestions = async (quiz) => {
  if (!quiz.hasModularSections()) {
    let count = quiz.questions?.length || 0;
    for (const sec of quiz.sections || []) {
      if (sec.questions) count += sec.questions.length;
      if (sec.subsections) {
        count +=
          (sec.subsections.easy?.length || 0) +
          (sec.subsections.medium?.length || 0) +
          (sec.subsections.hard?.length || 0);
      }
    }
    return count;
  }

  let total = 0;
  for (const ref of quiz.sections) {
    const section = await Section.findById(ref.sectionId);
    total += countSectionQuestions(section);
  }
  return total;
};

const getQuizzesReferencingSection = async (sectionId) => {
  return Quiz.find({
    isModular: true,
    "sections.sectionId": sectionId,
  });
};

const syncToPracticeQuiz = async (quizId, publishAs) => {
  if (publishAs === "exam") {
    await PracticeQuiz.deleteOne({ linkedExamId: quizId });
    return;
  }

  const populatedQuiz = await previewQuiz(quizId);
  if (!populatedQuiz) return;

  const practiceQuestions = [];

  // Extract from modular sections
  if (populatedQuiz.isModular && populatedQuiz.sections) {
    populatedQuiz.sections.forEach((sec) => {
      const allQs = [
        ...(sec.questions || []),
        ...(sec.subsections?.easy || []),
        ...(sec.subsections?.medium || []),
        ...(sec.subsections?.hard || []),
      ];
      allQs.forEach((q) => {
        practiceQuestions.push({
          questionEnglish: q.questionEnglish,
          questionHindi: q.questionHindi || "",
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanations: {
            correct: q.explanation || "",
            incorrect: {},
            conceptSummary: "",
            didYouKnow: ""
          }
        });
      });
    });
  } else {
    // Extract from legacy questions
    (populatedQuiz.questions || []).forEach((q) => {
      practiceQuestions.push({
        questionEnglish: q.questionEnglish,
        questionHindi: q.questionHindi || "",
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanations: {
          correct: q.explanation || "",
          incorrect: {},
          conceptSummary: "",
          didYouKnow: ""
        }
      });
    });
  }

  const practiceData = {
    title: populatedQuiz.title,
    subject: populatedQuiz.subject,
    description: populatedQuiz.description || "",
    questions: practiceQuestions,
    shuffleQuestions: populatedQuiz.shuffleQuestions || false,
    shuffleOptions: populatedQuiz.shuffleOptions || false,
    randomSelection: populatedQuiz.randomSelection || false,
    questionsPerAttempt: populatedQuiz.randomSelection ? (populatedQuiz.questionsPerAttempt || 20) : practiceQuestions.length,
    createdBy: populatedQuiz.createdBy,
    status: populatedQuiz.status,
    showResultAfterSubmission: populatedQuiz.practiceShowResultAfterSubmission !== undefined ? populatedQuiz.practiceShowResultAfterSubmission : true,
    showCorrectAnswers: populatedQuiz.practiceShowCorrectAnswers !== undefined ? populatedQuiz.practiceShowCorrectAnswers : true,
    showExplanations: populatedQuiz.practiceShowExplanations !== undefined ? populatedQuiz.practiceShowExplanations : true,
    showAnswerReview: populatedQuiz.practiceShowAnswerReview !== undefined ? populatedQuiz.practiceShowAnswerReview : true,
    practiceResultReleaseMode: populatedQuiz.practiceResultReleaseMode || "immediate",
    practiceResultReleaseDate: populatedQuiz.practiceResultReleaseDate || null,
    publishedAt: populatedQuiz.published ? new Date() : null,
    isPaid: Boolean(populatedQuiz.isPracticePaid || populatedQuiz.isPaid),
    price: Number(populatedQuiz.practicePrice || populatedQuiz.price || 0),
    detailedDescription: populatedQuiz.detailedDescription || "",
    plans: populatedQuiz.plans || [],
  };

  await PracticeQuiz.findOneAndUpdate(
    { linkedExamId: quizId },
    { $set: practiceData },
    { upsert: true, new: true }
  );
};

const stripAnswers = (quiz) => {
  if (!quiz) return quiz;
  const sanitized = JSON.parse(JSON.stringify(quiz));

  const sanitizeQuestion = (q) => {
    if (!q) return;
    delete q.correctAnswer;
    delete q.correctAnswerObfuscated;
    delete q.explanation;
    delete q.explanations;
  };

  if (sanitized.questions && sanitized.questions.length > 0) {
    sanitized.questions.forEach(sanitizeQuestion);
  }

  if (sanitized.sections && sanitized.sections.length > 0) {
    sanitized.sections.forEach(sec => {
      if (sec.questions && sec.questions.length > 0) {
        sec.questions.forEach(sanitizeQuestion);
      }
      if (sec.subsections) {
        ["easy", "medium", "hard"].forEach(level => {
          if (sec.subsections[level] && sec.subsections[level].length > 0) {
            sec.subsections[level].forEach(sanitizeQuestion);
          }
        });
      }
    });
  }

  return sanitized;
};

const previewQuizForStudent = async (quizId) => {
  const quiz = await previewQuiz(quizId);
  return stripAnswers(quiz);
};

module.exports = {
  isModularSection,
  createQuestionFromEmbedded,
  cloneQuestion,
  populateSectionQuestions,
  createQuestion,
  createSection,
  cloneSection,
  resolveSectionRefs,
  createQuiz,
  linkSectionToQuiz,
  flattenSectionForClient,
  previewQuiz,
  previewQuizForStudent,
  stripAnswers,
  extractSection,
  convertSingleQuizToSection,
  duplicateQuiz,
  countSectionQuestions,
  countQuizQuestions,
  getQuizzesReferencingSection,
  syncToPracticeQuiz,
};
