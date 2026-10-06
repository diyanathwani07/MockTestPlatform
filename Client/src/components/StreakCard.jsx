import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flame, Snowflake, CheckCircle, X } from "lucide-react";
import "../css/StreakCard.css";

const StreakCard = ({ results }) => {
  const navigate = useNavigate();
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  
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
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
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
    const usedFreezeOnYesterday = isYesterday && streak > 0 && !dates.includes(dateStr);
    
    const isDone = dates.includes(dateStr) || usedFreezeOnYesterday;
    
    return { label: dayName, isDone, dateStr, isFreeze: usedFreezeOnYesterday, isToday };
  });

  return (
    <div className="streak-card-container">
      <div className="streak-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="streak-title-area">
          <div className="streak-title">
            <span className="fire-emoji">🔥</span> {streak} {streak === 1 ? "Day" : "Days"} Streak
          </div>
          <p className="streak-subtitle">Show up. Keep going. Build your streak!</p>
        </div>
        
        <button onClick={() => navigate("/dashboard/streak")} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
          View All
        </button>
      </div>

      <div className="streak-timeline-container" style={{ position: 'relative', marginTop: '20px', marginBottom: '24px', display: 'flex', flexShrink: 0, justifyContent: 'space-between' }}>
        {days.map((day, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '40px',
              height: '56px',
              borderRadius: '20px',
              background: day.isDone ? (day.isFreeze ? 'rgba(56, 189, 248, 0.2)' : 'var(--primary)') : 'color-mix(in srgb, var(--primary) 10%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: day.isDone ? '0 4px 12px color-mix(in srgb, var(--primary) 40%, transparent)' : 'none',
              position: 'relative'
            }}>
              {day.isFreeze ? (
                  <Snowflake size={24} color="#38BDF8" fill="#38BDF8" />
              ) : (
                  <Flame size={24} color={day.isDone ? '#ffffff' : 'color-mix(in srgb, var(--primary) 30%, transparent)'} fill={day.isDone ? '#ffffff' : 'color-mix(in srgb, var(--primary) 30%, transparent)'} />
              )}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '600', color: day.isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {day.label}
            </span>
          </div>
        ))}
      </div>

      {/* Freeze Ready to Use Banner inside Card */}
      <div style={{ 
        marginTop: 'auto',
        padding: '12px 16px',
        borderRadius: '16px',
        background: 'rgba(56, 189, 248, 0.05)',
        border: '1px solid rgba(56, 189, 248, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Snowflake size={16} color="#38BDF8" fill="#38BDF8" />
        </div>
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>1 streak freeze ready to use</span>
      </div>
    </div>
  );
};

export default StreakCard;
