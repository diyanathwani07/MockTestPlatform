path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the entire StreakCard component body or styles
# I will just write a new StreakCard.jsx entirely to match the new simplified design and add the View All button.
new_code = """import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame, Star, Sparkles, Trophy, Medal, Lock, Check, Snowflake } from "lucide-react";
import "../css/StreakCard.css";

const StreakCard = ({ results }) => {
  const navigate = useNavigate();
  const [notify, setNotify] = useState(true);
  
  const calculateStreak = (results) => {
      if (!results || results.length === 0) return 0;
      
      const uniqueDates = [...new Set(results.map(r => {
          const d = new Date(r.createdAt);
          return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
      }))];
      
      if (uniqueDates.length === 0) return 0;
      
      const todayDate = new Date();
      const yesterdayDate = new Date(Date.now() - 86400000);
      
      const today = todayDate.getFullYear() + "-" + String(todayDate.getMonth() + 1).padStart(2, '0') + "-" + String(todayDate.getDate()).padStart(2, '0');
      const yesterday = yesterdayDate.getFullYear() + "-" + String(yesterdayDate.getMonth() + 1).padStart(2, '0') + "-" + String(yesterdayDate.getDate()).padStart(2, '0');
      
      if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday)) {
          return 0; // Streak broken
      }
      
      let streak = 0;
      let checkDate = uniqueDates.includes(today) ? new Date(todayDate) : new Date(yesterdayDate);
      
      while (true) {
          const checkDateString = checkDate.getFullYear() + "-" + String(checkDate.getMonth() + 1).padStart(2, '0') + "-" + String(checkDate.getDate()).padStart(2, '0');
          if (uniqueDates.includes(checkDateString)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
          } else {
              break;
          }
      }
      
      return streak;
  };

  const streak = calculateStreak(results);
  
  // Calculate days for the week (Mon-Sun or relative)
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // To make it look like Image 2, let's just do a 7-day pill layout.
  // We can just use the milestone progress or last 7 days.
  const milestoneProgress = streak === 0 ? 0 : ((streak - 1) % 7) + 1;
  const days = Array.from({ length: 7 }, (_, i) => {
    const label = dayLabels[i];
    const isDone = (i + 1) <= milestoneProgress;
    return { label, isDone, index: i };
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
              background: day.isDone ? '#ffffff' : 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: day.isDone ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              position: 'relative'
            }}>
              <Flame size={24} color={day.isDone ? '#F59E0B' : 'rgba(59, 130, 246, 0.5)'} fill={day.isDone ? '#F59E0B' : 'rgba(59, 130, 246, 0.5)'} />
              
              {/* Optional Streak Badge on the current day */}
              {day.isDone && i === milestoneProgress - 1 && streak > 0 && (
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

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_code)
print("Updated StreakCard.jsx")
