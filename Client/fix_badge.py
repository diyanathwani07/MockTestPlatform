with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentOnboarding.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

old_badge = '''{formData.examId && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(138, 85, 252, 0.1)", color: "var(--primary)", padding: "8px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "600", marginBottom: "32px" }}>
                    <Target size={16} /> Preparing for: {formData.examId === "other" ? "Your Exam" : (examSeries.find(e => e._id === formData.examId)?.title || "Your Exam")}
                  </div>
                )}'''

new_badge = '''{formData.examId && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(138, 85, 252, 0.1)", color: "var(--primary)", padding: "8px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "600", marginBottom: "32px" }}>
                    <Target size={16} /> {formData.examId === "other" ? "Exploring Exams" : Preparing for: }
                  </div>
                )}'''

content = content.replace(old_badge, new_badge)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentOnboarding.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
