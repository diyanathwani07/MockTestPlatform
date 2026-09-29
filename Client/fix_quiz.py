path_quiz = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Quiz.jsx'
with open(path_quiz, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix full screen uncaught promise
old_fullscreen = """if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();"""

new_fullscreen = """if (el.requestFullscreen) { el.requestFullscreen().catch(() => {}); }
    else if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); }
    else if (el.mozRequestFullScreen) { el.mozRequestFullScreen(); }"""

if old_fullscreen in content:
    content = content.replace(old_fullscreen, new_fullscreen)

# 2. Fix mobile footer
import re
old_footer_pattern = r'<div className="mobile-quiz-footer">.*?<span className="fab-label">Question Palette</span>\s*</button>\s*</div>'

new_footer = """<div className="mobile-quiz-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', height: '65px' }}>
        <div className="mobile-progress-bar-container">
          <div 
            className="mobile-progress-fill" 
            style={{ width: `${((currentQuestion) / questions.length) * 100}%` }}
          ></div>
        </div>
        
        <button 
          onClick={() => setCurrentQuestion(Math.max(currentQuestion - 1, 0))} 
          disabled={currentQuestion === 0 || lockPreviousQuestions}
          style={{ padding: '10px 16px', borderRadius: '10px', background: '#F1EFFA', color: '#2D1B69', border: '1.5px solid #D8D3F0', fontWeight: '700', fontSize: '13px', zIndex: 10, opacity: (currentQuestion === 0 || lockPreviousQuestions) ? 0.5 : 1 }}
        >
          Prev
        </button>

        <button 
          className="mobile-fab-palette"
          onClick={() => setShowPaletteMobile(!showPaletteMobile)}
        >
          <div className="fab-icon-container">
            <LayoutGrid size={24} />
          </div>
          <span className="fab-label">Palette</span>
        </button>

        {currentQuestion === questions.length - 1 ? (
          <button 
            onClick={submitQuiz} 
            disabled={previewMode}
            style={{ padding: '10px 16px', borderRadius: '10px', background: previewMode ? '#6b7280' : '#16A34A', color: '#FFFFFF', border: 'none', fontWeight: '700', fontSize: '13px', zIndex: 10, opacity: previewMode ? 0.5 : 1 }}
          >
            Submit
          </button>
        ) : (
          <button 
            onClick={() => setCurrentQuestion(Math.min(currentQuestion + 1, questions.length - 1))}
            style={{ padding: '10px 16px', borderRadius: '10px', background: '#3730A3', color: '#FFFFFF', border: 'none', fontWeight: '700', fontSize: '13px', zIndex: 10 }}
          >
            Next
          </button>
        )}
      </div>"""

content = re.sub(old_footer_pattern, new_footer, content, flags=re.DOTALL)

with open(path_quiz, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Quiz.jsx")
