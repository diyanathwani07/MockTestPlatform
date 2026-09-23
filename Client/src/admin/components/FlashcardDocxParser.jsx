import React, { useState } from "react";
import mammoth from "mammoth";
import axios from "axios";

export default function FlashcardDocxParser({ onCardsLoaded }) {
  const [parsing, setParsing] = useState(false);
  const [status, setStatus] = useState("");
  const [dragActive, setDragActive] = useState(false);

  function dataURLtoBlob(dataurl) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
  }

  const processFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".docx")) {
      setStatus("? Please upload a .docx file only.");
      return;
    }
    setParsing(true);
    setStatus("Parsing document...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const options = {
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        })
      };

      const result = await mammoth.convertToHtml({ arrayBuffer }, options);
      const htmlText = result.value;

      const cards = parseFlashcardsFromHtml(htmlText);

      if (cards.length === 0) {
        setStatus("? No flashcards found. Please check the document format.");
      } else {
        // Upload images
        for (let i = 0; i < cards.length; i++) {
          let card = cards[i];
          if (card.localImage) {
            setStatus(`Uploading image ${i+1} of ${cards.length}...`);
            try {
              const blob = dataURLtoBlob(card.localImage);
              const formData = new FormData();
              formData.append("image", blob, "image.png");
              formData.append("folder", "flashcards");
              const token = localStorage.getItem("token");
              const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload/image`, formData, {
                headers: { Authorization: `Bearer ${token}` }
              });
              card.imageUrl = res.data.imageUrl;
            } catch(e) {
              console.error("Failed to upload image", e);
            }
            delete card.localImage;
          }
        }

        setStatus(`✅ Found ${cards.length} flashcards!`);
        onCardsLoaded(cards, file.name);
      }
    } catch (err) {
      console.error(err);
      setStatus("? Error parsing the document.");
    } finally {
      setParsing(false);
    }
  };

  const parseFlashcardsFromHtml = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    const items = [];
    const traverse = (node) => {
      if (node.nodeName.toLowerCase() === 'img') {
        items.push({ type: 'image', src: node.getAttribute('src') });
      } else if (node.nodeName.toLowerCase() === 'br') {
        items.push({ type: 'text', content: '\n' });
      } else if (node.nodeType === Node.TEXT_NODE) {
        items.push({ type: 'text', content: node.textContent });
      } else {
        if (node.nodeName.toLowerCase() === 'p' && items.length > 0 && items[items.length-1].content !== '\n') {
           items.push({ type: 'text', content: '\n' });
        }
        node.childNodes.forEach(traverse);
        if (node.nodeName.toLowerCase() === 'p') {
           items.push({ type: 'text', content: '\n' });
        }
      }
    };
    traverse(doc.body);

    let lines = [];
    let currentLine = { text: "", image: null };
    
    items.forEach(item => {
       if (item.type === 'text') {
           const parts = item.content.split('\n');
           parts.forEach((part, i) => {
              currentLine.text += part;
              if (i < parts.length - 1) {
                  lines.push(currentLine);
                  currentLine = { text: "", image: null };
              }
           });
       } else if (item.type === 'image') {
           currentLine.image = item.src;
       }
    });
    if (currentLine.text || currentLine.image) lines.push(currentLine);
    
    lines = lines.map(l => ({ ...l, text: l.text.trim() })).filter(l => l.text.length > 0 || l.image);

    const cards = [];
    let currentCard = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const text = line.text;

      if (/^(?:Q\d+[\.\)]\s*|Question\s*\d+[\.\)]\s*)/i.test(text)) {
        if (currentCard && currentCard.front && currentCard.back) {
          cards.push(currentCard);
        }
        currentCard = {
          front: text.replace(/^(?:Q\d+[\.\)]\s*|Question\s*\d+[\.\)]\s*)/i, "").trim(),
          back: "",
          explanation: "",
          imageUrl: "",
          localImage: line.image || null
        };
      } 
      else if (/^H[\.\:]\s*/i.test(text) && currentCard) {
        const hindiText = text.replace(/^H[\.\:]\s*/i, "").trim();
        currentCard.front += `\n\n${hindiText}`;
        if (line.image && !currentCard.localImage) currentCard.localImage = line.image;
      }
      else if (/^(?:Ans|Answer)[\.\:\s]/i.test(text) && currentCard) {
        currentCard.back = text.replace(/^(?:Ans|Answer)[\.\:\s]+/i, "").trim();
        if (line.image && !currentCard.localImage) currentCard.localImage = line.image;
      }
      else if (/^(?:Exp|Explanation)[\.\:\s]/i.test(text) && currentCard) {
        currentCard.explanation = text.replace(/^(?:Exp|Explanation)[\.\:\s]+/i, "").trim();
        if (line.image && !currentCard.localImage) currentCard.localImage = line.image;
      }
      else if (currentCard) {
        if (text) {
          if (!currentCard.back && !currentCard.explanation) {
              currentCard.front += (currentCard.front ? " " : "") + text;
          } else if (currentCard.back && !currentCard.explanation) {
              currentCard.back += (currentCard.back ? " " : "") + text;
          } else if (currentCard.explanation) {
              currentCard.explanation += (currentCard.explanation ? " " : "") + text;
          }
        }
        if (line.image && !currentCard.localImage) {
            currentCard.localImage = line.image;
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
