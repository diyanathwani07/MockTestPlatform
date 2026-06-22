import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QuizHeader from "../components/QuizHeader";
import "../css/Result.css";
import axios from "axios";

function Result() {
  const location = useLocation();
  const navigate = useNavigate();

  // data is sent via navigate("/result", { state: data }) from Quiz.jsx
  const data = location.state;

  const score = data?.score ?? 0;
  const total = data?.total ?? 0;
  const correct = data?.correct ?? 0;
  const incorrect = data?.incorrect ?? 0;
  const unanswered = data?.unanswered ?? 0;
  const percentage = data?.percentage;
  const questions = data?.questions ?? [];
  const userAnswers = data?.userAnswers ?? [];
  // Read subject from navigation state (set by Quiz.jsx), then localStorage, then fallback
  const examTitle = data?.subject || data?.title || localStorage.getItem("lastExamTaken") || "Examination";

  const computedPercentage =
    percentage !== undefined && percentage !== null
      ? Number(percentage).toFixed(2)
      : total
      ? ((score / total) * 100).toFixed(2)
      : "0.00";

  // Save result to MongoDB whenever this page loads with valid data
  useEffect(() => {
    if (!data) return; // nothing to save if user landed here without quiz data

    console.log("Result Page Loaded");

    const saveResult = async () => {
      try {
        console.log("Saving Result...");

        const userString = localStorage.getItem("user");
        console.log("user from localStorage:", userString);

        const user = userString ? JSON.parse(userString) : null;

        if (!user || !user.id) {
          console.log("SAVE SKIPPED: no logged-in user found in localStorage");
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

        console.log("Result Saved");
        console.log(res.data);
      } catch (error) {
        console.log("SAVE ERROR");
        console.log(error);
      }
    };

    saveResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="result-page">
      <QuizHeader title={examTitle} showInstructions={false} />

      <div className="result-summary">
        <h1>{examTitle} — Result</h1>

        <div className="summary-cards">
          <div className="card total">
            <h3>Total Questions</h3>
            <p>{total}</p>
          </div>

          <div className="card score">
            <h3>Score</h3>
            <p>{score}</p>
          </div>

          <div className="card correct">
            <h3>Correct</h3>
            <p>{correct}</p>
          </div>

          <div className="card incorrect">
            <h3>Incorrect</h3>
            <p>{incorrect}</p>
          </div>

          <div className="card unanswered">
            <h3>Unanswered</h3>
            <p>{unanswered}</p>
          </div>

          <div className="card percentage">
            <h3>Percentage</h3>
            <p>{computedPercentage}%</p>
          </div>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="result-details">
          <h2>Answer Review</h2>

          <div className="review-list">
            {questions.map((q, index) => {
              const userAns = userAnswers[index];
              const isCorrect = q.correctAnswer
                ? userAns === q.correctAnswer
                : undefined;

              return (
                <div className="review-item" key={q.id || index}>
                  <div className="review-question">
                    <span className="q-number">Q{index + 1}.</span>{" "}
                    {q.english}
                  </div>

                  <div className="review-answers">
                    <p>
                      <strong>Your Answer: </strong>
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
                        <strong>Correct Answer: </strong>
                        <span className="correct-text">
                          {q.correctAnswer}
                        </span>
                      </p>
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
          Back to Login
        </button>

      </div>
    </div>
  );
}

export default Result;