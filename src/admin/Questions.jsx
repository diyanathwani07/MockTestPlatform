import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

function Questions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterExam, setFilterExam] = useState("ALL");
  const [filterSubject, setFilterSubject] = useState("ALL");

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/quizzes");
        const allRows = [];
        res.data.forEach((quiz) => {
          (quiz.questions || []).forEach((q, i) => {
            allRows.push({
              quizId: quiz._id,
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

  // Filter Logic: Filters by BOTH dropdowns simultaneously
  const displayedRows = rows.filter((r) => {
    const matchExam = filterExam === "ALL" || r.quizId === filterExam;
    const matchSubject = filterSubject === "ALL" || r.subject === filterSubject;
    return matchExam && matchSubject;
  });

  // Get unique lists for the dropdowns
  const uniqueExams = [...new Map(rows.map(item => [item.quizId, item.quizTitle])).entries()];
  const uniqueSubjects = [...new Set(rows.map(item => item.subject))];

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Questions Bank" />
        <div className="admin-content">
          <div className="quiz-table-wrapper">
            <table className="quiz-table">
              <thead>
                <tr>
                  {/* Exam Filter Header */}
                  <th style={{ width: "25%", background: "#f8fafc" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#64748b" }}>Exam</span>
                      <select value={filterExam} onChange={(e) => setFilterExam(e.target.value)} style={{ padding: "4px", fontSize: "12px" }}>
                        <option value="ALL">All Exams</option>
                        {uniqueExams.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
                      </select>
                    </div>
                  </th>

                  {/* Subject Filter Header */}
                  <th style={{ width: "20%", background: "#f8fafc" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#64748b" }}>Subject</span>
                      <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} style={{ padding: "4px", fontSize: "12px" }}>
                        <option value="ALL">All Subjects</option>
                        {uniqueSubjects.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                      </select>
                    </div>
                  </th>

                  <th>#</th>
                  <th>Question Text</th>
                  <th>Correct Answer</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.quizTitle}</td>
                    <td>{row.subject}</td>
                    <td>{row.questionNumber}</td>
                    <td>{row.questionEnglish}</td>
                    <td><span style={{ fontWeight: "700", color: "#10b981" }}>{row.correctAnswer}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Questions;