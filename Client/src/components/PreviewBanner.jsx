import React from "react";
import { useNavigate } from "react-router-dom";
import { usePreview } from "../context/PreviewContext";
import { Eye, LogOut } from "lucide-react";

function PreviewBanner() {
  const { previewMode, setPreviewMode } = usePreview();
  const navigate = useNavigate();

  if (!previewMode) return null;

  return (
    <div style={{
      width: "100%",
      backgroundColor: "#F59E0B",
      color: "#000",
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontWeight: "600",
      zIndex: 9999,
      position: "sticky",
      top: 0,
      left: 0,
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Eye size={20} />
        <span>STUDENT PREVIEW MODE: You are viewing the application as a student. No actions performed here will modify real data.</span>
      </div>
      <button 
        onClick={() => {
          setPreviewMode(false);
          navigate("/admin/dashboard");
        }}
        style={{
          backgroundColor: "#000",
          color: "#F59E0B",
          border: "none",
          borderRadius: "6px",
          padding: "6px 12px",
          cursor: "pointer",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}
      >
        <LogOut size={16} /> Return to Admin Dashboard
      </button>
    </div>
  );
}

export default PreviewBanner;
