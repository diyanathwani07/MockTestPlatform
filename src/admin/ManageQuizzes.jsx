import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

function ManageQuizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");

  const fetchQuizzes = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/quizzes");
      setQuizzes(res.data);
    } catch (error) {
      console.error("Fetch Quizzes Error:", error);
      setMessage("Failed to load quizzes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const togglePublish = async (quiz) => {
    try {
      await axios.put(
        `http://localhost:5000/api/quizzes/${quiz._id}`,
        { published: !quiz.published },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchQuizzes();
    } catch (error) {
      console.error("Toggle Publish Error:", error);
      setMessage("Failed to update quiz status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this quiz? This cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("Quiz deleted successfully.");
      fetchQuizzes();
    } catch (error) {
      console.error("Delete Quiz Error:", error);
      setMessage("Failed to delete quiz.");
    }
  };

  const filteredQuizzes = quizzes.filter((quiz) =>
    quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title="Manage Quizzes" />

        <div className="admin-content">
          {message && <p className="admin-status-message">{message}</p>}

          {/* COMMAND BAR: Pushes Search LEFT, Button RIGHT */}
          <div className="manage-command-bar">
            
            {/* 1. Reuses the Pill Search Bar */}
            <div className="pill-search-container" style={{ marginBottom: 0 }}>
              <svg width="16" height="16" className="pill-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              
              <input
                type="text"
                placeholder="Search quizzes by title or subject..."
                className="pill-search-input"
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
            </div>

            {/* 2. Shrunken Pill Button on the far right */}
            <button
              className="create-quiz-pill-btn"
              onClick={() => navigate("/admin/create-quiz")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Create Quiz</span>
            </button>

          </div>

          {/* TABLE CONTAINER */}
          <div className="quiz-table-wrapper">
            <table className="quiz-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Duration</th>
                  <th>Questions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuizzes.map((quiz) => (
                  <tr key={quiz._id}>
                    <td style={{ fontWeight: "600", color: "#1a1a2e" }}>{quiz.title}</td>
                    <td>{quiz.subject}</td>
                    <td>{quiz.duration} min</td>
                    <td>{quiz.questions?.length || 0}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          quiz.published ? "status-published" : "status-draft"
                        }`}
                        onClick={() => togglePublish(quiz)}
                      >
                        {quiz.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="action-cell">
                      {/* Preserved your exact preferred Edit & Delete buttons */}
                      <button
                        className="edit-btn"
                        onClick={() => navigate(`/admin/edit-quiz/${quiz._id}`)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(quiz._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && filteredQuizzes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      No quizzes found matching your search.
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

export default ManageQuizzes;