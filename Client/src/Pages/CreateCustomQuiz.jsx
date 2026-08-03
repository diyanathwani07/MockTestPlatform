import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css"; // Reuse premium dashboard themes

const CreateCustomQuiz = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/questions/subjects`,
          { headers }
        );
        setSubjects(response.data || []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        setFetchingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  const handleCreate = async () => {
    if (!selectedSubject) {
      alert("Please select a subject.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/quizzes/custom`,
        {
          subject: selectedSubject,
          quantity: parseInt(quantity, 10),
        },
        { headers }
      );
      const newQuiz = response.data;
      navigate(`/quiz/${newQuiz._id}`);
    } catch (error) {
      console.error("Failed to create custom quiz:", error);
      alert(error.response?.data?.message || "Failed to create custom quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const quantityOptions = [5, 10, 15, 20, 25, 30, 50];

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Custom Test" />
        
        <div className="sd-content">
          <div 
            className="sd-custom-quiz-card"
            style={{ 
              background: "var(--bg-card, #131428)", 
              border: "1px solid var(--border-color, rgba(255,255,255,0.08))", 
              borderRadius: "16px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
              maxWidth: "800px",
              margin: "0 auto"
            }}
          >
            {/* Header block inside the card container */}
            <div style={{ marginBottom: "32px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
                Create Your Own Quiz
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
                Configure a custom practice exam by selecting your target subject and number of questions.
              </p>
            </div>

            {/* Subject selector */}
            <div style={{ marginBottom: "24px" }}>
              <label 
                style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "600", 
                  color: "var(--text-primary)", 
                  marginBottom: "8px" 
                }}
              >
                Select Target Subject
              </label>
              {fetchingSubjects ? (
                <div 
                  style={{ 
                    height: "46px", 
                    background: "rgba(255,255,255,0.05)", 
                    borderRadius: "30px", 
                    animation: "pulse 1.5s infinite" 
                  }}
                ></div>
              ) : subjects.length > 0 ? (
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 24px",
                    borderRadius: "30px",
                    background: "var(--bg-page, #0A0A0A)",
                    color: "var(--text-primary)",
                    border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                    outline: "none",
                    fontSize: "15px"
                  }}
                >
                  <option value="">-- Choose a Subject --</option>
                  {subjects.map((sub, idx) => (
                    <option key={idx} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              ) : (
                <p style={{ color: "#ef4444", fontSize: "14px", margin: "4px 0" }}>No subjects available in the question bank.</p>
              )}
            </div>

            {/* Quantity selector */}
            <div style={{ marginBottom: "32px" }}>
              <label 
                style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: "600", 
                  color: "var(--text-primary)", 
                  marginBottom: "12px" 
                }}
              >
                Number of Questions
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))", gap: "10px" }}>
                {quantityOptions.map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setQuantity(qty)}
                    style={{
                      padding: "10px 0",
                      borderRadius: "30px",
                      fontWeight: "700",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: quantity === qty 
                        ? "1.5px solid var(--primary-color, #6E3FF3)" 
                        : "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                      background: quantity === qty 
                        ? "var(--primary-color, #6E3FF3)" 
                        : "transparent",
                      color: quantity === qty ? "#ffffff" : "var(--text-secondary)"
                    }}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleCreate}
              disabled={loading || !selectedSubject}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "30px",
                fontWeight: "700",
                fontSize: "15px",
                cursor: (loading || !selectedSubject) ? "not-allowed" : "pointer",
                transition: "all 0.25s ease",
                border: "none",
                background: (loading || !selectedSubject) ? "var(--border-color, #333)" : "var(--primary-color, #6E3FF3)",
                color: (loading || !selectedSubject) ? "var(--text-muted, #777)" : "#ffffff",
                boxShadow: (loading || !selectedSubject) ? "none" : "0 4px 14px rgba(110, 63, 243, 0.4)"
              }}
            >
              {loading ? "Generating Practice Test..." : "Start Custom Quiz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomQuiz;
