import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import { usePreview } from "../context/PreviewContext";
import { Sun, Moon, Clock, Bookmark, ArrowLeft, ArrowRight, LayoutGrid, CheckCircle, Trash2, Info, X } from "lucide-react";
import MathRenderer from "../components/MathRenderer";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import "../css/Quiz.css";

function QuizMulti() {
  const navigate = useNavigate();
  const location = useLocation();
  const { quizId: paramQuizId } = useParams();
  const [searchParams] = useSearchParams();

  const isPreview = searchParams.get("preview") === "true" && localStorage.getItem("role") === "admin";
  const quizId = location.state?.quizId || paramQuizId;

  const [examName, setExamName] = useState(location.state?.examName || location.state?.subject || "Live Examination");
  const [quizTitle, setQuizTitle] = useState(location.state?.quizTitle || "Mock Test");
  const [examSubject, setExamSubject] = useState(location.state?.subject || localStorage.getItem("lastExamTaken") || "General Studies");
  const [globalDuration, setGlobalDuration] = useState(location.state?.duration || 30);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const candidateName = storedUser.fullName || "Registered Aspirant";

  const [pageLoading, setPageLoading] = useState(true);
  
  // Section states
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  
  // Inside a section, we have an array of questions.
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // userAnswers maps sectionId -> questionId -> answer
  const [userAnswers, setUserAnswers] = useState({});
  const [reviewQuestions, setReviewQuestions] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState({});

  // Timers
  const [globalTimeLeft, setGlobalTimeLeft] = useState(globalDuration * 60);
  const [sectionTimeLeft, setSectionTimeLeft] = useState(null); // null if global only
  const [sectionTimeSpent, setSectionTimeSpent] = useState({}); // sectionId -> seconds

  // Anti-cheat
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [violations, setViolations] = useState(0);
  const MAX_VIOLATIONS = 3;

  const [showPaletteMobile, setShowPaletteMobile] = useState(false);
  // UI States imported from legacy Quiz.jsx
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [palettePage, setPalettePage] = useState(0);
  const itemsPerPage = 25;
  const [lockPreviousQuestions, setLockPreviousQuestions] = useState(false);
  const [enablePerQuestionTimer, setEnablePerQuestionTimer] = useState(false);
  const [timePerQuestion, setTimePerQuestion] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [breakBetweenSections, setBreakBetweenSections] = useState(0);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState(0);
  const [showTimerTooltip, setShowTimerTooltip] = useState(false);

  useEffect(() => {
    if (location.state?.subject) {
      localStorage.setItem("lastExamTaken", location.state.subject);
    }
    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = response.data;
      setExamName(data.examName || data.subject);
      setQuizTitle(data.title);
      setExamSubject(data.subject);
      setLockPreviousQuestions(data.lockPreviousQuestions || false);
      setEnablePerQuestionTimer(data.enablePerQuestionTimer || false);
      setTimePerQuestion(data.timePerQuestion || 0);
      setBreakBetweenSections(data.breakBetweenSections || 0);
      
      let loadedSections = data.sections || [];
      // Backward compatibility for legacy flat quizzes
      if (loadedSections.length === 0 && data.questions && data.questions.length > 0) {
         loadedSections = [{
            _id: "legacy",
            title: "General Section",
            type: "standard",
            duration: 0,
            marksPerQuestion: data.marksPerQuestion || 1,
            negativeMarking: data.negativeMarking || 0,
            questions: data.questions
         }];
      }

      // Flatten coding subsections if necessary for UI render ease
      let normalizedSections = loadedSections.map(sec => {
         let qs = sec.questions || [];
         if (sec.type === 'coding' && sec.subsections) {
            qs = [
              ...(sec.subsections.easy || []).map(q => ({...q, difficulty: 'easy'})),
              ...(sec.subsections.medium || []).map(q => ({...q, difficulty: 'medium'})),
              ...(sec.subsections.hard || []).map(q => ({...q, difficulty: 'hard'})),
            ];
         }

          // Resolve letter correct answers to text first (e.g. "A" -> options[0])
          qs = qs.map(q => {
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
             return { ...q, correctAnswer: correctText };
          });
         
         // Setup defaults in tracking state
         setUserAnswers(prev => ({ ...prev, [sec._id]: {} }));
         setReviewQuestions(prev => ({ ...prev, [sec._id]: [] }));
         setVisitedQuestions(prev => ({ ...prev, [sec._id]: [0] }));
         setSectionTimeSpent(prev => ({ ...prev, [sec._id]: 0 }));
         
         return { ...sec, flatQuestions: qs };
      });

      // Auto-divide total duration equally among sections if sections don't have their own duration
      // NOTE: data.duration is stored in SECONDS in the DB for multi-section, and MINUTES for legacy/flat
      const isMulti = data.sections && data.sections.length > 0;
      const totalDurationSecs = isMulti ? (data.duration || 0) : (data.duration || 0) * 60;
      const sectionCount = normalizedSections.length;
      
      if (sectionCount > 1 && totalDurationSecs > 0) {
         const perSectionSecs = Math.floor(totalDurationSecs / sectionCount);
         normalizedSections = normalizedSections.map(sec => ({
            ...sec,
            duration: sec.duration > 0 ? sec.duration : perSectionSecs
         }));
      }

      setSections(normalizedSections);
      
      if (normalizedSections.length > 0) {
         setCurrentQuestions(normalizedSections[0].flatQuestions);
         const firstDuration = normalizedSections[0].duration;
         if (firstDuration > 0) {
            setSectionTimeLeft(firstDuration);
         } else if (totalDurationSecs > 0) {
            setSectionTimeLeft(totalDurationSecs);
         } else {
            setSectionTimeLeft(null);
         }
      }
      
      if (data.duration) {
         setGlobalTimeLeft(totalDurationSecs);
      }
      
      setPageLoading(false);
    } catch (error) {
      console.error("Error fetching quiz:", error);
      alert("Failed to load test paper. Returning to Dashboard.");
      navigate("/dashboard");
    }
  };

  // Anti-Cheat (same logic as before)
  useEffect(() => {
    if (isPreview || pageLoading) return;
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(()=>{});
    
    const handleFSChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        setViolations((v) => {
          const newV = v + 1;
          if (newV >= MAX_VIOLATIONS) {
            setWarningMsg(`⚠️ Final Warning! Auto-submitting due to ${MAX_VIOLATIONS} violations.`);
            setShowWarning(true);
            setTimeout(() => submitQuiz(true), 3000);
          } else {
            setWarningMsg(`⚠️ You exited fullscreen! Violation ${newV}/${MAX_VIOLATIONS}. Return to fullscreen to continue.`);
            setShowWarning(true);
          }
          return newV;
        });
      }
    };
    
    const handleVisibility = () => {
      if (document.hidden) {
        setViolations((v) => {
          const newV = v + 1;
          if (newV >= MAX_VIOLATIONS) {
            setWarningMsg(`⚠️ Final Warning! Auto-submitting due to ${MAX_VIOLATIONS} tab-switch violations.`);
            setShowWarning(true);
            setTimeout(() => submitQuiz(true), 3000);
          } else {
            setWarningMsg(`⚠️ Tab switching detected! Violation ${newV}/${MAX_VIOLATIONS}. Stay on this tab!`);
            setShowWarning(true);
          }
          return newV;
        });
      }
    };

    const blockRight = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'p' || e.key === 's')) || e.key === 'F12') {
        e.preventDefault();
      }
    };

    document.addEventListener("fullscreenchange", handleFSChange);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("contextmenu", blockRight);
    document.addEventListener("keydown", blockKeys);
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("contextmenu", blockRight);
      document.removeEventListener("keydown", blockKeys);
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(()=>{});
      }
    };
  }, [pageLoading]);

  const reEnterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(()=>{});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(()=>{});
    setShowWarning(false);
  };

  // Timers
  useEffect(() => {
    if (pageLoading || isBreakTime) return;
    const timer = setInterval(() => {
      // Global timer tick
      setGlobalTimeLeft(prev => {
         if (prev <= 1) {
            clearInterval(timer);
            submitQuiz();
            return 0;
         }
         return prev - 1;
      });
      
      // Section timer tick
      if (sectionTimeLeft !== null) {
         setSectionTimeLeft(prev => {
            if (prev <= 1) {
               // Auto advance section
               handleNextSection();
               return 0;
            }
            return prev - 1;
         });
      }

      // Per Question Timer tick
      if (enablePerQuestionTimer) {
         setQuestionTimeLeft(prev => prev > 0 ? prev - 1 : 0);
      }

      // Track time spent per section
      if (sections.length > 0) {
         setSectionTimeSpent(prev => {
            const secId = sections[currentSectionIndex]._id;
            return { ...prev, [secId]: (prev[secId] || 0) + 1 };
         });
      }

    }, 1000);
    return () => clearInterval(timer);
  }, [pageLoading, currentSectionIndex, sectionTimeLeft, sections, isBreakTime, enablePerQuestionTimer]);

  // Break Timer
  useEffect(() => {
    if (!isBreakTime) return;
    const timer = setInterval(() => {
      setBreakTimeLeft(prev => {
        if (prev <= 1) {
          endBreak();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isBreakTime]);

  // Reset Question Timer on Question Change
  useEffect(() => {
    if (enablePerQuestionTimer && timePerQuestion > 0) {
      setQuestionTimeLeft(timePerQuestion);
    }
  }, [currentQuestionIndex, enablePerQuestionTimer, timePerQuestion]);

  // Auto-advance / Auto-submit when Question Timer hits 0
  useEffect(() => {
    if (enablePerQuestionTimer && questionTimeLeft === 0 && !pageLoading && !isBreakTime) {
       if (currentQuestionIndex < currentQuestions.length - 1) {
          const nextIdx = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIdx);
          const secId = sections[currentSectionIndex]._id;
          if (!visitedQuestions[secId]?.includes(nextIdx)) {
            setVisitedQuestions(prev => ({
               ...prev,
               [secId]: [...(prev[secId] || []), nextIdx]
            }));
          }
       } else {
          handleNextSection();
       }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionTimeLeft, enablePerQuestionTimer, pageLoading, currentQuestions.length, isBreakTime]);

  const handleNextSection = () => {
     if (currentSectionIndex < sections.length - 1) {
        if (breakBetweenSections > 0) {
           setIsBreakTime(true);
           setBreakTimeLeft(breakBetweenSections);
        } else {
           endBreak();
        }
     } else {
        submitQuiz();
     }
  };

  const endBreak = () => {
      setIsBreakTime(false);
      const nextIdx = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIdx);
      setCurrentQuestions(sections[nextIdx].flatQuestions);
      setCurrentQuestionIndex(0);
      
      // Mark first question visited
      setVisitedQuestions(prev => ({
         ...prev,
         [sections[nextIdx]._id]: [0]
      }));
      
      // Reset local timer if next section has one
      if (sections[nextIdx].duration > 0) {
         setSectionTimeLeft(sections[nextIdx].duration);
      } else {
         setSectionTimeLeft(null); // fallback to global
      }
  };

  const handleOptionSelect = (option) => {
    const secId = sections[currentSectionIndex]._id;
    setUserAnswers(prev => ({
      ...prev,
      [secId]: {
         ...prev[secId],
         [currentQuestionIndex]: option
      }
    }));
  };

  const clearResponse = () => {
    const secId = sections[currentSectionIndex]._id;
    const currentSecAnswers = { ...userAnswers[secId] };
    delete currentSecAnswers[currentQuestionIndex];
    setUserAnswers(prev => ({
       ...prev,
       [secId]: currentSecAnswers
    }));
  };

  const toggleReview = () => {
    const secId = sections[currentSectionIndex]._id;
    setReviewQuestions(prev => {
       const rev = prev[secId] || [];
       if (rev.includes(currentQuestionIndex)) {
          return { ...prev, [secId]: rev.filter(idx => idx !== currentQuestionIndex) };
       }
       return { ...prev, [secId]: [...rev, currentQuestionIndex] };
    });
  };

  const navigateToQuestion = (idx) => {
    setCurrentQuestionIndex(idx);
    const secId = sections[currentSectionIndex]._id;
    if (!visitedQuestions[secId]?.includes(idx)) {
       setVisitedQuestions(prev => ({
          ...prev,
          [secId]: [...(prev[secId] || []), idx]
       }));
    }
    if (window.innerWidth <= 900) {
      setShowPaletteMobile(false);
    }
  };

  const submitQuiz = async (force = false) => {
    if (isPreview) {
      alert("Preview complete. You can close this tab.");
      window.close();
      return;
    }

    try {
      // Evaluation
      let totalQuestions = 0;
      let totalCorrect = 0;
      let totalIncorrect = 0;
      
      const sectionResults = [];
      const difficultyBreakdown = {
         easy: { correct: 0, total: 0 },
         medium: { correct: 0, total: 0 },
         hard: { correct: 0, total: 0 }
      };

      sections.forEach(sec => {
         let secTotal = sec.flatQuestions.length;
         let secCorrect = 0;
         let secIncorrect = 0;
         
         totalQuestions += secTotal;
         
         sec.flatQuestions.forEach((q, i) => {
            const uAns = userAnswers[sec._id]?.[i];
            
            // Difficulty stat base
            if (sec.type === 'coding' && q.difficulty) {
               difficultyBreakdown[q.difficulty].total += 1;
            }

            if (uAns) {
               if (uAns === q.correctAnswer) {
                  secCorrect++;
                  totalCorrect++;
                  if (sec.type === 'coding' && q.difficulty) {
                     difficultyBreakdown[q.difficulty].correct += 1;
                  }
               } else {
                  secIncorrect++;
                  totalIncorrect++;
               }
            }
         });
         
         const secScore = (secCorrect * (sec.marksPerQuestion || 1)) - (secIncorrect * (sec.negativeMarking || 0));
         const secAttempted = secCorrect + secIncorrect;
         const secAccuracy = secAttempted > 0 ? (secCorrect / secAttempted) * 100 : 0;
         
         sectionResults.push({
            sectionId: sec._id,
            sectionTitle: sec.title,
            score: secScore,
            totalQuestions: secTotal,
            correct: secCorrect,
            incorrect: secIncorrect,
            timeTaken: sectionTimeSpent[sec._id] || 0,
            accuracy: secAccuracy,
            type: sec.type
         });
      });

      // Overall calculations
      const finalScore = sectionResults.reduce((sum, sr) => sum + sr.score, 0);
      const finalPercentage = totalQuestions > 0 ? (finalScore / (totalQuestions * (sections[0]?.marksPerQuestion || 1))) * 100 : 0; 
      
      // Calculate total max marks
      const maxPossibleMarks = sections.reduce((sum, sec) => sum + (sec.flatQuestions.length * (sec.marksPerQuestion || 1)), 0);
      const accuratePercentage = maxPossibleMarks > 0 ? (finalScore / maxPossibleMarks) * 100 : 0;
      const totalTimeSpent = Object.values(sectionTimeSpent).reduce((a, b) => a + b, 0);

      const flatAnswers = sections.flatMap(sec =>
        sec.flatQuestions.map((q, i) => userAnswers[sec._id]?.[i] ?? null)
      );

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/quizzes/${quizId}/submit`, {
        userAnswers: flatAnswers,
        timeTaken: totalTimeSpent
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      navigate(`/student/result/${res.data.result.shareId}`, { replace: true });
    } catch (error) {
      console.error("Submit Error:", error);
      alert("Failed to submit results. Please try again.");
    }
  };

  if (pageLoading) return <div className="quiz-loading-screen">Loading Assessment Engine...</div>;

  const currentSection = sections[currentSectionIndex];
  const activeQ = currentQuestions[currentQuestionIndex];
  
  // formatting
  const formatTime = (secs) => {
    if (secs === null) return "--:--";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getQuestionStatus = (idx) => {
    const secId = currentSection._id;
    const isAnswered = !!userAnswers[secId]?.[idx];
    const isMarked = reviewQuestions[secId]?.includes(idx);
    const isVisited = visitedQuestions[secId]?.includes(idx);

    if (isAnswered && isMarked) return "status-answered-marked";
    if (isAnswered) return "status-answered";
    if (isMarked) return "status-marked";
    if (isVisited) return "status-visited";
    return "status-unvisited";
  };



  
  const formatTimeBox = (secs) => {
    if (secs === null || isNaN(secs)) return null;
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return (
      <>
        <div style={{ backgroundColor: "var(--bg-page)", padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontWeight: "700" }}>{h}</div>
        <span style={{ fontWeight: "bold", color: "var(--text-muted)", alignSelf: "center" }}>:</span>
        <div style={{ backgroundColor: "var(--bg-page)", padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontWeight: "700" }}>{m}</div>
        <span style={{ fontWeight: "bold", color: "var(--text-muted)", alignSelf: "center" }}>:</span>
        <div style={{ backgroundColor: "var(--bg-page)", padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontWeight: "700" }}>{s}</div>
      </>
    );
  };
  
  const getPaletteStatus = (idx) => {
    const secId = currentSection?._id;
    if (!secId) return "unvisited";
    const isAnswered = !!userAnswers[secId]?.[idx];
    const isMarked = (reviewQuestions[secId] || []).includes(idx);
    const isVisited = (visitedQuestions[secId] || []).includes(idx);

    if (isAnswered && isMarked) return "review";
    if (isAnswered) return "answered";
    if (isMarked) return "review";
    if (isVisited) return "visited";
    return "unvisited";
  };
  
  // End UI states
  const current = currentQuestions[currentQuestionIndex];

  return (
    <div style={{ backgroundColor: "var(--bg-page)", minHeight: "100vh", paddingBottom: "60px", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif", userSelect: "none" }}>

      {/* ════ ANTI-CHEAT WARNING OVERLAY ════ */}
      {showWarning && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(10,9,20,0.92)",
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#1c1b2e", border: "2px solid #DC2626",
            borderRadius: "24px", padding: "48px 52px",
            textAlign: "center", maxWidth: "460px", width: "90%",
            boxShadow: "0 0 60px rgba(220,38,38,0.25)"
          }}>
            <div style={{ fontSize: "52px", marginBottom: "16px" }}>🚨</div>
            <h2 style={{ color: "#F87171", margin: "0 0 12px", fontSize: "22px", fontWeight: "800" }}>
              Integrity Violation!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "15px", margin: "0 0 8px", lineHeight: 1.6 }}>
              {warningMsg}
            </p>
            <p style={{ color: "#F4C842", fontSize: "13px", fontWeight: "600", margin: "0 0 28px" }}>
              Violations: {violations} / {MAX_VIOLATIONS}
            </p>
            {violations < MAX_VIOLATIONS && (
              <button
                onClick={reEnterFullscreen}
                style={{
                  background: "linear-gradient(135deg,#3730A3,#6E3FF3)",
                  color: "#fff", border: "none", borderRadius: "12px",
                  padding: "14px 36px", fontSize: "15px", fontWeight: "700",
                  cursor: "pointer", width: "auto"
                }}
              >
                🔒 Return to Fullscreen
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════ BREAK TIME OVERLAY ════ */}
      {isBreakTime && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99990,
          background: "rgba(10,9,20,0.95)",
          backdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", color: "#fff"
        }}>
          <h2 style={{ fontSize: "36px", marginBottom: "16px", fontWeight: "800", color: "#F4C842" }}>Section Completed!</h2>
          <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.7)", marginBottom: "32px" }}>Next section starting in:</p>
          <div style={{ fontSize: "72px", fontWeight: "900", fontFamily: "'JetBrains Mono', monospace", color: "#10B981", marginBottom: "48px" }}>
            {breakTimeLeft}s
          </div>
          <button
            onClick={endBreak}
            style={{
              background: "linear-gradient(135deg,#3730A3,#6E3FF3)",
              color: "#fff", border: "none", borderRadius: "12px",
              padding: "16px 48px", fontSize: "16px", fontWeight: "700",
              cursor: "pointer", transition: "transform 0.2s"
            }}
          >
            Skip Break & Start Now
          </button>
        </div>
      )}

      {/* ─── TOP HEADER ─── */}
      <header className="quiz-header-wrapper">
        <div className="quiz-header-inner">

          {/* LEFT: Brand only */}
          <div style={{ display: "flex", alignItems: "center", zIndex: 1 }}>
            <Logo />
          </div>

          {/* CENTER: Dynamic Exam Name */}
          <div className="quiz-header-exam-name" style={{ fontWeight: "700", fontSize: "15px", color: "#DC2626", letterSpacing: "0.5px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#DC2626", display: "inline-block", animation: "pulse 1.5s infinite" }}></span>
            {examName}
          </div>

          {/* RIGHT: Theme toggle + Instructions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />
            <button 
              className="quiz-instructions-btn"
              onClick={() => setShowInstructionsModal(true)}
              style={{ background: "#4C1D95", color: "#FFF", border: "none", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <Info size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Centering wrapper */}
      <div className="quiz-main-wrapper">

        {/* ─── 2. DYNAMIC EXAM TITLE PILL & TIMER BAR ─── */}
        <div className="quiz-top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          
          <span className="quiz-subject-pill" style={{ backgroundColor: "#2E1065", color: "#FFF", fontWeight: "700", fontSize: "13px", padding: "10px 18px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "10px", textTransform: "uppercase" }}>
            <LayoutGrid size={16} /> {examSubject}
          </span>
          {/* Section Tabs in Timer Line */}
          {sections.length > 1 && (
             <div className="quiz-section-tabs" style={{ display: "flex", gap: "8px", overflowX: "auto", flex: 1, margin: "0 10px" }}>
               {sections.map((sec, idx) => (
                  <div key={idx} style={{ padding: "8px 16px", borderRadius: "8px", background: idx === currentSectionIndex ? "var(--violet)" : "var(--bg-input)", color: idx === currentSectionIndex ? "#fff" : "var(--text-muted)", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", opacity: idx < currentSectionIndex ? 0.5 : 1 }}>
                     <span className="section-tab-title">{sec.title}</span>
                  </div>
               ))}
             </div>
          )}


          {/* Compact Horizontal Clock(s) - MOBILE ONLY */}
          <div className="quiz-timers-wrapper mobile-timer-only" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", width: "100%" }}>
            <div className="quiz-horizontal-timer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", backgroundColor: "#111115", border: "1.5px solid var(--border-color)", padding: "14px 24px", borderRadius: "12px", boxShadow: "var(--card-shadow)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Clock size={18} color="var(--text-secondary)" />
                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Timer
                </span>
              </div>
              <div className="timer-render-container" style={{ display: "flex", gap: "8px" }}>
                {formatTimeBox(sectionTimeLeft !== null ? sectionTimeLeft : globalTimeLeft)}
              </div>
            </div>
          </div>
          
        </div>

        {/* ─── 3. VIEWPORT GRID ─── */}
        <div className="quiz-main-grid">
        
        {/* LEFT: QUESTION & OPTIONS */}
        <div className="quiz-question-card">
            
            <div>
            {/* Question Number Bar */}
            <div className="quiz-question-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
              <span className="quiz-question-pill" style={{ backgroundColor: "var(--bg-page)", color: "var(--text-secondary)", border: "1px solid var(--border-color)", fontWeight: "700", fontSize: "13px", padding: "8px 16px", borderRadius: "20px" }}>
                Question {currentQuestionIndex + 1} of {currentQuestions.length}
              </span>
              {enablePerQuestionTimer ? (
                <div 
                  style={{ position: "relative", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  onClick={() => setShowTimerTooltip(!showTimerTooltip)}
                >
                  <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border-color)" strokeWidth="4" />
                    <circle 
                      cx="20" cy="20" r="16" fill="none" stroke={questionTimeLeft <= 5 ? "#EF4444" : "#10B981"} 
                      strokeWidth="4" 
                      strokeDasharray="100.53" 
                      strokeDashoffset={100.53 - (questionTimeLeft / (timePerQuestion || 30)) * 100.53}
                      style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
                    />
                  </svg>
                  <span style={{ position: "absolute", fontSize: "13px", fontWeight: "700", color: questionTimeLeft <= 5 ? "#EF4444" : "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {questionTimeLeft}
                  </span>
                  
                  {/* Tooltip Popup */}
                  {showTimerTooltip && (
                    <div style={{
                      position: "absolute", top: "50px", right: "0", width: "240px",
                      backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)",
                      padding: "14px", borderRadius: "10px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                      zIndex: 1000, textAlign: "left"
                    }}>
                      <div style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.5", fontWeight: "500" }}>
                        You have <strong style={{ color: "#EF4444" }}>{timePerQuestion} seconds</strong> for this question. After the timer runs out, you cannot attempt it!
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="quiz-mobile-bookmark-btn" 
                  onClick={toggleReview}
                  style={{ cursor: "pointer", color: (reviewQuestions[currentSection?._id] || []).includes(currentQuestionIndex) ? "#F4C842" : "var(--text-muted)" }}
                >
                  <Bookmark size={24} fill={(reviewQuestions[currentSection?._id] || []).includes(currentQuestionIndex) ? "#F4C842" : "none"} />
                </div>
              )}
            </div>

            {/* English Question */}
            {(current?.english || current?.questionEnglish) && (
              <div style={{ marginBottom: current?.hindi ? "20px" : "30px", textAlign: "left" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "700", lineHeight: "1.5", margin: 0, color: "var(--text-primary)", textAlign: "left" }}>
                  <MathRenderer text={current?.english || current?.questionEnglish} />
                </h2>
              </div>
            )}

            {/* Hindi Question */}
            {(current?.hindi || current?.questionHindi) && (
              <div style={{ marginBottom: "30px", textAlign: "left" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "600", lineHeight: "1.5", color: "var(--text-secondary)", margin: 0, textAlign: "left" }}>
                  <MathRenderer text={current?.hindi || current?.questionHindi} />
                </h2>
              </div>
            )}

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "40px" }}>
              {(current?.options || []).map((option) => {
                const isSelected = userAnswers[currentSection?._id]?.[currentQuestionIndex] === option;
                return (
                  <div 
                    key={option}
                    onClick={() => handleOptionSelect(option)}
                    className={`option-card ${isSelected ? "selected-opt-card" : ""}`}
                    style={{ 
                      border: isSelected ? "2.5px solid var(--violet)" : "1.5px solid var(--border-color)", 
                      backgroundColor: isSelected ? "var(--option-hover)" : "var(--bg-card)", 
                      borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer",
                      fontWeight: "600", fontSize: "15px", transition: "all 0.15s ease",
                      color: "var(--text-primary)"
                    }}
                  >
                    <div style={{ 
                      width: "20px", height: "20px", borderRadius: "50%", 
                      border: isSelected ? "6px solid var(--violet)" : "2.5px solid var(--text-muted)", backgroundColor: "var(--bg-card)" 
                    }} />
                    <span><MathRenderer text={option} /></span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="quiz-action-bar">
            <div className="quiz-action-left">
              <button className="quiz-btn-review" onClick={toggleReview} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#F4C842", color: "#FFFFFF", border: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: "700", fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease" }}>
                <Bookmark size={18} /> Mark Review
              </button>
              <button className="quiz-btn-clear" onClick={clearResponse} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#C51414", color: "#FFFFFF", border: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: "700", fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease" }}>
                <Trash2 size={18} /> Clear Response
              </button>
            </div>

            <div className="quiz-action-right">
              <button 
                className="quiz-btn-previous"
                onClick={() => navigateToQuestion(Math.max(currentQuestionIndex - 1, 0))} 
                disabled={currentQuestionIndex === 0 || lockPreviousQuestions}
                style={{ 
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  background: "#F1EFFA",
                  color: "#2D1B69", 
                  border: "1.5px solid #D8D3F0", 
                  borderRadius: "10px", 
                  padding: "12px 24px", 
                  fontWeight: "700", 
                  fontSize: "13px", 
                  cursor: (currentQuestionIndex === 0 || lockPreviousQuestions) ? "not-allowed" : "pointer",
                  opacity: (currentQuestionIndex === 0 || lockPreviousQuestions) ? 0.5 : 1,
                  transition: "all 0.15s ease"
                }}
              >
                <ArrowLeft size={18} /> Previous
              </button>
              {currentQuestionIndex < currentQuestions.length - 1 ? (
                <button 
                  className="quiz-btn-next"
                  onClick={() => navigateToQuestion(currentQuestionIndex + 1)} 
                  style={{ 
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    background: "#3730A3",
                    color: "#FFFFFF", 
                    border: "none", 
                    borderRadius: "10px", 
                    padding: "12px 32px", 
                    fontWeight: "700", 
                    fontSize: "13px", 
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  Next <ArrowRight size={18} />
                </button>
              ) : (
                <button 
                  className="quiz-btn-submit"
                  onClick={() => {
                     if (currentSectionIndex < sections.length - 1) {
                        handleNextSection();
                     } else {
                        submitQuiz();
                     }
                  }} 
                  disabled={isPreview}
                  title={isPreview ? "Submitting disabled in Preview Mode" : ""}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", background: isPreview ? "#6b7280" : "#16A34A", color: "#FFFFFF", border: "none", borderRadius: "10px", padding: "12px 28px", fontWeight: "700", fontSize: "13px", cursor: isPreview ? "not-allowed" : "pointer", transition: "all 0.15s ease" }}
                >
                  {isPreview ? "Preview Mode" : (currentSectionIndex < sections.length - 1 ? "Submit Section & Proceed" : "Submit Test")}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: LIVE TELEMETRY */}
        <div className="quiz-right-panel">
          
          {/* 1. Desktop Timer Block */}
          <div className="quiz-timers-wrapper desktop-timer-only" style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px", width: "100%" }}>
            <div className="quiz-horizontal-timer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", backgroundColor: "#111115", border: "1.5px solid var(--border-color)", padding: "14px 24px", borderRadius: "12px", boxShadow: "var(--card-shadow)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Clock size={18} color="var(--text-secondary)" />
                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Timer
                </span>
              </div>
              <div className="timer-render-container" style={{ display: "flex", gap: "8px" }}>
                {formatTimeBox(sectionTimeLeft !== null ? sectionTimeLeft : globalTimeLeft)}
              </div>
            </div>
          </div>

          {/* 2. Candidate Info */}
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "16px", border: "1.5px solid var(--border-color)", padding: "20px", boxShadow: "var(--card-shadow)" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "16px", display: "block" }}>
              👤 Aspirant Identity
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "46px", height: "46px", borderRadius: "50%", backgroundColor: "rgba(110, 63, 243, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold", color: "var(--violet)" }}>
                {candidateName.charAt(0)}
              </div>
              <div style={{ overflow: "hidden" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 2px 0", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{candidateName}</h3>
                <span style={{ fontSize: "12px", color: "var(--violet)", fontWeight: "600", display: "block", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {examSubject}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Real-Time Palette Grid */}
          {showPaletteMobile && <div className="palette-overlay" onClick={() => setShowPaletteMobile(false)}></div>}
          <div className={`question-palette ${!showPaletteMobile ? "mobile-hidden" : ""}`} style={{ backgroundColor: "var(--bg-card)", borderRadius: "16px", border: "1.5px solid var(--border-color)", padding: "20px", boxShadow: "var(--card-shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                🎨 Navigation Palette
              </span>
              <button 
                className="mobile-palette-close" 
                onClick={() => setShowPaletteMobile(false)}
                style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Legend inside Palette */}
            <div className="quiz-timer-legend" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1.5px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981" }} /> Answered</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#C51414" }} /> Not Answered</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--border-color)" }} /> Not Visited</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#F4C842" }} /> Review</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", paddingRight: "12px" }}>
              {currentQuestions.slice(palettePage * itemsPerPage, palettePage * itemsPerPage + itemsPerPage).map((_, i) => {
                const idx = palettePage * itemsPerPage + i;
                const status = getPaletteStatus(idx);
                const isCurrent = currentQuestionIndex === idx;

                let bg = "var(--bg-card)";
                let col = "var(--text-secondary)";
                let bdr = "1.5px solid var(--border-color)";

                if (status === "answered") { bg = "#10B981"; col = "#FFF"; bdr = "none"; }
                else if (status === "review") { bg = "#F4C842"; col = "#FFF"; bdr = "none"; }
                else if (status === "visited") { bg = "#C51414"; col = "#FFF"; bdr = "none"; }

                const isLocked = lockPreviousQuestions && idx < currentQuestionIndex;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!isLocked) navigateToQuestion(idx);
                    }}
                    disabled={isLocked}
                    style={{
                      height: "36px", borderRadius: "8px", backgroundColor: bg, color: col, 
                      border: isCurrent ? "2px solid var(--text-primary)" : bdr,
                      fontWeight: "700", fontSize: "13px", 
                      cursor: isLocked ? "not-allowed" : "pointer",
                      opacity: isLocked ? 0.5 : 1,
                      boxShadow: isCurrent ? "0 0 0 2px rgba(110, 63, 243, 0.2)" : "none"
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            {(() => {
              const totalPages = Math.ceil(currentQuestions.length / itemsPerPage);
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
                  {/* Prev Button */}
                  <button 
                    onClick={() => setPalettePage(Math.max(0, palettePage - 1))}
                    disabled={palettePage === 0}
                    style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", cursor: palettePage === 0 ? "not-allowed" : "pointer", opacity: palettePage === 0 ? 0.5 : 1, fontWeight: "bold", color: "var(--text-secondary)", transition: "all 0.2s" }}
                  >
                    {"<"}
                  </button>

                  {/* Page Numbers */}
                  {visiblePages.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPalettePage(p)}
                      style={{
                        width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
                        backgroundColor: palettePage === p ? "#3B82F6" : "var(--bg-card)",
                        border: palettePage === p ? "none" : "1.5px solid var(--border-color)",
                        color: palettePage === p ? "#fff" : "var(--text-primary)",
                        fontWeight: "700",
                        fontSize: "13px",
                        boxShadow: palettePage === p ? "0 4px 10px rgba(59, 130, 246, 0.3)" : "none"
                      }}
                    >
                      {p + 1}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button 
                    onClick={() => setPalettePage(Math.min(totalPages - 1, palettePage + 1))}
                    disabled={palettePage === totalPages - 1}
                    style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", cursor: palettePage === totalPages - 1 ? "not-allowed" : "pointer", opacity: palettePage === totalPages - 1 ? 0.5 : 1, fontWeight: "bold", color: "var(--text-secondary)", transition: "all 0.2s" }}
                  >
                    {">"}
                  </button>
                </div>
              );
            })()}
          </div>

        </div>

      </div>

      {/* ─── MOBILE STICKY FOOTER ─── */}
      <div className="mobile-quiz-footer">
        <div className="mobile-progress-bar-container">
          <div 
            className="mobile-progress-fill" 
            style={{ width: `${((currentQuestionIndex) / currentQuestions.length) * 100}%` }}
          ></div>
        </div>
        
        <button 
          className="mobile-fab-palette"
          onClick={() => setShowPaletteMobile(!showPaletteMobile)}
        >
          <div className="fab-icon-container">
            <LayoutGrid size={24} />
          </div>
          <span className="fab-label">Question Palette</span>
        </button>
      </div>

    </div>
    
    {/* ── INSTRUCTIONS MODAL ── */}
    {showInstructionsModal && (
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)", width: "600px", maxWidth: "90%", borderRadius: "16px", padding: "32px", position: "relative", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", border: "1.5px solid var(--border-color)" }}>
          <button 
            onClick={() => setShowInstructionsModal(false)}
            style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={24} />
          </button>
          <h2 style={{ margin: "0 0 24px 0", fontSize: "22px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>Test Instructions</h2>
          
          <div style={{ maxHeight: "60vh", overflowY: "auto", fontSize: "14px", lineHeight: "1.6" }}>
            <p><strong>1. General Guidelines:</strong></p>
            <ul style={{ paddingLeft: "20px", marginBottom: "16px" }}>
              <li>Ensure you have a stable internet connection.</li>
              <li>Do not refresh the page or press the back button during the test.</li>
              <li>The test will automatically submit when the timer runs out.</li>
            </ul>
            
            <p><strong>2. Navigation:</strong></p>
            <ul style={{ paddingLeft: "20px", marginBottom: "16px" }}>
              <li>Use the <strong>Next</strong> and <strong>Previous</strong> buttons to move between questions.</li>
              <li>Use the <strong>Question Palette</strong> on the right to jump to specific questions.</li>
            </ul>
            
            <p><strong>3. Marking System:</strong></p>
            <ul style={{ paddingLeft: "20px", marginBottom: "16px" }}>
              <li><span style={{ color: "#16A34A", fontWeight: "bold" }}>Answered:</span> Questions you have saved an answer for.</li>
              <li><span style={{ color: "#DC2626", fontWeight: "bold" }}>Not Answered:</span> Questions you visited but didn't answer.</li>
              <li><span style={{ color: "#F59E0B", fontWeight: "bold" }}>Review:</span> Questions you marked to look at again later.</li>
              <li><span style={{ color: "var(--text-muted)", fontWeight: "bold" }}>Not Visited:</span> Questions you haven't seen yet.</li>
            </ul>
            
            <p><strong>4. Anti-Cheat:</strong></p>
            <ul style={{ paddingLeft: "20px", marginBottom: "0" }}>
              <li>Exiting full-screen mode will trigger a warning.</li>
              <li>Multiple violations may lead to automatic submission of your test.</li>
            </ul>
          </div>
          
          <div style={{ marginTop: "24px", textAlign: "right" }}>
            <button 
              onClick={() => setShowInstructionsModal(false)}
              style={{ background: "#6E3FF3", color: "white", padding: "10px 24px", borderRadius: "8px", fontWeight: "600", border: "none", cursor: "pointer" }}
            >
              Understood, Resume Test
            </button>
          </div>
        </div>
      </div>
    )}

  </div>
)
}
export default QuizMulti;
