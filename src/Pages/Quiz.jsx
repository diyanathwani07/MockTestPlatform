import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import QuizHeader from "../components/QuizHeader";
import SubjectTabs from "../components/SubjectTabs";
import CandidatePanel from "../components/CandidatePanel";
import QuestionPalette from "../components/QuestionPalette";

import "../css/Quiz.css";


function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const examSubject = location.state?.subject || "BPSC - Quantitative Aptitude";

  // State for tracking the active subject tab
  const [activeTab, setActiveTab] = useState("Quantitative Aptitude");

  const questions = [
    { id: 1, english: "What is React?", hindi: "React क्या है?", options: ["Library", "Framework", "Database", "Language"] },
    { id: 2, english: "Who developed React?", hindi: "React किसने विकसित किया?", options: ["Google", "Meta", "Amazon", "Microsoft"] },
    { id: 3, english: "What is JSX?", hindi: "JSX क्या है?", options: ["JavaScript XML", "Java Extension", "JSON XML", "None"] },
    { id: 4, english: "What is useState in React?", hindi: "React में useState क्या है?", options: ["Hook", "Function", "Variable", "Component"] },
    { id: 5, english: "What is useEffect used for?", hindi: "useEffect का उपयोग किस लिए होता है?", options: ["Side effects", "Styling", "Routing", "Database"] },
    { id: 6, english: "React is based on which language?", hindi: "React किस भाषा पर आधारित है?", options: ["JavaScript", "Python", "Java", "C++"] },
    { id: 7, english: "What is a component?", hindi: "Component क्या होता है?", options: ["Reusable UI", "Database", "API", "Server"] },
    { id: 8, english: "What is virtual DOM?", hindi: "Virtual DOM क्या है?", options: ["Copy of real DOM", "Database", "Server", "API"] },
    { id: 9, english: "What is props in React?", hindi: "React में props क्या हैं?", options: ["Data passing", "State", "Hook", "Function"] },
    { id: 10, english: "Which hook is used for state?", hindi: "State के लिए कौन सा hook उपयोग होता है?", options: ["useState", "useEffect", "useMemo", "useRef"] },
    { id: 11, english: "React is developed by?", hindi: "React किसने बनाया?", options: ["Meta", "Google", "Apple", "Microsoft"] },
    { id: 12, english: "What is SPA?", hindi: "SPA क्या है?", options: ["Single Page App", "Server Page App", "Simple Page App", "None"] },
    { id: 13, english: "React uses which DOM?", hindi: "React कौन सा DOM उपयोग करता है?", options: ["Virtual DOM", "Real DOM", "Shadow DOM", "None"] },
    { id: 14, english: "What is state?", hindi: "State क्या है?", options: ["Data storage", "Database", "API", "Server"] },
    { id: 15, english: "Which is used for routing?", hindi: "Routing के लिए क्या उपयोग होता है?", options: ["React Router", "Redux", "Axios", "Node"] },
    { id: 16, english: "JSX stands for?", hindi: "JSX का full form क्या है?", options: ["JavaScript XML", "Java Source XML", "JSON Syntax XML", "None"] },
    { id: 17, english: "What is npm?", hindi: "npm क्या है?", options: ["Package Manager", "Database", "Framework", "Language"] },
    { id: 18, english: "React is?", hindi: "React क्या है?", options: ["Frontend Library", "Backend Framework", "Database", "OS"] },
    { id: 19, english: "Which company maintains React?", hindi: "React को कौन maintain करता है?", options: ["Meta", "Google", "Amazon", "IBM"] },
    { id: 20, english: "What is key in React lists?", hindi: "React list में key क्या है?", options: ["Unique ID", "Index only", "Style", "Function"] },
    { id: 21, english: "What is Redux used for?", hindi: "Redux किस लिए उपयोग होता है?", options: ["State management", "Routing", "Styling", "Database"] },
    { id: 22, english: "Which hook replaces componentDidMount?", hindi: "componentDidMount को कौन replace करता है?", options: ["useEffect", "useState", "useRef", "useMemo"] },
    { id: 23, english: "What is an event in React?", hindi: "React में event क्या है?", options: ["User action", "Database", "API", "Server"] },
    { id: 24, english: "React uses ___ rendering.", hindi: "React ___ rendering उपयोग करता है।", options: ["Declarative", "Imperative", "Static", "Manual"] },
    { id: 25, english: "What is a hook?", hindi: "Hook क्या है?", options: ["Special function", "Database", "Component", "Server"] },
    { id: 26, english: "What is Babel?", hindi: "Babel क्या है?", options: ["Compiler", "Database", "Framework", "Server"] },
    { id: 27, english: "React files are written in?", hindi: "React files किसमें लिखे जाते हैं?", options: ["JSX", "HTML only", "CSS", "Python"] },
    { id: 28, english: "What is conditional rendering?", hindi: "Conditional rendering क्या है?", options: ["Rendering based on condition", "Database", "API call", "Styling"] },
    { id: 29, english: "What is a fragment?", hindi: "Fragment क्या है?", options: ["Empty wrapper", "Component", "Hook", "State"] },
    { id: 30, english: "React is used for?", hindi: "React किस लिए उपयोग होता है?", options: ["UI development", "Backend", "Database", "OS"] },
  ];

  const [userAnswers, setUserAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  
  // Track which questions have been visited (opened at least once)
  const [visitedQuestions, setVisitedQuestions] = useState([0]);

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mark a question as visited whenever it becomes the current question
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
    console.log("Marked for review:", currentQuestion);
  };

  const clearResponse = () => {
    setUserAnswers((prev) => {
      const updated = [...prev];
      updated[currentQuestion] = undefined;
      return updated;
    });
    console.log("Cleared:", currentQuestion);
  };

  const submitQuiz = async () => {
    console.log("🔥 Submit clicked");

    try {
      const res = await fetch("http://localhost:5000/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAnswers,
          questions, // send questions too so backend/result page can compute correctness
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      console.log("RESULT:", data);
      console.log("Navigating to /result");    
      
      navigate("/result", { state: data });

    } catch (err) {
      console.error("Submit Error:", err);
      alert("Failed to submit test. Please check if the backend server is running.");
    }
  };

  const current = questions[currentQuestion];

  return (
    <div className="quiz-page">
      
      <QuizHeader />

      {/* Passed activeTab and setActiveTab to handle subject switching */}
      <SubjectTabs examSubject={examSubject} />

      <div className="main-layout">
        
        {/* Left Side: Question Area */}
        <div className="question-section">
          <h2>Question No. {currentQuestion + 1}</h2>

          <div className="question-box">
            <h3>English</h3>
            <p>{current?.english}</p>

            <h3>Hindi</h3>
            <p>{current?.hindi}</p>
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
            <button
              type="button"
              className="submit-btn"
              onClick={submitQuiz}
            >
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