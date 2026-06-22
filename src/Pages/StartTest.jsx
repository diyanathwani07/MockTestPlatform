import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import "../css/StartTest.css";

function StartTest() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🌐 THE CATCHER'S MITT: Fetch all live quizzes from MongoDB when the page loads
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/quizzes?published=true");
        const liveQuizzes = response.data;
        setQuizzes(liveQuizzes);
        
        // Automatically select the most recently created quiz by default
        if (liveQuizzes.length > 0) {
          setSelectedQuiz(liveQuizzes[0]);
        }
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const handleDropdownChange = (e) => {
    const foundQuiz = quizzes.find((q) => q._id === e.target.value);
    setSelectedQuiz(foundQuiz);
  };

  const handleStart = () => {
    if (!selectedQuiz) return alert("Please select a quiz first!");

    // Pass the entire quiz footprint over to the Quiz Interface
    navigate("/quiz", { 
      state: { 
        subject: selectedQuiz.subject,
        quizId: selectedQuiz._id,
        quizTitle: selectedQuiz.title,
        duration: selectedQuiz.duration
      } 
    });
  };

  return (
    <div className="start-page">
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
        <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme">
          <div className="pill-track-icons"><span>☀️</span><span>🌙</span></div>
          <div className="pill-thumb-slider"></div>
        </div>
      </div>
      <div className="top-left"></div>
      <div className="bottom-right"></div>
      <div className="big-circle"></div>
      <div className="small-circle"></div>

      <div className="start-card">
        <div className="logo">
          <span className="icon">📝</span>
          <h1>Teaching Pariksha</h1>
        </div>

        <h2>Test Instructions</h2>

        <div className="instruction-table">
          <div className="row">
            <div className="label">Name</div>
            <div className="value">Diya Nathwani</div>
          </div>

          <div className="row">
            <div className="label">Email</div>
            <div className="value">diyanathwani@gmail.com</div>
          </div>

          {/* ── LIVE MONGODB SUBJECT DROPDOWN ── */}
          <div className="row">
            <div className="label">Select Subject</div>
            <div className="value">
              <select 
                className="subject-dropdown"
                value={selectedQuiz ? selectedQuiz._id : ""} 
                onChange={handleDropdownChange}
                disabled={loading || quizzes.length === 0}
              >
                {loading ? (
                  <option value="">Loading live exams...</option>
                ) : quizzes.length === 0 ? (
                  <option value="">No published exams found</option>
                ) : (
                  quizzes.map((quiz) => (
                    <option key={quiz._id} value={quiz._id}>
                      {quiz.title} ({quiz.subject})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* ── DYNAMIC DURATION DISPLAY ── */}
          <div className="row">
            <div className="label">Duration</div>
            <div className="value">
              {selectedQuiz ? `${selectedQuiz.duration} Minutes` : "60 Minutes"}
            </div>
          </div>

          <div className="row">
            <div className="label">Do's</div>
            <div className="value">
              ✔ Read questions carefully <br />
              ✔ Manage your time properly <br />
              ✔ Submit before time ends
            </div>
          </div>

          <div className="row">
            <div className="label">Don'ts</div>
            <div className="value">
              ❌ Don't refresh the page <br />
              ❌ Don't switch tabs <br />
              ❌ Don't use external help
            </div>
          </div>
        </div>

        <button 
          className="start-btn" 
          onClick={handleStart}
          disabled={loading || !selectedQuiz}
        >
          {loading ? "Connecting..." : "Start Test"}
        </button>
      </div>
    </div>
  );
}

export default StartTest;