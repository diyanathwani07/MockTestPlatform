const fs = require('fs');
const path = 'Client/src/Pages/StreakPage.jsx';

let text = fs.readFileSync(path, 'utf8');

// 1. Update imports
const importRegex = /import {([^}]+)} from "lucide-react";/;
const match = text.match(importRegex);
if (match) {
    text = text.replace(importRegex, 'import { ChevronLeft, Snowflake, Flame, Star, Sparkles, Trophy, Medal, ChevronDown, ChevronUp, Crown, Award, Shield, Sword, Gem, Telescope, Diamond, Sun, Globe, Rocket } from "lucide-react";');
}

// 2. Add showBadges state
if (!text.includes('const [showBadges, setShowBadges]')) {
    text = text.replace('const [isLoading, setIsLoading] = useState(true);', 'const [isLoading, setIsLoading] = useState(true);\n  const [showBadges, setShowBadges] = useState(true);\n  const [badgePage, setBadgePage] = useState(0);');
}

// 3. Replace the Badges Section
const badgesSectionStart = '{/* Badges Section */}';
const notificationSectionStart = '{/* Notification Toggle (Moved from Dashboard) */}';

const beforeBadges = text.substring(0, text.indexOf(badgesSectionStart));
const afterBadges = text.substring(text.indexOf(notificationSectionStart));

const newBadgesSection = `
      {/* Badges Section */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div 
          onClick={() => setShowBadges(!showBadges)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showBadges ? '20px' : '0', cursor: 'pointer' }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Badges</h3>
          {showBadges ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
        </div>
        
        {showBadges && (
          <div className="badges-carousel-container" style={{ position: 'relative' }}>
            <div 
              style={{ 
                display: 'flex', 
                gap: '16px', 
                overflowX: 'auto', 
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none', 
                paddingBottom: '12px'
              }}
              className="hide-scrollbar"
            >
              {[
                { days: 3, label: 'Star', icon: Star },
                { days: 5, label: 'Superstar', icon: Sparkles },
                { days: 7, label: 'Champion', icon: Trophy },
                { days: 31, label: 'Icon', icon: Crown },
                { days: 50, label: 'Hall of fame', icon: Award },
                { days: 100, label: 'Invincible', icon: Shield },
                { days: 150, label: 'Legend', icon: Sword },
                { days: 200, label: 'Golden', icon: Gem },
                { days: 250, label: 'Visionary', icon: Telescope },
                { days: 300, label: 'Supreme', icon: Diamond },
                { days: 365, label: 'Interstellar', icon: Sun },
                { days: 500, label: 'Galactic', icon: Globe },
                { days: 1000, label: 'Cosmic', icon: Rocket }
              ].map((badge, idx) => {
                const achieved = stats.best >= badge.days;
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      minWidth: '90px',
                      flex: '0 0 auto',
                      scrollSnapAlign: 'start',
                      textAlign: 'center',
                      opacity: achieved ? 1 : 0.6,
                      filter: achieved ? 'none' : 'grayscale(100%)'
                    }}
                  >
                    <div style={{ 
                      margin: '0 auto 12px auto', 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '50%',
                      background: achieved ? 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)' : 'var(--border-color)',
                      boxShadow: achieved ? '0 8px 16px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255,255,255,0.6)' : 'none',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      {achieved && (
                        <div style={{ 
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                          borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%)' 
                        }} />
                      )}
                      <badge.icon 
                        size={32} 
                        color={achieved ? "#FFFFFF" : "var(--text-muted)"} 
                        fill={achieved ? "rgba(255,255,255,0.8)" : "transparent"} 
                        style={{ position: 'relative', zIndex: 1, filter: achieved ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none' }}
                      />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{badge.days.toLocaleString()} days</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{badge.label}</div>
                  </div>
                );
              })}
            </div>
            <style>{\`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
            \`}</style>
          </div>
        )}
      </div>\n\n`;

text = beforeBadges + newBadgesSection + afterBadges;

fs.writeFileSync(path, text, 'utf8');
console.log('Successfully updated StreakPage.jsx');
