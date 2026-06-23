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
      setStatus(`✅ Successfully parsed ${questions.length} question(s)!`);
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
    <div className="docx-parser-compact" style={{ padding: "10px 14px", border: "1.5px dashed var(--border-input)", borderRadius: "10px", backgroundColor: "var(--bg-input)", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)" }}>📄 Import Qs (.docx)</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <a
          href="#"
          style={{ fontSize: "11.5px", color: "var(--violet)", fontWeight: "700", textDecoration: "none" }}
          onClick={(e) => {
            e.preventDefault();
            alert(
              "Word Document Format Rules:\n\n" +
              "Q1. Your question here?\n" +
              "H. हिंदी में प्रश्न (optional)\n" +
              "A. English Option / हिंदी विकल्प\n" +
              "B. English Option / हिंदी विकल्प\n" +
              "C. English Option / हिंदी विकल्प\n" +
              "D. English Option / हिंदी विकल्प\n" +
              "Ans: A\n\n" +
              "💡 Use a slash (/) to split English and Hindi options."
            );
          }}
        >
          Guide
        </a>
        <label className="docx-upload-label" style={{ cursor: "pointer" }}>
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
            padding: "6px 12px", 
            border: "1.5px solid var(--violet)", 
            borderRadius: "6px", 
            backgroundColor: "rgba(110, 63, 243, 0.08)",
            color: "var(--violet)",
            fontSize: "11.5px",
            fontWeight: "700",
            transition: "all 0.2s"
          }}>
            <span>{parsing ? "Wait..." : "📤 Import"}</span>
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
  const questions = [];

  // Split by question markers: Q1. Q2. etc. Lookbehinds ensure formatting safety
  const questionBlocks = text.split(/\n(?=Q\d+[\.\)])/i).filter(Boolean);

  for (const block of questionBlocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 6) continue;

    // Extract Question English
    const questionEnglishRaw = lines[0].replace(/^Q\d+[\.\)]\s*/i, "").trim();

    // Check for optional Hindi line tracker
    let hindiLine = "";
    let optionStartIndex = 1;

    if (/^H[\.\:]/i.test(lines[1])) {
      hindiLine = lines[1].replace(/^H[\.\:]\s*/i, "").trim();
      optionStartIndex = 2;
    }

    // Extract raw options and look for answer line keys
    const optionsArray = [];
    let answerLine = "";
    let i = optionStartIndex;

    while (i < lines.length) {
      const line = lines[i];

      if (/^[A-D][\.\)]\s+/i.test(line)) {
        // Strip the letter assignment prefix ("A. ", "B) ")
        const textWithoutLetter = line.replace(/^[A-D][\.\)]\s+/i, "").trim();
        
        // Split option string into English & Hindi segments using your slash format separator
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
      }
      i++;
    }

    if (optionsArray.length !== 4 || !answerLine) continue;

    // Parse Answer line value
    const answerRaw = answerLine.replace(/^Ans[\.\:\s]+/i, "").trim();
    let correctAnswer = "";

    // Normalize answer into a standardized option letter tag selector ("A", "B", "C", "D")
    if (/^[A-D]$/i.test(answerRaw)) {
      correctAnswer = answerRaw.toUpperCase();
    } else {
      // If the file provides full raw text string instead of letters, map matches back to the target letter
      const targetIndex = optionsArray.findIndex(
        (opt) => opt.english.toLowerCase() === answerRaw.toLowerCase()
      );
      if (targetIndex !== -1) {
        correctAnswer = ["A", "B", "C", "D"][targetIndex];
      } else {
        // Default fallback selection if string parsing mismatches occur
        correctAnswer = "A";
      }
    }

    questions.push({
      questionEnglish: questionEnglishRaw,
      questionHindi: hindiLine,
      options: optionsArray,
      correctAnswer: correctAnswer,
    });
  }

  return questions;
}

export default DocxParser;