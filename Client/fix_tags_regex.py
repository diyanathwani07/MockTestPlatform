import re
path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/ExamSeriesDetails.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace fc.chapter
content = re.sub(r'\{fc\.chapter\s*&&\s*<span[^>]*>\{fc\.chapter\}</span>\}', 
    r'{fc.chapter && fc.chapter.toLowerCase() !== (fc.subjectName || "General").toLowerCase() && <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(99, 102, 241, 0.15)", color: "#6366F1", borderRadius: "4px", fontWeight: "600" }}>{fc.chapter}</span>}', 
    content)

# Replace fc.topic
content = re.sub(r'\{fc\.topic\s*&&\s*<span[^>]*>\{fc\.topic\}</span>\}', 
    r'{fc.topic && fc.topic.toLowerCase() !== (fc.subjectName || "General").toLowerCase() && fc.topic.toLowerCase() !== (fc.chapter || "").toLowerCase() && <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(236, 72, 153, 0.15)", color: "#EC4899", borderRadius: "4px", fontWeight: "600" }}>{fc.topic}</span>}', 
    content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated tags deduplication")
