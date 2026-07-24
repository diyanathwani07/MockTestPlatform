import React, { useState } from "react";
import mammoth from "mammoth";

/**
 * DocxParser Component (Bilingual Options Version)
 *
 * Expected Word document format:
 *
 * Q1. What is React?
 * H. रिएक्ट क्या है?
 * A. Library / लाइब्रेरी
 * B. Framework / फ्रेमवर्क
 * C. Database / डेटाबेस
 * D. Language / भाषा
 * Ans: A
 *
 * (Note: The "Ans:" can be either the letter like "A" or the exact English text like "Library")
 */

function DocxParser({ onQuestionsLoaded }) {
  const [parsing, setParsing] = useState(false);
  const [status, setStatus] = useState("");
  const [parsedCount, setParsedCount] = useState(0);

  const parseDocx = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      setStatus("❌ Please upload a .docx file only.");
      return;
    }

    setParsing(true);
    setStatus("Parsing document...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawText = result.value;

      const questions = parseQuestionsFromText(rawText);

      if (questions.length === 0) {
        setStatus(
          "❌ No questions found. Please check the document format (see template guide)."
        );
        setParsing(false);
        return;
      }

      setParsedCount(questions.length);
      setStatus(""); // Removed success message per user request
      onQuestionsLoaded(questions);
    } catch (error) {
      console.error("DocxParser Error:", error);
      setStatus("❌ Failed to parse document. Make sure it's a valid .docx file.");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  return (
    <div className="docx-parser-compact" style={{ padding: "10px 14px", border: "1.5px solid var(--border-color)", borderRadius: "10px", backgroundColor: "var(--bg-input)", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>📄 Import Qs (.docx)</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <a
          href="#"
          style={{ fontSize: "11.5px", color: "var(--violet)", fontWeight: "700", textDecoration: "none" }}
          onClick={(e) => {
            e.preventDefault();
            alert(
              "Supported Word (.docx) Formats:\n\n" +
              "FORMAT 1 (Labeled Layout with Option Explanations):\n" +
              "Question 1\n" +
              "English Question:\n" +
              "Which Article guarantees the Right to Equality?\n" +
              "Hindi Question:\n" +
              "भारतीय संविधान का कौन-सा अनुच्छेद...\n" +
              "Option A:\n" +
              "Article 12\n" +
              "Option B:\n" +
              "Article 14\n" +
              "Option C:\n" +
              "Article 19\n" +
              "Option D:\n" +
              "Article 21\n" +
              "Correct Answer:\n" +
              "B\n" +
              "Explanation (English):\n" +
              "Article 14 guarantees...\n" +
              "Explanation (Hindi):\n" +
              "अनुच्छेद 14 सभी नागरिकों...\n" +
              "Explanation (Option A):\n" +
              "Article 12 guarantees...\n" +
              "Explanation (Option C):\n" +
              "Article 19 guarantees...\n" +
              "Explanation (Option D):\n" +
              "Article 21 guarantees...\n\n" +
              "FORMAT 2 (Compact Layout):\n" +
              "Q1. Your English question?\n" +
              "H. हिंदी में प्रश्न\n" +
              "A. English Option / हिंदी विकल्प\n" +
              "B. English Option / हिंदी विकल्प\n" +
              "C. English Option / हिंदी विकल्प\n" +
              "D. English Option / हिंदी विकल्प\n" +
              "Ans: A\n" +
              "Exp: Explanation here\n\n" +
              "💡 Use 'Section: Name' above questions to automatically split sections!"
            );
          }}
        >
          Guide
        </a>
        <label className="docx-upload-label" style={{ cursor: "pointer", margin: 0 }}>
          <input
            type="file"
            accept=".docx"
            onChange={parseDocx}
            disabled={parsing}
            style={{ display: "none" }}
          />
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "6px", 
            padding: "8px 16px", 
            borderRadius: "8px", 
            backgroundColor: "var(--primary-color, #6E3FF3)",
            color: "#fff",
            fontSize: "12px",
            fontWeight: "700",
            transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(110, 63, 243, 0.2)"
          }}>
            <span>{parsing ? "Parsing..." : "📥 Import"}</span>
          </div>
        </label>
      </div>
      {status && (
        <p
          className={`docx-status ${status.startsWith("✅") ? "docx-success" : "docx-error"}`}
          style={{ 
            margin: "0", 
            fontSize: "11px", 
            fontWeight: "600",
            color: status.startsWith("✅") ? "var(--green)" : "var(--red)"
          }}
        >
          {status}
        </p>
      )}
    </div>
  );
}

/**
 * Parses raw extracted text into structured bilingual option objects.
 */
function parseQuestionsFromText(text) {
  const sections = [];

  // Split by section markers (e.g., "Section: Aptitude", "Section 1")
  const sectionChunks = text.split(/\n(?=Section\s*[:\-]?\s*)/i).filter(Boolean);

  for (const chunk of sectionChunks) {
    let sectionTitle = "Default";
    let chunkText = chunk.trim();

    const sectionMatch = chunkText.match(/^Section\s*[:\-]?\s*(.+)/i);
    if (sectionMatch) {
      sectionTitle = sectionMatch[1].trim();
      chunkText = chunkText.replace(/^Section\s*[:\-]?\s*(.+)/i, "").trim();
    }

    const questions = [];
    // Split by Question marker: Q1., Question 1, Question 2, etc.
    const questionBlocks = chunkText.split(/\n(?=(?:Q\d+[\.\)]|Question\s*\d+))/i).filter(Boolean);

    for (const block of questionBlocks) {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 5) continue;

      let questionEnglishRaw = "";
      let hindiLine = "";
      let optionsArray = [];
      let correctAnswer = "";
      let explanationLine = "";

      // We support two formats:
      // 1) Labeled layout:
      //    Question 1
      //    English Question:
      //    Which Article...
      //    Hindi Question:
      //    भारतीय संविधान...
      //    Option A:
      //    Article 12
      //    ...
      //    Correct Answer:
      //    B
      //    Explanation (English):
      //    ...
      //    Explanation (Hindi):
      //    ...
      //
      // 2) Original compact format:
      //    Q1. What is React?
      //    H. रिएक्ट क्या है?
      //    A. Library / लाइब्रेरी
      //    ...

      const isLabeledLayout = lines.some(l => /^English\s+Question\s*:/i.test(l)) || lines.some(l => /^Option\s+[A-D]\s*:/i.test(l));

      if (isLabeledLayout) {
        // Parse Labeled layout
        let currentMode = ""; // "question_en", "question_hi", "opt_a", "opt_b", "opt_c", "opt_d", "answer", "exp_en", "exp_hi", "exp_a", "exp_b", "exp_c", "exp_d"
        let optA_en = "", optA_hi = "";
        let optB_en = "", optB_hi = "";
        let optC_en = "", optC_hi = "";
        let optD_en = "", optD_hi = "";
        let expEn = "", expHi = "";
        let expA = "", expB = "", expC = "", expD = "";

        for (let idx = 0; idx < lines.length; idx++) {
          const line = lines[idx];

          if (/^English\s+Question\s*:/i.test(line)) {
            currentMode = "question_en";
            continue;
          } else if (/^Hindi\s+Question\s*:/i.test(line)) {
            currentMode = "question_hi";
            continue;
          } else if (/^Option\s+A\s*:/i.test(line)) {
            currentMode = "opt_a";
            continue;
          } else if (/^Option\s+B\s*:/i.test(line)) {
            currentMode = "opt_b";
            continue;
          } else if (/^Option\s+C\s*:/i.test(line)) {
            currentMode = "opt_c";
            continue;
          } else if (/^Option\s+D\s*:/i.test(line)) {
            currentMode = "opt_d";
            continue;
          } else if (/^Correct\s+Answer\s*:/i.test(line)) {
            currentMode = "answer";
            continue;
          } else if (/^Explanation\s*\(English\)\s*:/i.test(line)) {
            currentMode = "exp_en";
            continue;
          } else if (/^Explanation\s*\(Hindi\)\s*:/i.test(line)) {
            currentMode = "exp_hi";
            continue;
          } else if (/^Explanation\s*\(Option\s*A\)\s*:/i.test(line)) {
            currentMode = "exp_a";
            continue;
          } else if (/^Explanation\s*\(Option\s*B\)\s*:/i.test(line)) {
            currentMode = "exp_b";
            continue;
          } else if (/^Explanation\s*\(Option\s*C\)\s*:/i.test(line)) {
            currentMode = "exp_c";
            continue;
          } else if (/^Explanation\s*\(Option\s*D\)\s*:/i.test(line)) {
            currentMode = "exp_d";
            continue;
          } else if (/^(Question\s*\d+|Q\d+)/i.test(line) && idx === 0) {
            continue; // Skip the Question 1 title line
          }

          // Accumulate text based on active block mode
          if (currentMode === "question_en") {
            questionEnglishRaw += (questionEnglishRaw ? " " : "") + line;
          } else if (currentMode === "question_hi") {
            hindiLine += (hindiLine ? " " : "") + line;
          } else if (currentMode === "opt_a") {
            if (line.includes("/")) {
              const pts = line.split("/");
              optA_en += (optA_en ? " " : "") + pts[0].trim();
              optA_hi += (optA_hi ? " " : "") + pts[1].trim();
            } else {
              optA_en += (optA_en ? " " : "") + line;
            }
          } else if (currentMode === "opt_b") {
            if (line.includes("/")) {
              const pts = line.split("/");
              optB_en += (optB_en ? " " : "") + pts[0].trim();
              optB_hi += (optB_hi ? " " : "") + pts[1].trim();
            } else {
              optB_en += (optB_en ? " " : "") + line;
            }
          } else if (currentMode === "opt_c") {
            if (line.includes("/")) {
              const pts = line.split("/");
              optC_en += (optC_en ? " " : "") + pts[0].trim();
              optC_hi += (optC_hi ? " " : "") + pts[1].trim();
            } else {
              optC_en += (optC_en ? " " : "") + line;
            }
          } else if (currentMode === "opt_d") {
            if (line.includes("/")) {
              const pts = line.split("/");
              optD_en += (optD_en ? " " : "") + pts[0].trim();
              optD_hi += (optD_hi ? " " : "") + pts[1].trim();
            } else {
              optD_en += (optD_en ? " " : "") + line;
            }
          } else if (currentMode === "answer") {
            correctAnswer = line.replace(/^Ans[\.\:\s]*/i, "").trim().toUpperCase().slice(0, 1);
          } else if (currentMode === "exp_en") {
            expEn += (expEn ? " " : "") + line;
          } else if (currentMode === "exp_hi") {
            expHi += (expHi ? " " : "") + line;
          } else if (currentMode === "exp_a") {
            expA += (expA ? " " : "") + line;
          } else if (currentMode === "exp_b") {
            expB += (expB ? " " : "") + line;
          } else if (currentMode === "exp_c") {
            expC += (expC ? " " : "") + line;
          } else if (currentMode === "exp_d") {
            expD += (expD ? " " : "") + line;
          }
        }

        optionsArray = [
          { english: optA_en.trim(), hindi: optA_hi.trim() },
          { english: optB_en.trim(), hindi: optB_hi.trim() },
          { english: optC_en.trim(), hindi: optC_hi.trim() },
          { english: optD_en.trim(), hindi: optD_hi.trim() }
        ];

        // Format explanations structure
        explanationLine = expEn.trim();
        if (expHi.trim()) {
          explanationLine += (explanationLine ? " / " : "") + expHi.trim();
        }

        const incorrectMap = {};
        const optionsPlain = optionsArray.map(o => {
          if (o.english && o.hindi) return `${o.english} / ${o.hindi}`;
          return o.english || o.hindi || "";
        });

        // Set correct option and mapping incorrect option explanations
        if (correctAnswer === "A") {
          incorrectMap[optionsPlain[1]] = expB.trim();
          incorrectMap[optionsPlain[2]] = expC.trim();
          incorrectMap[optionsPlain[3]] = expD.trim();
        } else if (correctAnswer === "B") {
          incorrectMap[optionsPlain[0]] = expA.trim();
          incorrectMap[optionsPlain[2]] = expC.trim();
          incorrectMap[optionsPlain[3]] = expD.trim();
        } else if (correctAnswer === "C") {
          incorrectMap[optionsPlain[0]] = expA.trim();
          incorrectMap[optionsPlain[1]] = expB.trim();
          incorrectMap[optionsPlain[3]] = expD.trim();
        } else if (correctAnswer === "D") {
          incorrectMap[optionsPlain[0]] = expA.trim();
          incorrectMap[optionsPlain[1]] = expB.trim();
          incorrectMap[optionsPlain[2]] = expC.trim();
        }

        questions.push({
          questionEnglish: questionEnglishRaw,
          questionHindi: hindiLine,
          options: optionsArray,
          correctAnswer: correctAnswer,
          explanation: explanationLine,
          explanations: {
            correct: explanationLine,
            incorrect: incorrectMap,
            conceptSummary: "",
            didYouKnow: ""
          }
        });

      } else {
        // Original compact format parse
        questionEnglishRaw = lines[0].replace(/^Q\d+[\.\)]\s*/i, "").trim();

        let optionStartIndex = 1;
        if (/^H[\.\:]/i.test(lines[1])) {
          hindiLine = lines[1].replace(/^H[\.\:]\s*/i, "").trim();
          optionStartIndex = 2;
        }

        let i = optionStartIndex;
        let ansLineText = "";

        while (i < lines.length) {
          const line = lines[i];
          if (/^[A-D][\.\)]\s+/i.test(line)) {
            const textWithoutLetter = line.replace(/^[A-D][\.\)]\s+/i, "").trim();
            let englishPart = textWithoutLetter;
            let hindiPart = "";

            if (textWithoutLetter.includes("/")) {
              const splitParts = textWithoutLetter.split("/");
              englishPart = splitParts[0].trim();
              hindiPart = splitParts[1].trim();
            }

            optionsArray.push({
              english: englishPart,
              hindi: hindiPart
            });
          } else if (/^Ans[\.\:\s]/i.test(line)) {
            ansLineText = line;
          } else if (/^Exp[\.\:\s]/i.test(line) || /^Explanation[\.\:\s]/i.test(line)) {
            explanationLine = line.replace(/^(Exp|Explanation)[\.\:\s]+/i, "").trim();
          }
          i++;
        }

        if (optionsArray.length !== 4 || !ansLineText) continue;

        const answerRaw = ansLineText.replace(/^Ans[\.\:\s]+/i, "").trim();
        if (/^[A-D]$/i.test(answerRaw)) {
          correctAnswer = answerRaw.toUpperCase();
        } else {
          const targetIndex = optionsArray.findIndex(
            (opt) => opt.english.toLowerCase() === answerRaw.toLowerCase()
          );
          correctAnswer = targetIndex !== -1 ? ["A", "B", "C", "D"][targetIndex] : "A";
        }

        const optionsPlain = optionsArray.map(o => {
          if (o.english && o.hindi) return `${o.english} / ${o.hindi}`;
          return o.english || o.hindi || "";
        });

        questions.push({
          questionEnglish: questionEnglishRaw,
          questionHindi: hindiLine,
          options: optionsArray,
          correctAnswer: correctAnswer,
          explanation: explanationLine,
          explanations: {
            correct: explanationLine,
            incorrect: {},
            conceptSummary: "",
            didYouKnow: ""
          }
        });
      }
    }

    if (questions.length > 0) {
      sections.push({
        sectionTitle,
        questions
      });
    }
  }

  return sections;
}

export default DocxParser;