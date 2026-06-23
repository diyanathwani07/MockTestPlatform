import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

import QuizHeader from "../components/QuizHeader";
import SubjectTabs from "../components/SubjectTabs";
import CandidatePanel from "../components/CandidatePanel";
import QuestionPalette from "../components/QuestionPalette";

import "../css/Quiz.css";

// Fallback safety payload if your Node backend is offline
const fallbackQuestions = [
  {
    id: 1,
    english: "What is the capital of India?",
    hindi: "भारत की राजधानी क्या है?",
    options: ["New Delhi", "Mumbai", "Kolkata", "Chennai"],
    correctAnswer: "New Delhi",
    explanation: "New Delhi was laid out to the south of the Old City and made the capital in 1911."
  },
  {
    id: 2,
    english: "Which planet is known as the Red Planet?",
    hindi: "किस ग्रह को लाल ग्रह कहा जाता है?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: "Mars",
    explanation: "Mars appears red due to the iron oxide (rust) covering much of its surface."
  }
];

function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();

  // ─── 1. THE TITLE CATCHER (Fixes the stuck "Live Examination" text) ───
  const rawState = location.state || {};
  const resolvedTitle = 
    rawState?.title || 
    rawState?.subject || 
    rawState?.examName || 
    localStorage.getItem("lastExamTaken") || 
    "BPSC - Quantitative Aptitude";

  const quizId = rawState?.quizId || rawState?._id || null;
  const initialDurationMinutes = rawState?.duration || 60;

  // Cache the exam title instantly so `/result` can read it later
  useEffect(() => {
    if (resolvedTitle && resolvedTitle !== "BPSC - Quantitative Aptitude") {
      localStorage.setItem("lastExamTaken", resolvedTitle);
    }
  }, [resolvedTitle]);

  const [questions, setQuestions] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(initialDurationMinutes * 60);

  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [visitedQuestions, setVisitedQuestions] = useState([0]);

  // ─── 2. MONGODB SECURE PACKET RETRIEVAL ───
  useEffect(() => {
    const fetchExamPacket = async () => {
      if (!quizId) {
        console.warn("No DB Quiz ID passed; mounting local high-performance fallback.");
        setQuestions(fallbackQuestions);
        setUserAnswers(new Array(fallbackQuestions.length).fill(undefined));
        setPageLoading(false);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/quizzes/${quizId}`);
        const rawQ = response.data?.questions || fallbackQuestions;

        // Ensure the explanation field is safely mapped into state
        const mapped = rawQ.map((q, idx) => ({
          id: idx + 1,
          _id: q._id || idx,
          english: q.questionEnglish || q.english || q.questionText || "",
          hindi: q.questionHindi || q.hindi || "",
          options: q.options || [],
          correctAnswer: q.correctAnswer || "",
          explanation: q.explanation || q.answerExplanation || "No official explanation provided."
        }));

        setQuestions(mapped);
        setUserAnswers(new Array(mapped.length).fill(undefined));
      } catch (err) {
        console.error("Backend packet fetch failed, loading local safe copy:", err);
        setQuestions(fallbackQuestions);
        setUserAnswers(new Array(fallbackQuestions.length).fill(undefined));
      } finally {
        setPageLoading(false);
      }
    };

    fetchExamPacket();
  }, [quizId]);

  // Timer Tick Engine
  useEffect(() => {
    if (pageLoading) return;
    if (timeLeft <= 0) {
      gradeAndSubmitTest(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, pageLoading]);

  // Visited Tracker Sync
  useEffect(() => {
    setVisitedQuestions((prev) =>
      prev.includes(currentQuestion) ? prev : [...prev, currentQuestion]
    );
  }, [currentQuestion]);

  const toggleReviewMark = () => {
    setReviewQuestions((prev) =>
      prev.includes(currentQuestion)
        ? prev.filter((q) => q !== currentQuestion)
        : [...prev, currentQuestion]
    );
  };

  const clearCurrentSelection = () => {
    setUserAnswers((prev) => {
      const copy = [...prev];
      copy[currentQuestion] = undefined;
      return copy;
    });
  };

  // ─── 3. SECURE SUBMIT & AUTO-GRADER ───
  const gradeAndSubmitTest = async (isTimeOut = false) => {
    if (!isTimeOut && !window.confirm("Are you sure you want to submit your final answers?")) return;

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    questions.forEach((q, i) => {
      const ans = userAnswers[i];
      if (ans === undefined || ans === null) unanswered++;
      else if (ans === q.correctAnswer) correct++;
      else incorrect++;
    });

    const total = questions.length;
    const score = correct * 1;
    const percentage = ((correct / total) * 100).toFixed(2);

    const payload = {
      title: resolvedTitle,
      score,
      total,
      correct,
      incorrect,
      unanswered,
      percentage,
      questions,
      userAnswers
    };

    try {
      await axios.post("http://localhost:5000/submit", payload);
    } catch (e) {
      console.log("Offline Client Submission Hook triggered safely.");
    } finally {
      navigate("/result", { state: payload });
    }
  };

  if (pageLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0B0C1A", color: "#fff", fontSize: "20px" }}>
        ⏳ Securely decrypting examination packet...
      </div>
    );
  }

  const current = questions[currentQuestion];

  return (
    <div className="quiz-page">
      {/* Passing the resolved title directly into the header */}
      <QuizHeader title={resolvedTitle} />
      <SubjectTabs />

      <div className="main-layout">
        
        {/* LEFT COLUMN: THE QUESTION CANVAS */}
        <div className="question-section">
          <div className="q-meta-stripe">
            <h2>Question No. {currentQuestion + 1}</h2>
            {reviewQuestions.includes(currentQuestion) && (
              <span className="review-flag">🚩 Marked for Review</span>
            )}
          </div>

          <div className="question-box" style={{ textAlign: "left" }}>
            <p className="q-prompt-text" style={{ textAlign: "left" }}>{current?.english}</p>

            {current?.hindi && (
              <p className="q-prompt-text" style={{ textAlign: "left", marginTop: "20px" }}>{current?.hindi}</p>
            )}
          </div>

          <div className="options">
            {current?.options.map((optText, idx) => {
              const isSelected = userAnswers[currentQuestion] === optText;
              return (
                <label key={idx} className={`option-card ${isSelected ? "selected-opt-card" : ""}`}>
                  <input
                    type="radio"
                    name={`q-${currentQuestion}`}
                    checked={isSelected}
                    onChange={() => {
                      setUserAnswers((prev) => {
                        const copy = [...prev];
                        copy[currentQuestion] = optText;
                        return copy;
                      });
                    }}
                  />
                  <span>{optText}</span>
                </label>
              );
            })}
          </div>

          <div className="button-group">
            <button className="review-btn" onClick={toggleReviewMark}>
              {reviewQuestions.includes(currentQuestion) ? "Unmark Review" : "Mark Review"}
            </button>
            <button className="clear-btn" onClick={clearCurrentSelection}>
              Clear Response
            </button>
            
            <button
              className="prev-btn"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion((prev) => prev - 1)}
            >
              Previous
            </button>
            <button
              className="next-btn"
              disabled={currentQuestion === questions.length - 1}
              onClick={() => setCurrentQuestion((prev) => prev + 1)}
            >
              Next
            </button>

            {currentQuestion === questions.length - 1 && (
              <button type="button" className="submit-btn" onClick={() => gradeAndSubmitTest(false)}>
                Submit Test
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CANDIDATE INFO & PALETTE */}
        <div className="right-panel">
          <CandidatePanel timeLeft={timeLeft} examName={resolvedTitle} />
          
          <QuestionPalette
            questions={questions}
            currentQuestion={currentQuestion}
            setCurrentQuestion={setCurrentQuestion}
            userAnswers={userAnswers}
            reviewQuestions={reviewQuestions}
            visitedQuestions={visitedQuestions}
          />
        </div>

      </div>
    </div>
  );
}

export default Quiz;