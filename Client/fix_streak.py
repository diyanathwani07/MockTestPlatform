path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """const days = Array.from({ length: 7 }, (_, i) => {
    const dayNumber = i + 1;
    const isDone = dayNumber <= milestoneProgress;
    return { dayNumber, isDone };
  });"""

repl1 = """const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = Array.from({ length: 7 }, (_, i) => {
    const label = dayLabels[i];
    const isDone = (i + 1) <= milestoneProgress;
    return { label, isDone };
  });"""
content = content.replace(target1, repl1)

target2 = """<span className="streak-day-label">Day {day.dayNumber}</span>"""
repl2 = """<span className="streak-day-label">{day.label}</span>"""
content = content.replace(target2, repl2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakCard.jsx")
