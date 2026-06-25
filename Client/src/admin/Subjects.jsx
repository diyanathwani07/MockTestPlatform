import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

function Subjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes`);

        const counts = {};
        res.data.forEach((quiz) => {
          counts[quiz.subject] = (counts[quiz.subject] || 0) + 1;
        });

        const subjectList = Object.entries(counts).map(([name, count]) => ({
          name,
          count,
        }));

        setSubjects(subjectList);
      } catch (error) {
        console.error("Fetch Subjects Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title="Subjects" />

        <div className="admin-content">

          <p className="manage-count">
            {loading ? "Loading..." : `${subjects.length} subject(s) in use`}
          </p>

          <div className="quiz-table-wrapper">
            <table className="quiz-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Quizzes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td>{s.count}</td>
                    <td className="action-cell">
                      <button
                        className="edit-btn"
                        onClick={() => navigate(`/admin/manage-quizzes?subject=${s.name}`)}
                      >
                        View Quizzes
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && subjects.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-row">
                      No subjects yet — create a quiz first.
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

export default Subjects;