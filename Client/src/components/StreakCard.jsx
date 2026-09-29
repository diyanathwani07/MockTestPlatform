import React from 'react';
import { Lock, Flame, Gift, Check } from 'lucide-react';
import '../css/StreakCard.css';

const StreakCard = ({ results }) => {
  const calculateStreak = (results) => {
      if (!results || results.length === 0) return 0;
      
      const uniqueDates = [...new Set(results.map(r => {
        const d = new Date(r.createdAt);
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
      }))].sort((a, b) => new Date(b) - new Date(a));
      
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
  const milestoneProgress = streak === 0 ? 0 : ((streak - 1) % 7) + 1; // 1 to 7

  const days = Array.from({ length: 7 }, (_, i) => {
    const dayNumber = i + 1;
    const isDone = dayNumber <= milestoneProgress;
    return { dayNumber, isDone };
  });

  return (
    <div className="streak-card-container">
      <div className="streak-header">
        <div className="streak-title-area">
          <div className="streak-title">
            <span className="fire-emoji">🔥</span> Streak
          </div>
          <p className="streak-subtitle">Show up. Keep going. Build your streak!</p>
        </div>
        <div className="streak-badge">
          <Flame size={16} color="#F97316" fill="#F97316" />
          <span>{streak} Day Streak</span>
        </div>
      </div>

      <div className="streak-timeline-wrapper">
        <div className="streak-timeline-line-bg"></div>
        <div className="streak-timeline-line-fill" style={{ width: `${(Math.max(milestoneProgress - 1, 0) / 6) * 100}%` }}></div>
        
        <div className="streak-days-container">
          {days.map((day, i) => (
            <div key={i} className="streak-day-item">
              <div className={`streak-circle ${day.isDone ? 'streak-done' : 'streak-locked'}`}>
                {day.isDone ? (
                  <Flame size={22} color="#F97316" fill="#F97316" />
                ) : (
                  <Lock size={18} color="#6B7280" />
                )}
              </div>
              <span className="streak-day-label">Day {day.dayNumber}</span>
              {day.isDone ? (
                <span className="streak-status done"><Check size={12} strokeWidth={4} /> Done</span>
              ) : (
                <span className="streak-status locked">Locked</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="streak-banner">
        <div className="streak-banner-icon-bg">
          <Gift size={24} color="#C084FC" />
        </div>
        <div className="streak-banner-text">
          <h4>Keep your streak alive!</h4>
          <p>Complete a mock test each day and win exciting rewards.</p>
        </div>
      </div>
    </div>
  );
};

export default StreakCard;
