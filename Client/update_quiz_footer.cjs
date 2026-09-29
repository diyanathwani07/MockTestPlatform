const fs = require('fs');
const path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Quiz.jsx';
let content = fs.readFileSync(path, 'utf8');

const target = `        <button 
          className="mobile-fab-palette"
          onClick={() => setShowPaletteMobile(!showPaletteMobile)}
        >
          <div className="fab-icon-container">
            <LayoutGrid size={24} />
          </div>
          <span className="fab-label">Question Palette</span>
        </button>`;

const replacement = `        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", width: "100%" }}>
          <button 
            onClick={() => setCurrentQuestion(Math.max(currentQuestion - 1, 0))}
            disabled={currentQuestion === 0 || lockPreviousQuestions}
            style={{ 
              background: "#F1EFFA", color: "#2D1B69", border: "1.5px solid #D8D3F0", borderRadius: "10px", 
              padding: "10px 16px", fontWeight: "700", fontSize: "13px",
              opacity: (currentQuestion === 0 || lockPreviousQuestions) ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            <ArrowLeft size={16} /> Prev
          </button>
          
          <button 
            className="mobile-fab-palette"
            onClick={() => setShowPaletteMobile(!showPaletteMobile)}
            style={{ position: "relative", bottom: "auto", left: "auto", right: "auto", transform: "none", top: "auto", margin: 0 }}
          >
            <div className="fab-icon-container" style={{ width: "44px", height: "44px" }}>
              <LayoutGrid size={20} />
            </div>
          </button>

          {currentQuestion < questions.length - 1 ? (
            <button 
              onClick={() => setCurrentQuestion(Math.min(currentQuestion + 1, questions.length - 1))}
              style={{ 
                background: "#3730A3", color: "#FFFFFF", border: "none", borderRadius: "10px", 
                padding: "10px 16px", fontWeight: "700", fontSize: "13px",
                display: "flex", alignItems: "center", gap: "6px"
              }}
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              onClick={submitQuiz}
              disabled={previewMode}
              style={{ 
                background: previewMode ? "#6b7280" : "#16A34A", color: "#FFFFFF", border: "none", borderRadius: "10px", 
                padding: "10px 16px", fontWeight: "700", fontSize: "13px",
                cursor: previewMode ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "6px"
              }}
            >
              {previewMode ? "Preview" : "Submit"}
            </button>
          )}
        </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced footer in Quiz.jsx');
