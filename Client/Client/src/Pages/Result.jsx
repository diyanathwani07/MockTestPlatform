import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QuizHeader from "../components/QuizHeader";
import "../css/Result.css";
import axios from "axios";

function Result() {
  const location = useLocation();
  const navigate = useNavigate();

  // Grab the packet handed over by Quiz.jsx
  const data = location.state;

  const score = data?.score ?? 0;
  const total = data?.total ?? 0;
  const correct = data?.correct ?? 0;
  const incorrect = data?.incorrect ?? 0;
  const unanswered = data?.unanswered ?? 0;
  const percentage = data?.percentage;
  const questions = data?.questions ?? [];
  const userAnswers = data?.userAnswers ?? [];
  
  // Safely inherit the Exam Name
const examTitle = data?.title || data?.subject || localStorage.getItem("lastExamTaken") || "Performance Scorecard";
  const computedPercentage =
    percentage !== undefined && percentage !== null
      ? Number(percentage).toFixed(2)
      : total
      ? ((score / total) * 100).toFixed(2)
      : "0.00";

  // ─── MONGODB AUTO-SAVE ENGINE ───
  useEffect(() => {
    if (!data) return; 

    const saveResult = async () => {
      try {
        const userString = localStorage.getItem("user");
        const user = userString ? JSON.parse(userString) : null;

        if (!user || !user.id) {
          console.log("Save Skipped: No authenticated user inside localStorage");
          return;
        }

        const res = await axios.post(
          "http://localhost:5000/api/results/save",
          {
            userId: user.id,
            score,
            total,
            correct,
            incorrect,
            percentage: Number(computedPercentage),
          }
        );
        console.log("Secure Result Payload logged to DB:", res.data);
      } catch (error) {
        console.error("MongoDB Save Error:", error);
      }
    };

    saveResult();
  }, [data, score, total, correct, incorrect, computedPercentage]);

  // Fallback view if a user tries to type /result directly into the URL bar
  if (!data) {
    return (
      <div className="result-page">
        <QuizHeader title="Test Result" showInstructions={false} />
        <div className="result-empty">
          <h2>No Exam Record Detected</h2>
          <p>You must complete an active examination session to generate a score report.</p>
          <button className="back-btn" onClick={() => navigate("/")}>
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="result-page">
      <QuizHeader title={examTitle} showInstructions={false} />

      <div className="result-summary">
        <h1>Performance Scorecard</h1>

        <div className="summary-cards">
          <div className="card total-card">
            <h3>Total Questions</h3>
            <p>{total}</p>
          </div>

          <div className="card score-card">
            <h3>Points Earned</h3>
            <p>{score}</p>
          </div>

          <div className="card correct-card">
            <h3>Correct</h3>
            <p>{correct}</p>
          </div>

          <div className="card incorrect-card">
            <h3>Incorrect</h3>
            <p>{incorrect}</p>
          </div>

          <div className="card unanswered-card">
            <h3>Skipped</h3>
            <p>{unanswered}</p>
          </div>

          <div className="card percentage-card">
            <h3>Accuracy</h3>
            <p>{computedPercentage}%</p>
          </div>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="result-details">
          <h2>Detailed Answer Key</h2>

          <div className="review-list">
            {questions.map((q, index) => {
              const userAns = userAnswers[index];
              const isCorrect = q.correctAnswer
                ? userAns === q.correctAnswer
                : undefined;

              return (
                <div className="review-item" key={q._id || index}>
                  
                  {/* Question Prompt */}
                  <div className="review-question">
                    <span className="q-number">Q{index + 1}.</span>{" "}
                    {q.english || q.questionEnglish}
                  </div>

                  {/* User vs Correct Breakdown */}
                  <div className="review-answers">
                    <p>
                      <span className="ans-label">Your Answer: </span>
                      <span
                        className={
                          userAns === undefined
                            ? "unanswered-text"
                            : isCorrect === false
                            ? "wrong-text"
                            : "correct-text"
                        }
                      >
                        {userAns !== undefined ? userAns : "Not Answered"}
                      </span>
                    </p>

                    {q.correctAnswer && (
                      <p>
                        <span className="ans-label">Correct Answer: </span>
                        <span className="correct-text">{q.correctAnswer}</span>
                      </p>
                    )}

                    {/* ─── THE EXPLANATION REVEAL ENGINE ─── */}
                    {(q.explanation || q.answerExplanation) && (
                      <div className="explanation-wrapper">
                        <span className="explanation-label">💡 Explanation</span>
                        <p className="explanation-text">{q.explanation || q.answerExplanation}</p>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="result-actions">
        <button className="back-btn" onClick={() => navigate("/")}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

export default Result;