const text = `Q23.
Who appoints the Governor of a State?
राज्य के राज्यपाल की नियुक्ति कौन करता है?
Options:
A. Chief Minister — मुख्यमंत्री
B. President — राष्ट्रपति
C. Prime Minister — प्रधानमंत्री
D. Chief Justice — मुख्य न्यायाधीश
Correct Answer: B — President — राष्ट्रपति
Correct Explanation:
English: The Governor of a State is appointed by the President of India.
Hindi: राज्य के राज्यपाल की नियुक्ति भारत के राष्ट्रपति करते हैं।
Wrong Answer Explanations:
A: The Chief Minister does not appoint the Governor.
Hindi: मुख्यमंत्री राज्यपाल की नियुक्ति नहीं करते।
C: The Prime Minister does not formally appoint Governors.
Hindi: प्रधानमंत्री औपचारिक रूप से राज्यपाल की नियुक्ति नहीं करते।
D: The Chief Justice has no power to appoint Governors.
Hindi: मुख्य न्यायाधीश को राज्यपाल नियुक्त करने की शक्ति नहीं है।`;

function parse(text) {
  const sections = [];
  const chunkText = text;
  const normalizedChunk = chunkText.replace(/(?=(?:Q\d+[\.\)]|Question\s*\d+))/ig, '\n');
  const questionBlocks = normalizedChunk.split(/\n(?=(?:Q\d+[\.\)]|Question\s*\d+))/i).filter(Boolean);
  const questions = [];

  for (const block of questionBlocks) {
    const preProcessedBlock = block
      .replace(/(?=[A-D][\.\)]\s+)/g, '\n')
      .replace(/(?=Correct\s+Answer\s*:)/ig, '\n')
      .replace(/(?=Correct\s+Explanation\s*:)/ig, '\n')
      .replace(/(?=Wrong\s+Answer\s+Explanations\s*:)/ig, '\n')
      .replace(/(?=English\s*:)/ig, '\n')
      .replace(/(?=Hindi\s*:)/ig, '\n')
      .replace(/(?=\b[A-D]\s*:\s+)/g, '\n')
      .replace(/(?=Hindi\s*:\s+)/ig, '\n');

    const lines = preProcessedBlock.split('\n').map(l => l.trim()).filter(Boolean);
    const isStructuredPracticeQuiz = lines.some(l => /^Correct\s+Answer\s*:/i.test(l));
    if (isStructuredPracticeQuiz) {
        let questionEnglishRaw = '';
        let hindiLine = '';
        let optionsArray = [];
        let correctAnswerLetter = '';
        let correctExpEn = '';
        let correctExpHi = '';
        
        let state = 'question';
        let currentWrongOption = '';
        const wrongExps = { A: { en: '', hi: '' }, B: { en: '', hi: '' }, C: { en: '', hi: '' }, D: { en: '', hi: '' } };

        for (let idx = 0; idx < lines.length; idx++) {
          const line = lines[idx].trim();
          if (!line) continue;

          if (/^Options\s*:/i.test(line)) {
            state = 'options';
            continue;
          } else if (/^Correct\s+Answer\s*:/i.test(line)) {
            state = 'correct_answer';
            const match = line.match(/^Correct\s+Answer\s*:\s*([A-D])/i);
            if (match) {
              correctAnswerLetter = match[1].toUpperCase();
            }
            continue;
          } else if (/^Correct\s+Explanation\s*:/i.test(line)) {
            state = 'correct_explanation';
            continue;
          } else if (/^Wrong\s+Answer\s+Explanations\s*:/i.test(line)) {
            state = 'wrong_explanations';
            continue;
          }

          if (state === 'question') {
            if (/^Q\d+[\.\)]*$/i.test(line)) continue;
            if (!questionEnglishRaw) {
              questionEnglishRaw = line;
            } else {
              hindiLine = line;
            }
          } else if (state === 'options') {
            const optMatch = line.match(/^([A-D])[\.\)]\s*(.*)/i);
            if (optMatch) {
              const optLetter = optMatch[1].toUpperCase();
              const optText = optMatch[2].trim();
              const parts = optText.split(/\s*[\u2014\u2013\-\/]\s*/);
              let enPart = parts[0] || '';
              let hiPart = parts[1] || '';
              if (parts.length > 2) {
                enPart = parts.slice(0, Math.ceil(parts.length / 2)).join(' — ');
                hiPart = parts.slice(Math.ceil(parts.length / 2)).join(' — ');
              }
              optionsArray.push({ letter: optLetter, english: enPart.trim(), hindi: hiPart.trim() });
            }
          } else if (state === 'correct_explanation') {
            if (/^English\s*:\s*(.*)/i.test(line)) {
              correctExpEn = line.replace(/^English\s*:\s*/i, '').trim();
            } else if (/^Hindi\s*:\s*(.*)/i.test(line)) {
              correctExpHi = line.replace(/^Hindi\s*:\s*/i, '').trim();
            }
          } else if (state === 'wrong_explanations') {
            const wrongMatch = line.match(/^([A-D])\s*[:\.]\s*(.*)/i);
            if (wrongMatch) {
              currentWrongOption = wrongMatch[1].toUpperCase();
              wrongExps[currentWrongOption].en = wrongMatch[2].trim();
            } else if (/^Hindi\s*:\s*(.*)/i.test(line) && currentWrongOption) {
              wrongExps[currentWrongOption].hi = line.replace(/^Hindi\s*:\s*/i, '').trim();
            }
          }
        }
        
        const sortedOptions = [];
        const letters = ['A', 'B', 'C', 'D'];
        letters.forEach(letter => {
          const found = optionsArray.find(o => o.letter === letter);
          sortedOptions.push(found ? { english: found.english, hindi: found.hindi } : { english: '', hindi: '' });
        });
        
        let explanationLine = correctExpEn;
        if (correctExpHi) explanationLine += (explanationLine ? ' / ' : '') + correctExpHi;
        
        const optionsPlain = sortedOptions.map(o => {
          if (o.english && o.hindi) return `${o.english} / ${o.hindi}`;
          return o.english || o.hindi || '';
        });
        
        const incorrectMap = {};
        letters.forEach((letter, idx) => {
          if (letter !== correctAnswerLetter) {
            const exp = wrongExps[letter];
            let expText = exp.en;
            if (exp.hi) expText += (expText ? ' / ' : '') + exp.hi;
            if (expText) incorrectMap[optionsPlain[idx]] = expText;
          }
        });
        
        questions.push({
          questionEnglish: questionEnglishRaw,
          explanations: { correct: explanationLine, incorrect: incorrectMap }
        });
    }
  }
  console.log(JSON.stringify(questions, null, 2));
}

parse(text);
