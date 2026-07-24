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
      const res = await axios.get("http://localhost:5000/api/quizzes", {
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
        "http://localhost:5000/api/purchase/exam",
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

  const filteredExams = exams.filter((e) => {
    if (filter === "Free") return !e.isPaid;
    if (filter === "Premium") return e.isPaid;
    return true;
  });

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="My Exams" />
        <div className="sd-content" style={{ paddingTop: '20px' }}>
          {(() => {
            const purchasedExams = filteredExams.filter((item) => item.isPurchased);
            const isEmpty = purchasedExams.length === 0;
            return (
              <>
                {!isEmpty && (
                  <div className="flex justify-end items-center mb-6">
                    <div className="flex gap-4">
                      {["All", "Free", "Premium"].map((f) => (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`px-4 py-2 rounded ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {loading ? (
            <p>Loading...</p>
          ) : (
            (() => {
              const purchasedExams = filteredExams.filter((item) => item.isPurchased);
              if (purchasedExams.length === 0) {
                return (
                  <div className="sd-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', backgroundColor: 'var(--bg-card, #111222)', borderRadius: '16px', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary, #ffffff)', marginBottom: '8px' }}>No Exam Series Available</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>You haven't enrolled or purchased any exam series yet.</p>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {purchasedExams.map((exam) => (
                    <div key={exam._id} className="bg-white rounded-xl shadow-md p-6 flex flex-col relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold">{exam.title}</h3>
                        {exam.isPaid && !exam.isPurchased ? (
                          <Lock className="text-red-500" />
                        ) : (
                          <Unlock className="text-green-500" />
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{exam.subject}</p>
                      
                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          {exam.isPaid ? (
                            <span className="font-bold text-lg">₹{exam.price}</span>
                          ) : (
                            <span className="text-green-600 font-semibold">Free</span>
                          )}
                        </div>
                        
                        {exam.isPurchased || !exam.isPaid ? (
                          <button 
                            onClick={() => navigate(`/start-test`, { state: { quizId: exam._id } })}
                            className="bg-green-100 text-green-700 px-4 py-2 rounded font-medium"
                          >
                            View
                          </button>
                        ) : (
                          <button 
                            onClick={() => handlePurchase(exam._id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded font-medium flex items-center gap-2"
                          >
                            <ShoppingCart size={16} /> Buy Now
                          </button>
                        )}
                      </div>
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
