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

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title="Manage Quizzes" />

        <div className="admin-content">

          {message && <p className="admin-status-message">{message}</p>}

          <div className="manage-header">
            <p className="manage-count">
              {loading ? "Loading..." : `${quizzes.length} quiz(es) found`}
            </p>
            <button
              className="create-new-btn"
              onClick={() => navigate("/admin/create-quiz")}
            >
              + Create New Quiz
            </button>
          </div>

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
                {quizzes.map((quiz) => (
                  <tr key={quiz._id}>
                    <td>{quiz.title}</td>
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

                {!loading && quizzes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      No quizzes created yet.
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