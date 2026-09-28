with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

pattern = r'<div className="sd-hero-target-pill">.*?<button className="target-btn".*?</button>\s*</div>'

replacement = '''{selectedExam && (
          <div className="sd-hero-target-pill">
            <Target size={18} className="target-icon" />
            <span className="target-text">
              {`Target: ${selectedExam.title}${selectedStructure ? ` \\u2022 ${selectedStructure.name}` : ''}${selectedSubject ? ` \\u2022 ${selectedSubject}` : ''}`}
            </span>
            <button className="target-btn" onClick={openChangeExamModal}>
              Change
              <ChevronRight size={16} style={{ marginLeft: "4px" }} />
            </button>
          </div>
        )}'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
