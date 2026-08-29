import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { Sparkles, Check, Loader2, ArrowRight } from "lucide-react";
import "../css/StudentDashboard.css";

function PricingPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasingPlanId, setPurchasingPlanId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchActivePlans();
  }, []);

  const fetchActivePlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/ai-plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(res.data);
    } catch (err) {
      console.error("Fetch plans error:", err);
      setError("Failed to load active plans.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    setPurchasingPlanId(planId);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/ai-plans/subscribe`,
        { planId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSuccess(true);
        // Update user state stored locally
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        user.isPremium = true;
        user.aiCredits = res.data.user.aiCredits;
        localStorage.setItem("user", JSON.stringify(user));
        
        setTimeout(() => {
          navigate("/dashboard/create-custom-quiz");
        }, 2000);
      }
    } catch (err) {
      console.error("Subscribe plan error:", err);
      setError(err.response?.data?.message || "Failed to complete purchase. Please try again.");
    } finally {
      setPurchasingPlanId(null);
    }
  };

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="AI Pricing Plans" />
        
        <div style={{ padding: "32px 24px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          
          {/* Header Description */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", margin: "0 0 8px 0" }}>Unlock Premium AI Features</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "15px", maxWidth: "600px", margin: "0 auto", lineHeight: "1.6" }}>
              Get access to personalized exam builder questions, Hindi/English pattern matching, and detailed explanations written by Gemini AI.
            </p>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px 16px", color: "#EF4444", fontSize: "14px", textAlign: "center", marginBottom: "24px" }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "10px", padding: "16px", color: "#10B981", fontSize: "15px", fontWeight: "600", textAlign: "center", marginBottom: "24px" }}>
              🎉 Subscription successful! Granting premium credits and redirecting to Custom Test...
            </div>
          )}

          {/* Cards Grid */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px", color: "var(--text-secondary)" }}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--violet)" }} />
            </div>
          ) : plans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)", fontSize: "14.5px" }}>
              No plans available at this moment. Please check back later.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 320px))",
              gap: "24px",
              justifyContent: "center"
            }}>
              {plans.map((plan) => {
                const discount = plan.originalPrice > plan.sellingPrice 
                  ? Math.round(((plan.originalPrice - plan.sellingPrice) / plan.originalPrice) * 100)
                  : 0;

                return (
                  <div key={plan._id} style={{
                    background: "var(--bg-card, #1c1b2e)",
                    borderRadius: "16px",
                    border: plan.isFeatured ? "2px solid var(--violet, #6E3FF3)" : "1px solid var(--border-color)",
                    padding: "32px 24px",
                    boxShadow: plan.isFeatured ? "0 10px 30px rgba(110,63,243,0.12)" : "0 4px 12px rgba(0,0,0,0.03)",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "24px",
                    transform: plan.isFeatured ? "scale(1.02)" : "none",
                    transition: "transform 0.25s ease"
                  }}>
                    {plan.isFeatured && (
                      <span style={{
                        position: "absolute",
                        top: "-12px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "var(--violet, #6E3FF3)",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        padding: "4px 14px",
                        borderRadius: "20px",
                        letterSpacing: "0.5px"
                      }}>RECOMMENDED</span>
                    )}

                    <div>
                      {/* Name & description */}
                      <h4 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>{plan.name}</h4>
                      <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", minHeight: "45px" }}>
                        {plan.description || "Unlock high-quality AI practice quizzes designed by Teaching Pariksha."}
                      </p>

                      {/* Price info */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "20px" }}>
                        <span style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)" }}>₹{plan.sellingPrice}</span>
                        {plan.originalPrice > plan.sellingPrice && (
                          <>
                            <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "15px" }}>₹{plan.originalPrice}</span>
                            <span style={{ color: "#10B981", fontSize: "13.5px", fontWeight: "700" }}>{discount}% OFF</span>
                          </>
                        )}
                      </div>

                      {/* Duration / credits info */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)", marginTop: "16px" }}>
                        <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", fontWeight: "600" }}>Valid for {plan.durationValue} {plan.durationUnit}</span>
                        <span style={{ fontSize: "12.5px", color: "var(--violet, #6E3FF3)", fontWeight: "700" }}>{plan.aiCredits} Credits</span>
                      </div>

                      {/* Features */}
                      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "18px", marginTop: "20px" }}>
                        <p style={{ margin: "0 0 10px 0", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>FEATURES INCLUDED</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {plan.features.map(feat => (
                            <div key={feat} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)" }}>
                              <Check size={14} style={{ color: "#10B981", flexShrink: 0 }} />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button 
                      onClick={() => handleSubscribe(plan._id)}
                      disabled={purchasingPlanId !== null || success}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "8px",
                        border: "none",
                        background: "var(--violet, #6E3FF3)",
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        opacity: purchasingPlanId === plan._id ? 0.75 : 1
                      }}
                    >
                      {purchasingPlanId === plan._id ? (
                        <>
                          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Unlocking...
                        </>
                      ) : (
                        <>
                          Subscribe Now <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default PricingPlans;
