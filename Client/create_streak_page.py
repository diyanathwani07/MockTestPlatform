path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StreakPage.jsx'

new_code = """import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Snowflake, Flame } from "lucide-react";
import axios from "axios";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

function StreakPage() {
  const navigate = useNavigate();
  const [notify, setNotify] = useState(true);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/my-results`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, []);

  const calculateStreakStats = (results) => {
    if (!results || results.length === 0) return { current: 0, best: 0, activeDays: 0, activeDates: [] };
    
    const uniqueDates = [...new Set(results.map(r => {
        const d = new Date(r.createdAt);
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    }))].sort();
    
    if (uniqueDates.length === 0) return { current: 0, best: 0, activeDays: 0, activeDates: [] };
    
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
        } else {
            tempStreak = 1;
        }
    }

    // Calculate Current Streak
    const todayDate = new Date();
    const yesterdayDate = new Date(Date.now() - 86400000);
    const today = todayDate.getFullYear() + "-" + String(todayDate.getMonth() + 1).padStart(2, '0') + "-" + String(todayDate.getDate()).padStart(2, '0');
    const yesterday = yesterdayDate.getFullYear() + "-" + String(yesterdayDate.getMonth() + 1).padStart(2, '0') + "-" + String(yesterdayDate.getDate()).padStart(2, '0');
    
    let current = 0;
    if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
        current = 0;
        let checkDate = uniqueDates.includes(today) ? new Date(todayDate) : new Date(yesterdayDate);
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

    return { current, best, activeDays: uniqueDates.length, activeDates: uniqueDates };
  };

  const stats = calculateStreakStats(results);

  // Generate last 4 weeks calendar (28 days ending today)
  const today = new Date();
  const last28Days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (27 - i));
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    return {
      date: d.getDate(),
      dayOfWeek: d.getDay(), // 0 = Sun, 1 = Mon...
      isActive: stats.activeDates.includes(dateStr)
    };
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main, #0B0A10)", color: "var(--text-primary)", padding: "20px", paddingBottom: "100px" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-card)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ flex: 1, textAlign: 'center', margin: 0, fontSize: '20px', fontWeight: '700' }}>Streak</h2>
        <div style={{ width: '40px' }} /> {/* spacer */}
      </div>

      {/* Hero Banner */}
      <div style={{ 
        background: 'linear-gradient(135deg, #F97316 0%, #D97706 100%)',
        borderRadius: '24px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '24px',
        boxShadow: '0 10px 25px rgba(249, 115, 22, 0.2)'
      }}>
        {/* Background Decorative Circles */}
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', right: '40px', bottom: '-40px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />

        {/* Mascot */}
        <div style={{ width: '120px', height: '120px', zIndex: 1 }}>
          <DotLottieReact src="/mascot.lottie" loop autoplay />
        </div>

        {/* Streak Info */}
        <div style={{ zIndex: 1, textAlign: 'right', flex: 1 }}>
          <h1 style={{ color: 'white', fontSize: '36px', margin: '0 0 8px 0', fontWeight: '800' }}>{stats.current} days</h1>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px', 
            background: 'rgba(255,255,255,0.2)', padding: '6px 12px', 
            borderRadius: '20px', backdropFilter: 'blur(4px)' 
          }}>
            <Flame size={14} color="white" fill="white" />
            <span style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>
              {stats.current > 0 ? "You're on fire! Keep it going!" : "Start your streak today!"}
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Last 4 weeks</h3>
        
        {/* Days Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid (Assuming grid aligns properly based on the 28 days) */}
        {/* We need to pad the beginning so it aligns with Mon-Sun */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', rowGap: '16px' }}>
          {last28Days.map((dayObj, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
              {dayObj.isActive ? (
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  background: '#F97316', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)' 
                }}>
                  <Flame size={20} color="white" fill="white" />
                </div>
              ) : (
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  background: 'var(--border-color)', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' 
                }}>
                  {dayObj.date}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notification Toggle (Moved from Dashboard) */}
      <div style={{ 
        background: 'var(--bg-card)', borderRadius: '24px', padding: '20px 24px', 
        marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' 
      }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Snowflake size={24} color="#3B82F6" />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Can you reach a 3-day streak?</h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Push notify me for tomorrow's game</p>
        </div>
        <div 
          onClick={() => setNotify(!notify)}
          style={{ 
            width: '50px', height: '28px', borderRadius: '14px', 
            background: notify ? '#10B981' : 'var(--border-color)',
            position: 'relative', cursor: 'pointer', transition: '0.3s'
          }}
        >
          <div style={{ 
            width: '24px', height: '24px', borderRadius: '50%', background: 'white',
            position: 'absolute', top: '2px', left: notify ? '24px' : '2px', transition: '0.3s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} />
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '20px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#F97316', marginBottom: '4px' }}>{stats.current}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Current</div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '20px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#6E3FF3', marginBottom: '4px' }}>{stats.best}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Best</div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '20px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10B981', marginBottom: '4px' }}>{stats.activeDays}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Active days</div>
        </div>
      </div>

    </div>
  );
}

export default StreakPage;
"""

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_code)
print("Created StreakPage.jsx")
