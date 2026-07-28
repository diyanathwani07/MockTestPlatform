import React, { useState, useEffect } from "react";
import axios from "axios";
import { Lock, Unlock, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css";

function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setExams(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handlePurchase = async (examId) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/purchase/exam`,
        { examId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      alert("Purchase Successful!");
      fetchExams();
    } catch (err) {
      console.error(err);
      alert("Purchase Failed");
    }
  };

  // My Exams: only show exams the student has purchased
  const purchasedExams = exams.filter((e) => e.isPurchased);

  const filteredExams = purchasedExams;

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="My Exams" />
        
        <div className="me-premium-layout" style={{ padding: '24px', minHeight: 'calc(100vh - 70px)' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
              Loading...
            </div>
          ) : (
            (() => {
              if (filteredExams.length === 0) {
                return (
                  <div className="sd-empty" style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    minHeight: '350px', 
                    backgroundColor: 'var(--bg-card, #FFFFFF)', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border-color, #ECE9F7)', 
                    padding: '40px', 
                    textAlign: 'center' 
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary, #1a1a2e)', marginBottom: '8px' }}>No Purchased Exams</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary, #6B7280)', margin: 0 }}>Exams you purchase will appear here for you to attempt anytime.</p>
                  </div>
                );
              }
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                  {filteredExams.map((exam) => (
                    <div key={exam._id} className="me-my-exam-card">
                      <div>
                        {/* Tags */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <span style={{ 
                            fontSize: '11px', 
                            backgroundColor: 'rgba(110, 63, 243, 0.12)', 
                            color: '#6E3FF3', 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontWeight: '600',
                            textTransform: 'uppercase' 
                          }}>
                            {exam.subject || "Exam"}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 style={{ 
                          fontSize: '18px', 
                          fontWeight: '700', 
                          color: 'var(--text-primary, #1a1a2e)', 
                          marginBottom: '8px',
                          lineHeight: '1.4'
                        }}>
                          {exam.title}
                        </h3>
                        
                        {/* Subtitle / Details */}
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #6B7280)', margin: '0 0 16px 0' }}>
                          Attempt this premium quiz to test your preparation.
                        </p>
                      </div>

                      {/* Action */}
                      <button 
                        onClick={() => navigate(`/start-test`, { state: { quizId: exam._id } })}
                        className="me-btn-primary"
                        style={{ 
                          width: '100%', 
                          padding: '12px', 
                          fontSize: '14px', 
                          fontWeight: '600',
                          background: 'linear-gradient(135deg, #6E3FF3, #3B82F6)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        Start Test
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

export default ExamsPage;
