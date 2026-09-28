import fs from 'fs';

const path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<div className="sd-hero-target-pill">[\s\S]*?<button className="target-btn"[^>]*>[\s\S]*?<\/button>\s*<\/div>/;

const replacement = `{selectedExam && (
          <div className="sd-hero-target-pill">
            <Target size={18} className="target-icon" />
            <span className="target-text">
              {\`Target: \${selectedExam.title}\${selectedStructure ? \` • \${selectedStructure.name}\` : ''}\${selectedSubject ? \` • \${selectedSubject}\` : ''}\`}
            </span>
            <button className="target-btn" onClick={openChangeExamModal}>
              Change
              <ChevronRight size={16} style={{ marginLeft: "4px" }} />
            </button>
          </div>
        )}`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content, 'utf8');
