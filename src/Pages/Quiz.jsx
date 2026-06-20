import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios"; // 📦 IMPORTED AXIOS TO TALK TO MONGO

import QuizHeader from "../components/QuizHeader";
import SubjectTabs from "../components/SubjectTabs";
import CandidatePanel from "../components/CandidatePanel";
import QuestionPalette from "../components/QuestionPalette";

import "../css/Quiz.css";

function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();

  // 🪝 Grab the footprint handed over from StartTest.jsx
  const examSubject = location.state?.subject || "BPSC - Quantitative Aptitude";
  const quizId = location.state?.quizId;
  const initialDurationMinutes = location.state?.duration || 30;

  const [activeTab, setActiveTab] = useState("Quantitative Aptitude");
  
  // 🧠 REPLACED STATIC ARRAY WITH DYNAMIC STATE
  const [questions, setQuestions] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [userAnswers, setUserAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialDurationMinutes * 60); // Dynamically converts DB minutes to seconds!
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [visitedQuestions, setVisitedQuestions] = useState([0]);

  // 🌐 THE BRAIN INJECTION: Fetch the real MongoDB test on load
  useEffect(() => {
    const fetchLiveExam = async () => {
      if (!quizId) {
        alert("No Exam ID detected! Redirecting back to exam selection.");
        navigate("/start-test");
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/quizzes/${quizId}`);
        const rawQuestions = response.data.questions || [];

        // 🛡️ THE TRANSLATOR: Maps Mongo's 'questionEnglish' to your frontend's 'english' instantly
        const mappedQuestions = rawQuestions.map((q, idx) => ({
          id: idx + 1,
          _id: q._id,
          english: q.questionEnglish || q.english || "",
          hindi: q.questionHindi || q.hindi || "",
          options: q.options || [],
          correctAnswer: q.correctAnswer || ""
        }));

        setQuestions(mappedQuestions);
        setUserAnswers(new Array(mappedQuestions.length).fill(undefined));
      } catch (err) {
        console.error("Failed to load exam packet:", err);
        alert("Could not load exam data. Server might be unreachable.");
      } finally {
        setPageLoading(false);
      }
    };

    fetchLiveExam();
  }, [quizId, navigate]);

  // Timer logic
  useEffect(() => {
    if (pageLoading) return; // Don't tick the clock while the DB is loading!

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [pageLoading]);

  // Visited Tracker
  useEffect(() => {
    setVisitedQuestions((prev) =>
      prev.includes(currentQuestion) ? prev : [...prev, currentQuestion]
    );
  }, [currentQuestion]);

  const markForReview = () => {
    setReviewQuestions((prev) => {
      if (prev.includes(currentQuestion)) return prev;
      return [...prev, currentQuestion];
    });
  };

  const clearResponse = () => {
    setUserAnswers((prev) => {
      const updated = [...prev];
      updated[currentQuestion] = undefined;
      return updated;
    });
  };

  const submitQuiz = async () => {
    if (!window.confirm("Are you sure you want to submit your exam?")) return;

    try {
      const res = await fetch("http://localhost:5000/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAnswers,
          questions, // Now contains the true DB questions with their real correctAnswers
        }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      navigate("/result", { state: data });

    } catch (err) {
      console.error("Submit Error:", err);
      alert("Failed to grade test. Please check if your Node backend is live.");
    }
  };

  if (pageLoading) {
    return (
      <div style={{ textAlign: "center", padding: "120px", fontSize: "22px", fontFamily: "sans-serif" }}>
        ⏳ Loading Secure Exam Simulator...
      </div>
    );
  }

  const current = questions[currentQuestion];

  return (
    <div className="quiz-page">
      <QuizHeader />
      <SubjectTabs examSubject={examSubject} />

      <div className="main-layout">
        {/* Left Side: Question Area */}
        <div className="question-section">
          <h2>Question No. {currentQuestion + 1}</h2>

          <div className="question-box">
            <h3>English</h3>
            <p>{current?.english}</p>

            {current?.hindi && (
              <>
                <h3>Hindi</h3>
                <p>{current?.hindi}</p>
              </>
            )}
          </div>

          <div className="options">
            {current?.options.map((option) => (
              <label className="option-card" key={option}>
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  checked={userAnswers[currentQuestion] === option}
                  onChange={() => {
                    setUserAnswers((prev) => {
                      const updated = [...prev];
                      updated[currentQuestion] = option;
                      return updated;
                    });
                  }}
                />
                {option}
              </label>
            ))}
          </div>

          <div className="button-group">
            <button className="review-btn" onClick={markForReview}>
              Mark Review
            </button>
            <button className="clear-btn" onClick={clearResponse}>
              Clear Response
            </button>
            <button
              className="prev-btn"
              onClick={() => setCurrentQuestion(Math.max(currentQuestion - 1, 0))}
            >
              Previous
            </button>
            <button
              className="next-btn"
              onClick={() => setCurrentQuestion(Math.min(currentQuestion + 1, questions.length - 1))}
            >
              Next
            </button>
            <button type="button" className="submit-btn" onClick={submitQuiz}>
              Submit Test
            </button>
          </div>
        </div>

        {/* Right Side: Candidate Info & Question Palette */}
        <div className="right-panel">
          <CandidatePanel timeLeft={timeLeft} />

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