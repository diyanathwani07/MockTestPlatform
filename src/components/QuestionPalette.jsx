import React from "react";
import "../css/QuestionPalette.css";

function QuestionPalette({
  questions,
  currentQuestion,
  setCurrentQuestion,
  userAnswers,
  reviewQuestions,
  visitedQuestions,
}) {

  const getStatusClass = (index) => {
    const isAnswered = userAnswers[index] !== undefined && userAnswers[index] !== null;
    const isReview = reviewQuestions.includes(index);
    const isVisited = visitedQuestions.includes(index);

    if (isReview) return "q-review";
    if (isAnswered) return "q-answered";
    if (isVisited) return "q-not-answered";
    return "q-not-visited";
  };

  return (
    <div className="question-palette">
      <div className="palette-header">Question Palette</div>

      <div className="palette-grid">
        {questions.map((q, index) => (
          <button
            key={q.id}
            className={`palette-btn ${getStatusClass(index)} ${index === currentQuestion ? "active" : ""}`}
            onClick={() => setCurrentQuestion(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuestionPalette;