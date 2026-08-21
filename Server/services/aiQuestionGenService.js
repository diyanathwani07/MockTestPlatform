const { GoogleGenAI, Type } = require('@google/genai');
const { generateContentWithFallback } = require('../utils/geminiHelper');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionEnglish: { type: Type.STRING },
          questionHindi: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          correctAnswerIndex: { type: Type.INTEGER },
          correctExplanationEnglish: { type: Type.STRING },
          correctExplanationHindi: { type: Type.STRING },
          wrongExplanations: {
            type: Type.OBJECT,
            properties: {
              '0': { type: Type.STRING },
              '1': { type: Type.STRING },
              '2': { type: Type.STRING },
              '3': { type: Type.STRING },
              '4': { type: Type.STRING },
              '5': { type: Type.STRING }
            }
          }
        },
        required: [
          'questionEnglish',
          'questionHindi',
          'options',
          'correctAnswerIndex',
          'correctExplanationEnglish',
          'correctExplanationHindi',
          'wrongExplanations'
        ]
      }
    }
  },
  required: ['questions']
};

function validateAndFormatQuestions(questionsList, expectedCount, expectedOptionCount) {
  if (!Array.isArray(questionsList)) {
    throw new Error('AI response did not return a valid list of questions.');
  }

  const validated = [];
  for (const q of questionsList) {
    if (!q.questionEnglish || !q.questionEnglish.trim()) {
      throw new Error('Question missing English text.');
    }
    if (!Array.isArray(q.options) || q.options.length !== expectedOptionCount) {
      throw new Error(`Question does not have exactly ${expectedOptionCount} options.`);
    }
    const correctIdx = parseInt(q.correctAnswerIndex, 10);
    if (isNaN(correctIdx) || correctIdx < 0 || correctIdx >= q.options.length) {
      throw new Error('Question correct answer index is out of bounds.');
    }

    const correctAnswerText = q.options[correctIdx];
    const incorrectMap = {};
    q.options.forEach((opt, idx) => {
      if (idx !== correctIdx) {
        let wrongExp = q.wrongExplanations && (q.wrongExplanations[idx] || q.wrongExplanations[String(idx)]);
        incorrectMap[opt] = wrongExp || 'Incorrect option.';
      }
    });

    const explanationLine = (q.correctExplanationEnglish || '') + 
      (q.correctExplanationEnglish && q.correctExplanationHindi ? '\n' : '') + 
      (q.correctExplanationHindi || '');

    validated.push({
      questionEnglish: q.questionEnglish,
      questionHindi: q.questionHindi || '',
      options: q.options,
      correctAnswer: correctAnswerText,
      explanation: explanationLine,
      explanations: {
        correct: explanationLine,
        incorrect: incorrectMap,
        conceptSummary: '',
        didYouKnow: ''
      }
    });
  }

  return validated;
}

async function generateFromPrompt({ topic, count, difficulty, subject, examContext, negativeMarkingEnabled, optionCount }) {
  const finalCount = Math.min(parseInt(count, 10) || 10, 20);
  const finalOptionCount = parseInt(optionCount, 10) || 4;

  let negativeMarkingNote = '';
  if (negativeMarkingEnabled) {
    negativeMarkingNote = 'Since negative marking is enabled, make sure NOT to generate any ambiguous, trick, or multi-interpretive questions. Keep the correct answer clear and objective.';
  }

  const promptText = `Generate ${finalCount} multiple-choice questions (MCQs) for the topic '${topic}'.
Subject context: ${subject || 'General'}
Exam context: ${examContext || 'Standard Competitive Exam'}
Difficulty: ${difficulty || 'medium'}
Each question must have exactly ${finalOptionCount} options.
${negativeMarkingNote}
Generate both English and Hindi versions for each question and its correct explanation.
For wrong explanations, map each incorrect option index (0-based) to a brief one-line reason why it is wrong.`;

  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await generateContentWithFallback(ai, promptText, {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7
      });
      const parsed = JSON.parse(response.text);
      return validateAndFormatQuestions(parsed.questions, finalCount, finalOptionCount);
    } catch (err) {
      console.error('[AI Gen prompt service] Attempt ' + attempt + ' failed:', err.message);
      lastErr = err;
    }
  }
  throw new Error('Failed to generate valid questions from prompt: ' + lastErr.message);
}

async function generateFromImage({ imageBuffer, mimeType, count, subject, optionCount }) {
  const finalCount = Math.min(parseInt(count, 10) || 10, 15);
  const finalOptionCount = parseInt(optionCount, 10) || 4;

  const promptText = `Analyze the uploaded image and generate ${finalCount} multiple-choice questions (MCQs) directly based on its content (text, diagrams, formulas, or concepts).
Subject context: ${subject || 'General'}
Each question must have exactly ${finalOptionCount} options.
Generate both English and Hindi versions for each question and its correct explanation.
For wrong explanations, map each incorrect option index (0-based) to a brief one-line reason why it is wrong.`;

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimeType
    }
  };

  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await generateContentWithFallback(ai, [imagePart, promptText], {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.4
      });
      const parsed = JSON.parse(response.text);
      return validateAndFormatQuestions(parsed.questions, finalCount, finalOptionCount);
    } catch (err) {
      console.error('[AI Gen image service] Attempt ' + attempt + ' failed:', err.message);
      lastErr = err;
    }
  }
  throw new Error('Failed to generate valid questions from image: ' + lastErr.message);
}

async function generateFromVideoFile({ geminiFileUri, mimeType, count, subject, optionCount }) {
  const finalCount = Math.min(parseInt(count, 10) || 10, 15);
  const finalOptionCount = parseInt(optionCount, 10) || 4;

  const promptText = `Analyze the uploaded video file and generate ${finalCount} multiple-choice questions (MCQs) directly based on its educational content, discussions, or concepts.
Subject context: ${subject || 'General'}
Each question must have exactly ${finalOptionCount} options.
Generate both English and Hindi versions for each question and its correct explanation.
For wrong explanations, map each incorrect option index (0-based) to a brief one-line reason why it is wrong.`;

  const videoPart = {
    fileData: {
      fileUri: geminiFileUri,
      mimeType: mimeType
    }
  };

  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await generateContentWithFallback(ai, [videoPart, promptText], {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.4
      });
      const parsed = JSON.parse(response.text);
      return validateAndFormatQuestions(parsed.questions, finalCount, finalOptionCount);
    } catch (err) {
      console.error('[AI Gen video service] Attempt ' + attempt + ' failed:', err.message);
      lastErr = err;
    }
  }
  throw new Error('Failed to generate valid questions from video: ' + lastErr.message);
}

module.exports = {
  generateFromPrompt,
  generateFromImage,
  generateFromVideoFile
};
