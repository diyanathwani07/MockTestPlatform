path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

import re

old_length = """  // Create last 7 days ending today
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    
    // Check if missed yesterday but streak > 0 (meaning freeze was used)
    const isToday = i === 6;
    const isYesterday = i === 5;
    const usedFreezeOnYesterday = isYesterday && streak > 0 && !dates.includes(dateStr);"""

new_length = """  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show 5 days on mobile for better spacing, 7 days on desktop
  const numDays = isMobile ? 5 : 7;
  const days = Array.from({ length: numDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - ((numDays - 1) - i));
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    
    // Check if missed yesterday but streak > 0 (meaning freeze was used)
    const isToday = i === (numDays - 1);
    const isYesterday = i === (numDays - 2);
    const usedFreezeOnYesterday = isYesterday && streak > 0 && !dates.includes(dateStr);"""

if old_length in text:
    text = text.replace(old_length, new_length)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated StreakCard.jsx correctly!")
else:
    print("Could not find old_length block!")
