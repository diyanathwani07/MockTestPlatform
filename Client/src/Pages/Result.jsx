import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import QuizHeader from "../components/QuizHeader";
import "../css/Result.css";
import axios from "axios";
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, BarChart3, Target, Award, ListChecks, Trophy, FileText, CalendarDays, HelpCircle, Medal, Timer, TrendingUp, LayoutGrid } from "lucide-react";
import MathRenderer from "../components/MathRenderer";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";

function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { shareId: routeShareId } = useParams();
  const { isDark } = useTheme();

  // data is sent via navigate("/result", { state: data }) from Quiz.jsx
  const [data, setData] = useState(() => {
    let initialData = location.state;
    if (!initialData && !routeShareId) {
      const stored = localStorage.getItem("lastQuizResult");
      if (stored && stored !== "undefined") {
        try {
          initialData = JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse cached result data", e);
        }
      }
    }
    return initialData;
  });

  let user = { name: "User" };
  try {
    const userString = localStorage.getItem("user");
    if (userString && userString !== "undefined") {
      user = JSON.parse(userString);
    }
  } catch (e) {
    console.error("Failed to parse user from localStorage", e);
  }
  const [loadingLatest, setLoadingLatest] = useState(!data || (routeShareId && data.shareId !== routeShareId));

  useEffect(() => {
    if (data) {
      localStorage.setItem("lastQuizResult", JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    const needsFetch = !data || (routeShareId && data.shareId !== routeShareId);

    if (needsFetch) {
      setLoadingLatest(true);
      const fetchResultData = async () => {
        try {
          let res;
          if (routeShareId) {
            res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/by-share/${routeShareId}`);
            setData(res.data);
          } else if (user?.id || user?._id) {
            res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id || user._id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            if (res.data && res.data.length > 0) {
              setData(res.data[0]);
            }
          }
        } catch (err) {
          console.error("Failed to fetch result data", err);
        } finally {
          setLoadingLatest(false);
        }
      };
      fetchResultData();
    } else {
      setLoadingLatest(false);
    }
  }, [routeShareId, user?.id]);

  const score = data?.score ?? 0;
  const total = data?.total ?? 0;
  const correct = data?.correct ?? 0;
  const incorrect = data?.incorrect ?? 0;
  const unanswered = data?.unanswered ?? 0;
  const percentage = data?.percentage;
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  // Read subject from navigation state (set by Quiz.jsx), then localStorage, then fallback
  const examTitle = data?.subject || data?.title || localStorage.getItem("lastExamTaken") || "Examination";

  const [visibleCount, setVisibleCount] = useState(10);
  const [shareId, setShareId] = useState(data?.shareId || null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [reviewFilter, setReviewFilter] = useState("all"); // "all", "correct", "incorrect", "unattempted"
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > document.documentElement.scrollHeight / 3) {
        setIsScrolledDown(true);
      } else {
        setIsScrolledDown(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const computedPercentage =
    percentage !== undefined && percentage !== null
      ? Number(percentage).toFixed(2)
      : total
      ? ((score / total) * 100).toFixed(2)
      : "0.00";

  const passThreshold = data?.passPercentage ?? 50;

  const timeTakenSecs = data?.timeTaken || 0;

  useEffect(() => {
    if (data) {
      if (data.questions && data.questions.length > 0) {
        const mappedQs = data.questions.map(q => {
          let correctText = q.correctAnswer || "";
          if (q.correctAnswerObfuscated) {
            try {
              correctText = atob(q.correctAnswerObfuscated);
            } catch (e) {
              console.error("Failed to decode obfuscated correct answer:", e);
            }
          }
          if (["A", "B", "C", "D", "E", "F"].includes(correctText) && Array.isArray(q.options)) {
            const idxMap = { "A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5 };
            correctText = q.options[idxMap[correctText]] || correctText;
          } else if (typeof correctText === "string" && correctText.startsWith("Option ") && Array.isArray(q.options)) {
            const optNum = parseInt(correctText.replace("Option ", ""), 10);
            if (!isNaN(optNum) && optNum >= 1 && optNum <= q.options.length) {
              correctText = q.options[optNum - 1] || correctText;
            }
          }
          return { ...q, correctAnswer: correctText };
        });
        setQuestions(mappedQs);
        setUserAnswers(data.userAnswers || []);
      } else if (data.quizId) {
        const fetchQuizQuestions = async () => {
          try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes/${data.quizId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const quizData = res.data;
            let loadedSections = quizData.sections || [];
            if (loadedSections.length === 0 && quizData.questions && quizData.questions.length > 0) {
               loadedSections = [{
                  questions: quizData.questions
               }];
            }
            const normalizedSections = loadedSections.map(sec => {
               let qs = sec.questions || [];
               if (sec.type === 'coding' && sec.subsections) {
                  qs = [
                    ...(sec.subsections.easy || []),
                    ...(sec.subsections.medium || []),
                    ...(sec.subsections.hard || []),
                  ];
               }
               return { ...sec, flatQuestions: qs };
            });
            const flatQs = normalizedSections.flatMap(sec => sec.flatQuestions);
            const mappedQs = flatQs.map(q => {
              let correctText = q.correctAnswer || "";
              if (q.correctAnswerObfuscated) {
                try {
                  correctText = atob(q.correctAnswerObfuscated);
                } catch (e) {
                  console.error("Failed to decode obfuscated correct answer:", e);
                }
              }
              if (["A", "B", "C", "D", "E", "F"].includes(correctText) && Array.isArray(q.options)) {
                const idxMap = { "A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5 };
                correctText = q.options[idxMap[correctText]] || correctText;
              } else if (typeof correctText === "string" && correctText.startsWith("Option ") && Array.isArray(q.options)) {
                const optNum = parseInt(correctText.replace("Option ", ""), 10);
                if (!isNaN(optNum) && optNum >= 1 && optNum <= q.options.length) {
                  correctText = q.options[optNum - 1] || correctText;
                }
              }
              return { ...q, correctAnswer: correctText };
            });
            setQuestions(mappedQs);
            setUserAnswers(data.userAnswers || []);
          } catch (err) {
            console.error("Failed to fetch fallback quiz questions", err);
          }
        };
        fetchQuizQuestions();
      }
    }
  }, [data]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 300) {
        setVisibleCount((prevCount) => Math.min(prevCount + 10, questions.length));
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [questions.length]);

  // Save result to MongoDB whenever this page loads with valid data
  useEffect(() => {
    if (!data) return; // nothing to save if user landed here without quiz data

    console.log("Result Page Loaded");

    if (data?.isPreview) {
      console.log("PREVIEW MODE: Skipping result save.");
      return;
    }

    const saveResult = async () => {
      try {
        console.log("Saving Result...");

        const userString = localStorage.getItem("user");
        console.log("user from localStorage:", userString);

        if (data?.shareId) {
          console.log("Result already saved by server with shareId:", data.shareId);
          setShareId(data.shareId);
          return;
        }

        const user = userString ? JSON.parse(userString) : null;

        const userId = user?.id || user?._id;
        if (!userId) {
          console.log("SAVE SKIPPED: no logged-in user found in localStorage");
          return;
        }

        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/results/save`,
          {
            userId,
            quizId: data?.quizId || null,
            quizTitle: data?.title || null,
            subject: data?.subject || null,
            score,
            total,
            correct,
            incorrect,
            percentage: Number(computedPercentage),
            passPercentage: data?.passPercentage ?? 50,
            timeTaken: timeTakenSecs,
            questions: data?.questions || [],
            userAnswers: data?.userAnswers || [],
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          }
        );

        console.log("Result Saved");
        console.log(res.data);
        if (res.data && res.data.result && res.data.result.shareId) {
          setShareId(res.data.result.shareId);
          // Update local data cache so on refresh we still have shareId
          const newData = { ...data, shareId: res.data.result.shareId };
          setData(newData);
          localStorage.setItem("lastQuizResult", JSON.stringify(newData));
        }
      } catch (error) {
        console.log("SAVE ERROR");
        console.log(error);
      }
    };

    saveResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadingLatest) {
    return (
      <div className="result-page">
        <QuizHeader title={examTitle} showInstructions={false} />
        <div className="result-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="sd-spinner"></div>
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Fetching your latest result...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="result-page">
        <QuizHeader title={examTitle} showInstructions={false} />
        <div className="result-empty">
          <h2>No result data found.</h2>
          <p>Please attempt the test first.</p>
          <button className="back-btn" onClick={() => navigate("/")}>
            Go to Test
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    if (!seconds) return "0m 0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });



  if (data && data.showResultAfterSubmission === false) {
    const submittedOn = data.createdAt ? new Date(data.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date(data.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    
    const showPassFail = data.showPassFailStatus === true;
    const isPassed = data.passed === true;

    return (
      <div style={{
        backgroundColor: "var(--bg-page)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", padding: "20px", boxSizing: "border-box"
      }}>
        {/* Floating Theme Toggle on Top Right */}
        <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
          <ThemeToggle />
        </div>
        <div style={{
          background: "var(--bg-card)", border: "1.5px solid var(--border-color)",
          borderRadius: "24px", padding: "40px",
          textAlign: "center", maxWidth: "640px", width: "100%",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)", boxSizing: "border-box"
        }}>
          
          {/* Circular green check icon with confetti style */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px", position: "relative" }}>
            {/* Confetti pieces */}
            <div className="confetti-piece" style={{ position: "absolute", top: "10px", left: "calc(50% - 70px)", width: "8px", height: "8px", background: "#8b5cf6", borderRadius: "2px", transform: "rotate(45deg)", animationDelay: "0s" }} />
            <div className="confetti-piece" style={{ position: "absolute", top: "40px", left: "calc(50% - 85px)", width: "6px", height: "12px", background: "#10b981", borderRadius: "1px", transform: "rotate(-15deg)", animationDelay: "0.4s" }} />
            <div className="confetti-piece" style={{ position: "absolute", top: "70px", left: "calc(50% - 65px)", width: "8px", height: "8px", background: "#3b82f6", borderRadius: "50%", animationDelay: "0.8s" }} />
            
            <div className="confetti-piece" style={{ position: "absolute", top: "15px", right: "calc(50% - 70px)", width: "8px", height: "8px", background: "#3b82f6", borderRadius: "2px", transform: "rotate(15deg)", animationDelay: "0.2s" }} />
            <div className="confetti-piece" style={{ position: "absolute", top: "45px", right: "calc(50% - 85px)", width: "6px", height: "12px", background: "#8b5cf6", borderRadius: "1px", transform: "rotate(30deg)", animationDelay: "0.6s" }} />
            <div className="confetti-piece" style={{ position: "absolute", top: "68px", right: "calc(50% - 65px)", width: "8px", height: "8px", background: "#10b981", borderRadius: "50%", animationDelay: "1s" }} />

            <div style={{ position: "absolute", width: "160px", height: "160px", pointerEvents: "none", opacity: 0.8, background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)", top: "-30px" }} />
            
            {showPassFail ? (
              <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: isPassed ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", border: isPassed ? "2px solid rgba(16, 185, 129, 0.2)" : "2px solid rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: isPassed ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isPassed ? "0 6px 20px rgba(16, 185, 129, 0.4)" : "0 6px 20px rgba(239, 68, 68, 0.4)" }}>
                  {isPassed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", border: "2px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(16, 185, 129, 0.4)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </div>
            )}
          </div>

          {showPassFail ? (
            <>
              <h2 style={{ color: "var(--text-primary)", margin: "0 0 12px", fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" }}>
                {isPassed ? (
                  <>You have successfully <span style={{ color: "#10B981" }}>passed the exam!</span></>
                ) : (
                  <>You did not <span style={{ color: "#EF4444" }}>pass the exam.</span></>
                )}
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "16px", fontWeight: "500", margin: "0 0 28px" }}>
                {isPassed ? "Well done! Your hard work has paid off." : "Keep practicing! You can do better next time."}
              </p>
            </>
          ) : (
            <>
              <h2 style={{ color: "var(--text-primary)", margin: "0 0 12px", fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" }}>
                Test Submitted <span style={{ color: "#10B981" }}>Successfully!</span>
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "16px", fontWeight: "500", margin: "0 0 28px" }}>
                Your responses have been recorded.
              </p>
            </>
          )}

          {showPassFail ? (
            /* Congratulations Card */
            <div style={{
              background: isPassed ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
              border: isPassed ? "1.5px solid rgba(16, 185, 129, 0.2)" : "1.5px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              textAlign: "left",
              marginBottom: "32px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: isPassed ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  {isPassed ? <Medal size={22} color="#10b981" /> : <AlertCircle size={22} color="#ef4444" />}
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {isPassed ? "Congratulations!" : "Result Status"}
                  </h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                    {isPassed ? "You have successfully passed the exam." : "You did not meet the passing criteria."}
                  </p>
                </div>
              </div>
              <span style={{
                background: isPassed ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: isPassed ? "#10B981" : "#EF4444",
                fontWeight: "700",
                fontSize: "12px",
                padding: "6px 12px",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                textTransform: "uppercase"
              }}>
                {isPassed ? "★ Passed" : "⚠ Failed"}
              </span>
            </div>
          ) : (
            /* Dotted border card for hidden result */
            <div style={{
              background: "rgba(139, 92, 246, 0.03)",
              border: "1.5px dashed rgba(139, 92, 246, 0.3)",
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              textAlign: "left",
              marginBottom: "32px"
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Clock size={22} color="#8b5cf6" />
              </div>
              <div>
                <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>Result will be available later</h4>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>The result for this exam will be processed and updated shortly. Please check back later.</p>
              </div>
            </div>
          )}

          {/* Style block for responsive grid */}
          <style>{`
            .submitted-details-row {
              border-top: 1.5px solid var(--border-color);
              padding-top: 28px;
              margin-bottom: 32px;
              display: grid;
              grid-template-columns: 1fr 1.3fr;
              gap: 20px;
              text-align: left;
            }
            @media (max-width: 640px) {
              .submitted-details-row {
                grid-template-columns: 1fr;
                gap: 24px;
              }
            }
            @keyframes confetti-drift {
              0% { transform: translateY(0) rotate(0deg); }
              50% { transform: translateY(-8px) translateX(3px) rotate(180deg); }
              100% { transform: translateY(0) rotate(360deg); }
            }
            .confetti-piece {
              animation: confetti-drift 4s ease-in-out infinite;
            }
          `}</style>

          {/* Grid stats section */}
          <div className="submitted-details-row">
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ color: "#8b5cf6", marginTop: "2px" }}><FileText size={20} /></div>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Exam</span>
                <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", lineHeight: "1.4" }}>{examTitle}</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ color: "#8b5cf6", marginTop: "2px" }}><CalendarDays size={20} /></div>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Submitted On</span>
                <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{submittedOn}</p>
              </div>
            </div>
          </div>

          {/* Go Back / Dashboard button */}
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "var(--violet)",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "14px 32px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              margin: "0 auto",
              boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)"
            }}
          >
            <ArrowLeft size={18} />
            Go to Dashboard
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className={`result-page-new ${showAnswers ? "show-answers" : ""}`}>
      {/* Floating Theme Toggle on Top Right */}
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
        <ThemeToggle />
      </div>
      
      {!showAnswers && (
        <div className="result-modal-overlay">
          {/* Back button to go to previous page (e.g. Attempts list) */}
          <button 
            onClick={() => {
              if (location.state?.fromAttempts) {
                navigate(-1);
              } else {
                navigate("/dashboard/results");
              }
            }}
            style={{
              position: "fixed",
              top: "20px",
              left: "20px",
              zIndex: 110,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              backgroundColor: isDark ? "#1E1B2E" : "#ffffff",
              boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
              border: "1px solid var(--border-color, #d1d5db)",
              color: isDark ? "#ffffff" : "#000000",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title="Go Back"
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>

          <div className="result-modal-card">
            
            {/* Header */}
            <div className="rm-header">
              <div className="rm-trophy" style={{ display: "flex", justifyContent: "center", marginBottom: "16px", color: "#F59E0B" }}>
                <Trophy size={64} strokeWidth={1.5} />
              </div>
              <h2>Quiz Completed!</h2>
              <p>Great job, <strong>{user.name || user.fullName}</strong>! You've completed the quiz.</p>
            </div>

            {/* Quiz Info */}
            <div className="rm-info-card">
              <div className="rm-icon-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#6E3FF3", backgroundColor: "rgba(110,63,243,0.1)", borderRadius: "12px", width: "48px", height: "48px" }}>
                <FileText size={24} />
              </div>
              <div className="rm-info-content">
                <p className="rm-info-label">Quiz Title</p>
                <h3 className="rm-info-title">{examTitle}</h3>
                <div className="rm-info-meta" style={{ flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}><CalendarDays size={14} /> {formattedDate}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}><Clock size={14} /> {data?.duration || 30} Min</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}><HelpCircle size={14} /> {total} Questions</span>
                </div>
              </div>
            </div>

            {/* Score Section */}
            <div className="rm-score-section">
              <div className="rm-score-circle-wrapper">
                <div className="rm-score-circle" style={{ background: `conic-gradient(#6E3FF3 ${computedPercentage}%, ${isDark ? "#1D1B28" : "#F3F4F6"} ${computedPercentage}%)` }}>
                  <div className="rm-score-inner">
                    <span className="rm-pct">{computedPercentage}%</span>
                    <span className="rm-pct-label">Score</span>
                  </div>
                </div>
              </div>
              
              <div className="rm-score-middle">
                <p className="rm-score-label">Your Score</p>
                <h2 className="rm-score-fraction">
                  <span className="rm-score-num">{score}</span>
                  <span className="rm-score-denom">/{total}</span>
                </h2>
                <div className={`rm-badge ${Number(computedPercentage) >= passThreshold ? "badge-pass" : "badge-fail"}`}>
                  {Number(computedPercentage) >= passThreshold ? "Passed 🎉" : "Failed 😢"}
                </div>
              </div>

              <div className="rm-score-right">
                <div className="rm-medal" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "#F59E0B" }}>
                  <Medal size={40} strokeWidth={1.5} />
                </div>
                <h4 className="rm-feedback-title">
                  {Number(computedPercentage) >= 80 ? "Excellent Work!" : Number(computedPercentage) >= passThreshold ? "Good Job!" : "Keep Trying!"}
                </h4>
                <p className="rm-feedback-text">
                  {computedPercentage === 0 
                    ? "Don't give up! Review your answers and try again." 
                    : <>You scored higher than <strong>{computedPercentage}%</strong> of users</>
                  }
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="rm-metrics-grid">
              <div 
                className="rm-metric"
                onClick={() => {
                  if (data?.showAnswerReview !== false) {
                    setReviewFilter(reviewFilter === "correct" ? "all" : "correct");
                    setShowAnswers(true);
                  }
                }}
                style={{ 
                  cursor: (data?.showAnswerReview !== false) ? "pointer" : "default", 
                  border: reviewFilter === "correct" && data?.showAnswerReview !== false ? "2.5px solid #22C55E" : "1.5px solid var(--border-color, #E2E8F0)",
                  boxShadow: reviewFilter === "correct" && data?.showAnswerReview !== false ? "0 4px 15px rgba(34, 197, 94, 0.25)" : "none",
                  transition: "all 0.2s ease"
                }}
              >
                <div className="rm-metric-icon icon-green" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Target size={24} /></div>
                <div className="rm-metric-data">
                  <h4>{correct}</h4>
                  <p>Correct Answers</p>
                </div>
              </div>
              <div 
                className="rm-metric"
                onClick={() => {
                  if (data?.showAnswerReview !== false) {
                    setReviewFilter(reviewFilter === "incorrect" ? "all" : "incorrect");
                    setShowAnswers(true);
                  }
                }}
                style={{ 
                  cursor: (data?.showAnswerReview !== false) ? "pointer" : "default", 
                  border: reviewFilter === "incorrect" && data?.showAnswerReview !== false ? "2.5px solid #EF4444" : "1.5px solid var(--border-color, #E2E8F0)",
                  boxShadow: reviewFilter === "incorrect" && data?.showAnswerReview !== false ? "0 4px 15px rgba(239, 68, 68, 0.25)" : "none",
                  transition: "all 0.2s ease"
                }}
              >
                <div className="rm-metric-icon icon-red" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><XCircle size={24} /></div>
                <div className="rm-metric-data">
                  <h4>{incorrect}</h4>
                  <p>Incorrect Answers</p>
                </div>
              </div>
              <div 
                className="rm-metric"
                onClick={() => {
                  if (data?.showAnswerReview !== false) {
                    setReviewFilter(reviewFilter === "unattempted" ? "all" : "unattempted");
                    setShowAnswers(true);
                  }
                }}
                style={{ 
                  cursor: (data?.showAnswerReview !== false) ? "pointer" : "default", 
                  border: reviewFilter === "unattempted" && data?.showAnswerReview !== false ? "2.5px solid #64748B" : "1.5px solid var(--border-color, #E2E8F0)",
                  boxShadow: reviewFilter === "unattempted" && data?.showAnswerReview !== false ? "0 4px 15px rgba(100, 116, 139, 0.25)" : "none",
                  transition: "all 0.2s ease"
                }}
              >
                <div className="rm-metric-icon icon-blue" style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(100, 116, 139, 0.15)", color: "#64748B" }}><HelpCircle size={24} /></div>
                <div className="rm-metric-data">
                  <h4>{Math.max(0, total - (correct + incorrect))}</h4>
                  <p>Unattempted Answers</p>
                </div>
              </div>
              <div className="rm-metric">
                <div className="rm-metric-icon icon-orange" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Timer size={24} /></div>
                <div className="rm-metric-data">
                  <h4>{formatTime(timeTakenSecs)}</h4>
                  <p>Time Taken</p>
                </div>
              </div>
            </div>



            {/* Action Buttons */}
            <div className="rm-actions">
              {data?.showAnswerReview !== false && (
                <button className="rm-btn-outline" onClick={() => setShowAnswers(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <FileText size={18} /> Review Answers
                </button>
              )}
              <button className="rm-btn-solid" onClick={() => navigate("/dashboard")} style={{ marginLeft: data?.showAnswerReview === false ? 0 : undefined, width: data?.showAnswerReview === false ? "100%" : undefined }}>
                Back to Dashboard →
              </button>
            </div>

            {/* Social Share */}
            <div className="rm-social-share">
              <p>Share Your Result</p>
              {shareId ? (
                <div className="rm-social-icons">
                  <button title="Share on WhatsApp" onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`I scored ${score}/${total} on the ${examTitle} test! Can you beat my score? Check it out here: ${window.location.origin}/share-result/${shareId}`)}`, '_blank')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#25D366" }}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </button>
                  <button title="Share on Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/share-result/${shareId}`)}`, '_blank')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#1877F2" }}>
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                  </button>
                  <button title="Share on Instagram" onClick={() => { navigator.clipboard.writeText(`I scored ${score}/${total} on the ${examTitle} test! Link: ${window.location.origin}/share-result/${shareId}`); alert("Result text and link copied! Open Instagram to share it."); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#E1306C" }}>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </button>
                  <button title="Copy Link" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share-result/${shareId}`); alert("Link copied to clipboard!"); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6B7280" }}>
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Generating share link...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showAnswers && (
        <div className="result-review-container">
          
          <div className="result-details" style={{ marginTop: "0" }}>
            {/* Fixed Back Button in Absolute Top Left Corner */}
            <button 
              onClick={() => setShowAnswers(false)}
              style={{
                position: "fixed",
                top: "20px",
                left: "20px",
                zIndex: 110,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                border: "1px solid #d1d5db",
                color: "#000000",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              title="Back to Summary"
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>

            {/* Sticky Title */}
            <div style={{
              position: "sticky",
              top: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 70px 20px",
              backgroundColor: isDark ? "#1D1B28" : "#EAEBF3",
              marginBottom: "24px",
              margin: "-20px -16px 24px -16px",
            }}>
              <h2 style={{ fontSize: "clamp(18px, 4vw, 26px)", margin: 0, lineHeight: "1.3", color: isDark ? "#FFFFFF" : "#000000", textAlign: "center" }}>Answer Review - {examTitle}</h2>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                {reviewFilter !== "all" && (
                  <span 
                    onClick={() => setReviewFilter("all")}
                    style={{ 
                      fontSize: "13px", 
                      backgroundColor: "rgba(110, 63, 243, 0.1)", 
                      color: "#6E3FF3", 
                      padding: "4px 12px", 
                      borderRadius: "20px", 
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    Showing {reviewFilter === "correct" ? "Correct" : reviewFilter === "incorrect" ? "Incorrect" : "Unattempted"} Answers ✕
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => {
                    const allIndices = {};
                    questions.forEach((_, idx) => { allIndices[idx] = true; });
                    setExpandedQuestions(allIndices);
                  }}
                  style={{ background: "transparent", border: "none", color: "#6E3FF3", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
                >
                  Expand All
                </button>
                <span style={{ color: "var(--text-muted, #94A3B8)" }}>|</span>
                <button 
                  onClick={() => setExpandedQuestions({})}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted, #94A3B8)", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
                >
                  Collapse All
                </button>
              </div>
            </div>

            <div className="review-list">
              {questions
                .map((q, idx) => ({ ...q, originalIndex: idx }))
                .filter((q) => {
                  const userAns = userAnswers[q.originalIndex];
                  const isUnanswered = userAns === undefined || userAns === null || userAns === "";
                  const isCorrect = q.correctAnswer ? userAns === q.correctAnswer : false;

                  if (reviewFilter === "correct") return !isUnanswered && isCorrect;
                  if (reviewFilter === "incorrect") return !isUnanswered && !isCorrect;
                  if (reviewFilter === "unattempted") return isUnanswered;
                  return true;
                })
                .slice(0, visibleCount)
                .map((q) => {
                  const index = q.originalIndex;
                  const userAns = userAnswers[index];
                  const isUnanswered = userAns === undefined || userAns === null || userAns === "";
                  const isCorrect = q.correctAnswer ? userAns === q.correctAnswer : false;

                // Color configuration based on answer status
                let statusColor = "#64748B"; // grey
                let cardBorder = "1px solid var(--border-color)";
                let cardShadow = "0 4px 12px rgba(0,0,0,0.02)";

                if (!isUnanswered) {
                  if (isCorrect) {
                    statusColor = "#22C55E"; // green
                    cardBorder = "1.5px solid #22C55E";
                    cardShadow = isDark ? "0 4px 18px rgba(34, 197, 94, 0.2)" : "0 4px 18px rgba(34, 197, 94, 0.15)";
                  } else {
                    statusColor = "#EF4444"; // red
                    cardBorder = "1.5px solid #EF4444";
                    cardShadow = isDark ? "0 4px 18px rgba(239, 68, 68, 0.2)" : "0 4px 18px rgba(239, 68, 68, 0.15)";
                  }
                }

                const isExpanded = !!expandedQuestions[index];

                return (
                  <div 
                    className="review-item" 
                    key={q.id || index}
                    style={{ 
                      borderRadius: "12px", 
                      marginBottom: "16px", 
                      border: cardBorder, 
                      boxShadow: cardShadow,
                      overflow: "hidden",
                      transition: "all 0.25s ease"
                    }}
                  >
                    {/* Collapsible Header */}
                    <div 
                      onClick={() => {
                        setExpandedQuestions(prev => ({
                          ...prev,
                          [index]: !prev[index]
                        }));
                      }}
                      style={{ 
                        padding: "16px 20px", 
                        cursor: "pointer", 
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "#FAFAFC", 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        userSelect: "none"
                      }}
                    >
                      <div className="review-question" style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: 1, textAlign: "left" }}>
                        {/* Rounded Status Badge for Q number */}
                        <span className="q-number" style={{ 
                          minWidth: "30px", 
                          height: "30px",
                          borderRadius: "8px",
                          backgroundColor: statusColor,
                          color: "#FFFFFF",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "800",
                          fontSize: "13px",
                          flexShrink: 0
                        }}>
                          {index + 1}
                        </span>
                        
                        <div style={{ flex: 1, paddingTop: "4px" }}>
                          <div style={{ fontWeight: "600", color: isDark ? "#F1F5F9" : "#1E293B", fontSize: "15px", lineHeight: "1.5" }}><MathRenderer text={q.english || q.questionEnglish} /></div>
                          {(q.hindi || q.questionHindi) && <div style={{ fontWeight: "500", color: isDark ? "#CBD5E1" : "#475569", marginTop: "4px", fontSize: "14px", lineHeight: "1.5" }}><MathRenderer text={q.hindi || q.questionHindi} /></div>}
                        </div>
                      </div>
                      
                      {/* Accordion Indicator Chevron */}
                      <span style={{ 
                        marginLeft: "16px", 
                        color: "var(--text-secondary)", 
                        fontSize: "18px", 
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", 
                        transition: "transform 0.2s ease",
                        fontWeight: "bold"
                      }}>
                        ❯
                      </span>
                    </div>

                    {/* Expandable options and explanation container */}
                    <div style={{ 
                      height: isExpanded ? "auto" : "0px",
                      overflow: "hidden",
                      transition: "all 0.25s ease-in-out",
                      borderTop: isExpanded ? "1px solid var(--border-color)" : "none",
                      backgroundColor: isDark ? "#171622" : "#ffffff",
                      padding: isExpanded ? "20px" : "0px 20px"
                    }}>
                      <div className="review-options" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        {q.options && q.options.length > 0 ? q.options.map((opt, optIdx) => {
                          const isSelected = userAns === opt;
                          const showCorrect = data?.showCorrectAnswers !== false;
                          const isCorrectOpt = showCorrect && q.correctAnswer === opt;
                          
                          let optBg = isDark ? "#2A273A" : "#ffffff";
                          let optBorder = isDark ? "1px solid #3F3C53" : "1px solid #E2E8F0";
                          let optColor = isDark ? "#F8FAFC" : "#1E293B";
                          let optWeight = "500";
                          
                          if (isCorrectOpt) {
                            optBg = isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7";
                            optBorder = "1px solid #22c55e";
                            optColor = isDark ? "#4ade80" : "#166534";
                            optWeight = "600";
                          } else if (isSelected) {
                            if (showCorrect) {
                              optBg = isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2";
                              optBorder = "1px solid #ef4444";
                              optColor = isDark ? "#f87171" : "#991b1b";
                            } else {
                              optBg = isDark ? "rgba(110, 63, 243, 0.15)" : "#f3e8ff";
                              optBorder = "1px solid #6e3ff3";
                              optColor = isDark ? "#a78bfa" : "#6e3ff3";
                              optWeight = "600";
                            }
                          }
                          
                          return (
                            <div key={optIdx} style={{ 
                              padding: "12px 16px", 
                              borderRadius: "10px", 
                              backgroundColor: optBg, 
                              border: optBorder,
                              color: optColor,
                              fontWeight: optWeight,
                              fontSize: "14.5px",
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              transition: "all 0.2s"
                            }}>
                              <span style={{ 
                                width: "26px", 
                                height: "26px", 
                                borderRadius: "50%", 
                                backgroundColor: isCorrectOpt ? "#22c55e" : (isSelected ? (showCorrect ? "#ef4444" : "#6e3ff3") : (isDark ? "#3F3C53" : "#F1F5F9")),
                                color: isCorrectOpt || isSelected ? "#fff" : (isDark ? "#E2E8F0" : "#64748B"),
                                border: isCorrectOpt || isSelected ? "none" : (isDark ? "1px solid #4F4C63" : "1px solid #E2E8F0"),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "13px",
                                fontWeight: "700",
                                flexShrink: 0
                              }}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span style={{ lineHeight: "1.4" }}><MathRenderer text={opt} /></span>
                            </div>
                          );
                        }) : (
                          <div style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "14px" }}>No options available.</div>
                        )}
                      </div>

                      <div className="review-answers" style={{ marginTop: "16px" }}>
                        <div style={{ marginBottom: "16px", fontSize: "14.5px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                          <strong style={{ color: "#1E293B" }}>Your Answer: </strong>
                          <span
                            className={
                              data?.showCorrectAnswers === false
                                ? ""
                                : userAns === undefined || userAns === null
                                ? "unanswered-text"
                                : isCorrect === false
                                ? "wrong-text"
                                : "correct-text"
                            }
                            style={{ 
                              padding: "4px 10px", 
                              borderRadius: "6px", 
                              backgroundColor: data?.showCorrectAnswers === false ? "#F1F5F9" : undefined, 
                              color: data?.showCorrectAnswers === false ? "#475569" : undefined, 
                              border: "1px solid #E2E8F0", 
                              fontWeight: "600", 
                              whiteSpace: "nowrap" 
                            }}
                          >
                            {(userAns !== undefined && userAns !== null) ? <MathRenderer text={userAns} /> : "Not Answered"}
                          </span>
                        </div>
                        
                        {data?.showExplanations !== false && q.explanation && (
                          <div style={{ marginTop: "20px", padding: "16px 20px", backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC", borderLeft: "4px solid #6E3FF3", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", textAlign: "left" }}>
                            <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: isDark ? "#A78BFA" : "#6E3FF3", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>💡</span> Explanation
                            </p>
                            <p style={{ margin: 0, fontSize: "14.5px", color: isDark ? "#E2E8F0" : "#475569", lineHeight: "1.6" }}><MathRenderer text={q.explanation} /></p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="result-actions" style={{ marginTop: "40px", paddingBottom: "60px", display: "flex", justifyContent: "center", gap: "16px" }}>
              <button 
                className="rm-btn-outline" 
                style={{ padding: "14px 32px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
                onClick={() => setShowAnswers(false)}
              >
                ← Back to Summary
              </button>
              <button 
                className="rm-btn-solid" 
                style={{ padding: "14px 32px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </button>
            </div>
            
             {/* Floating scroll action button */}
             <div style={{
               position: "fixed",
               bottom: "30px",
               right: "30px",
               zIndex: 1000
             }}>
               <button
                 onClick={() => {
                   if (isScrolledDown) {
                     window.scrollTo({ top: 0, behavior: "smooth" });
                   } else {
                     window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
                   }
                 }}
                 style={{
                   width: "48px",
                   height: "48px",
                   borderRadius: "50%",
                   backgroundColor: isDark ? "#6E3FF3" : "#ffffff",
                   color: isDark ? "#ffffff" : "#6E3FF3",
                   border: "2px solid var(--border-color, #d1d5db)",
                   boxShadow: "0 4px 16px rgba(110, 63, 243, 0.3)",
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   cursor: "pointer",
                   transition: "all 0.25s ease",
                   fontSize: "16px",
                   fontWeight: "bold"
                 }}
                 title={isScrolledDown ? "Scroll to Top" : "Scroll to Bottom"}
                 onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
                 onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
               >
                 {isScrolledDown ? "▲" : "▼"}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Result;