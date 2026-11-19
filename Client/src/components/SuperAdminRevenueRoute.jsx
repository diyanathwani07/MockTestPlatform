import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert, AlertTriangle, ArrowLeft } from "lucide-react";

export default function SuperAdminRevenueRoute({ children }) {
  const { role, loading, token } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!token) return <Navigate to="/" replace />;

  const isRevenueEnabled = import.meta.env.VITE_ENABLE_REVENUE_DASHBOARD === "true";

  // Kill Switch check
  if (!isRevenueEnabled) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#08070B",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', sans-serif",
        color: "#F8FAFC"
      }}>
        <div style={{
          maxWidth: "480px",
          width: "100%",
          background: "#121118",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "36px 32px",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
        }}>
          <div style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            color: "#F59E0B"
          }}>
            <AlertTriangle size={30} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "#F8FAFC" }}>
            Revenue Management Disabled
          </h2>
          <p style={{ fontSize: "14px", color: "#94A3B8", lineHeight: "1.6", marginBottom: "24px" }}>
            Revenue Management is currently disabled by system administrator configuration.
          </p>
          <button
            onClick={() => navigate("/admin/dashboard")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#F8FAFC",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
          >
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Super Admin Authorization check
  if (role !== "superadmin") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#08070B",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', sans-serif",
        color: "#F8FAFC"
      }}>
        <div style={{
          maxWidth: "500px",
          width: "100%",
          background: "#121118",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          borderRadius: "16px",
          padding: "36px 32px",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
        }}>
          <div style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            color: "#EF4444"
          }}>
            <ShieldAlert size={30} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "#F8FAFC" }}>
            403 - Super Admin Access Required
          </h2>
          <p style={{ fontSize: "14px", color: "#94A3B8", lineHeight: "1.6", marginBottom: "24px" }}>
            Revenue Management contains confidential financial data and is exclusively restricted to the Super Administrator. Staff accounts, normal administrators, and permission delegations cannot access this area.
          </p>
          <button
            onClick={() => navigate("/admin/dashboard")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#F8FAFC",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
          >
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return children;
}
