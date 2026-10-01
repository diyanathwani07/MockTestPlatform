path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add CheckCircle import
if 'CheckCircle' not in content:
    content = content.replace('import { Flame, Snowflake } from "lucide-react";', 'import { Flame, Snowflake, CheckCircle, X } from "lucide-react";')

# Add state
if 'const [showFreezeModal, setShowFreezeModal] = useState(false);' not in content:
    content = content.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n  const [showFreezeModal, setShowFreezeModal] = useState(false);')

# Modify banner
banner_old = """<div style={{ 
          marginTop: 'auto',
          padding: '12px 16px',
          borderRadius: '16px',
          background: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid rgba(56, 189, 248, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>"""
banner_new = """<div 
        className="streak-freeze-banner"
        onClick={() => setShowFreezeModal(true)}
        style={{ 
          marginTop: 'auto',
          padding: '12px 16px',
          borderRadius: '16px',
          background: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid rgba(56, 189, 248, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}>"""
content = content.replace(banner_old, banner_new)

# Add Modal JSX before the last closing div of the component
modal_jsx = """
      {/* Freeze Info Modal */}
      {showFreezeModal && (
        <div className="freeze-modal-overlay" onClick={() => setShowFreezeModal(false)}>
          <div className="freeze-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="freeze-modal-handle"></div>
            
            <div className="freeze-modal-icon-container">
              <div className="freeze-modal-icon-bg">
                <CheckCircle size={48} color="#ffffff" strokeWidth={3} />
              </div>
              {/* Melting drips simulation */}
              <div className="freeze-drip drip-1"></div>
              <div className="freeze-drip drip-2"></div>
              <div className="freeze-drip drip-3"></div>
            </div>

            <p className="freeze-modal-avail">You have <strong>1 available</strong></p>
            <h2 className="freeze-modal-title">Streak freeze</h2>
            <p className="freeze-modal-desc">Keep your streak if you lose or miss a mock test!</p>

            <div className="freeze-modal-feature">
              <CheckCircle size={18} color="#4b5563" className="feature-check" />
              <span>Freezes automatically applied</span>
            </div>

            <button className="freeze-modal-btn" onClick={() => setShowFreezeModal(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
"""
if 'freeze-modal-overlay' not in content:
    # Find last closing div
    content = content.replace('      </div>\n    );\n  };\n  \n  export default StreakCard;', modal_jsx + '      </div>\n    );\n  };\n  \n  export default StreakCard;')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakCard.jsx")
