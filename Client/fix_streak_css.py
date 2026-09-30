path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StreakCard.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded dark colors with CSS variables
replacements = {
    "linear-gradient(180deg, #1B1534 0%, #0D0A1C 100%)": "var(--bg-card, #1B1534)",
    "color: #fff;": "color: var(--text-primary, #fff);",
    "color: #9CA3AF;": "color: var(--text-secondary, #9CA3AF);",
    "background: rgba(30, 20, 60, 0.6);": "background: var(--bg-hover, rgba(30, 20, 60, 0.6));",
    "background: rgba(255, 255, 255, 0.05);": "background: var(--border-color, rgba(255, 255, 255, 0.05));",
    "background: #110B22;": "background: var(--bg-body, #110B22);",
    "color: #D1D5DB;": "color: var(--text-secondary, #D1D5DB);",
    "color: #6B7280;": "color: var(--text-muted, #6B7280);",
    "background: rgba(124, 58, 237, 0.1);": "background: rgba(124, 58, 237, 0.1);", # Keep purple tint for banner
    "border: 1px solid rgba(124, 58, 237, 0.2);": "border: 1px solid rgba(124, 58, 237, 0.2);" 
}

for old, new_val in replacements.items():
    content = content.replace(old, new_val)

# Add new CSS classes for the bottom section
new_css = """
/* Badges & Notification Bottom Grid */
.streak-bottom-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.streak-badges-card, .streak-notify-card {
  background: var(--bg-card, #1B1534);
  border: 1px solid var(--border-color, #2D234A);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.streak-badges-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #fff);
  margin-bottom: 16px;
}

.streak-badges-list {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.streak-badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.streak-badge-icon-wrap {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.streak-badge-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary, #fff);
}
.streak-badge-sub {
  font-size: 10px;
  color: var(--text-secondary, #9CA3AF);
}

.streak-notify-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.streak-notify-link {
  font-size: 12px;
  font-weight: 600;
  color: #C084FC;
  cursor: pointer;
}

.streak-notify-box {
  background: var(--bg-hover, rgba(30, 20, 60, 0.6));
  border: 1px solid var(--border-color, #2D234A);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.streak-notify-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.streak-notify-content h5 {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #fff);
  margin: 0 0 2px 0;
}
.streak-notify-content p {
  font-size: 11px;
  color: var(--text-secondary, #9CA3AF);
  margin: 0;
  line-height: 1.3;
}

/* Toggle Switch */
.streak-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  background: #10B981;
  border-radius: 20px;
  cursor: pointer;
  flex-shrink: 0;
}
.streak-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: all 0.3s;
}
.streak-toggle.off {
  background: #4B5563;
}
.streak-toggle.off::after {
  right: 18px;
}

@media (max-width: 768px) {
  .streak-bottom-grid {
    grid-template-columns: 1fr;
  }
}
"""

content += "\n" + new_css

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakCard.css")
