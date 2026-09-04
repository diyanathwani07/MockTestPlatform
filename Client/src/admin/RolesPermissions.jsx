import React, { useState, useEffect } from "react";
import axios from "axios";
import { Shield, Plus, Edit2, Trash2, Copy, Users, X, Check } from "lucide-react";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";

const API = import.meta.env.VITE_API_URL;

/* Dashboard panel permissions — these match the sidebar pages exactly */
const PANEL_PERMISSIONS = [
  { key: "dashboard",             label: "Dashboard" },
  { key: "create_quiz",           label: "Create Quiz" },
  { key: "edit_quiz",             label: "Manage Quizzes" },
  { key: "manage_practice_tests", label: "Practice Modules" },
  { key: "manage_questions",      label: "Questions" },
  { key: "manage_users",          label: "Users" },
  { key: "manage_results",        label: "Results" },
  { key: "view_reports",          label: "Reports" },
  { key: "audit_logs",            label: "Audit Log" },
  { key: "support_tickets",       label: "Support Tickets" },
  { key: "manage_roles",          label: "Roles & Permissions" }
];

const COLORS = ["#6E3FF3", "#3B82F6", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B"];

const EMPTY_FORM = { name: "", description: "", permissions: [], color: "#6E3FF3", slackChannelId: "", slackNotificationsPaused: false };

function RolesPermissions() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/admin/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(res.data);
    } catch (e) {
      console.error("Fetch Departments Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreate = () => {
    setEditingDept(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (dept) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      description: dept.description || "",
      permissions: [...(dept.permissions || [])],
      color: dept.color || "#6E3FF3",
      slackChannelId: dept.slackChannelId || "",
      slackNotificationsPaused: dept.slackNotificationsPaused || false
    });
    setDrawerOpen(true);
  };

  const togglePermission = (key) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key]
    }));
  };


  const handleSave = async () => {
    if (!form.name.trim()) return alert("Department name is required.");
    setSaving(true);
    try {
      if (editingDept) {
        await axios.put(`${API}/api/admin/departments/${editingDept._id}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API}/api/admin/departments`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setDrawerOpen(false);
      fetchDepartments();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to save department.");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (dept) => {
    try {
      await axios.post(`${API}/api/admin/departments/${dept._id}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDepartments();
    } catch (e) {
      alert("Failed to duplicate department.");
    }
  };

  const handleDelete = async (dept) => {
    const isSystemDept = ["Technical Team", "Content Team", "Calling Team", "YouTube Team", "Faculty", "Operations Team"].includes(dept.name);
    if (isSystemDept) {
      if (!window.confirm(`"${dept.name}" is a default department. Deleting it might disrupt default flows. Are you sure you want to delete it?`)) return;
    } else {
      if (!window.confirm(`Delete department "${dept.name}"? This will clear department assignment for all users in this department.`)) return;
    }

    try {
      await axios.delete(`${API}/api/admin/departments/${dept._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDepartments();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete department.");
    }
  };



  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <AdminSidebar />
      <div className="admin-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-page, #0A0A14)" }}>
        <AdminNavbar title={<><span className="sm:hidden">Roles</span><span className="hidden sm:inline">Roles & Permissions</span></>} />
        <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
            <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #6E3FF3, #8B5CF6)", color: "#fff", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>
              <Plus size={16} /> Create Department
            </button>
          </div>

          {/* Departments Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>Loading departments...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
              {departments.map((dept, deptIdx) => {
                const displayColor = dept.color || COLORS[deptIdx % COLORS.length];
                return (
                  <div key={dept._id} style={{ background: "var(--bg-card, #131326)", border: "1.5px solid var(--border-color, #232338)", borderRadius: "16px", padding: "24px", position: "relative", overflow: "hidden" }}>
                    {/* Color stripe */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: displayColor, borderRadius: "16px 16px 0 0" }} />

                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${displayColor}22`, border: `1.5px solid ${displayColor}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Shield size={20} style={{ color: displayColor }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-primary)" }}>{dept.name}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => openEdit(dept)} title="Edit" style={{ padding: "6px", borderRadius: "8px", border: "1px solid var(--border-color, #232338)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}><Edit2 size={14} /></button>
                        <button onClick={() => handleDuplicate(dept)} title="Duplicate" style={{ padding: "6px", borderRadius: "8px", border: "1px solid var(--border-color, #232338)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}><Copy size={14} /></button>
                        <button onClick={() => handleDelete(dept)} title="Delete" style={{ padding: "6px", borderRadius: "8px", border: "1px solid var(--border-color, #232338)", background: "transparent", color: "var(--red, #EF4444)", cursor: "pointer" }}><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.5 }}>{dept.description || "No description."}</p>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Slack:</span>
                      {!dept.slackChannelId ? (
                        <span style={{ fontSize: "10.5px", padding: "2px 8px", borderRadius: "4px", background: "rgba(148, 163, 184, 0.12)", color: "var(--text-muted)", fontWeight: "700" }}>OFF</span>
                      ) : dept.slackNotificationsPaused ? (
                        <span style={{ fontSize: "10.5px", padding: "2px 8px", borderRadius: "4px", background: "rgba(239, 68, 68, 0.12)", color: "#EF4444", fontWeight: "700" }}>Paused</span>
                      ) : (
                        <span style={{ fontSize: "10.5px", padding: "2px 8px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.12)", color: "#10B981", fontWeight: "700" }}>ON</span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                        <Users size={14} />
                        <span>{dept.userCount || 0} active user{dept.userCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        <span>{dept.permissions?.length || 0} panel{dept.permissions?.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {/* Panel chips preview */}
                    <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {(dept.permissions || []).slice(0, 5).map(p => {
                        const found = PANEL_PERMISSIONS.find(pp => pp.key === p);
                        return (
                          <span key={p} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: `${displayColor}18`, color: displayColor, fontWeight: "500" }}>
                            {found ? found.label : p.replace(/_/g, " ")}
                          </span>
                        );
                      })}
                      {(dept.permissions || []).length > 5 && (
                        <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: "var(--bg-input, #1B1B32)", color: "var(--text-muted)" }}>+{(dept.permissions || []).length - 5} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "520px", maxWidth: "100vw", height: "100vh", background: "var(--bg-card, #131326)", borderLeft: "1.5px solid var(--border-color)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {/* Drawer Header */}
            <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Shield size={20} style={{ color: "#6E3FF3" }} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>{editingDept ? "Edit Department" : "Create New Department"}</h3>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
            </div>

            <div style={{ padding: "24px 28px", flex: 1 }}>
              {/* Name */}
              <label style={labelStyle}>Department Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Content Team" />

              {/* Description */}
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, height: "80px", resize: "vertical" }} placeholder="What does this department do?" />

              {/* Slack Notifications Section */}
              <div style={{ border: "1px solid var(--border-color)", borderRadius: "12px", padding: "16px", marginBottom: "20px", background: "rgba(255, 255, 255, 0.01)" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "var(--text-primary)", fontWeight: "600" }}>Slack Notifications Integration</h4>
                
                <label style={labelStyle}>Slack Channel ID</label>
                <input 
                  type="text"
                  value={form.slackChannelId} 
                  onChange={e => setForm({ ...form, slackChannelId: e.target.value })} 
                  style={{ ...inputStyle, marginBottom: "12px" }} 
                  placeholder="e.g. C12345678" 
                />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>Pause Notifications</span>
                  <div 
                    onClick={() => setForm({ ...form, slackNotificationsPaused: !form.slackNotificationsPaused })} 
                    style={{ width: "36px", height: "20px", borderRadius: "10px", background: form.slackNotificationsPaused ? "#EF4444" : "var(--border-color)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                  >
                    <div style={{ position: "absolute", top: "2px", left: form.slackNotificationsPaused ? "18px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </div>
                </div>
              </div>

              {/* Accent Color */}
              <label style={labelStyle}>Accent Color</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: "32px", height: "32px", borderRadius: "50%", background: c, border: form.color === c ? "3px solid #fff" : "3px solid transparent", cursor: "pointer", outline: form.color === c ? `2px solid ${c}` : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {form.color === c && <Check size={14} color="#fff" />}
                  </button>
                ))}
              </div>

              {/* Dashboard Panels */}
              <label style={labelStyle}>Dashboard Panels</label>
              <div style={{ border: "1px solid var(--border-color)", borderRadius: "10px", overflow: "hidden" }}>
                {PANEL_PERMISSIONS.map((panel, idx) => (
                  <div key={panel.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: idx < PANEL_PERMISSIONS.length - 1 ? "1px solid var(--border-color)" : "none", background: "var(--bg-card)" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary, #94a3b8)", fontWeight: "500" }}>{panel.label}</span>
                    <div onClick={() => togglePermission(panel.key)} style={{ width: "36px", height: "20px", borderRadius: "10px", background: form.permissions.includes(panel.key) ? "#6E3FF3" : "var(--border-color)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: "2px", left: form.permissions.includes(panel.key) ? "18px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: "20px 28px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "12px", position: "sticky", bottom: 0, background: "var(--bg-card)" }}>
              <button onClick={() => setDrawerOpen(false)} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid var(--border-color)", background: "transparent", color: "var(--text-primary)", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "11px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #6E3FF3, #8B5CF6)", color: "#fff", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : editingDept ? "Save Changes" : "Create Department"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "6px", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "16px" };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid var(--border-color)", background: "var(--bg-input, #1B1B32)", color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box", marginBottom: "4px" };

export default RolesPermissions;
