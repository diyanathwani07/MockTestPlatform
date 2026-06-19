import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

function Questions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/quizzes");

        const allRows = [];
        res.data.forEach((quiz) => {
          (quiz.questions || []).forEach((q, i) => {
            allRows.push({
              quizTitle: quiz.title,
              subject: quiz.subject,
              questionNumber: i + 1,
              questionEnglish: q.questionEnglish,
              correctAnswer: q.correctAnswer,
            });
          });
        });

        setRows(allRows);
      } catch (error) {
        console.error("Fetch Questions Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title="Questions" />

        <div className="admin-content">

          <p className="manage-count">
            {loading ? "Loading..." : `${rows.length} question(s) across all quizzes`}
          </p>

          <div className="quiz-table-wrapper">
            <table className="quiz-table">
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>Subject</th>
                  <th>#</th>
                  <th>Question</th>
                  <th>Correct Answer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.quizTitle}</td>
                    <td>{row.subject}</td>
                    <td>{row.questionNumber}</td>
                    <td className="question-text-cell">{row.questionEnglish}</td>
                    <td>{row.correctAnswer}</td>
                  </tr>
                ))}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      No questions yet — create a quiz first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Questions;