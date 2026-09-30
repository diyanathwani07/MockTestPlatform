path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Update imports
content = content.replace("import React from 'react';", "import React, { useState } from 'react';")
content = content.replace("import { Lock, Flame, Gift, Check } from 'lucide-react';", "import { Lock, Flame, Gift, Check, Award, Star, Sparkles, Trophy, Medal, Snowflake } from 'lucide-react';")

# Add state inside component
content = content.replace("const StreakCard = ({ results }) => {", "const StreakCard = ({ results }) => {\n  const [notify, setNotify] = useState(true);")

# Add bottom grid
bottom_grid = """
      <div className="streak-bottom-grid">
        <div className="streak-badges-card">
          <div className="streak-badges-header">
            <Award size={20} color="#C084FC" /> Badges
          </div>
          <div className="streak-badges-list">
            <div className="streak-badge-item">
              <div className="streak-badge-icon-wrap">
                <Star size={32} color="#FBBF24" fill="#FBBF24" />
              </div>
              <span className="streak-badge-title">3 days</span>
              <span className="streak-badge-sub">Star</span>
            </div>
            <div className="streak-badge-item">
              <div className="streak-badge-icon-wrap">
                <Sparkles size={32} color="#FBBF24" fill="#FBBF24" />
              </div>
              <span className="streak-badge-title">5 days</span>
              <span className="streak-badge-sub">Superstar</span>
            </div>
            <div className="streak-badge-item">
              <div className="streak-badge-icon-wrap">
                <Trophy size={32} color="#FBBF24" fill="#FBBF24" />
              </div>
              <span className="streak-badge-title">7 days</span>
              <span className="streak-badge-sub">Champion</span>
            </div>
            <div className="streak-badge-item">
              <div className="streak-badge-icon-wrap">
                <Medal size={32} color="#FBBF24" fill="#FBBF24" />
              </div>
              <span className="streak-badge-title">31 days</span>
              <span className="streak-badge-sub">Icon</span>
            </div>
          </div>
        </div>

        <div className="streak-notify-card">
          <div className="streak-notify-header">
            <span className="streak-notify-link">View All</span>
          </div>
          <div className="streak-notify-box">
            <div className="streak-notify-icon">
              <Snowflake size={20} color="#3B82F6" />
            </div>
            <div className="streak-notify-content" style={{ flex: 1 }}>
              <h5>Can you reach a 3-day streak?</h5>
              <p>Push notify me for tomorrow's game</p>
            </div>
            <div 
              className={`streak-toggle ${!notify ? 'off' : ''}`} 
              onClick={() => setNotify(!notify)}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};"""

content = content.replace("    </div>\n  );\n};", bottom_grid)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakCard JSX")
