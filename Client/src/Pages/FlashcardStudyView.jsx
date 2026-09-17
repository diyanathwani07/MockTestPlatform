import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, RotateCcw, Book, Square, Eye, ArrowRight } from "lucide-react";
import "../css/StudentDashboard.css"; // Reuse existing styles

function FlashcardStudyView() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const [setMeta, setSetMeta] = useState(null);
  const [cards, setCards] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [finished, setFinished] = useState(false);

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
        setCards(cardsRes.data);
        setProgress(progRes.data);
        
        // Auto-resume logic: find first card not marked Known
        if (cardsRes.data.length > 0) {
          const knownIds = progRes.data.filter(p => p.status === "Known").map(p => p.flashcardId);
          const firstUnlearned = cardsRes.data.findIndex(c => !knownIds.includes(c._id));
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
      
      {/* Top Navigation Row */}
      <div style={{ padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {/* Left: Back Button */}
        <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "var(--violet, #6E3FF3)", fontWeight: "600", fontSize: "14px", cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={16} /> Back to Flashcards
        </button>

        {/* Center: Icon + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", transform: "translateX(-20px)" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(110,63,243,0.1)", color: "var(--violet, #6E3FF3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
             <Book size={28} />
          </div>
          <div style={{ textAlign: "left" }}>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }}>{setMeta.title}</h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>{setMeta.subjectName || "Subject"} • {activeCards.length} cards</p>
          </div>
        </div>

        {/* Right: End Session */}
        <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "10px 16px", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-card-hover)"} onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}>
          <Square size={14} fill="var(--text-primary)" /> End Session
        </button>
      </div>

      {/* Progress Row */}
      <div style={{ maxWidth: "1200px", margin: "0 auto 40px auto", width: "100%", padding: "0 40px", display: "flex", alignItems: "center", gap: "24px" }}>
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
              <div style={{
                display: "grid",
                width: "100%",
                minHeight: "400px",
                textAlign: "center",
                transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}>
                
                {/* FRONT OF CARD */}
                <div style={{
                  gridArea: "1 / 1",
                  backfaceVisibility: "hidden",
                  background: "var(--bg-card)",
                  borderRadius: "24px",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
                  padding: "80px 40px",
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center", 
                  justifyContent: "center",
                  transform: "rotateY(0deg)"
                }}>
                  <div style={{ position: "absolute", top: "24px", left: "24px", background: "rgba(110,63,243,0.1)", color: "var(--violet, #6E3FF3)", fontSize: "14px", fontWeight: "600", padding: "8px 20px", borderRadius: "20px" }}>
                    Front
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "700", lineHeight: "1.5", color: "var(--text-primary)" }}>
                    {currentCard?.front}
                  </div>
                </div>

                {/* BACK OF CARD */}
                <div style={{
                  gridArea: "1 / 1",
                  backfaceVisibility: "hidden",
                  background: "var(--bg-card)",
                  borderRadius: "24px",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
                  padding: "80px 40px",
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center", 
                  justifyContent: "center",
                  transform: "rotateY(180deg)"
                }}>
                  <div style={{ position: "absolute", top: "24px", left: "24px", background: "rgba(110,63,243,0.1)", color: "var(--violet, #6E3FF3)", fontSize: "14px", fontWeight: "600", padding: "8px 20px", borderRadius: "20px" }}>
                    Answer
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: "500", lineHeight: "1.6", color: "var(--text-primary)" }}>
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
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "60px", width: "100%", maxWidth: "850px", position: "relative" }}>
              
              {/* PREV */}
              <button onClick={handlePrev} disabled={currentIndex === 0} style={{ flex: 1, maxWidth: "180px", padding: "16px", borderRadius: "30px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: currentIndex === 0 ? "var(--text-muted)" : "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontWeight: "600", cursor: currentIndex === 0 ? "not-allowed" : "pointer" }}>
                <ArrowLeft size={18} /> Previous
              </button>

              {/* CENTER CONTROLS (FLIP OR LEARNING/KNOWN) */}
              <div style={{ flex: 2, maxWidth: "400px", position: "relative", display: "flex", gap: "16px", justifyContent: "center" }}>
                {!isFlipped ? (
                  <button onClick={handleFlip} style={{ width: "100%", padding: "16px", borderRadius: "30px", background: "var(--violet, #6E3FF3)", border: "none", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontWeight: "600", fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 20px rgba(110,63,243,0.3)" }}>
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