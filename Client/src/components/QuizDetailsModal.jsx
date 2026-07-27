import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, X, Play, Clock, FileText } from "lucide-react";
import axios from "axios";

function QuizDetailsModal({ quiz, onClose, attemptedCount = 0 }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currency, setCurrency] = useState("INR");
  const [purchasing, setPurchasing] = useState(false);

  const plans = quiz.plans && quiz.plans.length > 0 
    ? quiz.plans 
    : [{ durationMonths: 1, price: quiz.price || 99, discountLabel: "90% off" }];

  // Select default plan (e.g. 1st plan)
  React.useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      setSelectedPlan(plans[0]);
    }
  }, [plans, selectedPlan]);

  const handleBuy = async () => {
    try {
      setPurchasing(true);
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to purchase exams.");
        return;
      }
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/purchase/exam`, 
        { examId: quiz._id, planMonths: selectedPlan?.durationMonths || 1 }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Purchase Successful! You can now attempt this exam.");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Purchase failed. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(8px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "#11131e",
        border: "1.5px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "20px",
        width: "100%",
        maxWidth: "920px",
        height: "90vh",
        maxHeight: "650px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.8)"
      }}>
        {/* Header Title */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", padding: "4px 10px", borderRadius: "100px", background: "rgba(110, 63, 243, 0.15)", color: "#A78BFA", letterSpacing: "0.5px" }}>Premium Mock Series</span>
            <h3 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#FFFFFF" }}>{quiz.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#A0AEC0", cursor: "pointer", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Row */}
        <div style={{
          display: "flex",
          gap: "32px",
          padding: "0 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}>
          {["Overview", "Content"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "transparent",
                border: "none",
                color: activeTab === tab ? "#8B5CF6" : "#A0AEC0",
                fontSize: "14px",
                fontWeight: "600",
                padding: "16px 0",
                borderBottom: activeTab === tab ? "2px solid #8B5CF6" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Body Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          flex: 1,
          overflow: "hidden"
        }}>
          {/* Left panel info */}
          <div style={{
            padding: "24px",
            overflowY: "auto",
            borderRight: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            {activeTab === "Overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#E2E8F0", fontSize: "14px", lineHeight: "1.6" }}>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#FFFFFF" }}>Description</h4>
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {quiz.detailedDescription || `${quiz.title} is a complete mock exam practice course specially designed to help you prepare effectively, including topic-wise practice, in-depth subject coverage, and full simulated conditions.`}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  <div style={{ color: "#EF4444", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#EF4444" }}></span>
                    Exclusive Launch Offer
                  </div>
                  {plans.map((p, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => setSelectedPlan(p)}>
                      <input 
                        type="radio" 
                        name="subPlan" 
                        checked={selectedPlan?.durationMonths === p.durationMonths}
                        onChange={() => setSelectedPlan(p)}
                        style={{ accentColor: "#8B5CF6" }}
                      />
                      <span>{p.durationMonths} Month{p.durationMonths > 1 ? 's' : ''} — <strong>₹{p.price}</strong></span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", marginTop: "12px" }}>
                  <div style={{ color: "#EF4444", fontWeight: "600" }}>🔴 Note:</div>
                  <div style={{ fontSize: "12px", color: "#A0AEC0" }}>Available only for registered student accounts. Ensure safe network conditions before starting attempt.</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#E2E8F0", fontSize: "12.5px", marginTop: "12px" }}>
                  <AlertTriangle size={14} style={{ color: "#F59E0B" }} />
                  <span>Note: No Refund Policy</span>
                </div>
              </div>
            )}

            {activeTab === "Content" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#FFFFFF" }}>Exam Content Overview</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", color: "#E2E8F0" }}>
                    <FileText size={15} style={{ color: "#8B5CF6" }} />
                    <span>Multiple assessment sections and real-time marking keys.</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", color: "#E2E8F0" }}>
                    <Clock size={15} style={{ color: "#8B5CF6" }} />
                    <span>Duration configuration: {Math.round(quiz.duration / 60)} minutes total.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel buy trigger */}
          <div style={{
            padding: "24px",
            backgroundColor: "#151726",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            {/* Plan selector header */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "#A0AEC0" }}>PRICE</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                    {currency === "USD" ? (
                      <>
                        <span style={{ fontSize: "28px", fontWeight: "800", color: "#FFFFFF" }}>
                          ${((selectedPlan?.price || quiz.price || 99) / 83).toFixed(2)}
                        </span>
                        <span style={{ fontSize: "14px", color: "#A0AEC0", textDecoration: "line-through" }}>
                          ${(((selectedPlan?.price || quiz.price || 99) * 10) / 83).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "28px", fontWeight: "800", color: "#FFFFFF" }}>
                          ₹{selectedPlan?.price || quiz.price || 99}
                        </span>
                        <span style={{ fontSize: "14px", color: "#A0AEC0", textDecoration: "line-through" }}>
                          ₹{Math.round((selectedPlan?.price || quiz.price || 99) * 10)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {selectedPlan?.discountLabel && (
                  <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", padding: "4px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: "700" }}>
                    {selectedPlan.discountLabel}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#A0AEC0" }}>Choose Currency:</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#1E2030",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    outline: "none"
                  }}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD (PayPal/Stripe)</option>
                </select>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "11px", color: "#A0AEC0", textAlign: "center" }}>
                Secured Checkout. 100% encrypted gateway.
              </div>
              <button
                onClick={handleBuy}
                disabled={purchasing}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: purchasing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 20px rgba(139, 92, 246, 0.25)",
                  transition: "all 0.2s ease"
                }}
              >
                {purchasing ? "Processing Payment..." : (
                  currency === "USD" 
                    ? `Buy Now — $${((selectedPlan?.price || quiz.price || 99) / 83).toFixed(2)}`
                    : `Buy Now — ₹${selectedPlan?.price || quiz.price || 99}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizDetailsModal;
