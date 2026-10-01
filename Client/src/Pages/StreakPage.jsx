import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Snowflake, Flame, Star, Sparkles, Trophy, Medal, ChevronDown } from "lucide-react";
import axios from "axios";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css";

function StreakPage() {
  const navigate = useNavigate();
  const [notify, setNotify] = useState(true);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = user.id || user._id;
        
        if (!userId) {
          setIsLoading(false);
          return;
        }

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setResults(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, []);

  const calculateStreakStats = (results) => {
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
                // if we encounter a 1-day gap inside the streak history, check if we can freeze it?
                // we only support 1 active freeze for the CURRENT streak missed yesterday.
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
      isActive: stats.activeDates.includes(dateStr),
      isFreeze: stats.freezesUsed.includes(dateStr)
    };
  });

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Streak" />
        <div className="sd-content" style={{ paddingTop: "20px" }}>

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
              ) : dayObj.isFreeze ? (
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', border: '1px solid #38BDF8' 
                }}>
                  <Snowflake size={20} color="#38BDF8" fill="#38BDF8" />
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

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
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

      {/* Streak Freeze Banner */}
      <div style={{ 
        background: 'var(--bg-card)', borderRadius: '20px', padding: '16px 20px', 
        marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' 
      }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Snowflake size={22} color="#38BDF8" fill="#38BDF8" />
        </div>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>1 streak freeze ready to use</h4>
      </div>

      {/* Badges Section */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Badges</h3>
          <ChevronDown size={20} color="var(--text-muted)" />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
          {/* Badge 1 */}
          <div>
            <div style={{ margin: '0 auto 8px auto', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={40} color={stats.best >= 3 ? "#FBBF24" : "var(--border-color)"} fill={stats.best >= 3 ? "#FBBF24" : "var(--border-color)"} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>3 days</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Star</div>
          </div>
          {/* Badge 2 */}
          <div>
            <div style={{ margin: '0 auto 8px auto', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={40} color={stats.best >= 5 ? "#FBBF24" : "var(--border-color)"} fill={stats.best >= 5 ? "#FBBF24" : "var(--border-color)"} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>5 days</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Superstar</div>
          </div>
          {/* Badge 3 */}
          <div>
            <div style={{ margin: '0 auto 8px auto', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={40} color={stats.best >= 7 ? "#FBBF24" : "var(--border-color)"} fill={stats.best >= 7 ? "#FBBF24" : "var(--border-color)"} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>7 days</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Champion</div>
          </div>
          {/* Badge 4 */}
          <div>
            <div style={{ margin: '0 auto 8px auto', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Medal size={40} color={stats.best >= 31 ? "#FBBF24" : "var(--border-color)"} fill={stats.best >= 31 ? "#FBBF24" : "var(--border-color)"} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>31 days</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Icon</div>
          </div>
        </div>
      </div>

      {/* Notification Toggle (Moved from Dashboard) */}
      <div style={{ 
        background: 'var(--bg-card)', borderRadius: '24px', padding: '20px 24px', 
        display: 'flex', alignItems: 'center', gap: '16px' 
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

    </div>
      </div>
    </div>
  );
}

export default StreakPage;
