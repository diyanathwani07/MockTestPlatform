import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, RotateCcw, Book, Square, Eye, ArrowRight, Sun, Moon, Palette, Shuffle } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "../css/StudentDashboard.css"; // Reuse existing styles

function FlashcardStudyView() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme, toggleThemePicker } = useTheme();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [setMeta, setSetMeta] = useState(null);
  const [cards, setCards] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  


  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        
        const [metaRes, cardsRes, progRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/flashcards/sets/${setId}`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/flashcards/sets/${setId}/cards`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/flashcards/progress/${setId}`, { headers })
        ]);
        
        setSetMeta(metaRes.data);
        let fetchedCards = cardsRes.data;
        if (metaRes.data.isShuffled) {
          fetchedCards = [...fetchedCards].sort(() => Math.random() - 0.5);
        }
        setCards(fetchedCards);
        setProgress(progRes.data);
        
        // Auto-resume logic: find first card not marked Known
        if (fetchedCards.length > 0) {
          const knownIds = progRes.data.filter(p => p.status === "Known").map(p => p.flashcardId);
          const firstUnlearned = fetchedCards.findIndex(c => !knownIds.includes(c._id));
          if (firstUnlearned !== -1) setCurrentIndex(firstUnlearned);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setId]);

  const activeCards = reviewMode 
    ? cards.filter(c => progress.some(p => p.flashcardId === c._id && p.status === "Learning"))
    : cards;

  const currentCard = activeCards[currentIndex];

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setFinished(true);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const markProgress = async (status) => {
    if (!currentCard) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${import.meta.env.VITE_API_URL}/api/flashcards/progress/${setId}/${currentCard._id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      const updatedProgress = [...progress];
      const existing = updatedProgress.find(p => p.flashcardId === currentCard._id);
      if (existing) existing.status = status;
      else updatedProgress.push({ flashcardId: currentCard._id, status });
      setProgress(updatedProgress);
      
      handleNext();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: "40px", color: "white", textAlign: "center" }}>Loading flashcards...</div>;
  if (!setMeta || cards.length === 0) return <div style={{ padding: "40px", color: "white", textAlign: "center" }}>No flashcards found.</div>;

  const total = cards.length;
  const knownCount = progress.filter(p => p.status === "Known").length;
  const learningCount = progress.filter(p => p.status === "Learning").length;
  const completionPercent = Math.round((knownCount / total) * 100) || 0;

  if (finished) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-app)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", padding: "20px" }}>
        <div style={{ background: "var(--bg-card)", padding: "40px", borderRadius: "24px", maxWidth: "400px", width: "100%", textAlign: "center", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
          <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Learning Complete!</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>{setMeta.title}</p>
          
          <div style={{ background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "16px", marginBottom: "24px", display: "flex", justifyContent: "space-around" }}>
            <div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#10B981" }}>{knownCount}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Known</div>
            </div>
            <div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#F59E0B" }}>{learningCount}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Needs Review</div>
            </div>
          </div>
          
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "8px" }}>
              <span>Mastery</span>
              <span>{completionPercent}%</span>
            </div>
            <div style={{ height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${completionPercent}%`, background: "#10B981" }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {learningCount > 0 && (
              <button 
                onClick={() => { setReviewMode(true); setCurrentIndex(0); setFinished(false); }}
                style={{ padding: "12px", borderRadius: "12px", background: "#F59E0B", color: "white", border: "none", fontWeight: "600", cursor: "pointer" }}
              >
                Review Difficult Cards ({learningCount})
              </button>
            )}
            <button 
              onClick={() => { setReviewMode(false); setCurrentIndex(0); setFinished(false); }}
              style={{ padding: "12px", borderRadius: "12px", background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.2)", fontWeight: "600", cursor: "pointer" }}
            >
              Study Again
            </button>
            <button 
              onClick={() => navigate(-1)}
              style={{ padding: "12px", borderRadius: "12px", background: "transparent", color: "var(--text-muted)", border: "none", fontWeight: "600", cursor: "pointer" }}
            >
              Back to Exam Series
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-app)", display: "flex", flexDirection: "column", color: "var(--text-primary)" }}>
      
      {/* Top Navigation */}
      <div className="fs-header-container" style={{ padding: "24px 40px", maxWidth: "1200px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Row 1: Back Button */}
        <div className="fs-header-row-1" style={{ display: "flex", width: "100%" }}>
          <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "var(--violet, #6E3FF3)", fontWeight: "600", fontSize: "14px", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>
            <ArrowLeft size={16} /> Back to Flashcards
          </button>
        </div>

        {/* Row 2: Title and Controls */}
        <div className="fs-header-row-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          
          {/* Left: Icon + Title */}
          <div className="fs-header-center" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--accent-bg, rgba(110,63,243,0.1))", color: "var(--violet, #6E3FF3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
               <Book size={24} />
            </div>
            <div style={{ textAlign: "left" }}>
              <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", lineHeight: "1.2" }}>{setMeta.title}</h1>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>{setMeta.subjectName || "Subject"}</p>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="fs-header-controls" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            
            {/* User Profile */}
            <div className="fs-user-profile" style={{ display: "flex", alignItems: "center", gap: "10px", paddingRight: "16px", borderRight: "1px solid var(--border-color)" }}>
              {user?.profilePicture || user?.avatar ? (
                <img src={user.profilePicture || user.avatar} alt="Profile" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-bg, rgba(110,63,243,0.1))", color: "var(--accent, #6E3FF3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "13px" }}>
                  {(user?.name || "S").substring(0, 1).toUpperCase()}
                </div>
              )}
              <div className="fs-user-text" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap" }}>{user?.name || "Student"}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{user?.role === "admin" ? "Admin" : "Student"}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Palette Picker */}
              <button onClick={toggleThemePicker} title="Theme Palette" className="fs-icon-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "10px", borderRadius: "8px", cursor: "pointer", transition: "background 0.2s" }}>
                <Palette size={16} />
              </button>
              
              {/* Light/Dark Toggle */}
              <button onClick={toggleTheme} title="Toggle Light/Dark Mode" className="fs-icon-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "10px", borderRadius: "8px", cursor: "pointer", transition: "background 0.2s" }}>
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* End Session */}
              <button onClick={() => navigate(-1)} className="fs-icon-btn" style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "10px 16px", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer", transition: "background 0.2s" }}>
                <Square size={14} fill="var(--text-primary)" /> <span className="fs-end-session-text">End Session</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Row */}
      <div className="fs-progress-row" style={{ maxWidth: "1200px", margin: "0 auto 40px auto", width: "100%", padding: "0 40px", display: "flex", alignItems: "center", gap: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          {currentIndex + 1} / {activeCards.length} cards
        </div>
        <div style={{ flex: 1, height: "4px", background: "var(--border-color, rgba(0,0,0,0.05))", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((currentIndex + 1) / activeCards.length) * 100}%`, background: "var(--violet, #6E3FF3)", transition: "width 0.3s" }} />
        </div>
        <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          {Math.round(((currentIndex + 1) / activeCards.length) * 100)}%
        </div>
      </div>

      {/* Main Flashcard Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px" }}>
        
        {!currentCard ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "40px" }}>
            <h3 style={{ color: "var(--text-primary)", marginBottom: "16px" }}>No cards to review!</h3>
            <button 
              onClick={() => { setReviewMode(false); setCurrentIndex(0); setFinished(false); }}
              style={{ padding: "12px 24px", borderRadius: "12px", background: "var(--violet, #6E3FF3)", color: "white", border: "none", fontWeight: "600", cursor: "pointer" }}
            >
              Study All Cards
            </button>
          </div>
        ) : (
          <>
            {/* The Card */}
            <div 
              onClick={handleFlip}
              style={{ 
                width: "100%", 
                maxWidth: "850px", 
                perspective: "1200px",
                cursor: "pointer",
                position: "relative",
                marginBottom: "40px"
              }}
            >
              <div className="fs-card-inner" style={{
                display: "grid",
                width: "100%",
                minHeight: "300px",
                textAlign: "center",
                transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}>
                
                {/* FRONT OF CARD */}
                <div className="fs-card-face" style={{
                  gridArea: "1 / 1",
                  position: isFlipped ? "absolute" : "relative",
                  width: "100%",
                  height: "100%",
                  backfaceVisibility: "hidden",
                  background: "var(--bg-card)",
                  borderRadius: "24px",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
                  padding: "80px 40px 40px 40px",
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center", 
                  justifyContent: "center",
                  transform: "rotateY(0deg)"
                }}>
                  <div style={{ position: "absolute", top: "24px", left: "24px", background: "var(--accent-bg, rgba(110,63,243,0.1))", color: "var(--accent, #6E3FF3)", fontSize: "14px", fontWeight: "600", padding: "8px 20px", borderRadius: "20px" }}>
                    Front
                  </div>
                  {currentCard?.imageUrl && (
                    <img src={currentCard.imageUrl} alt="Card Front" style={{ maxWidth: "100%", maxHeight: "250px", objectFit: "contain", marginBottom: "24px", borderRadius: "8px" }} />
                  )}
                  <div className="fs-card-text" style={{ fontSize: "28px", fontWeight: "700", lineHeight: "1.5", color: "var(--text-primary)" }}>
                    {currentCard?.front}
                  </div>
                </div>

                {/* BACK OF CARD */}
                <div className="fs-card-face" style={{
                  gridArea: "1 / 1",
                  position: isFlipped ? "relative" : "absolute",
                  width: "100%",
                  height: "100%",
                  backfaceVisibility: "hidden",
                  background: "var(--bg-card)",
                  borderRadius: "24px",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
                  padding: "80px 40px 40px 40px",
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center", 
                  justifyContent: "center",
                  transform: "rotateY(180deg)"
                }}>
                  <div style={{ position: "absolute", top: "24px", left: "24px", background: "var(--accent-bg, rgba(110,63,243,0.1))", color: "var(--accent, #6E3FF3)", fontSize: "14px", fontWeight: "600", padding: "8px 20px", borderRadius: "20px" }}>
                    Answer
                  </div>
                  {currentCard?.imageUrl && (
                    <img src={currentCard.imageUrl} alt="Card Answer" style={{ maxWidth: "100%", maxHeight: "180px", objectFit: "contain", marginBottom: "20px", borderRadius: "8px" }} />
                  )}
                  <div className="fs-card-text" style={{ fontSize: "22px", fontWeight: "500", lineHeight: "1.6", color: "var(--text-primary)" }}>
                    {currentCard?.back}
                  </div>
                  {currentCard?.explanation && (
                    <div style={{ marginTop: "32px", padding: "20px", background: "var(--bg-input, rgba(255,255,255,0.03))", borderRadius: "16px", fontSize: "15px", color: "var(--text-secondary)", textAlign: "left", width: "100%", border: "1px solid var(--border-color)" }}>
                      <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "8px" }}>Explanation:</strong>
                      <div style={{ lineHeight: "1.6" }}>
                        {currentCard.explanation}
                      </div>
                    </div>
                  )}
                </div>
                
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="fs-bottom-controls" style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "60px", width: "100%", maxWidth: "850px", position: "relative" }}>
              
              {/* PREV */}
              <button onClick={handlePrev} disabled={currentIndex === 0} style={{ flex: 1, maxWidth: "180px", padding: "16px", borderRadius: "30px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: currentIndex === 0 ? "var(--text-muted)" : "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontWeight: "600", cursor: currentIndex === 0 ? "not-allowed" : "pointer" }}>
                <ArrowLeft size={18} /> Previous
              </button>

              {/* CENTER CONTROLS (FLIP OR LEARNING/KNOWN) */}
              <div style={{ flex: 2, maxWidth: "400px", position: "relative", display: "flex", gap: "16px", justifyContent: "center" }}>
                {!isFlipped ? (
                  <button onClick={handleFlip} style={{ width: "100%", padding: "16px", borderRadius: "30px", background: "var(--violet, #6E3FF3)", border: "none", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontWeight: "600", fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 20px var(--accent-border, rgba(110,63,243,0.3))" }}>
                    <Eye size={20} /> Flip
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); markProgress("Learning"); }}
                      style={{ flex: 1, padding: "16px", borderRadius: "30px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B", fontWeight: "600", fontSize: "15px", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(245,158,11,0.15)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(245,158,11,0.1)"}
                    >
                      Still Learning
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); markProgress("Known"); }}
                      style={{ flex: 1, padding: "16px", borderRadius: "30px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981", fontWeight: "600", fontSize: "15px", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(16,185,129,0.15)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(16,185,129,0.1)"}
                    >
                      Got It
                    </button>
                  </>
                )}
              </div>

              {/* NEXT */}
              <button onClick={handleNext} style={{ flex: 1, maxWidth: "180px", padding: "16px", borderRadius: "30px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontWeight: "600", cursor: "pointer" }}>
                Next <ArrowRight size={18} />
              </button>
            </div>
            
          </>
        )}
      </div>
    </div>
  );
}

export default FlashcardStudyView;
