import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import { usePreview } from "../context/PreviewContext";
import { Sun, Moon, Clock, Bookmark, ArrowLeft, ArrowRight, LayoutGrid, CheckCircle, Trash2 } from "lucide-react";
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

  useEffect(() => {
    if (location.state?.subject) {
      localStorage.setItem("lastExamTaken", location.state.subject);
    }
    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes/${quizId}`);
      const data = response.data;
      setExamName(data.examName || data.subject);
      setQuizTitle(data.title);
      setExamSubject(data.subject);
      
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
      const normalizedSections = loadedSections.map(sec => {
         let qs = sec.questions || [];
         if (sec.type === 'coding' && sec.subsections) {
            qs = [
              ...(sec.subsections.easy || []).map(q => ({...q, difficulty: 'easy'})),
              ...(sec.subsections.medium || []).map(q => ({...q, difficulty: 'medium'})),
              ...(sec.subsections.hard || []).map(q => ({...q, difficulty: 'hard'})),
            ];
         }
         
         // Setup defaults in tracking state
         setUserAnswers(prev => ({ ...prev, [sec._id]: {} }));
         setReviewQuestions(prev => ({ ...prev, [sec._id]: [] }));
         setVisitedQuestions(prev => ({ ...prev, [sec._id]: [0] }));
         setSectionTimeSpent(prev => ({ ...prev, [sec._id]: 0 }));
         
         return { ...sec, flatQuestions: qs };
      });

      setSections(normalizedSections);
      
      if (normalizedSections.length > 0) {
         setCurrentQuestions(normalizedSections[0].flatQuestions);
         if (normalizedSections[0].duration > 0) {
            setSectionTimeLeft(normalizedSections[0].duration);
         } else {
            setSectionTimeLeft(null);
         }
      }
      
      if (data.duration) {
         setGlobalTimeLeft(data.duration * 60);
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

  // Timers
  useEffect(() => {
    if (pageLoading) return;
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

      // Track time spent per section
      if (sections.length > 0) {
         setSectionTimeSpent(prev => {
            const secId = sections[currentSectionIndex]._id;
            return { ...prev, [secId]: (prev[secId] || 0) + 1 };
         });
      }

    }, 1000);
    return () => clearInterval(timer);
  }, [pageLoading, currentSectionIndex, sectionTimeLeft, sections]);

  const handleNextSection = () => {
     if (currentSectionIndex < sections.length - 1) {
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
     } else {
        submitQuiz();
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
    if (!force && !window.confirm("Are you sure you want to submit the assessment? You won't be able to change answers later.")) {
      return;
    }
    
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

      const payload = {
        userId: storedUser.id,
        quizId,
        quizTitle,
        subject: examSubject,
        examName,
        score: finalScore,
        total: totalQuestions,
        correct: totalCorrect,
        incorrect: totalIncorrect,
        percentage: accuratePercentage,
        timeTaken: totalTimeSpent,
        sectionResults,
        difficultyBreakdown
      };

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/results/save`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      navigate(`/student/result/${res.data.result.shareId}`);
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

  return (
    <div className="quiz-fullscreen-wrapper">
      {showWarning && (
        <div className="anti-cheat-overlay">
          <div className="anti-cheat-modal">
            <h2 style={{ color: "#ef4444", marginBottom: "12px" }}>Security Alert</h2>
            <p>{warningMsg}</p>
            <button className="quiz-btn-primary" onClick={() => setShowWarning(false)}>Acknowledge & Continue</button>
          </div>
        </div>
      )}

      {/* 🟢 TOP NAVBAR */}
      <header className="quiz-header">
        <div className="quiz-header-left">
          <Logo size="small" />
          <div className="exam-titles hidden-mobile">
            <h2>{examName}</h2>
            <p>{quizTitle}</p>
          </div>
        </div>
        
        {/* Central Section Indicators */}
        <div className="quiz-section-tabs" style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
          {sections.map((sec, idx) => (
             <div key={idx} style={{ padding: "8px 16px", borderRadius: "8px", background: idx === currentSectionIndex ? "var(--primary-color)" : "var(--bg-input)", color: idx === currentSectionIndex ? "#fff" : "var(--text-muted)", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", opacity: idx < currentSectionIndex ? 0.5 : 1 }}>
                <span className="section-tab-title">{sec.title}</span>
                {idx === currentSectionIndex && sectionTimeLeft !== null && (
                   <span className="section-tab-timer" style={{ background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: "4px" }}>{formatTime(sectionTimeLeft)}</span>
                )}
             </div>
          ))}
        </div>

        <div className="quiz-header-right">
          <ThemeToggle />
          <div className="candidate-profile hidden-mobile">
            <div className="candidate-avatar">{candidateName.charAt(0)}</div>
            <span>{candidateName}</span>
          </div>
          <div className="global-timer-box" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
             <Clock size={16} /> Global: {formatTime(globalTimeLeft)}
          </div>
        </div>
      </header>

      {/* 🟢 MAIN CONTENT */}
      <div className="quiz-main-layout">
        <div className="quiz-left-panel">
          
          {/* Section Info Bar */}
          <div className="quiz-question-header" style={{ display: "flex", justifyContent: "space-between" }}>
             <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
               <h3 style={{ margin: 0, color: "var(--primary-color)" }}>Question {currentQuestionIndex + 1}</h3>
               {currentSection.type === 'coding' && activeQ?.difficulty && (
                  <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", background: "rgba(108, 93, 211, 0.1)", color: "var(--primary-color)", fontWeight: "bold", textTransform: "capitalize" }}>
                     {activeQ.difficulty}
                  </span>
               )}
             </div>
             
             <div style={{ display: "flex", gap: "12px", fontSize: "14px" }}>
                <span style={{ color: "#4ade80", fontWeight: "600" }}>+{currentSection.marksPerQuestion || 1} Marks</span>
                <span style={{ color: "#f87171", fontWeight: "600" }}>-{currentSection.negativeMarking || 0} Negative</span>
             </div>
          </div>

          <div className="quiz-question-body">
            <div className="question-text-english">{activeQ?.questionEnglish}</div>
            {activeQ?.questionHindi && <div className="question-text-hindi">{activeQ.questionHindi}</div>}
            
            <div className="options-container">
              {activeQ?.options.map((opt, i) => (
                <div 
                  key={i} 
                  className={`option-row ${userAnswers[currentSection._id]?.[currentQuestionIndex] === opt ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(opt)}
                >
                  <div className="option-circle">{String.fromCharCode(65 + i)}</div>
                  <div className="option-text">{opt}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="quiz-action-footer">
            <div className="footer-left-actions">
              <button className="quiz-btn-secondary" onClick={toggleReview}>
                <Bookmark size={16} /> 
                {reviewQuestions[currentSection._id]?.includes(currentQuestionIndex) ? "Unmark Review" : "Mark for Review"}
              </button>
              <button className="quiz-btn-danger" onClick={clearResponse}>
                <Trash2 size={16} /> Clear Response
              </button>
            </div>
            
            <div className="footer-right-actions">
              {currentQuestionIndex > 0 && (
                 <button className="quiz-btn-nav" onClick={() => navigateToQuestion(currentQuestionIndex - 1)}>
                   <ArrowLeft size={16} /> Previous
                 </button>
              )}
              {currentQuestionIndex < currentQuestions.length - 1 ? (
                 <button className="quiz-btn-nav primary-nav" onClick={() => navigateToQuestion(currentQuestionIndex + 1)}>
                   Save & Next <ArrowRight size={16} />
                 </button>
              ) : (
                 <button className="quiz-btn-nav primary-nav" onClick={handleNextSection}>
                   {currentSectionIndex < sections.length - 1 ? "Submit Section & Proceed" : "Submit Assessment"}
                 </button>
              )}
            </div>
          </div>
        </div>

        {/* 🟢 RIGHT PALETTE */}
        <div className={`quiz-right-panel ${showPaletteMobile ? 'mobile-visible' : ''}`}>
          <div className="palette-header">
            <h4>Question Palette</h4>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{currentSection.title}</span>
          </div>
          
          <div className="palette-grid">
            {currentQuestions.map((_, i) => (
              <button
                key={i}
                className={`palette-btn ${getQuestionStatus(i)} ${currentQuestionIndex === i ? 'active' : ''}`}
                onClick={() => navigateToQuestion(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          
          <div className="palette-legend">
            <div className="legend-item"><span className="legend-box status-answered"></span> Answered</div>
            <div className="legend-item"><span className="legend-box status-marked"></span> Marked</div>
            <div className="legend-item"><span className="legend-box status-unvisited"></span> Not Visited</div>
            <div className="legend-item"><span className="legend-box status-visited"></span> Not Answered</div>
          </div>

          <button className="submit-exam-btn" onClick={() => submitQuiz()}>
            <CheckCircle size={20} /> Submit Assessment
          </button>
        </div>
      </div>
      
      <button className="mobile-palette-toggle" onClick={() => setShowPaletteMobile(!showPaletteMobile)}>
        <LayoutGrid size={24} />
      </button>

    </div>
  );
}

export default QuizMulti;
