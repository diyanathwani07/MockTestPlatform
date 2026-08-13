import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ChevronRight, Info, Trash2, Bookmark, X, Shield, Menu } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/Practice.css";
import MathRenderer from "../components/MathRenderer";
import ThemeToggle from "../components/ThemeToggle";

function PracticeTest() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [quiz, setQuiz] = useState(null);
  const [sections, setSections] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Mobile check state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [palettePage, setPalettePage] = useState(0);
  const itemsPerPage = 25;
  const [selectedOptionsMap, setSelectedOptionsMap] = useState({}); // { questionIndex: { optionIndex: true } }
  const [isCorrectSelectedMap, setIsCorrectSelectedMap] = useState({}); // { questionIndex: true }
  const [reviewQuestions, setReviewQuestions] = useState([]); // Array of review indices
  const [answeredQuestions, setAnsweredQuestions] = useState({}); // { index: true }
  const [visitedQuestions, setVisitedQuestions] = useState([0]); // Array of visited indices
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [wrongQuestionIds, setWrongQuestionIds] = useState(new Set());
  // Live AI explanations fetched on-demand when stored ones are missing
  const [liveExplanations, setLiveExplanations] = useState({}); // { questionIndex: { correct, incorrect: {} } }
  const [fetchingExplanation, setFetchingExplanation] = useState(false);

  const [stats, setStats] = useState({
    firstTryCorrect: 0,
    multipleTries: 0,
    totalWrongAttempts: 0,
    totalAttemptsAll: 0,
    startTime: Date.now()
  });

  const [questionTime, setQuestionTime] = useState(0);

  // Timer Effect
  useEffect(() => {
    const isCorrectSelected = isCorrectSelectedMap[currentIndex] || false;
    if (loading || !questions.length || isCorrectSelected) return;
    const timer = setInterval(() => {
      setQuestionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, questions.length, isCorrectSelectedMap, currentIndex]);

  // Fetch Quiz & Active/New Session
  useEffect(() => {
    const fetchQuizAndSession = async () => {
      try {
        const token = localStorage.getItem("token");
        const queryParams = new URLSearchParams(location.search);
        const restart = queryParams.get("restart") === "true";

        const sessionUrl = `${import.meta.env.VITE_API_URL}/api/practice/${quizId}/session${restart ? "?restart=true" : ""}`;
        
        const [quizRes, sessionRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/practice/${quizId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(sessionUrl, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const rawQuiz = quizRes.data;
        const sessionData = sessionRes.data;

        let loadedSections = rawQuiz.sections || [];
        // Backward compatibility for legacy flat quizzes
        if (loadedSections.length === 0 && rawQuiz.questions && rawQuiz.questions.length > 0) {
           loadedSections = [{
              _id: "legacy",
              title: "General Section",
              questions: rawQuiz.questions
           }];
        }

        let allQuestions = [];
        let normalizedSections = loadedSections.map(sec => {
           let qs = sec.questions || [];
           if (sec.type === 'coding' && sec.subsections) {
              qs = [
                ...(sec.subsections.easy || []).map(q => ({...q, difficulty: 'easy'})),
                ...(sec.subsections.medium || []).map(q => ({...q, difficulty: 'medium'})),
                ...(sec.subsections.hard || []).map(q => ({...q, difficulty: 'hard'})),
              ];
           }
           
           const startIndex = allQuestions.length;
           allQuestions.push(...qs);
           
           return { ...sec, flatQuestions: qs, startIndex, count: qs.length };
        });

        // Re-map the questions array to match sessionData.questionsOrder list of indices
        const orderedQuestions = sessionData.questionsOrder.map((origIdx) => {
          const q = allQuestions[origIdx];
          if (!q) return null;

          // Resolve correct answer (including obfuscated or letter/Option keys)
          let correctText = q.correctAnswer || "";
          if (q.correctAnswerObfuscated) {
            try {
              correctText = atob(q.correctAnswerObfuscated);
            } catch (e) {
              console.error("Failed to decode obfuscated correct answer:", e);
            }
          }
          if (["A", "B", "C", "D"].includes(correctText) && Array.isArray(q.options)) {
            const idxMap = { "A": 0, "B": 1, "C": 2, "D": 3 };
            correctText = q.options[idxMap[correctText]] || correctText;
          } else if (typeof correctText === "string" && correctText.startsWith("Option ") && Array.isArray(q.options)) {
            const optNum = parseInt(correctText.replace("Option ", ""), 10);
            if (!isNaN(optNum) && optNum >= 1 && optNum <= q.options.length) {
              correctText = q.options[optNum - 1] || correctText;
            }
          }

          // Handle Option Shuffling
          const optOrder = (sessionData.optionsOrder && sessionData.optionsOrder[origIdx]) || [0, 1, 2, 3];
          const shuffledOptions = optOrder.map((optIdx) => q.options[optIdx]);

          return {
            ...q,
            correctAnswer: correctText,
            originalIndex: origIdx,
            options: shuffledOptions,
            optionIndicesMapping: optOrder
          };
        }).filter(Boolean);

        setQuiz(rawQuiz);
        setSections(normalizedSections);
        setQuestions(orderedQuestions);

        // Strip restart parameter from address bar to prevent reshuffle on refresh
        if (restart) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch (err) {
        console.error("Error loading quiz/session:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizAndSession();
  }, [quizId]);

  // Add current index to visited list
  useEffect(() => {
    if (!visitedQuestions.includes(currentIndex)) {
      setVisitedQuestions(prev => [...prev, currentIndex]);
    }
  }, [currentIndex]);

  const renderExplanationText = (text, optionText) => {
    if (!text) return null;
    
    // Remove markdown formatting
    let cleanedText = text.replace(/\*/g, '').replace(/#/g, '').trim();
    
    // Remove prepended option text if it exists at the start of the explanation
    if (optionText) {
      const escapedOpt = optionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^\\s*${escapedOpt}\\s*[:\\-]?\\s*`, 'i');
      cleanedText = cleanedText.replace(regex, '');
    }

    return <MathRenderer text={cleanedText} />;
  };

  const activeSectionIndex = sections.findIndex(s => currentIndex >= s.startIndex && currentIndex < s.startIndex + s.count);
  const activeSection = sections[activeSectionIndex > -1 ? activeSectionIndex : 0];

  useEffect(() => {
    if (activeSection) {
      const relativeIdx = currentIndex - activeSection.startIndex;
      setPalettePage(Math.floor(relativeIdx / itemsPerPage));
    }
  }, [currentIndex, activeSection]);

  if (loading) {
    return (
      <div className="practice-fullscreen-layout" style={{ minHeight: "100vh", backgroundColor: "#080914", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="sd-loading">
            <div className="sd-spinner" style={{ borderColor: "#8B5CF6", borderTopColor: "transparent" }}></div>
            <p style={{ color: "#a78bfa" }}>Loading your practice module...</p>
          </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="practice-fullscreen-layout" style={{ minHeight: "100vh", backgroundColor: "#080914", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="sd-empty" style={{ textAlign: "center" }}>
            <h3 style={{ color: "#ffffff", marginBottom: "16px" }}>No questions found.</h3>
            <button className="practice-btn-primary" onClick={() => navigate("/dashboard/practice")} style={{ background: "#8B5CF6", color: "#ffffff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}>Go Back</button>
          </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const selectedOptions = selectedOptionsMap[currentIndex] || {};
  const isCorrectSelected = isCorrectSelectedMap[currentIndex] || false;

  // Fetch AI explanation on-demand if not pre-generated in DB
  const fetchLiveExplanation = async (question, qIndex) => {
    // Skip if already fetched or if DB already has real explanations
    const hasStoredCorrect = question.explanations?.correct && question.explanations.correct.trim().length > 0;
    const hasStoredIncorrect = question.explanations?.incorrect && Object.keys(question.explanations.incorrect).length > 0;

    // Decouple checks: if we have correct explanation but no incorrect (imported case), do not call AI
    if (hasStoredCorrect && !hasStoredIncorrect) {
      return;
    }

    if ((hasStoredCorrect && hasStoredIncorrect) || liveExplanations[qIndex] || fetchingExplanation) return;

    setFetchingExplanation(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/practice/ai-explain`,
        { question, mode: "combined-structured" },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000
        }
      );

      console.log("[DEBUG] combined-structured response raw result:", res.data?.result);
      let parsed = {};
      try {
        if (res.data?.result && typeof res.data.result === "object") {
          parsed = res.data.result;
        } else if (typeof res.data?.result === "string") {
          let cleanStr = res.data.result.trim();
          if (cleanStr.startsWith("```")) {
            cleanStr = cleanStr.replace(/^```(json)?/, "").replace(/```$/, "").trim();
          }
          parsed = JSON.parse(cleanStr);
        }
      } catch (parseErr) {
        console.error("[DEBUG] Client failed to parse result as JSON, trying fuzzy option mapping", parseErr);
        parsed = {};
      }

      const correctText = parsed.correct || (typeof res.data?.result === "string" ? res.data.result : "This option is correct.");
      const incorrectMap = {};

      question.options.forEach((opt, idx) => {
        if (opt === question.correctAnswer) return;
        const letter = ["A", "B", "C", "D"][idx] || "A";
        incorrectMap[opt] = parsed.incorrect?.[letter] || "This option is incorrect.";
      });

      console.log("[DEBUG] Storing live explanations mapping:", { correctText, incorrectMap });

      setLiveExplanations(prev => ({
        ...prev,
        [qIndex]: {
          correct: correctText,
          incorrect: incorrectMap
        }
      }));
    } catch (err) {
      console.error("Live explanation fetch failed:", err);
      // Store fallback messages to prevent spinner from running indefinitely
      const incorrectMap = {};
      question.options.forEach((opt) => {
        if (opt !== question.correctAnswer) {
          incorrectMap[opt] = "Explanation unavailable right now.";
        }
      });
      setLiveExplanations(prev => ({
        ...prev,
        [qIndex]: {
          correct: "Explanation unavailable right now.",
          incorrect: incorrectMap
        }
      }));
    } finally {
      setFetchingExplanation(false);
    }
  };

  const handleOptionClick = (optIdx) => {
    if (isCorrectSelected || selectedOptions[optIdx]) return; // prevent re-clicking

    // Fetch live AI explanation if not pre-generated
    fetchLiveExplanation(currentQuestion, currentIndex);

    const normalizeString = (str) => String(str || "").replace(/\s+/g, " ").trim().toLowerCase();
    const isCorrect = normalizeString(currentQuestion.options[optIdx]) === normalizeString(currentQuestion.correctAnswer);
    const newSelected = { ...selectedOptions, [optIdx]: true };
    setSelectedOptionsMap(prev => ({ ...prev, [currentIndex]: newSelected }));

    if (isCorrect) {
      setIsCorrectSelectedMap(prev => ({ ...prev, [currentIndex]: true }));
      setAnsweredQuestions(prev => ({ ...prev, [currentIndex]: true }));

      // Update stats
      if (Object.keys(selectedOptions).length === 0) {
        setStats(prev => ({
          ...prev,
          firstTryCorrect: prev.firstTryCorrect + 1,
          totalAttemptsAll: prev.totalAttemptsAll + 1
        }));
      } else {
        setStats(prev => ({
          ...prev,
          multipleTries: prev.multipleTries + 1,
          totalAttemptsAll: prev.totalAttemptsAll + 1
        }));
      }
    } else {
      // Track wrong question for analytics
      setWrongQuestionIds(prev => {
        const next = new Set(prev);
        next.add(currentQuestion._id);
        return next;
      });
      setStats(prev => ({
        ...prev,
        totalWrongAttempts: prev.totalWrongAttempts + 1,
        totalAttemptsAll: prev.totalAttemptsAll + 1
      }));
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setQuestionTime(0);
    } else {
      // Finish Practice Attempt
      const timeSpent = Math.floor((Date.now() - stats.startTime) / 1000);
      const accuracyVal = questions.length > 0 ? Math.round((stats.firstTryCorrect / questions.length) * 100) : 0;

      // Map wrongQuestions, sorted by original logical index in the quiz for proper analytics order
      const wrongQs = Array.from(wrongQuestionIds).map(id => {
        const q = questions.find(item => item._id === id);
        if (!q) return null;
        return {
          questionId: q._id,
          questionEnglish: q.questionEnglish,
          questionHindi: q.questionHindi,
          options: q.options, // Save option order for completeness
          correctAnswer: q.correctAnswer,
          explanations: {
            correct: q.explanations?.correct || "",
            incorrect: q.explanations?.incorrect || {},
            conceptSummary: q.explanations?.conceptSummary || ""
          }
        };
      }).filter(Boolean).sort((a, b) => {
        const aIndex = quiz.questions.findIndex(q => q._id.toString() === a.questionId.toString());
        const bIndex = quiz.questions.findIndex(q => q._id.toString() === b.questionId.toString());
        return aIndex - bIndex;
      });

      try {
        const token = localStorage.getItem("token");
        // Save practice result history to server
        await axios.post(`${import.meta.env.VITE_API_URL}/api/practice/history`, {
          quizId,
          stats: {
            totalQuestions: questions.length,
            firstTryCorrect: stats.firstTryCorrect,
            multipleTries: stats.multipleTries,
            totalWrongAttempts: stats.totalWrongAttempts,
            totalAttemptsAll: stats.totalAttemptsAll,
            timeSpent,
            accuracy: accuracyVal
          },
          wrongQuestions: wrongQs
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Restart/Reset active session order for future attempts
        await axios.get(`${import.meta.env.VITE_API_URL}/api/practice/${quizId}/session?restart=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to save practice completion metrics:", err);
      }

      navigate("/practice-result", {
        replace: true,
        state: {
          quizId,
          title: quiz.title,
          stats: {
            ...stats,
            totalQuestions: questions.length,
            timeSpent
          }
        }
      });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setQuestionTime(0);
    }
  };

  const handleMarkReview = () => {
    if (reviewQuestions.includes(currentIndex)) {
      setReviewQuestions(prev => prev.filter(idx => idx !== currentIndex));
    } else {
      setReviewQuestions(prev => [...prev, currentIndex]);
    }
  };

  // Stats for right sidebar
  const answeredCount = Object.keys(answeredQuestions).length;
  const reviewCount = reviewQuestions.length;
  const remainingCount = questions.length - answeredCount;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  const getOptionLetter = (idx) => {
    return ["A", "B", "C", "D"][idx] || String.fromCharCode(65 + idx);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isMobile) {
    return (
      <div className="practice-mobile-root" style={{ minHeight: "100vh", backgroundColor: "var(--bg-page)", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", color: "var(--text-primary)" }}>
        
        {/* ── MOBILE HEADER (Compact Rows) ── */}
        <div style={{ display: "flex", flexDirection: "column", backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border-color)", padding: "10px 12px", gap: "8px", sticky: "top", top: 0, zIndex: 100 }}>
          {/* Row 1 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "44px" }}>
            <button type="button" onClick={() => navigate("/dashboard/practice")} style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", padding: "6px 0", minHeight: "44px" }}>
              <ArrowLeft size={16} /> Back
            </button>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>Quiz</h3>
            <div style={{ fontSize: "13px", color: "var(--primary, #8B5CF6)", fontWeight: "700" }}>⏱ {formatTime(questionTime)}</div>
          </div>
          
          {/* Row 2 */}
          <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", wordBreak: "break-word", lineHeight: "1.4", maxHeight: "2.8em", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {quiz?.title || quiz?.examGroup || "Practice Test"}
          </div>
          
          {/* Row 3 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#8B5CF6", fontWeight: "700", backgroundColor: "rgba(139, 92, 246, 0.1)", padding: "4px 8px", borderRadius: "6px" }}>
              {activeSection?.title || "General Section"}
            </span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <ThemeToggle />
              <button onClick={() => setShowSidebar(true)} style={{ background: "#8B5CF6", border: "none", color: "#ffffff", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", minHeight: "44px", display: "flex", alignItems: "center", gap: "6px" }}>
                📋 Qs & Info
              </button>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div style={{ flex: 1, padding: "12px 12px 88px", display: "flex", flexDirection: "column", gap: "12px", boxSizing: "border-box" }}>
          
          {/* ── PROGRESS CARD ── */}
          {/* Progress Card Removed for Space Optimization */}

          {/* ── QUESTION CARD ── */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ backgroundColor: "rgba(139, 92, 246, 0.12)", color: "#c084fc", border: "1px solid rgba(139, 92, 246, 0.2)", fontWeight: "700", fontSize: "12px", padding: "4px 10px", borderRadius: "20px" }}>
                Question {currentIndex + 1} / {questions.length}
              </span>
              <button onClick={handleMarkReview} style={{ background: "transparent", border: "none", color: reviewQuestions.includes(currentIndex) ? "#F59E0B" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: "600", minHeight: "44px" }}>
                <Bookmark size={16} fill={reviewQuestions.includes(currentIndex) ? "#F59E0B" : "none"} /> Mark
              </button>
            </div>

            <div style={{ marginBottom: "20px", wordBreak: "break-word" }}>
              <p style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 8px 0", lineHeight: 1.5 }}>
                <MathRenderer text={currentQuestion.questionEnglish} />
              </p>
              {currentQuestion.questionHindi && (
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500", margin: 0, lineHeight: 1.5 }}>
                  <MathRenderer text={currentQuestion.questionHindi} />
                </p>
              )}
            </div>

            {/* ── OPTIONS ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOptions[idx];
                const normalizeString = (str) => String(str || "").replace(/\s+/g, " ").trim().toLowerCase();
                const isCorrectOption = normalizeString(opt) === normalizeString(currentQuestion.correctAnswer);
                
                let borderStyle = "1.5px solid var(--border-color)";
                let backgroundStyle = "var(--bg-page)";
                let badgeBorder = "2px solid rgba(139, 92, 246, 0.4)";
                let badgeBg = "transparent";
                let badgeText = "#8B5CF6";
                
                if (isSelected && isCorrectOption) {
                  borderStyle = "2.5px solid #10B981";
                  backgroundStyle = "rgba(16, 185, 129, 0.08)";
                  badgeBorder = "2px solid #10B981";
                  badgeBg = "#10B981";
                  badgeText = "#ffffff";
                } else if (isSelected && !isCorrectOption) {
                  borderStyle = "2.5px solid #EF4444";
                  backgroundStyle = "rgba(239, 68, 68, 0.08)";
                  badgeBorder = "2px solid #EF4444";
                  badgeBg = "#EF4444";
                  badgeText = "#ffffff";
                } else if (isCorrectSelected && isCorrectOption) {
                  borderStyle = "2.5px solid #10B981";
                  backgroundStyle = "rgba(16, 185, 129, 0.08)";
                  badgeBorder = "2px solid #10B981";
                  badgeBg = "#10B981";
                  badgeText = "#ffffff";
                } else if (isCorrectSelected && !isCorrectOption) {
                  borderStyle = "2.5px solid #EF4444";
                  backgroundStyle = "rgba(239, 68, 68, 0.08)";
                  badgeBorder = "2px solid #EF4444";
                  badgeBg = "#EF4444";
                  badgeText = "#ffffff";
                }

                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <button 
                      onClick={() => handleOptionClick(idx)}
                      disabled={isCorrectSelected || isSelected}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "12px",
                        borderRadius: "10px",
                        border: borderStyle,
                        background: backgroundStyle,
                        color: "var(--text-primary)",
                        cursor: (isCorrectSelected || isSelected) ? "default" : "pointer",
                        width: "100%",
                        textAlign: "left",
                        minHeight: "48px",
                        transition: "all 0.15s ease",
                        gap: "12px",
                        boxSizing: "border-box"
                      }}
                    >
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: badgeBorder,
                        background: badgeBg,
                        color: badgeText,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        fontSize: "13px",
                        flexShrink: 0
                      }}>
                        {getOptionLetter(idx)}
                      </div>
                      <span style={{ flex: 1, fontSize: "14px", wordBreak: "break-word", whiteSpace: "normal" }}>
                        <MathRenderer text={opt} />
                      </span>
                    </button>

                    {/* Explanation right below the clicked choice */}
                    {(isSelected || isCorrectSelected) && !isCorrectOption && (() => {
                       const normalizeString = (str) => String(str || "").replace(/\s+/g, " ").trim().toLowerCase();
                       
                       const storedIncorrectEntry = Object.entries(currentQuestion.explanations?.incorrect || {}).find(
                           ([k]) => normalizeString(k) === normalizeString(opt)
                       );
                       const storedIncorrect = storedIncorrectEntry ? storedIncorrectEntry[1] : null;
                       
                       const liveIncorrectEntry = Object.entries(liveExplanations[currentIndex]?.incorrect || {}).find(
                           ([k]) => normalizeString(k) === normalizeString(opt)
                       );
                       const liveIncorrect = liveIncorrectEntry ? liveIncorrectEntry[1] : null;
                       
                       const specificIncorrect = (storedIncorrect && storedIncorrect.trim()) ? storedIncorrect : liveIncorrect;
                       
                       const text = specificIncorrect; // NO FALLBACK to correct explanation
                       
                       const conceptSummary = currentQuestion.explanations?.conceptSummary;
                       const didYouKnow = currentQuestion.explanations?.didYouKnow;
                       
                       return (
                         <div style={{ padding: "14px", backgroundColor: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                           <div>
                             <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#F87171", fontWeight: "700", fontSize: "13px" }}>
                               ❌ Incorrect
                             </div>
                             <p style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                               {text ? renderExplanationText(text) : (fetchingExplanation ? <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Generating explanation…</span> : "This option is incorrect.")}
                             </p>
                           </div>

                           {conceptSummary && (
                             <div>
                               <div style={{ color: "#60A5FA", fontWeight: "700", fontSize: "13px", marginBottom: "2px" }}>💡 Concept Summary</div>
                               <p style={{ margin: 0, fontSize: "13.5px", color: "#cbd5e1", lineHeight: 1.5 }}>{renderExplanationText(conceptSummary)}</p>
                             </div>
                           )}

                           {didYouKnow && (
                             <div>
                               <div style={{ color: "#FBBF24", fontWeight: "700", fontSize: "13px", marginBottom: "2px" }}>✨ Did You Know?</div>
                               <p style={{ margin: 0, fontSize: "13.5px", color: "#cbd5e1", lineHeight: 1.5 }}>{renderExplanationText(didYouKnow)}</p>
                             </div>
                           )}
                         </div>
                       );
                    })()}

                    {isCorrectSelected && isCorrectOption && (() => {
                      const stored = currentQuestion.explanations?.correct;
                      const live = liveExplanations[currentIndex]?.correct;
                      const text = (stored && stored.trim()) ? stored : (currentQuestion.explanation && currentQuestion.explanation.trim() ? currentQuestion.explanation : live);
                      
                      const conceptSummary = currentQuestion.explanations?.conceptSummary;
                      const didYouKnow = currentQuestion.explanations?.didYouKnow;

                      return (
                        <div style={{ padding: "14px", backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10B981", fontWeight: "700", fontSize: "13px" }}>
                              ☑ Correct Answer
                            </div>
                            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                              {text ? renderExplanationText(text) : (fetchingExplanation ? <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Generating explanation…</span> : "This option is correct.")}
                            </p>
                          </div>

                          {conceptSummary && (
                            <div>
                              <div style={{ color: "#60A5FA", fontWeight: "700", fontSize: "13px", marginBottom: "2px" }}>💡 Concept Summary</div>
                              <p style={{ margin: 0, fontSize: "13.5px", color: "#cbd5e1", lineHeight: 1.5 }}>{renderExplanationText(conceptSummary)}</p>
                            </div>
                          )}

                          {didYouKnow && (
                            <div>
                              <div style={{ color: "#FBBF24", fontWeight: "700", fontSize: "13px", marginBottom: "2px" }}>✨ Did You Know?</div>
                              <p style={{ margin: 0, fontSize: "13.5px", color: "#cbd5e1", lineHeight: 1.5 }}>{renderExplanationText(didYouKnow)}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── STICKY BOTTOM NAVIGATION BAR ── */}
        <div style={{ position: "sticky", bottom: 0, width: "100%", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border-color)", padding: "12px 16px", boxSizing: "border-box", zIndex: 90 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", height: "48px" }}>
            <button 
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              style={{
                height: "48px",
                borderRadius: "10px",
                border: "1px solid var(--border-color)",
                background: "transparent",
                color: currentIndex === 0 ? "var(--text-secondary)" : "var(--text-primary)",
                fontSize: "15px",
                fontWeight: "600",
                cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              &lt; Previous
            </button>

            <button 
              type="button"
              onClick={handleNext}
              disabled={!isCorrectSelected}
              style={{
                height: "48px",
                borderRadius: "10px",
                background: isCorrectSelected ? "#6d28d9" : "rgba(109, 40, 217, 0.4)",
                color: "#ffffff",
                border: "none",
                fontSize: "15px",
                fontWeight: "700",
                cursor: isCorrectSelected ? "pointer" : "not-allowed",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              {currentIndex === questions.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── MOBILE PALETTE BOTTOM SHEET ── */}
        {showSidebar && (
          <div style={{ 
            position: "fixed", 
            left: 0, 
            right: 0, 
            bottom: 0, 
            height: "75%", 
            backgroundColor: "var(--bg-card)", 
            borderTopLeftRadius: "24px", 
            borderTopRightRadius: "24px", 
            padding: "20px 16px 40px", 
            boxSizing: "border-box", 
            zIndex: 1000, 
            display: "flex", 
            flexDirection: "column",
            borderTop: "1.5px solid var(--border-color)",
            boxShadow: "0 -10px 30px rgba(0,0,0,0.3)"
          }}>
            <div style={{ width: "40px", height: "4px", backgroundColor: "var(--border-color)", borderRadius: "2px", margin: "-10px auto 16px" }} onClick={() => setShowSidebar(false)}></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Question Palette</h3>
              <button onClick={() => { setShowSidebar(false); setShowInstructions(true); }} style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.3)", color: "#8B5CF6", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" }}>
                Instructions
              </button>
            </div>
            
            {/* Counts inside drawer */}
            <div style={{ backgroundColor: "var(--bg-page)", borderRadius: "12px", border: "1px solid var(--border-color)", padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#10B981" }}>{answeredCount}</div>
                <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Answered</div>
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#F59E0B" }}>{reviewCount}</div>
                <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Review</div>
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)" }}>{remainingCount}</div>
                <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Remaining</div>
              </div>
            </div>

            {/* Grid selector */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "20px" }}>
              {questions.slice(activeSection?.startIndex || 0, (activeSection?.startIndex || 0) + (activeSection?.count || questions.length))
                .slice(palettePage * itemsPerPage, palettePage * itemsPerPage + itemsPerPage)
                .map((_, i) => {
                const relativeIdx = palettePage * itemsPerPage + i;
                const qIdx = (activeSection?.startIndex || 0) + relativeIdx;
                const isCurrent = currentIndex === qIdx;
                const isAnswered = answeredQuestions[qIdx];
                const isReview = reviewQuestions.includes(qIdx);
                const isVisited = visitedQuestions.includes(qIdx);

                let bg = "var(--bg-page)";
                let text = "var(--text-secondary)";
                let border = "1px solid var(--border-color)";

                if (isCurrent) {
                  bg = "#8B5CF6";
                  text = "#ffffff";
                  border = "1px solid #8B5CF6";
                } else if (isAnswered) {
                  bg = "#10B981";
                  text = "#ffffff";
                  border = "1px solid #10B981";
                } else if (isReview) {
                  bg = "#F59E0B";
                  text = "#ffffff";
                  border = "1px solid #F59E0B";
                } else if (!isVisited) {
                  bg = "var(--bg-card)";
                  text = "var(--text-secondary)";
                }

                return (
                  <button
                    key={qIdx}
                    onClick={() => {
                      setCurrentIndex(qIdx);
                      setQuestionTime(0);
                      setShowSidebar(false);
                    }}
                    style={{
                      height: "36px",
                      borderRadius: "8px",
                      background: bg,
                      color: text,
                      border: border,
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>

            {/* Close palette */}
            <button onClick={() => setShowSidebar(false)} style={{ width: "100%", background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border-color)", padding: "12px", borderRadius: "10px", fontWeight: "700", fontSize: "14px" }}>
              Close Palette
            </button>
          </div>
        )}

        {/* ── MOBILE INSTRUCTIONS MODAL ── */}
        {showInstructions && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "20px" }}>
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "450px", position: "relative" }}>
              <button onClick={() => setShowInstructions(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", border: "none", color: "var(--text-secondary)" }}><X size={20} /></button>
              <h3 style={{ color: "var(--text-primary)", fontSize: "17px", fontWeight: "700", margin: "0 0 12px 0" }}>Instructions</h3>
              <div style={{ color: "var(--text-secondary)", fontSize: "13.5px", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "10px" }}>
                <p>Select the correct answer to enable the "Next" button.</p>
                <p>Use the floating "Questions" button to skip directly to other question blocks.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="practice-fullscreen-layout" style={{ minHeight: "100vh", backgroundColor: "var(--bg-page)", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── DESKTOP HEADER BAR ── */}
      <div className="practice-top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "14px 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <button className="back-btn" onClick={() => navigate("/dashboard/practice")} style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "15px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <ArrowLeft size={18} /> Back
        </button>
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", letterSpacing: "0.5px", color: "var(--text-primary)" }}>Quiz</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <ThemeToggle />
          <button className="instructions-btn" onClick={() => setShowInstructions(true)} style={{ background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.2)", color: "var(--text-primary)", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <Info size={16} /> Instructions
          </button>
          <button className="practice-progress-toggle-btn" onClick={() => setShowSidebar(!showSidebar)} style={{ background: "#8B5CF6", border: "none", color: "#ffffff", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            {showSidebar ? "Hide Progress" : "Show Progress"}
          </button>
        </div>
      </div>

      {/* ── DESKTOP SUBJECT / TITLE BANNER ── */}
      <div className="practice-test-banner" style={{ maxWidth: "1400px", width: "100%", margin: "0 auto", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px", width: "100%" }}>
          <div style={{ width: "54px", height: "54px", borderRadius: "14px", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "800", color: "#FBBF24" }}>
            JS
          </div>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
              {quiz?.title || quiz?.examGroup || "Practice Test"}
            </h2>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
              {quiz?.subject || "Practice Questions"}
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA (GRID) ── */}
      <div className="practice-main-layout" style={{ flex: 1, maxWidth: "1400px", width: "100%", margin: "0 auto", boxSizing: "border-box", display: "flex", position: "relative" }}>
        
        {/* LEFT COLUMN: QUESTION CARD AND TABS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", minWidth: 0 }}>
          
          {/* Section Tabs */}
          {sections.length > 0 && (
             <div className="practice-section-tabs" style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
               {sections.map((sec, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {
                      setCurrentIndex(sec.startIndex);
                      setQuestionTime(0);
                    }}
                    style={{ 
                      padding: "10px 20px", 
                      borderRadius: "10px", 
                      border: "none",
                      cursor: "pointer",
                      background: idx === activeSectionIndex ? "#8B5CF6" : "var(--bg-card)", 
                      color: idx === activeSectionIndex ? "#ffffff" : "var(--text-secondary)", 
                      fontSize: "14px", 
                      fontWeight: "700", 
                      transition: "all 0.2s"
                    }}
                  >
                     {sec.title}
                  </button>
               ))}
             </div>
          )}

          <div className="practice-question-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "20px", padding: "36px", display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>


            {/* Question Indicator & Mark for Review */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
              <span className="quiz-question-pill" style={{ backgroundColor: "rgba(139, 92, 246, 0.12)", color: "#c084fc", border: "1px solid rgba(139, 92, 246, 0.2)", fontWeight: "700", fontSize: "13px", padding: "8px 16px", borderRadius: "20px" }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <button 
                onClick={handleMarkReview}
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  color: reviewQuestions.includes(currentIndex) ? "#F59E0B" : "var(--text-secondary)", 
                  fontSize: "14px", 
                  fontWeight: "600", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px", 
                  cursor: "pointer" 
                }}
              >
                <Bookmark size={18} fill={reviewQuestions.includes(currentIndex) ? "#F59E0B" : "none"} /> Mark for Review
              </button>
            </div>

            {/* Question Texts */}
            <div className="practice-q-text" style={{ marginBottom: "32px", textAlign: "left" }}>
              <p className="practice-question-title" style={{ fontSize: "19px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 12px 0", lineHeight: 1.5 }}>
                <MathRenderer text={currentQuestion.questionEnglish} />
              </p>
              {currentQuestion.questionHindi && (
                <p className="q-hindi" style={{ fontSize: "17px", color: "var(--text-secondary)", fontWeight: "500", margin: 0, lineHeight: 1.7 }}>
                  <MathRenderer text={currentQuestion.questionHindi} />
                </p>
              )}
            </div>

            {/* Options List */}
            <div className="practice-options-grid" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOptions[idx];
                const normalizeString = (str) => String(str || "").replace(/\s+/g, " ").trim().toLowerCase();
                const isCorrectOption = normalizeString(opt) === normalizeString(currentQuestion.correctAnswer);
                
                // Define border & background styles based on correctness
                let borderStyle = "1.5px solid var(--border-color)";
                let backgroundStyle = "var(--bg-page)";
                let badgeBorder = "2px solid rgba(139, 92, 246, 0.4)";
                let badgeBg = "transparent";
                let badgeText = "#8B5CF6";
                
                if (isSelected && isCorrectOption) {
                  borderStyle = "2.5px solid #10B981";
                  backgroundStyle = "rgba(16, 185, 129, 0.08)";
                  badgeBorder = "2px solid #10B981";
                  badgeBg = "#10B981";
                  badgeText = "#ffffff";
                } else if (isSelected && !isCorrectOption) {
                  borderStyle = "2.5px solid #EF4444";
                  backgroundStyle = "rgba(239, 68, 68, 0.08)";
                  badgeBorder = "2px solid #EF4444";
                  badgeBg = "#EF4444";
                  badgeText = "#ffffff";
                } else if (isCorrectSelected && isCorrectOption) {
                  borderStyle = "2.5px solid #10B981";
                  backgroundStyle = "rgba(16, 185, 129, 0.08)";
                  badgeBorder = "2px solid #10B981";
                  badgeBg = "#10B981";
                  badgeText = "#ffffff";
                } else if (isCorrectSelected && !isCorrectOption) {
                  borderStyle = "2.5px solid #EF4444";
                  backgroundStyle = "rgba(239, 68, 68, 0.08)";
                  badgeBorder = "2px solid #EF4444";
                  badgeBg = "#EF4444";
                  badgeText = "#ffffff";
                }

                return (
                  <div key={idx} className="practice-opt-wrapper" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button 
                      onClick={() => handleOptionClick(idx)}
                      disabled={isCorrectSelected || isSelected}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "16px 20px",
                        borderRadius: "14px",
                        border: borderStyle,
                        background: backgroundStyle,
                        color: "var(--text-primary)",
                        cursor: (isCorrectSelected || isSelected) ? "default" : "pointer",
                        width: "100%",
                        textAlign: "left",
                        fontSize: "15px",
                        fontWeight: "500",
                        transition: "all 0.15s ease",
                        gap: "16px"
                      }}
                    >
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: badgeBorder,
                        background: badgeBg,
                        color: badgeText,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        fontSize: "13px",
                        flexShrink: 0
                      }}>
                        {getOptionLetter(idx)}
                      </div>
                      <span style={{ flex: 1 }}><MathRenderer text={opt} /></span>
                    </button>

                    {/* Explanation right below the clicked choice */}
                    {(isSelected || isCorrectSelected) && !isCorrectOption && (() => {
                       const normalizeString = (str) => String(str || "").replace(/\s+/g, " ").trim().toLowerCase();
                       
                       const storedIncorrectEntry = Object.entries(currentQuestion.explanations?.incorrect || {}).find(
                           ([k]) => normalizeString(k) === normalizeString(opt)
                       );
                       const storedIncorrect = storedIncorrectEntry ? storedIncorrectEntry[1] : null;
                       
                       const liveIncorrectEntry = Object.entries(liveExplanations[currentIndex]?.incorrect || {}).find(
                           ([k]) => normalizeString(k) === normalizeString(opt)
                       );
                       const liveIncorrect = liveIncorrectEntry ? liveIncorrectEntry[1] : null;
                       
                       const specificIncorrect = (storedIncorrect && storedIncorrect.trim()) ? storedIncorrect : liveIncorrect;
                       
                       const text = specificIncorrect; // NO FALLBACK to correct explanation
                       
                       const conceptSummary = currentQuestion.explanations?.conceptSummary;
                       const didYouKnow = currentQuestion.explanations?.didYouKnow;
                       
                       return (
                         <div className="practice-inline-exp danger" style={{ padding: "16px", backgroundColor: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                           <div>
                             <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#F87171", fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>
                               ❌ Incorrect
                             </div>
                             <p style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                               {text ? renderExplanationText(text) : (fetchingExplanation ? <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Generating explanation…</span> : "This option is incorrect.")}
                             </p>
                           </div>

                           {conceptSummary && (
                             <div>
                               <div style={{ color: "#60A5FA", fontWeight: "700", fontSize: "13px", marginBottom: "2px" }}>💡 Concept Summary</div>
                               <p style={{ margin: 0, fontSize: "13.5px", color: "#cbd5e1", lineHeight: 1.5 }}>{renderExplanationText(conceptSummary)}</p>
                             </div>
                           )}

                           {didYouKnow && (
                             <div>
                               <div style={{ color: "#FBBF24", fontWeight: "700", fontSize: "13px", marginBottom: "2px" }}>✨ Did You Know?</div>
                               <p style={{ margin: 0, fontSize: "13.5px", color: "#cbd5e1", lineHeight: 1.5 }}>{renderExplanationText(didYouKnow)}</p>
                             </div>
                           )}
                         </div>
                       );
                    })()}

                    {isCorrectSelected && isCorrectOption && (() => {
                      const stored = currentQuestion.explanations?.correct;
                      const live = liveExplanations[currentIndex]?.correct;
                      const text = (stored && stored.trim()) ? stored : (currentQuestion.explanation && currentQuestion.explanation.trim() ? currentQuestion.explanation : live);
                      
                      const conceptSummary = currentQuestion.explanations?.conceptSummary;
                      const didYouKnow = currentQuestion.explanations?.didYouKnow;

                      return (
                        <div className="practice-inline-exp success" style={{ padding: "16px", backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                          
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10B981", fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>
                              ☑ Correct Answer
                            </div>
                            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                              {text ? renderExplanationText(text) : (fetchingExplanation ? <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Generating explanation…</span> : "This option is correct.")}
                            </p>
                          </div>

                          {conceptSummary && (
                            <>
                              <hr style={{ borderTop: "1px solid var(--border-color)", borderBottom: "none", margin: "4px 0" }} />
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#60A5FA", fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>
                                  💡 Concept Summary
                                </div>
                                <p style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                                  {renderExplanationText(conceptSummary)}
                                </p>
                              </div>
                            </>
                          )}

                          {didYouKnow && (
                            <>
                              <hr style={{ borderTop: "1px solid var(--border-color)", borderBottom: "none", margin: "4px 0" }} />
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#FBBF24", fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>
                                  ✨ Did You Know?
                                </div>
                                <p style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                                  {renderExplanationText(didYouKnow)}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SIDE PANEL (DESKTOP VERSION) */}
        <div className="practice-desktop-sidebar" style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: sections.length > 0 ? "54px" : "0px" }}>
          
          {/* Progress Widget */}
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-secondary)" }}>Your Progress</span>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#8B5CF6" }}>{progressPercent}%</span>
            </div>
            
            {/* Progress Bar */}
            <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-page)", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", backgroundColor: "#8B5CF6", borderRadius: "4px", transition: "width 0.3s ease" }}></div>
            </div>

            {/* Counts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "20px", fontWeight: "800", color: "#10B981" }}>{answeredCount}</span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600", marginTop: "2px" }}>Answered</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "20px", fontWeight: "800", color: "#F59E0B" }}>{reviewCount}</span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600", marginTop: "2px" }}>Review</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>{remainingCount}</span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600", marginTop: "2px" }}>Remaining</span>
              </div>
            </div>
          </div>

          {/* Palette Grid */}
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)", padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
            <div className="practice-grid-section">
              <h4 style={{ color: "var(--text-primary)", fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                {activeSection?.title || "Questions"}
              </h4>
              <div className="practice-grid-scroll" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", paddingRight: "12px" }}>
                {questions.slice(activeSection?.startIndex || 0, (activeSection?.startIndex || 0) + (activeSection?.count || questions.length))
                  .slice(palettePage * itemsPerPage, palettePage * itemsPerPage + itemsPerPage)
                  .map((_, i) => {
                  const relativeIdx = palettePage * itemsPerPage + i;
                  const qIdx = (activeSection?.startIndex || 0) + relativeIdx;
                  const isCurrent = currentIndex === qIdx;
                  const isAnswered = answeredQuestions[qIdx];
                  const isReview = reviewQuestions.includes(qIdx);
                  const isVisited = visitedQuestions.includes(qIdx);

                  let bg = "var(--bg-page)";
                  let text = "var(--text-secondary)";
                  let border = "1px solid var(--border-color)";

                  if (isCurrent) {
                    bg = "#8B5CF6";
                    text = "#ffffff";
                    border = "1px solid #8B5CF6";
                  } else if (isAnswered) {
                    bg = "#10B981";
                    text = "#ffffff";
                    border = "1px solid #10B981";
                  } else if (isReview) {
                    bg = "#F59E0B";
                    text = "#ffffff";
                    border = "1px solid #F59E0B";
                  } else if (!isVisited) {
                    bg = "var(--bg-card)";
                    text = "var(--text-secondary)";
                  }

                  return (
                    <button
                      key={qIdx}
                      onClick={() => {
                        setCurrentIndex(qIdx);
                        setQuestionTime(0);
                      }}
                      style={{
                        height: "36px",
                        borderRadius: "8px",
                        background: bg,
                        color: text,
                        border: border,
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s ease"
                      }}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {(() => {
                const totalSectionQuestions = activeSection?.count || questions.length;
                const totalPages = Math.ceil(totalSectionQuestions / itemsPerPage);
                if (totalPages <= 1) return null;

                let startPage = Math.max(0, palettePage - 2);
                let endPage = Math.min(totalPages - 1, startPage + 4);
                
                if (endPage - startPage < 4) {
                  startPage = Math.max(0, endPage - 4);
                }

                const visiblePages = [];
                for (let i = startPage; i <= endPage; i++) {
                  visiblePages.push(i);
                }

                return (
                  <div style={{ display: "flex", justifyContent: "center", gap: "6px", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1.5px solid var(--border-color)", flexWrap: "wrap", paddingRight: "12px" }}>
                    <button 
                      onClick={() => setPalettePage(Math.max(0, palettePage - 1))}
                      disabled={palettePage === 0}
                      style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-color)", cursor: palettePage === 0 ? "not-allowed" : "pointer", opacity: palettePage === 0 ? 0.5 : 1, fontWeight: "bold", color: "var(--text-secondary)", transition: "all 0.2s" }}
                    >
                      &lt;
                    </button>
                    {visiblePages.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPalettePage(p)}
                        style={{
                          width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px",
                          backgroundColor: palettePage === p ? "rgba(139, 92, 246, 0.2)" : "var(--bg-page)",
                          border: `1px solid ${palettePage === p ? "#8B5CF6" : "var(--border-color)"}`,
                          color: palettePage === p ? "var(--text-primary)" : "var(--text-secondary)",
                          fontWeight: "bold", cursor: "pointer", transition: "all 0.2s"
                        }}
                      >
                        {p + 1}
                      </button>
                    ))}
                    <button 
                      onClick={() => setPalettePage(Math.min(totalPages - 1, palettePage + 1))}
                      disabled={palettePage === totalPages - 1}
                      style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-color)", cursor: palettePage === totalPages - 1 ? "not-allowed" : "pointer", opacity: palettePage === totalPages - 1 ? 0.5 : 1, fontWeight: "bold", color: "var(--text-secondary)", transition: "all 0.2s" }}
                    >
                      {">"}
                    </button>
                  </div>
                );
              })()}
            </div>

          </div>

        </div>



      </div>

      {/* ── BOTTOM ACTIONS ROW (Desktop & Mobile safe-area wrapper) ── */}
      <div className="practice-bottom-actions-sticky-wrapper" style={{ position: "sticky", bottom: 0, width: "100%", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border-color)", padding: "16px 24px", boxSizing: "border-box", zIndex: 90 }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", minHeight: "48px" }}>
          
          <button 
            className="practice-nav-btn practice-nav-prev"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: currentIndex === 0 ? "#475569" : "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              cursor: currentIndex === 0 ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
              minHeight: "48px",
              flex: 1,
              maxWidth: "200px"
            }}
          >
            &lt; Previous
          </button>

          {/* Centered spacer / empty box since we removed the auto-saved text */}
          <div className="practice-nav-spacer practice-desktop-only" style={{ flex: 1 }}></div>

          <button 
            className="practice-nav-btn practice-nav-next"
            onClick={handleNext}
            disabled={!isCorrectSelected}
            style={{
              padding: "12px 28px",
              borderRadius: "10px",
              background: isCorrectSelected ? "#6d28d9" : "rgba(109, 40, 217, 0.4)",
              color: isCorrectSelected ? "#ffffff" : "#94a3b8",
              border: "none",
              fontSize: "14px",
              fontWeight: "700",
              cursor: isCorrectSelected ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.15s ease",
              minHeight: "48px",
              flex: 1,
              maxWidth: "200px"
            }}
          >
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
          </button>

        </div>
      </div>

      {/* ── INSTRUCTIONS MODAL ── */}
      {showInstructions && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "28px",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
            position: "relative"
          }}>
            <button 
              onClick={() => setShowInstructions(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer"
              }}
            >
              <X size={20} />
            </button>
            <h3 style={{ color: "var(--text-primary)", fontSize: "18px", fontWeight: "700", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <Info size={20} color="#8B5CF6" /> Practice Test Instructions
            </h3>
            <div style={{ color: "var(--text-secondary)", fontSize: "14.5px", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p>Welcome to the interactive Practice Module. Please read the following instructions carefully:</p>
              <ul style={{ paddingLeft: "20px", margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                <li>This is an untimed practice quiz designed to improve your conceptual clarity.</li>
                <li>You must select the correct option to unlock the <strong>Next Question</strong> action.</li>
                <li>You can retry any question as many times as you like. Detailed explanations for both correct and incorrect options will appear instantly below each selected choice.</li>
                <li>Use the <strong>Question Palette</strong> on the right to navigate directly to any question.</li>
                <li>You can mark any question as "Review" to revisit it later.</li>
              </ul>
            </div>
            <button 
              onClick={() => setShowInstructions(false)}
              style={{
                width: "100%",
                background: "#8B5CF6",
                color: "#ffffff",
                border: "none",
                padding: "12px",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                marginTop: "24px",
                transition: "all 0.15s ease"
              }}
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default PracticeTest;