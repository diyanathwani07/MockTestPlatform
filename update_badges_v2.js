const fs = require('fs');
const path = 'Client/src/Pages/StreakPage.jsx';
let text = fs.readFileSync(path, 'utf8');

const badgesSectionRegex = /\{\/\* Badges Section \*\/\}.*?\{\/\* Notification Toggle/s;

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
                gap: '20px', 
                overflowX: 'auto', 
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none', 
                paddingBottom: '16px',
                paddingTop: '8px'
              }}
              className="hide-scrollbar"
            >
              {[
                { days: 3, label: 'Star', icon: Star },
                { days: 5, label: 'Superstar', icon: Sparkles },
                { days: 7, label: 'Champion', icon: Trophy },
                { days: 31, label: 'Elite', icon: Crown },
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
                
                // Gamified 3D Gold Gradient for ALL badges, but unachieved are grayscale
                const goldGradient = 'radial-gradient(circle at 30% 30%, #FFE55C 0%, #FFB703 40%, #FB8500 80%, #CC5500 100%)';
                const lockedGradient = 'radial-gradient(circle at 30% 30%, #E2E8F0 0%, #94A3B8 40%, #64748B 80%, #475569 100%)';
                
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      minWidth: '95px',
                      flex: '0 0 auto',
                      scrollSnapAlign: 'start',
                      textAlign: 'center',
                      opacity: achieved ? 1 : 0.85,
                      transform: achieved ? 'scale(1.05)' : 'scale(1)',
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    <div style={{ 
                      margin: '0 auto 14px auto', 
                      width: '72px', 
                      height: '72px', 
                      borderRadius: '50%',
                      background: achieved ? goldGradient : lockedGradient,
                      boxShadow: achieved 
                        ? '0 10px 20px rgba(251, 133, 0, 0.4), inset 0 4px 6px rgba(255, 255, 255, 0.8), inset 0 -4px 6px rgba(0, 0, 0, 0.2)' 
                        : '0 4px 10px rgba(0, 0, 0, 0.1), inset 0 4px 6px rgba(255, 255, 255, 0.5), inset 0 -4px 6px rgba(0, 0, 0, 0.2)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      position: 'relative',
                      border: achieved ? '2px solid rgba(255, 230, 100, 0.5)' : '2px solid rgba(255, 255, 255, 0.3)'
                    }}>
                      {/* Inner glowing ring */}
                      <div style={{
                        position: 'absolute', top: '4px', left: '4px', right: '4px', bottom: '4px',
                        borderRadius: '50%',
                        border: achieved ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'transparent'
                      }} />
                      
                      <badge.icon 
                        size={34} 
                        strokeWidth={2}
                        color={achieved ? "#FFFFFF" : "rgba(255,255,255,0.7)"} 
                        fill={achieved ? "rgba(255, 255, 255, 0.3)" : "transparent"} 
                        style={{ 
                          position: 'relative', 
                          zIndex: 1, 
                          filter: achieved ? 'drop-shadow(0 2px 4px rgba(200, 50, 0, 0.5))' : 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' 
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{badge.days.toLocaleString()} days</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>{badge.label}</div>
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
      </div>

      {/* Notification Toggle`;

text = text.replace(badgesSectionRegex, newBadgesSection);
fs.writeFileSync(path, text, 'utf8');
console.log("Updated badged successfully");
