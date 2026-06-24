import React, { useState, useEffect } from "react";
import "../css/QuestionPalette.css";

function QuestionPalette({ questions, currentQuestion, setCurrentQuestion, userAnswers, reviewQuestions, visitedQuestions }) {
  const [palettePage, setPalettePage] = useState(0);
  const itemsPerPage = 50;
  const totalPages = Math.ceil(questions.length / itemsPerPage);

  // Automatically switch palette page if currentQuestion moves outside the current page
  useEffect(() => {
    const correctPage = Math.floor(currentQuestion / itemsPerPage);
    if (correctPage !== palettePage) {
      setPalettePage(correctPage);
    }
  }, [currentQuestion, itemsPerPage]);

  const getStatusClass = (index) => {
    const isAnswered = userAnswers[index] !== undefined && userAnswers[index] !== null;
    const isReview = reviewQuestions.includes(index);
    const isVisited = visitedQuestions.includes(index);

    if (isReview) return "q-review";
    if (isAnswered) return "q-answered";
    if (isVisited) return "q-not-answered";
    return "q-not-visited";
  };

  const startIndex = palettePage * itemsPerPage;
  const currentQuestions = questions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="question-palette">
      <div className="palette-header">Question Palette</div>
      <div className="palette-grid">
        {currentQuestions.map((q, i) => {
          const actualIndex = startIndex + i;
          return (
            <button
              key={q.id || actualIndex}
              className={`palette-btn ${getStatusClass(actualIndex)} ${actualIndex === currentQuestion ? "active" : ""}`}
              onClick={() => setCurrentQuestion(actualIndex)}
            >
              {actualIndex + 1}
            </button>
          );
        })}
      </div>
      
      {totalPages > 1 && (
        <div className="palette-pagination">
          <button 
            className="page-btn" 
            onClick={() => setPalettePage(Math.max(0, palettePage - 1))}
            disabled={palettePage === 0}
          >
            {"<"}
          </button>
          <span className="page-text">Page {palettePage + 1} of {totalPages}</span>
          <button 
            className="page-btn" 
            onClick={() => setPalettePage(Math.min(totalPages - 1, palettePage + 1))}
            disabled={palettePage === totalPages - 1}
          >
            {">"}
          </button>
        </div>
      )}
    </div>
  );
}

export default QuestionPalette;