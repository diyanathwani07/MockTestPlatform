import React, { useState, useEffect } from "react";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";

function AdminProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <div className="admin-main" style={{ flex: 1, backgroundColor: "#FAFAFC" }}>
        <AdminNavbar title="Administrator Profile" />
        
        <div className="admin-content" style={{ padding: "32px", maxWidth: "800px" }}>
          <div className="form-card" style={{ padding: "40px", borderRadius: "16px", backgroundColor: "#fff", border: "1.5px solid #ECE9F7" }}>
            
            {/* Header: Uses fullName */}
            <div style={{ display: "flex", gap: "24px", alignItems: "center", marginBottom: "32px" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #2D1B69, #6E3FF3)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "700" }}>
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <h2 style={{ fontSize: "24px", marginBottom: "4px" }}>{user.fullName || "User Name"}</h2>
                <p style={{ color: "#6E3FF3", fontWeight: "600", fontSize: "14px" }}>
                    {user.role === 'admin' ? " Admin" : "Standard User"}
                </p>
              </div>
            </div>

            {/* Details: Uses fullName and safely handles createdAt */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", borderTop: "1px solid rgba(168, 165, 189, 0.2)", paddingTop: "24px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#a8a5bd", textTransform: "uppercase", fontWeight: "700", display: "block" }}>Registered Email</label>
                <p style={{ fontSize: "15px", fontWeight: "500", marginTop: "4px" }}>{user.email}</p>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#a8a5bd", textTransform: "uppercase", fontWeight: "700", display: "block" }}>Security Clearance</label>
                <p style={{ fontSize: "15px", fontWeight: "500", marginTop: "4px" }}>
                    {user.role === 'admin' ? "All-Access Platform Override / DB Write" : "Standard Access"}
                </p>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#a8a5bd", textTransform: "uppercase", fontWeight: "700", display: "block" }}>Account Created</label>
                <p style={{ fontSize: "15px", fontWeight: "500", marginTop: "4px" }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "Date Unavailable"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminProfile;