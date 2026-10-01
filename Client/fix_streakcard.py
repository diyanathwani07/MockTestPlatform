path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_return = """  return (
    <div className="streak-card-container">
      <div className="streak-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="streak-title-area">
          <div className="streak-title">
            <span className="fire-emoji">🔥</span> {streak} Day Streak
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
            </div>
            <span style={{ fontSize: '13px', fontWeight: '600', color: day.isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {day.label}
            </span>
          </div>
        ))}
      </div>

      {/* Freeze Ready to Use Banner inside Card */}
      <div style={{ 
        marginTop: '24px',
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
  );"""

import re
content = re.sub(r'  return \(\n    <div className="streak-card-container">.*?\n  \);', new_return, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakCard.jsx")
