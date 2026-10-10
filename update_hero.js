const fs = require('fs');
const path = 'Client/src/Pages/StreakPage.jsx';
let text = fs.readFileSync(path, 'utf8');

const oldHeroBlock = `        {/* Streak Info */}
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
        </div>`;

const newHeroBlock = `        {/* Streak Info */}
        <div style={{ zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
          <h1 style={{ color: 'white', fontSize: '42px', margin: 0, fontWeight: '800', lineHeight: '1' }}>{stats.current} days</h1>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px', 
            background: 'rgba(255,255,255,0.2)', padding: '8px 14px', 
            borderRadius: '20px', backdropFilter: 'blur(4px)' 
          }}>
            <Flame size={16} color="white" fill="white" />
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '600', lineHeight: '1' }}>
              {stats.current > 0 ? "You're on fire! Keep it going!" : "Start your streak today!"}
            </span>
          </div>
        </div>`;

text = text.replace(oldHeroBlock, newHeroBlock);
fs.writeFileSync(path, text, 'utf8');
console.log("Updated Hero Block successfully");
