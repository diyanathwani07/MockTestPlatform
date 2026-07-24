import React, { useState, useEffect } from "react";
import axios from "axios";
import { Lock, Unlock, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css";

function PracticePage() {
  const [practice, setPractice] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPractice();
  }, []);

  const fetchPractice = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/practice", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setPractice(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handlePurchase = async (practiceId) => {
    try {
      await axios.post(
        "http://localhost:5000/api/purchase/practice",
        { practiceId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      alert("Purchase Successful!");
      fetchPractice();
    } catch (err) {
      console.error(err);
      alert("Purchase Failed");
    }
  };

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="My Practice" />
        <div className="sd-content" style={{ paddingTop: '20px' }}>
          {loading ? (
            <p>Loading...</p>
          ) : (
            (() => {
              const purchasedPractice = practice.filter((item) => item.isPurchased);
              if (purchasedPractice.length === 0) {
                return (
                  <div className="sd-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', backgroundColor: 'var(--bg-card, #111222)', borderRadius: '16px', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary, #ffffff)', marginBottom: '8px' }}>No Practice Modules Available</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>You haven't enrolled or purchased any practice modules yet.</p>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {purchasedPractice.map((item) => (
                    <div key={item._id} className="bg-white rounded-xl shadow-md p-6 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold">{item.title}</h3>
                        {item.isPaid && !item.isPurchased ? (
                          <Lock className="text-red-500" />
                        ) : (
                          <Unlock className="text-green-500" />
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{item.subject}</p>
                      
                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          {item.isPaid ? (
                            <span className="font-bold text-lg">₹{item.price}</span>
                          ) : (
                            <span className="text-green-600 font-semibold">Free</span>
                          )}
                        </div>
                        
                        {item.isPurchased || !item.isPaid ? (
                          <button 
                            onClick={() => navigate(`/dashboard/practice/test/${item._id}`)}
                            className="bg-green-100 text-green-700 px-4 py-2 rounded font-medium"
                          >
                            Practice Now
                          </button>
                        ) : (
                          <button 
                            onClick={() => handlePurchase(item._id)}
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

export default PracticePage;
