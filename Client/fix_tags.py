path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/ExamSeriesDetails.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We want to replace the hardcoded {fc.chapter} and {fc.topic} spans.
old_tags = """<span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(110, 63, 243, 0.15)", color: "#6E3FF3", borderRadius: "4px", fontWeight: "600" }}>Flashcards</span>
                            {fc.chapter && <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(99, 102, 241, 0.15)", color: "#6366F1", borderRadius: "4px", fontWeight: "600" }}>{fc.chapter}</span>}
                            {fc.topic && <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(236, 72, 153, 0.15)", color: "#EC4899", borderRadius: "4px", fontWeight: "600" }}>{fc.topic}</span>}"""

new_tags = """<span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(110, 63, 243, 0.15)", color: "#6E3FF3", borderRadius: "4px", fontWeight: "600" }}>Flashcards</span>
                            {fc.chapter && fc.chapter.toLowerCase() !== (fc.subjectName || "General").toLowerCase() && (
                              <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(99, 102, 241, 0.15)", color: "#6366F1", borderRadius: "4px", fontWeight: "600" }}>{fc.chapter}</span>
                            )}
                            {fc.topic && fc.topic.toLowerCase() !== (fc.subjectName || "General").toLowerCase() && fc.topic.toLowerCase() !== (fc.chapter || "").toLowerCase() && (
                              <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(236, 72, 153, 0.15)", color: "#EC4899", borderRadius: "4px", fontWeight: "600" }}>{fc.topic}</span>
                            )}"""

if old_tags in content:
    content = content.replace(old_tags, new_tags)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed repeating tags in ExamSeriesDetails.jsx")
else:
    print("Could not find the exact tags block in ExamSeriesDetails.jsx")
