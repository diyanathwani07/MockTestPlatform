path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentOnboarding.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Add useLocation
content = content.replace('import { useNavigate } from "react-router-dom";', 'import { useNavigate, useLocation } from "react-router-dom";')

# Add location and change useState(1)
content = content.replace('const navigate = useNavigate();\n  const { user, login } = useAuth();\n  const [step, setStep] = useState(1);', 
'''const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const [step, setStep] = useState(location.state?.skipIntro ? 2 : 1);''')

# Add skip buttons to Step 4, 5, 6
skip_button = """
                <button onClick={nextStep} style={{ marginTop: "16px", padding: "8px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontWeight: "500", width: "100%", fontSize: "14px", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "var(--text-primary)"} onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}>
                  Skip for now
                </button>
              </div>
            )}
"""

# Replace the end of Step 4
content = re.sub(
    r'(<button\s+onClick=\{nextStep\}\s+disabled=\{\!formData\.goal\}.*?Continue\s*</button>\s*</div>)\s*</div>\s*\)}', 
    r'\1' + skip_button, 
    content,
    flags=re.DOTALL
)

# Replace the end of Step 5
content = re.sub(
    r'(<button\s+onClick=\{nextStep\}\s+disabled=\{\!formData\.experience\}.*?Continue\s*</button>\s*</div>)\s*</div>\s*\)}', 
    r'\1' + skip_button, 
    content,
    flags=re.DOTALL
)

# Replace the end of Step 6
content = re.sub(
    r'(<button\s+onClick=\{nextStep\}\s+disabled=\{formData\.preferences\.length === 0\}.*?Continue\s*</button>\s*</div>)\s*</div>\s*\)}', 
    r'\1' + skip_button, 
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StudentOnboarding.jsx")
