path_card = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
path_page = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StreakPage.jsx'

def get_new_card(old_content):
    # Just write a new React component replacing it
    return """import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame, Snowflake } from "lucide-react";
import "../css/StreakCard.css";

const StreakCard = ({ results }) => {
  const navigate = useNavigate();
  
  const calculateStreak = (results) => {
      if (!results || !Array.isArray(results) || results.length === 0) return { streak: 0, dates: [] };
      
      const uniqueDates = [...new Set(results.map(r => {
          const d = new Date(r.createdAt);
          return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
      }))].sort();
      
      if (uniqueDates.length === 0) return { streak: 0, dates: [] };
      
      const todayDate = new Date();
      const yesterdayDate = new Date(Date.now() - 86400000);
      const dayBeforeYesterdayDate = new Date(Date.now() - 86400000 * 2);
      
      const today = todayDate.getFullYear() + "-" + String(todayDate.getMonth() + 1).padStart(2, '0') + "-" + String(todayDate.getDate()).padStart(2, '0');
      const yesterday = yesterdayDate.getFullYear() + "-" + String(yesterdayDate.getMonth() + 1).padStart(2, '0') + "-" + String(yesterdayDate.getDate()).padStart(2, '0');
      const dayBeforeYesterday = dayBeforeYesterdayDate.getFullYear() + "-" + String(dayBeforeYesterdayDate.getMonth() + 1).padStart(2, '0') + "-" + String(dayBeforeYesterdayDate.getDate()).padStart(2, '0');
      
      let streak = 0;
      let checkDate = new Date();
      
      // Streak Freeze Logic
      // If missed yesterday but did day before yesterday -> freeze used
      let usedFreeze = false;
      if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday) && uniqueDates.includes(dayBeforeYesterday)) {
          usedFreeze = true;
      }
      
      if (uniqueDates.includes(today) || uniqueDates.includes(yesterday) || usedFreeze) {
          if (uniqueDates.includes(today)) {
             checkDate = new Date(todayDate);
          } else if (uniqueDates.includes(yesterday)) {
             checkDate = new Date(yesterdayDate);
          } else {
             checkDate = new Date(yesterdayDate); // start counting from yesterday as freeze
             streak++; // give 1 free day for the freeze!
             checkDate.setDate(checkDate.getDate() - 1);
          }
          
          while (true) {
              const checkStr = checkDate.getFullYear() + "-" + String(checkDate.getMonth() + 1).padStart(2, '0') + "-" + String(checkDate.getDate()).padStart(2, '0');
              if (uniqueDates.includes(checkStr)) {
                  streak++;
                  checkDate.setDate(checkDate.getDate() - 1);
              } else {
                  break;
              }
          }
      }
      
      return { streak, dates: uniqueDates };
  };

  const { streak, dates } = calculateStreak(results);
  
  // Create last 7 days ending today
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    
    // Check if missed yesterday but streak > 0 (meaning freeze was used)
    const isToday = i === 6;
    const isYesterday = i === 5;
    const usedFreezeOnYesterday = isYesterday && streak > 0 && !dates.includes(dateStr);
    
    const isDone = dates.includes(dateStr) || usedFreezeOnYesterday;
    
    return { label: dayName, isDone, dateStr, isFreeze: usedFreezeOnYesterday, isToday };
  });

  return (
    <div className="streak-card-container">
      <div className="streak-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="streak-title-area">
          <div className="streak-title">
            <span className="fire-emoji">🔥</span> Streak
          </div>
          <p className="streak-subtitle">Show up. Keep going. Build your streak!</p>
        </div>
        
        <button onClick={() => navigate("/dashboard/streak")} style={{ background: 'transparent', border: 'none', color: 'var(--violet, #6E3FF3)', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
          View All
        </button>
      </div>

      <div className="streak-timeline-container" style={{ position: 'relative', marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        {days.map((day, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '40px',
              height: '56px',
              borderRadius: '20px',
              background: day.isDone ? (day.isFreeze ? 'rgba(56, 189, 248, 0.2)' : '#ffffff') : 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: day.isDone ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              position: 'relative'
            }}>
              {day.isFreeze ? (
                  <Snowflake size={24} color="#38BDF8" fill="#38BDF8" />
              ) : (
                  <Flame size={24} color={day.isDone ? '#F59E0B' : 'rgba(59, 130, 246, 0.5)'} fill={day.isDone ? '#F59E0B' : 'rgba(59, 130, 246, 0.5)'} />
              )}
              
              {/* Optional Streak Badge on today (or yesterday if today is not done but yesterday is) */}
              {day.isDone && ((day.isToday && dates.includes(day.dateStr)) || (day.isYesterday && !dates.includes(days[6].dateStr))) && streak > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#F59E0B',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff'
                }}>
                  {streak}
                </div>
              )}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '600', color: day.isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreakCard;
"""

def get_new_page(old_content):
    import re
    # Replace calculateStreakStats function
    
    new_stats_fn = """const calculateStreakStats = (results) => {
    if (!results || !Array.isArray(results) || results.length === 0) return { current: 0, best: 0, activeDays: 0, activeDates: [], freezesUsed: [] };
    
    const uniqueDates = [...new Set(results.map(r => {
        const d = new Date(r.createdAt);
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    }))].sort();
    
    if (uniqueDates.length === 0) return { current: 0, best: 0, activeDays: 0, activeDates: [], freezesUsed: [] };
    
    const todayDate = new Date();
    const yesterdayDate = new Date(Date.now() - 86400000);
    const dayBeforeYesterdayDate = new Date(Date.now() - 86400000 * 2);
    
    const today = todayDate.getFullYear() + "-" + String(todayDate.getMonth() + 1).padStart(2, '0') + "-" + String(todayDate.getDate()).padStart(2, '0');
    const yesterday = yesterdayDate.getFullYear() + "-" + String(yesterdayDate.getMonth() + 1).padStart(2, '0') + "-" + String(yesterdayDate.getDate()).padStart(2, '0');
    const dayBeforeYesterday = dayBeforeYesterdayDate.getFullYear() + "-" + String(dayBeforeYesterdayDate.getMonth() + 1).padStart(2, '0') + "-" + String(dayBeforeYesterdayDate.getDate()).padStart(2, '0');
    
    let current = 0;
    let checkDate = new Date();
    let freezesUsed = [];
    
    let usedFreeze = false;
    if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday) && uniqueDates.includes(dayBeforeYesterday)) {
        usedFreeze = true;
        freezesUsed.push(yesterday);
    }
    
    if (uniqueDates.includes(today) || uniqueDates.includes(yesterday) || usedFreeze) {
        if (uniqueDates.includes(today)) {
            checkDate = new Date(todayDate);
        } else if (uniqueDates.includes(yesterday)) {
            checkDate = new Date(yesterdayDate);
        } else {
            checkDate = new Date(yesterdayDate); 
            current++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        while (true) {
            const checkStr = checkDate.getFullYear() + "-" + String(checkDate.getMonth() + 1).padStart(2, '0') + "-" + String(checkDate.getDate()).padStart(2, '0');
            if (uniqueDates.includes(checkStr)) {
                current++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }
    
    // Calculate Best Streak
    let best = 1;
    let tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i-1]);
        const curr = new Date(uniqueDates[i]);
        const diffTime = Math.abs(curr - prev);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 1) {
            tempStreak++;
            if (tempStreak > best) best = tempStreak;
        } else if (diffDays === 2) {
            // implicit freeze allowed in history for best streak
            tempStreak += 2; 
            if (tempStreak > best) best = tempStreak;
        } else {
            tempStreak = 1;
        }
    }
    if (current > best) best = current;

    return { current, best, activeDays: uniqueDates.length, activeDates: uniqueDates, freezesUsed };
  };"""
    
    content = re.sub(r'const calculateStreakStats = \(results\) => \{.*?\};', new_stats_fn, old_content, flags=re.DOTALL)
    
    # Also update the calendar rendering to show snowflakes for freezesUsed
    calendar_generation = """const today = new Date();
  const last28Days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (27 - i));
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    return {
      date: d.getDate(),
      dayOfWeek: d.getDay(), // 0 = Sun, 1 = Mon...
      isActive: stats.activeDates.includes(dateStr),
      isFreeze: stats.freezesUsed.includes(dateStr)
    };
  });"""
    content = re.sub(r'const today = new Date\(\);\s*const last28Days = Array\.from.*?\}\);', calendar_generation, content, flags=re.DOTALL)
    
    # Update rendering in grid
    grid_render = """{dayObj.isActive ? (
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  background: '#F97316', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)' 
                }}>
                  <Flame size={20} color="white" fill="white" />
                </div>
              ) : dayObj.isFreeze ? (
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', border: '1px solid #38BDF8' 
                }}>
                  <Snowflake size={20} color="#38BDF8" fill="#38BDF8" />
                </div>
              ) : ("""
    content = content.replace('{dayObj.isActive ? (', grid_render)
    content = content.replace(') : (\n                <div style={{\n                  width: \'36px\'', ') : (\n                <div style={{\n                  width: \'36px\'', 1) # Keep existing logic

    return content

with open(path_card, 'r', encoding='utf-8') as f:
    card_content = get_new_card(f.read())
with open(path_card, 'w', encoding='utf-8') as f:
    f.write(card_content)

with open(path_page, 'r', encoding='utf-8') as f:
    page_content = get_new_page(f.read())
with open(path_page, 'w', encoding='utf-8') as f:
    f.write(page_content)

print("Updated StreakCard.jsx and StreakPage.jsx")
