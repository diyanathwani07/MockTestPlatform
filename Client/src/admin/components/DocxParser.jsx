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
              "Word Document Format Rules:\n\n" +
              "Section: General Knowledge (optional)\n" +
              "Q1. Your question here?\n" +
              "H. हिंदी में प्रश्न (optional)\n" +
              "A. English Option / हिंदी विकल्प\n" +
              "B. English Option / हिंदी विकल्प\n" +
              "C. English Option / हिंदी विकल्प\n" +
              "D. English Option / हिंदी विकल्प\n" +
              "Ans: A\n" +
              "Exp: Explanation here (optional)\n\n" +
              "💡 Use a slash (/) to split English and Hindi options.\n" +
              "💡 Use 'Section: Name' to automatically split questions into different sections!"
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
    const questionBlocks = chunkText.split(/\n(?=Q\d+[\.\)])/i).filter(Boolean);

    for (const block of questionBlocks) {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 6) continue;

      const questionEnglishRaw = lines[0].replace(/^Q\d+[\.\)]\s*/i, "").trim();

      let hindiLine = "";
      let optionStartIndex = 1;

      if (/^H[\.\:]/i.test(lines[1])) {
        hindiLine = lines[1].replace(/^H[\.\:]\s*/i, "").trim();
        optionStartIndex = 2;
      }

      const optionsArray = [];
      let answerLine = "";
      let explanationLine = "";
      let i = optionStartIndex;

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
          answerLine = line;
        } else if (/^Exp[\.\:\s]/i.test(line) || /^Explanation[\.\:\s]/i.test(line)) {
          explanationLine = line.replace(/^(Exp|Explanation)[\.\:\s]+/i, "").trim();
        }
        i++;
      }

      if (optionsArray.length !== 4 || !answerLine) continue;

      const answerRaw = answerLine.replace(/^Ans[\.\:\s]+/i, "").trim();
      let correctAnswer = "";

      if (/^[A-D]$/i.test(answerRaw)) {
        correctAnswer = answerRaw.toUpperCase();
      } else {
        const targetIndex = optionsArray.findIndex(
          (opt) => opt.english.toLowerCase() === answerRaw.toLowerCase()
        );
        if (targetIndex !== -1) {
          correctAnswer = ["A", "B", "C", "D"][targetIndex];
        } else {
          correctAnswer = "A";
        }
      }

      questions.push({
        questionEnglish: questionEnglishRaw,
        questionHindi: hindiLine,
        options: optionsArray,
        correctAnswer: correctAnswer,
        explanation: explanationLine,
      });
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