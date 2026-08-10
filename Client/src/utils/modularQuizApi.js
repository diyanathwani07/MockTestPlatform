import axios from "axios";

const API = () => import.meta.env.VITE_API_URL;
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const sanitizeQuestion = (q, subject = "") => {
  const result = {
    questionEnglish: (q.questionEnglish || "").trim(),
    questionHindi: (q.questionHindi || "").trim(),
    options: (q.options || []).map((o) => String(o).trim()).filter(Boolean),
    correctAnswer: (q.correctAnswer || "").trim(),
    explanation: (q.explanation || "").trim(),
    explanations: q.explanations
      ? { ...q.explanations, correct: (q.explanation || "").trim() }
      : {
          correct: (q.explanation || "").trim(),
          incorrect: {},
          conceptSummary: "",
          didYouKnow: ""
        },
    difficulty: q.difficulty || "medium",
    subject,
  };
  if (q._id) {
    result._id = q._id;
  } else if (q.id && String(q.id).length === 24) {
    result._id = q.id;
  }
  return result;
};

const filterValidQuestions = (questions = []) =>
  questions.filter(
    (q) =>
      q.questionEnglish?.trim() &&
      q.correctAnswer?.trim() &&
      (q.options || []).some((o) => String(o).trim())
  );

const bulkCreateQuestions = async (questions, subject) => {
  const valid = filterValidQuestions(questions);
  if (valid.length === 0) return [];

  const res = await axios.post(
    `${API()}/api/questions/bulk`,
    { questions: valid.map((q) => sanitizeQuestion(q, subject)) },
    { headers: authHeaders() }
  );
  const questionsData = Array.isArray(res.data) ? res.data : (res.data.questions || []);
  return questionsData.map((q) => q._id);
};

const createSectionDoc = async (section, questionIds, subsections) => {
  const duration =
    (parseInt(section.durationMin || 0, 10) * 60) +
    parseInt(section.durationSec || 0, 10);

  const res = await axios.post(
    `${API()}/api/sections`,
    {
      title: section.title || "Untitled Section",
      description: section.description || "",
      type: section.type || "standard",
      duration,
      marksPerQuestion: section.marksPerQuestion ?? 1,
      negativeMarking: section.negativeMarking ?? 0,
      questionLimit: section.questionLimit ?? 0,
      randomizeOptions: section.randomizeOptions || false,
      questions: questionIds,
      subsections: subsections || { easy: [], medium: [], hard: [] },
      isStandalone: true,
    },
    { headers: authHeaders() }
  );
  return res.data._id;
};

const updateSectionDoc = async (sectionId, section, questionIds, subsections) => {
  const duration =
    (parseInt(section.durationMin || 0, 10) * 60) +
    parseInt(section.durationSec || 0, 10);

  await axios.put(
    `${API()}/api/sections/${sectionId}`,
    {
      title: section.title,
      description: section.description || "",
      type: section.type || "standard",
      duration,
      marksPerQuestion: section.marksPerQuestion ?? 1,
      negativeMarking: section.negativeMarking ?? 0,
      questionLimit: section.questionLimit ?? 0,
      randomizeOptions: section.randomizeOptions || false,
      questions: questionIds,
      subsections: subsections || { easy: [], medium: [], hard: [] },
    },
    { headers: authHeaders() }
  );
};

const persistCodingSubsections = async (subsections, subject) => {
  const result = { easy: [], medium: [], hard: [] };
  for (const level of ["easy", "medium", "hard"]) {
    result[level] = await bulkCreateQuestions(subsections?.[level] || [], subject);
  }
  return result;
};

export const persistLocalSection = async (section, subject, existingSectionId = null) => {
  let questionIds = [];
  let subsections = { easy: [], medium: [], hard: [] };

  if (section.type === "coding") {
    subsections = await persistCodingSubsections(section.subsections, subject);
  } else {
    questionIds = await bulkCreateQuestions(section.questions, subject);
  }

  if (existingSectionId) {
    await updateSectionDoc(existingSectionId, section, questionIds, subsections);
    return { sectionId: existingSectionId, mode: section.mode === "cloned" ? "cloned" : "linked" };
  }

  const sectionId = await createSectionDoc(section, questionIds, subsections);
  return { sectionId, mode: "linked" };
};

export const resolveSectionRef = async (section, subject) => {
  if (section.isExternal && section.mode === "linked" && section.sectionId) {
    return { sectionId: section.sectionId, mode: "linked" };
  }

  if (section.isExternal && section.mode === "cloned" && section.sectionId) {
    return { sectionId: section.sectionId, mode: "cloned" };
  }

  if (section.sectionId && !section.isExternal) {
    await persistLocalSection(section, subject, section.sectionId);
    return {
      sectionId: section.sectionId,
      mode: section.mode === "cloned" ? "cloned" : "linked",
    };
  }

  const ref = await persistLocalSection(section, subject);
  return ref;
};

export const saveModularQuiz = async ({
  quizMeta,
  sections,
  quizId = null,
  isPublishing = false,
}) => {
  const globalDuration =
    (parseInt(quizMeta.durationMin || 0, 10) * 60) +
    parseInt(quizMeta.durationSec || quizMeta.duration || 0, 10);

  const sectionRefs = [];
  for (let i = 0; i < sections.length; i++) {
    const ref = await resolveSectionRef(sections[i], quizMeta.subject);
    sectionRefs.push({ ...ref, order: i });
  }

  const payload = {
    title: quizMeta.title,
    subject: quizMeta.subject,
    examName: quizMeta.examName || "",
    description: quizMeta.description || "",
    duration: globalDuration || 1800,
    marksPerQuestion: quizMeta.marksPerQuestion ?? 1,
    negativeMarking: quizMeta.negativeMarking ?? 0,
    enablePerQuestionTimer: quizMeta.enablePerQuestionTimer || false,
    timePerQuestion: quizMeta.timePerQuestion || 0,
    lockPreviousQuestions: quizMeta.lockPreviousQuestions || false,
    breakBetweenSections: quizMeta.breakBetweenSections || 0,
    published: isPublishing,
    status: isPublishing ? "Published" : quizMeta.status || "Draft",
    scheduledDate: quizMeta.scheduledDate || null,
    quizType: quizMeta.publishAs === "practice" ? "practice" : "exam",
    publishAs: quizMeta.publishAs || "exam",
    shuffleQuestions: quizMeta.shuffleQuestions || false,
    shuffleOptions: quizMeta.shuffleOptions || false,
    randomSelection: quizMeta.randomSelection || false,
    questionsPerAttempt: quizMeta.questionsPerAttempt || 20,
    sections: sectionRefs,
    questions: [],
    isModular: true,
    examSeriesId: quizMeta.examSeriesId || null,
    isPaid: Boolean(quizMeta.isPaid),
    price: Number(quizMeta.price || 0),
    isPracticePaid: Boolean(quizMeta.isPracticePaid),
    practicePrice: Number(quizMeta.practicePrice || 0),
    detailedDescription: quizMeta.detailedDescription || "",
    plans: (quizMeta.isPaid || quizMeta.isPracticePaid) ? (quizMeta.plans || []) : [],
  };

  if (quizId) {
    const res = await axios.put(`${API()}/api/quizzes/${quizId}`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  }

  const res = await axios.post(`${API()}/api/quizzes`, payload, {
    headers: authHeaders(),
  });
  return res.data;
};

export const saveModularPractice = async ({
  quizMeta,
  sections,
  quizId = null,
  isPublishing = false,
}) => {
  const globalDuration =
    (parseInt(quizMeta.durationMin || 0, 10) * 60) +
    parseInt(quizMeta.durationSec || quizMeta.duration || 0, 10);

  const sectionRefs = [];
  for (let i = 0; i < sections.length; i++) {
    const ref = await resolveSectionRef(sections[i], quizMeta.subject);
    sectionRefs.push({ ...ref, order: i });
  }

  const payload = {
    title: quizMeta.title,
    subject: quizMeta.subject,
    description: quizMeta.description || "",
    published: isPublishing,
    status: isPublishing ? "Published" : quizMeta.status || "Draft",
    sections: sectionRefs,
    questions: [],
    isModular: true,
    isPaid: Boolean(quizMeta.isPaid || quizMeta.isPracticePaid),
    price: Number(quizMeta.price || quizMeta.practicePrice || 0),
    detailedDescription: quizMeta.detailedDescription || "",
    plans: quizMeta.plans || [],
  };

  if (quizId) {
    const res = await axios.put(`${API()}/api/practice/${quizId}`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  }

  const res = await axios.post(`${API()}/api/practice`, payload, {
    headers: authHeaders(),
  });
  return res.data;
};

export const saveSingleQuizModular = async ({ quizMeta, questions, isPublishing, scheduledDate, quizId, existingSectionId }) => {
  const questionIds = await bulkCreateQuestions(questions, quizMeta.subject);

  let sectionId = existingSectionId;
  const sectionData = {
    title: quizMeta.title,
    description: quizMeta.description,
    durationMin: 0,
    durationSec: 0,
    marksPerQuestion: quizMeta.marksPerQuestion,
    negativeMarking: quizMeta.negativeMarking,
    type: "standard",
  };

  if (sectionId) {
    await updateSectionDoc(sectionId, sectionData, questionIds, { easy: [], medium: [], hard: [] });
  } else {
    sectionId = await createSectionDoc(sectionData, questionIds, { easy: [], medium: [], hard: [] });
  }

  const duration =
    parseInt(quizMeta.duration, 10) > 0
      ? parseInt(quizMeta.duration, 10) * 60
      : 1800;

  const isPractice = quizMeta.publishAs === "practice" || quizMeta.quizType === "practice" || window.location.pathname.includes("edit-practice");
  const endpoint = isPractice ? `${API()}/api/practice` : `${API()}/api/quizzes`;

  const payload = {
    ...quizMeta,
    duration,
    published: isPublishing,
    status: isPublishing ? "Published" : quizMeta.status || "Draft",
    scheduledDate: scheduledDate || null,
    sections: [{ sectionId, mode: "linked", order: 0 }],
    questions: [],
    isModular: true,
    quizType: isPractice ? "practice" : "exam",
    publishAs: quizMeta.publishAs || (isPractice ? "practice" : "exam"),
    examSeriesId: quizMeta.examSeriesId || null,
    isPaid: Boolean(quizMeta.isPaid),
    price: Number(quizMeta.price || 0),
    isPracticePaid: Boolean(quizMeta.isPracticePaid),
    practicePrice: Number(quizMeta.practicePrice || 0),
    detailedDescription: quizMeta.detailedDescription || "",
    plans: (quizMeta.isPaid || quizMeta.isPracticePaid) ? (quizMeta.plans || []) : [],
  };

  if (quizId) {
    console.log("[saveSingleQuizModular] PUT payload overview fields:", {
      detailedDescription: payload.detailedDescription,
      plans: payload.plans,
      isPaid: payload.isPaid,
      price: payload.price,
      isPracticePaid: payload.isPracticePaid,
      practicePrice: payload.practicePrice,
      publishAs: payload.publishAs,
    });
    const res = await axios.put(`${endpoint}/${quizId}`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  }

  const res = await axios.post(endpoint, payload, {
    headers: authHeaders(),
  });
  return res.data;
};

export const fetchStandaloneSections = async (search = "") => {
  const params = new URLSearchParams({ standalone: "true" });
  if (search) params.set("search", search);

  const res = await axios.get(`${API()}/api/sections?${params}`, {
    headers: authHeaders(),
  });
  return res.data;
};

export const cloneSectionById = async (sectionId) => {
  const res = await axios.post(
    `${API()}/api/sections/${sectionId}/clone`,
    {},
    { headers: authHeaders() }
  );
  return res.data;
};

export const fetchSectionById = async (sectionId) => {
  const res = await axios.get(`${API()}/api/sections/${sectionId}`, {
    headers: authHeaders(),
  });
  return res.data;
};

export const countSectionQuestions = (section) => {
  if (!section) return 0;
  if (section.questionCount != null) return section.questionCount;
  if (section.type === "coding" && section.subsections) {
    return (
      (section.subsections.easy?.length || 0) +
      (section.subsections.medium?.length || 0) +
      (section.subsections.hard?.length || 0)
    );
  }
  return section.questions?.length || 0;
};

export const countQuizQuestions = (quiz) => {
  if (!quiz) return 0;
  if (quiz.sections?.length > 0) {
    const hasPopulated = quiz.sections.some(
      (s) => s.questions?.length > 0 || s.title
    );
    if (hasPopulated) {
      return quiz.sections.reduce((sum, sec) => sum + countSectionQuestions(sec), 0);
    }
    return null;
  }
  return quiz.questions?.length || 0;
};
