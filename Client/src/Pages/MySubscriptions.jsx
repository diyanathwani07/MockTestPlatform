import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Calendar,
  Zap,
  ArrowRight,
  ArrowLeft,
  RefreshCcw,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import "../css/StudentDashboard.css";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function MySubscriptions() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [fallbackPlan, setFallbackPlan] = useState(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      // 1. Fetch Subscription History (with fallback if primary remote returns 404 in dev)
      let historyData = null;
      try {
        const res = await axios.get(`${apiUrl}/api/subscription/my`, { headers });
        historyData = res.data;
      } catch (subErr) {
        // If 404 and running locally, fallback attempt to localhost:5000
        if (
          subErr.response?.status === 404 &&
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
          apiUrl !== "http://localhost:5000"
        ) {
          try {
            const localRes = await axios.get("http://localhost:5000/api/subscription/my", { headers });
            historyData = localRes.data;
          } catch {
            historyData = null;
          }
        }
        if (!historyData) {
          console.warn("Could not fetch subscription history from server:", subErr.message);
        }
      }

      // 2. Fetch Live Premium Status & Credits
      let statusData = null;
      try {
        const statusRes = await axios.get(`${apiUrl}/api/ai-tests/premium-status`, { headers });
        statusData = statusRes.data;
      } catch {
        // Fallback from localStorage
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (storedUser.isPremium) {
          statusData = {
            isPremium: true,
            aiCredits: storedUser.aiCredits || 100,
            activePlan: storedUser.activePlan || null
          };
        }
      }

      if (statusData) {
        setUserProfile(statusData);

        // If user is premium and has activePlan ID, fetch plan name for fallback display
        if (statusData.isPremium && statusData.activePlan) {
          try {
            const planRes = await axios.get(`${apiUrl}/api/admin/ai-plans/${statusData.activePlan}`, { headers });
            setFallbackPlan(planRes.data);
          } catch {
            setFallbackPlan({ name: "AI Premium Plan" });
          }
        }
      }

      if (Array.isArray(historyData)) {
        setSubscriptions(historyData);
      } else if (!statusData?.isPremium) {
        // If history failed and user is not verified premium, flag error
        if (!historyData) {
          setError("Unable to load subscriptions from server. Please check your connection.");
        }
      }
    } catch (err) {
      console.error("Fetch My Subscriptions Error:", err);
      setError("Unable to load your subscriptions. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const now = new Date();

  // Find currently active subscription from history
  let activeSubscription = subscriptions.find(
    (sub) => sub.status === "active" && new Date(sub.expiryDate) > now
  );

  // If not found in history, but user profile has active isPremium, synthesize active plan card
  if (!activeSubscription && userProfile?.isPremium) {
    activeSubscription = {
      _id: "active-cached",
      planNameSnapshot: fallbackPlan?.name || "AI Premium Plan",
      purchaseId: "MEMBERSHIP-ACTIVE",
      amount: fallbackPlan?.sellingPrice || 499,
      aiCreditsGranted: userProfile?.aiCredits || 100,
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "active",
      paymentGateway: "phonepe"
    };
  }

  // Past subscriptions (all non-active ones)
  const pastSubscriptions = subscriptions.filter(
    (sub) => !activeSubscription || sub._id !== activeSubscription._id
  );

  const getStatusBadge = (status, expiryDate) => {
    const isActuallyExpired = status === "expired" || (expiryDate && new Date(expiryDate) <= now);

    if (status === "active" && !isActuallyExpired) {
      return (
        <Badge variant="success" className="gap-1 font-semibold text-[11px]">
          <CheckCircle2 className="w-3 h-3" /> Active
        </Badge>
      );
    }
    if (status === "cancelled") {
      return (
        <Badge variant="destructive" className="gap-1 font-semibold text-[11px]">
          <XCircle className="w-3 h-3" /> Cancelled
        </Badge>
      );
    }
    if (status === "refunded") {
      return (
        <Badge variant="outline" className="gap-1 font-semibold text-[11px]">
          Refunded
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 font-semibold text-[11px]">
        <Clock className="w-3 h-3" /> Expired
      </Badge>
    );
  };

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return 0;
    const diff = new Date(expiryDate).getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const hasAnyData = !!activeSubscription || subscriptions.length > 0;

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="My Subscriptions" />

        <div className="sd-content" style={{ padding: "24px 32px 60px", maxWidth: "100%", margin: "0 auto 0 0", width: "100%", boxSizing: "border-box" }}>
          
          {/* Top Actions Row */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "20px" }}>
            <button
              onClick={() => navigate("/dashboard/pricing")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--violet, #6E3FF3)",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "opacity 0.2s ease"
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explore Plans</span>
            </button>
          </div>

          {/* Skeletons Loading */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : error && !hasAnyData ? (
            /* Error State (when failed and no cached active sub) */
            <div style={{
              background: "var(--bg-card, #1c1b2e)",
              border: "1.5px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "16px",
              padding: "48px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px"
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#EF4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px 0" }}>
                  Unable to connect to subscription services
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, maxWidth: "420px", lineHeight: "1.5" }}>
                  {error}
                </p>
              </div>
              <button
                onClick={fetchSubscriptions}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "var(--violet, #6E3FF3)",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : !hasAnyData ? (
            /* Clean Empty State: Never purchased anything */
            <div style={{
              background: "var(--bg-card, #1c1b2e)",
              border: "1.5px solid var(--border-color, #2e2c45)",
              borderRadius: "16px",
              padding: "56px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
            }}>
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(110, 63, 243, 0.12)",
                color: "var(--violet, #6E3FF3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "4px"
              }}>
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div>
                <h3 style={{ fontSize: "19px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px 0" }}>
                  You haven't purchased an AI plan yet
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", margin: 0, maxWidth: "440px", lineHeight: "1.5" }}>
                  Unlock personalized AI test generators, in-depth question explanations, and weak topic analysis to boost your preparation.
                </p>
              </div>
              <button
                onClick={() => navigate("/dashboard/pricing")}
                style={{
                  marginTop: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "var(--violet, #6E3FF3)",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(110,63,243,0.3)"
                }}
              >
                <span>View AI Pricing Plans</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Subscriptions Content */
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* 1. Highlighted Current Active Subscription Card */}
              {activeSubscription ? (
                <div style={{
                  background: "linear-gradient(135deg, rgba(110,63,243,0.08) 0%, rgba(45,27,105,0.12) 100%)",
                  border: "2px solid var(--violet, #6E3FF3)",
                  borderRadius: "16px",
                  padding: "24px 28px",
                  boxShadow: "0 8px 30px rgba(110,63,243,0.12)",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {/* Top Bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <Badge variant="success" className="gap-1 font-bold text-xs py-1 px-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE MEMBERSHIP
                        </Badge>
                        <span style={{ fontSize: "11.5px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                          #{activeSubscription.purchaseId}
                        </span>
                      </div>
                      <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", margin: "4px 0 0 0" }}>
                        {activeSubscription.planNameSnapshot || activeSubscription.planId?.name || "AI Subscription Plan"}
                      </h2>
                    </div>

                    <button
                      onClick={() => navigate("/dashboard/create-custom-quiz")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "var(--violet, #6E3FF3)",
                        color: "#ffffff",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        border: "none",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Create AI Test</span>
                    </button>
                  </div>

                  {/* Metrics Grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "16px",
                    padding: "16px 0",
                    borderTop: "1px solid rgba(110,63,243,0.2)",
                    borderBottom: "1px solid rgba(110,63,243,0.2)"
                  }}>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>
                        AI CREDITS AVAILABLE
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>{userProfile?.aiCredits ?? activeSubscription.aiCreditsGranted ?? 0}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>
                        START DATE
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginTop: "4px" }}>
                        {new Date(activeSubscription.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>
                        EXPIRES ON
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#10B981", marginTop: "4px" }}>
                        {new Date(activeSubscription.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        <span style={{ fontSize: "11.5px", fontWeight: "500", color: "var(--text-secondary)", marginLeft: "6px" }}>
                          ({getDaysLeft(activeSubscription.expiryDate)} days left)
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>
                        AMOUNT PAID
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", marginTop: "4px" }}>
                        ₹{activeSubscription.amount}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Renewal Hint */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", fontSize: "12px", color: "var(--text-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Secured via {activeSubscription.paymentGateway?.toUpperCase()}</span>
                    </div>
                    <button
                      onClick={() => navigate("/dashboard/pricing")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--violet, #6E3FF3)",
                        fontWeight: "600",
                        fontSize: "12px",
                        cursor: "pointer",
                        textDecoration: "underline"
                      }}
                    >
                      Extend / Upgrade Plan →
                    </button>
                  </div>
                </div>
              ) : (
                /* No Active Subscription Banner */
                <div style={{
                  background: "var(--bg-card, #1c1b2e)",
                  border: "1px solid var(--border-color, #2e2c45)",
                  borderRadius: "14px",
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(245,158,11,0.12)", color: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-primary)" }}>
                        No Active Subscription
                      </div>
                      <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        Your previous plan has expired. Renew to continue creating AI tests.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/dashboard/pricing")}
                    style={{
                      background: "var(--violet, #6E3FF3)",
                      color: "#ffffff",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    Renew Subscription
                  </button>
                </div>
              )}

              {/* 2. All / Past Subscriptions Order History */}
              {subscriptions.length > 0 && (
                <div style={{
                  background: "var(--bg-card, #1c1b2e)",
                  border: "1.5px solid var(--border-color, #2e2c45)",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
                }}>
                  <div style={{ marginBottom: "18px" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                      Order & Payment History ({subscriptions.length})
                    </h3>
                    <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0 }}>
                      Detailed receipts of all your past plan purchases.
                    </p>
                  </div>

                  <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left", minWidth: "600px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1.5px solid var(--border-color, #2e2c45)", background: "rgba(255,255,255,0.02)" }}>
                          <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)" }}>PLAN</th>
                          <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)" }}>ORDER REF</th>
                          <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)" }}>AMOUNT</th>
                          <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)" }}>GATEWAY</th>
                          <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)" }}>PURCHASED ON</th>
                          <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)" }}>VALID UNTIL</th>
                          <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)" }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptions.map((sub) => (
                          <tr key={sub._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "12px 14px", fontWeight: "600", color: "var(--text-primary)" }}>
                              {sub.planNameSnapshot || sub.planId?.name || "AI Plan"}
                            </td>
                            <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: "11.5px", color: "var(--text-muted)" }}>
                              {sub.purchaseId}
                            </td>
                            <td style={{ padding: "12px 14px", fontWeight: "700", color: "var(--text-primary)" }}>
                              ₹{sub.amount}
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                                <CreditCard className="w-2.5 h-2.5 mr-1" />
                                {sub.paymentGateway}
                              </Badge>
                            </td>
                            <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "12px" }}>
                              {new Date(sub.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "12px" }}>
                              {new Date(sub.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              {getStatusBadge(sub.status, sub.expiryDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
