path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Result.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_tag = '<div className="rm-header">'
end_tag = '{/* Metrics Grid */}'
start_idx = content.find(start_tag)
end_idx = content.find(end_tag, start_idx)

desktop_content = content[start_idx:end_idx]

mobile_jsx = """
            {/* MOBILE INSPO TOP SECTION */}
            <div className="rm-mobile-top">
              <h2 className="inspo-mobile-header">Quiz Result</h2>
              
              <div className="inspo-trophy-container">
                <Trophy className="inspo-trophy-svg" />
                <div className="inspo-avatar">
                  <img src={user?.profilePicture || user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} alt="User" />
                </div>
              </div>
              
              <h1 className="inspo-congrats">Congratulations!</h1>
              
              <p className="inspo-subtitle">
                You have completed <strong>{examTitle}</strong> on {formattedDate}.<br />
                Duration: {data?.duration || 30} Min
              </p>
              
              <div className="inspo-score-box">
                <p className="inspo-score-label">Your Score</p>
                <div className="inspo-score-value">
                  <span className="inspo-score-num">{score}</span>
                  <span className="inspo-score-denom">/ {total}</span>
                </div>
              </div>
            </div>

            {/* DESKTOP ORIGINAL TOP SECTION */}
            <div className="rm-desktop-top">
"""

wrapped_desktop = mobile_jsx + desktop_content + "            </div>\n\n            "

new_content = content[:start_idx] + wrapped_desktop + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Updated Result.jsx")
