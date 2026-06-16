import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QuizHeader from "../components/QuizHeader";
import "../css/Result.css";

function Result() {
  const location = useLocation();
  const navigate = useNavigate();

  // data is sent via navigate("/result", { state: data }) from Quiz.jsx
  const data = location.state;

  if (!data) {
    return (
      <div className="result-page">
        <QuizHeader />
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

  const {
    score = 0,
    total = 0,
    correct = 0,
    incorrect = 0,
    unanswered = 0,
    percentage,
    questions = [],
    userAnswers = [],
  } = data;

  const computedPercentage =
    percentage !== undefined && percentage !== null
      ? Number(percentage).toFixed(2)
      : total
      ? ((score / total) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="result-page">
      <QuizHeader />

      <div className="result-summary">
        <h1>Test Result</h1>

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