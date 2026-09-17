import React, { useState } from "react";
import mammoth from "mammoth";

export default function FlashcardDocxParser({ onCardsLoaded }) {
  const [parsing, setParsing] = useState(false);
  const [status, setStatus] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const processFile = async (file) => {
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

      const cards = parseFlashcardsFromText(rawText);

      if (cards.length === 0) {
        setStatus("❌ No flashcards found. Please check the document format.");
      } else {
        setStatus(`✅ Found ${cards.length} flashcards!`);
        onCardsLoaded(cards, file.name);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Error parsing the document.");
    } finally {
      setParsing(false);
    }
  };

  const parseFlashcardsFromText = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const cards = [];
    
    let currentCard = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // New Question starts
      if (/^(?:Q\d+[\.\)]\s*|Question\s*\d+[\.\)]\s*)/i.test(line)) {
        if (currentCard && currentCard.front && currentCard.back) {
          cards.push(currentCard);
        }
        currentCard = {
          front: line.replace(/^(?:Q\d+[\.\)]\s*|Question\s*\d+[\.\)]\s*)/i, "").trim(),
          back: "",
          explanation: ""
        };
      } 
      // Hindi translation for question
      else if (/^H[\.\:]\s*/i.test(line) && currentCard) {
        const hindiText = line.replace(/^H[\.\:]\s*/i, "").trim();
        currentCard.front += `\n\n${hindiText}`;
      }
      // Answer starts
      else if (/^(?:Ans|Answer)[\.\:\s]/i.test(line) && currentCard) {
        currentCard.back = line.replace(/^(?:Ans|Answer)[\.\:\s]+/i, "").trim();
      }
      // Explanation starts
      else if (/^(?:Exp|Explanation)[\.\:\s]/i.test(line) && currentCard) {
        currentCard.explanation = line.replace(/^(?:Exp|Explanation)[\.\:\s]+/i, "").trim();
      }
      // Continuation lines
      else if (currentCard) {
        if (!currentCard.back && !currentCard.explanation) {
            currentCard.front += " " + line;
        } else if (currentCard.back && !currentCard.explanation) {
            currentCard.back += " " + line;
        } else if (currentCard.explanation) {
            currentCard.explanation += " " + line;
        }
      }
    }

    if (currentCard && currentCard.front && currentCard.back) {
      cards.push(currentCard);
    }

    return cards;
  };

  const showGuide = () => {
    alert(
      "Supported Word (.docx) Format for Flashcards:\n\n" +
      "Q1. What is the smallest natural number?\n" +
      "Ans. 1\n" +
      "Exp. Natural numbers start from 1.\n\n" +
      "Q2. What is the successor of 99?\n" +
      "H. 99 का उत्तराधिकारी क्या है?\n" +
      "Ans. 100\n" +
      "Exp. 99 + 1 = 100.\n\n" +
      "Notes:\n" +
      "- Start questions with Q1., Q2., etc.\n" +
      "- (Optional) Add 'H.' below question for Hindi translation.\n" +
      "- Start answers with Ans.\n" +
      "- (Optional) Start explanations with Exp."
    );
  };

  return (
    <div 
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
      onDrop={(e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        setDragActive(false); 
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          processFile(e.dataTransfer.files[0]);
        }
      }}
      style={{ 
        padding: "10px 14px", 
        border: dragActive ? "2.5px dashed var(--violet, #6E3FF3)" : "1.5px solid var(--border-color)", 
        borderRadius: "10px", 
        backgroundColor: dragActive ? "rgba(110, 63, 243, 0.08)" : "var(--bg-card, #1E1E1E)", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        width: "100%", 
        boxSizing: "border-box",
        transition: "all 0.25s ease",
        cursor: "pointer",
        flexWrap: "wrap",
        gap: "10px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "200px" }}>
        <div style={{ 
          width: "36px", height: "36px", borderRadius: "8px", 
          background: "rgba(110, 63, 243, 0.1)", color: "#6E3FF3", 
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px"
        }}>
          📄
        </div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary, white)" }}>
            Import Flashcards (.docx)
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted, #9CA3AF)" }}>
            {parsing ? status : (status || "Drag & Drop or Click to Browse")}
          </div>
        </div>
      </div>
      
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button 
          onClick={(e) => { e.stopPropagation(); showGuide(); }}
          style={{ background: "transparent", border: "none", color: "var(--text-secondary, #9CA3AF)", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
        >
          Template Guide
        </button>
        <label style={{ cursor: "pointer", margin: 0 }}>
          <input
            type="file"
            accept=".docx"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0]);
              }
            }}
          />
          <div style={{ 
            background: "var(--violet, #6E3FF3)", color: "white", 
            padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "600" 
          }}>
            Browse File
          </div>
        </label>
      </div>
    </div>
  );
}
