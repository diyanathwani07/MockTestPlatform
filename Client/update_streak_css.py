path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StreakCard.css'
content = """
/* Freeze Modal */
.freeze-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
  padding: 20px;
}

.freeze-modal-content {
  background: var(--bg-card, #ffffff);
  border-radius: 24px;
  width: 100%;
  max-width: 380px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: slideUpModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

body.dark-mode .freeze-modal-content {
  background: #1B1534;
  border: 1px solid #2D234A;
}

.freeze-modal-handle {
  width: 48px;
  height: 4px;
  background: var(--border-color, #e5e7eb);
  border-radius: 4px;
  margin-bottom: 32px;
}
body.dark-mode .freeze-modal-handle {
  background: #374151;
}

.freeze-modal-icon-container {
  position: relative;
  margin-bottom: 24px;
}

.freeze-modal-icon-bg {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7dd3fc 0%, #0ea5e9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.3);
  position: relative;
  z-index: 2;
}

.freeze-drip {
  position: absolute;
  background: #0ea5e9;
  border-radius: 0 0 10px 10px;
  top: 80px;
  z-index: 1;
}
.drip-1 { width: 12px; height: 24px; left: 24px; }
.drip-2 { width: 16px; height: 32px; left: 44px; }
.drip-3 { width: 10px; height: 20px; right: 28px; }

.freeze-modal-avail {
  font-size: 15px;
  color: var(--text-secondary, #4b5563);
  margin: 0 0 8px 0;
}
body.dark-mode .freeze-modal-avail {
  color: #9CA3AF;
}

.freeze-modal-title {
  font-size: 32px;
  font-weight: 800;
  color: #0ea5e9;
  margin: 0 0 12px 0;
  line-height: 1.1;
}

.freeze-modal-desc {
  font-size: 15px;
  color: var(--text-primary, #1f2937);
  margin: 0 0 32px 0;
  font-weight: 500;
}
body.dark-mode .freeze-modal-desc {
  color: #E5E7EB;
}

.freeze-modal-feature {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary, #4b5563);
}
body.dark-mode .freeze-modal-feature {
  color: #9CA3AF;
}
.feature-check {
  background: var(--text-secondary, #4b5563);
  border-radius: 50%;
  color: #fff;
}
body.dark-mode .feature-check {
  background: #9CA3AF;
  color: #1B1534;
}

.freeze-modal-btn {
  width: 100%;
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 100px;
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.freeze-modal-btn:hover {
  background: #0284c7;
  transform: translateY(-2px);
}

.streak-freeze-banner:hover {
  background: rgba(56, 189, 248, 0.1) !important;
}

@keyframes slideUpModal {
  from { opacity: 0; transform: translateY(40px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 768px) {
  .freeze-modal-overlay {
    align-items: flex-end;
    padding: 0;
  }
  .freeze-modal-content {
    border-radius: 24px 24px 0 0;
    max-width: 100%;
    animation: slideUpSheet 0.3s cubic-bezier(0.175, 0.885, 0.32, 1);
    padding-bottom: 40px;
  }
}

@keyframes slideUpSheet {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
"""

with open(path, 'a', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakCard.css")
