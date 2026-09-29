path_quiz = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Quiz.jsx'
with open(path_quiz, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Remove Prev and Next from mobile footer
bad_footer = r'<div className="mobile-quiz-footer".*?<div className="fab-icon-container">.*?<LayoutGrid size=\{24\} />.*?</div>.*?<span className="fab-label">Palette</span>\s*</button>.*?</div>'
new_footer = """<div className="mobile-quiz-footer">
        <div className="mobile-progress-bar-container">
          <div 
            className="mobile-progress-fill" 
            style={{ width: `${((currentQuestion) / questions.length) * 100}%` }}
          ></div>
        </div>
        
        <button 
          className="mobile-fab-palette"
          onClick={() => setShowPaletteMobile(!showPaletteMobile)}
        >
          <div className="fab-icon-container">
            <LayoutGrid size={24} />
          </div>
          <span className="fab-label">Question Palette</span>
        </button>
      </div>"""

if re.search(bad_footer, content, re.DOTALL):
    content = re.sub(bad_footer, new_footer, content, flags=re.DOTALL)
else:
    print("Could not find the new mobile footer pattern to revert.")
    # let's try a broader one
    bad_footer2 = r'<div className="mobile-quiz-footer".*?<span className="fab-label">Palette</span>\s*</button>.*?</div>'
    content = re.sub(bad_footer2, new_footer, content, flags=re.DOTALL)


with open(path_quiz, 'w', encoding='utf-8') as f:
    f.write(content)

path_css = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/Quiz.css'
with open(path_css, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Remove display: none !important for .quiz-action-bar
css_content = css_content.replace('.quiz-action-bar {\n      display: none !important;\n    }', '')
css_content = css_content.replace('.quiz-action-bar {\n    display: none !important;\n  }', '')

# Add new mobile rules
mobile_rules = """
@media (max-width: 768px) {
  .quiz-action-left {
    display: none !important;
  }
  .quiz-action-right {
    display: flex !important;
    justify-content: space-between !important;
    width: 100% !important;
    flex-direction: row !important;
  }
  .quiz-action-right button {
    flex: 1;
    margin: 0 4px;
  }
}
"""
css_content += mobile_rules

with open(path_css, 'w', encoding='utf-8') as f:
    f.write(css_content)

print("Updated Quiz.jsx and Quiz.css")
