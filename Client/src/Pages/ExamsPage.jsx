import React, { useState, useEffect } from "react";
import axios from "axios";
import { Lock, Unlock, ShoppingCart, Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css";

function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredExams = purchasedExams.filter((exam) => {
    return (
      (exam.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.subject || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="My Exams" />
        
        <div className="me-premium-layout" style={{ padding: '24px', minHeight: 'calc(100vh - 70px)' }}>
          {!loading && purchasedExams.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "24px" }}>
              <div className="me-search-wrapper" style={{ maxWidth: "320px", width: "100%", margin: 0 }}>
                <Search className="me-search-icon" size={18} />
                <input 
                  type="text" 
                  className="me-search-input" 
                  placeholder="Search exams..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gap: '16px', color: 'var(--text-secondary)' }}>
              <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--violet)' }} />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              <p style={{ fontSize: '15px', fontWeight: '500' }}>Loading exams...</p>
            </div>
          ) : (
            (() => {
              if (filteredExams.length === 0) {
                const isSearchActive = searchQuery.trim() !== "";
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
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>{isSearchActive ? '🔍' : '📭'}</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary, #1a1a2e)', marginBottom: '8px' }}>
                      {isSearchActive ? "No Matching Exams" : "No Purchased Exams"}
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary, #6B7280)', margin: 0 }}>
                      {isSearchActive 
                        ? "Try adjusting your search query or keywords." 
                        : "Exams you purchase will appear here for you to attempt anytime."}
                    </p>
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
                        onClick={() => navigate(`/start-test`, { state: { quizId: exam._id, fromExamsPage: true } })}
                        className="me-btn-primary"
                        style={{ 
                          width: '100%', 
                          padding: '12px', 
                          fontSize: '14px', 
                          fontWeight: '600',
                          background: 'var(--violet, #6E3FF3)',
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
