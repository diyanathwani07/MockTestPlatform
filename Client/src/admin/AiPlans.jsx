import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { 
  Sparkles, Plus, Edit2, Trash2, Check, X, ShieldAlert, 
  HelpCircle, CheckCircle, Eye, RefreshCw, Layers 
} from "lucide-react";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

const AVAILABLE_FEATURES = [
  "AI Test Builder",
  "Personalized Questions",
  "Exam Pattern Matching",
  "English + Hindi",
  "AI Explanations",
  "Difficulty Selection",
  "Weak Topic Recommendations"
];

function AdminAiPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [exams, setExams] = useState([]);
  const [metrics, setMetrics] = useState({
    activePlansCount: 0,
    totalSubscribers: 0,
    aiTestsGenerated: 0,
    activeRevenue: 0
  });

  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  
  // Form/Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    originalPrice: 199,
    sellingPrice: 99,
    durationValue: 30,
    durationUnit: "days",
    aiCredits: 500,
    maxAITests: 20,
    features: ["AI Test Builder", "Personalized Questions", "Exam Pattern Matching", "English + Hindi", "AI Explanations"],
    allowedExamIds: [],
    isFeatured: false,
    status: "draft",
    displayOrder: 0
  });

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchExams();
    fetchMetrics();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/ai-plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(res.data);
    } catch (err) {
      console.error("Fetch AI Plans error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-series`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(res.data);
    } catch (err) {
      console.error("Fetch exam series error:", err);
    }
  };

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/ai-plans/dashboard-metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(res.data);
    } catch (err) {
      console.error("Fetch dashboard metrics error:", err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const calculateDiscount = () => {
    if (!form.originalPrice || !form.sellingPrice) return 0;
    if (form.sellingPrice >= form.originalPrice) return 0;
    const diff = form.originalPrice - form.sellingPrice;
    return Math.round((diff / form.originalPrice) * 100);
  };

  const handleOpenCreate = () => {
    setForm({
      name: "",
      description: "",
      originalPrice: 199,
      sellingPrice: 99,
      durationValue: 30,
      durationUnit: "days",
      aiCredits: 500,
      maxAITests: 20,
      features: ["AI Test Builder", "Personalized Questions", "Exam Pattern Matching", "English + Hindi", "AI Explanations"],
      allowedExamIds: [],
      isFeatured: false,
      status: "draft",
      displayOrder: 0
    });
    setFormError("");
    setEditMode(false);
    setSelectedPlanId(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (plan) => {
    setForm({
      name: plan.name,
      description: plan.description || "",
      originalPrice: plan.originalPrice,
      sellingPrice: plan.sellingPrice,
      durationValue: plan.durationValue,
      durationUnit: plan.durationUnit,
      aiCredits: plan.aiCredits,
      maxAITests: plan.maxAITests || 0,
      features: plan.features || [],
      allowedExamIds: plan.allowedExamIds ? plan.allowedExamIds.map(e => e._id || e) : [],
      isFeatured: plan.isFeatured || false,
      status: plan.status || "draft",
      displayOrder: plan.displayOrder || 0
    });
    setFormError("");
    setEditMode(true);
    setSelectedPlanId(plan._id);
    setShowFormModal(true);
  };

  const handleFeatureToggle = (feature) => {
    const updated = form.features.includes(feature)
      ? form.features.filter(f => f !== feature)
      : [...form.features, feature];
    setForm({ ...form, features: updated });
  };

  const handleExamToggle = (examId) => {
    const updated = form.allowedExamIds.includes(examId)
      ? form.allowedExamIds.filter(id => id !== examId)
      : [...form.allowedExamIds, examId];
    setForm({ ...form, allowedExamIds: updated });
  };

  const handleSelectAllExams = () => {
    if (form.allowedExamIds.length === exams.length) {
      setForm({ ...form, allowedExamIds: [] });
    } else {
      setForm({ ...form, allowedExamIds: exams.map(e => e._id) });
    }
  };

  const [newExamTitle, setNewExamTitle] = useState("");
  const [addingExam, setAddingExam] = useState(false);

  const handleQuickAddExam = async () => {
    if (!newExamTitle.trim()) return;
    setAddingExam(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/exam-series`, {
        title: newExamTitle.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newExam = res.data;
      setExams([...exams, newExam]);
      setForm(prev => ({ ...prev, allowedExamIds: [...prev.allowedExamIds, newExam._id] }));
      setNewExamTitle("");
    } catch (err) {
      console.error("Quick add exam error:", err);
      alert(err.response?.data?.message || "Failed to add exam.");
    } finally {
      setAddingExam(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    
    if (!form.name.trim()) return setFormError("Plan Name is required.");
    if (form.sellingPrice > form.originalPrice) {
      return setFormError("Selling price cannot exceed original price.");
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (editMode) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/ai-plans/${selectedPlanId}`, form, { headers });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/ai-plans`, form, { headers });
      }

      setShowFormModal(false);
      fetchPlans();
      fetchMetrics();
    } catch (err) {
      console.error("Save AI plan error:", err);
      setFormError(err.response?.data?.message || "Failed to save AI Plan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (planId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/ai-plans/${planId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPlans();
      fetchMetrics();
    } catch (err) {
      console.error("Change status error:", err);
      alert("Failed to update status.");
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this AI Plan? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/ai-plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPlans();
      fetchMetrics();
    } catch (err) {
      console.error("Delete AI Plan error:", err);
      alert("Failed to delete plan.");
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="AI Plans" />
        
        <div className="admin-content-inner" style={{ padding: "24px" }}>
          
          {/* Analytics Overview Cards */}
          <div className="admin-stats-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <div className="armored-stat-card" style={{ background: "var(--bg-card)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }}>Active Plans</p>
              <h3 style={{ margin: "8px 0 0 0", fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>
                {metricsLoading ? "..." : metrics.activePlansCount}
              </h3>
            </div>
            <div 
              className="armored-stat-card" 
              onClick={() => navigate("/admin/ai-subscribers")}
              style={{ 
                background: "var(--bg-card)", 
                padding: "20px", 
                borderRadius: "12px", 
                border: "1px solid var(--border-color)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              title="Click to view all AI Subscribers"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }}>Total Subscribers</p>
                <span style={{ fontSize: "11px", color: "var(--violet)", fontWeight: "600" }}>View Subscribers →</span>
              </div>
              <h3 style={{ margin: "8px 0 0 0", fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>
                {metricsLoading ? "..." : metrics.totalSubscribers}
              </h3>
            </div>
            <div className="armored-stat-card" style={{ background: "var(--bg-card)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }}>AI Tests Generated</p>
              <h3 style={{ margin: "8px 0 0 0", fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>
                {metricsLoading ? "..." : metrics.aiTestsGenerated}
              </h3>
            </div>
            <div 
              className="armored-stat-card" 
              onClick={() => navigate("/admin/revenue")}
              style={{ 
                background: "var(--bg-card)", 
                padding: "20px", 
                borderRadius: "12px", 
                border: "1px solid var(--border-color)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              title="Click to view full Revenue Analytics Dashboard"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }}>Active Revenue</p>
                <span style={{ fontSize: "11px", color: "var(--violet)", fontWeight: "600" }}>View Analytics →</span>
              </div>
              <h3 style={{ margin: "8px 0 0 0", fontSize: "28px", fontWeight: "800", color: "var(--violet, #6E3FF3)" }}>
                {metricsLoading ? "..." : `₹${metrics.activeRevenue}`}
              </h3>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>AI Subscription Plans</h2>
            <button 
              onClick={handleOpenCreate}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "8px",
                border: "none",
                background: "var(--violet, #6E3FF3)",
                color: "#fff",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(110,63,243,0.2)"
              }}
            >
              <Plus size={16} /> Create AI Plan
            </button>
          </div>

          {/* Plans Table */}
          <div className="reports-table-wrapper" style={{
            background: "var(--bg-card)",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            overflow: "hidden"
          }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                Loading AI Plans...
              </div>
            ) : plans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                No AI subscription plans configured. Create one to get started!
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="report-table-body" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-color)" }}>
                      <th style={{ textAlign: "left", padding: "14px 20px", fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>Plan Name</th>
                      <th style={{ textAlign: "left", padding: "14px 20px", fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>Pricing</th>
                      <th style={{ textAlign: "left", padding: "14px 20px", fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>Duration</th>
                      <th style={{ textAlign: "left", padding: "14px 20px", fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>Max AI Tests</th>
                      <th style={{ textAlign: "left", padding: "14px 20px", fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>Status</th>
                      <th style={{ textAlign: "center", padding: "14px 20px", fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr key={plan._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>{plan.name}</span>
                            {plan.isFeatured && (
                              <span style={{
                                fontSize: "10px",
                                background: "rgba(245, 158, 11, 0.15)",
                                color: "#F59E0B",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "700"
                              }}>Recommended</span>
                            )}
                          </div>
                          {plan.description && (
                            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-secondary)", maxWIdth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {plan.description}
                            </p>
                          )}
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>₹{plan.sellingPrice}</span>
                            {plan.originalPrice > plan.sellingPrice && (
                              <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "12px" }}>₹{plan.originalPrice}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px", color: "var(--text-primary)" }}>
                          {plan.durationValue} {plan.durationUnit}
                        </td>
                        <td style={{ padding: "14px 20px", color: "var(--text-primary)", fontWeight: "600" }}>
                          {plan.maxAITests || "Unlimited"} Tests
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <select 
                            value={plan.status}
                            onChange={(e) => handleStatusChange(plan._id, e.target.value)}
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              color: plan.status === "active" ? "#10B981" : plan.status === "draft" ? "#F59E0B" : "var(--text-secondary)",
                              padding: "4px 8px",
                              fontWeight: "700",
                              fontSize: "12.5px"
                            }}
                          >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button 
                              onClick={() => handleOpenEdit(plan)}
                              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                              title="Edit Plan"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(plan._id)}
                              style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}
                              title="Delete Plan"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reusable Plan Form Modal (Create & Edit Mode with Live Preview!) */}
      {showFormModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "20px"
        }}>
          <div style={{
            background: "var(--bg-card, #131428)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            width: "900px",
            maxWidth: "100%",
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
                {editMode ? "Edit AI Subscription Plan" : "Create AI Subscription Plan"}
              </h3>
              <button 
                onClick={() => setShowFormModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body with form on left and live preview on right */}
            <div style={{ display: "flex", overflowY: "auto", flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
              
              {/* Form Side */}
              <form onSubmit={handleSubmit} style={{ flex: "1 1 450px", minWidth: "280px", padding: "24px", borderRight: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)" }}>
                {formError && (
                  <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #EF4444", borderRadius: "8px", padding: "10px 14px", color: "#EF4444", marginBottom: "16px", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldAlert size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  
                  {/* Plan Name */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Plan Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. AI Starter"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)" }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Description</label>
                    <textarea 
                      placeholder="Describe what is included in this plan..."
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)", fontFamily: "inherit" }}
                    />
                  </div>

                  {/* Pricing Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Original Price (₹) *</label>
                      <input 
                        type="number" 
                        value={form.originalPrice}
                        onChange={(e) => setForm({ ...form, originalPrice: parseInt(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Selling Price (₹) *</label>
                      <input 
                        type="number" 
                        value={form.sellingPrice}
                        onChange={(e) => setForm({ ...form, sellingPrice: parseInt(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>

                  {/* Duration Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Duration Value *</label>
                      <input 
                        type="number" 
                        value={form.durationValue}
                        onChange={(e) => setForm({ ...form, durationValue: parseInt(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Duration Unit *</label>
                      <select 
                        value={form.durationUnit}
                        onChange={(e) => setForm({ ...form, durationUnit: e.target.value })}
                        style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)" }}
                      >
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </div>

                  {/* Test limits */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Max AI Tests</label>
                      <input 
                        type="number" 
                        value={form.maxAITests}
                        onChange={(e) => setForm({ ...form, maxAITests: parseInt(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div />
                  </div>

                  {/* Features checklist */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>Features Included</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
                      {AVAILABLE_FEATURES.map(feat => (
                        <label key={feat} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--text-secondary)", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={form.features.includes(feat)}
                            onChange={() => handleFeatureToggle(feat)}
                            style={{ accentColor: "var(--violet, #6E3FF3)" }}
                          />
                          <span>{feat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Exam Availability Checklist */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Available for Exams</label>
                      <button 
                        type="button" 
                        onClick={handleSelectAllExams}
                        style={{ background: "none", border: "none", color: "var(--violet, #6E3FF3)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                      >
                        {form.allowedExamIds.length === exams.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", maxHeight: "100px", overflowY: "auto", padding: "6px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.01)" }}>
                      {exams.map(exam => (
                        <label key={exam._id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--text-secondary)", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={form.allowedExamIds.includes(exam._id)}
                            onChange={() => handleExamToggle(exam._id)}
                            style={{ accentColor: "var(--violet, #6E3FF3)" }}
                          />
                          <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{exam.title}</span>
                        </label>
                      ))}
                    </div>
                    {form.allowedExamIds.length === 0 && (
                      <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--text-secondary)" }}>
                        No restrictions. Available for <strong>All Exams</strong>.
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
                      <input 
                        type="text" 
                        placeholder="Add missing exam category..."
                        value={newExamTitle}
                        onChange={(e) => setNewExamTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddExam();
                          }
                        }}
                        style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)", fontSize: "12.5px" }}
                      />
                      <button 
                        type="button" 
                        onClick={handleQuickAddExam}
                        disabled={addingExam || !newExamTitle.trim()}
                        style={{ padding: "8px 14px", background: "var(--violet, #6E3FF3)", color: "white", border: "none", borderRadius: "6px", fontSize: "12.5px", fontWeight: "600", cursor: addingExam || !newExamTitle.trim() ? "not-allowed" : "pointer", opacity: addingExam || !newExamTitle.trim() ? 0.6 : 1 }}
                      >
                        {addingExam ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>

                  {/* recommended & status row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", alignItems: "center" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Status</label>
                      <select 
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)" }}
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Display Order</label>
                      <input 
                        type="number" 
                        value={form.displayOrder}
                        onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>

                  <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)", fontWeight: "600", cursor: "pointer", marginTop: "4px" }}>
                    <input 
                      type="checkbox" 
                      checked={form.isFeatured}
                      onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                      style={{ accentColor: "var(--violet, #6E3FF3)", width: "16px", height: "16px" }}
                    />
                    <span>Mark as Recommended (Highlights plan)</span>
                  </label>

                </div>

                {/* Submit Row */}
                <div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button 
                    type="button" 
                    onClick={() => setShowFormModal(false)}
                    style={{ flex: "none", width: "auto", padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", fontWeight: "600", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    style={{ flex: "none", width: "auto", padding: "10px 20px", borderRadius: "8px", border: "none", background: "var(--violet, #6E3FF3)", color: "#fff", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    {submitting ? "Saving..." : "Save Plan"}
                  </button>
                </div>
              </form>

              {/* Live Preview Side */}
              <div style={{ flex: 0.8, padding: "24px", background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <p style={{ margin: "0 0 16px 0", fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "1px", textTransform: "uppercase" }}>Live Student Card Preview</p>
                
                {/* Plan Card */}
                <div style={{
                  width: "100%",
                  maxWidth: "320px",
                  background: "var(--bg-card, #1c1b2e)",
                  borderRadius: "16px",
                  border: form.isFeatured ? "2px solid var(--violet, #6E3FF3)" : "1px solid var(--border-color)",
                  padding: "24px",
                  boxShadow: form.isFeatured ? "0 8px 30px rgba(110,63,243,0.12)" : "0 4px 12px rgba(0,0,0,0.05)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px"
                }}>
                  {form.isFeatured && (
                    <span style={{
                      position: "absolute",
                      top: "-12px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--violet, #6E3FF3)",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      letterSpacing: "0.5px"
                    }}>RECOMMENDED</span>
                  )}

                  <div>
                    <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "var(--text-primary)" }}>{form.name || "AI Plan Title"}</h4>
                    <p style={{ margin: "6px 0 0 0", fontSize: "12.5px", color: "var(--text-secondary)", minHeight: "36px", lineHeight: "1.4" }}>{form.description || "Plan description preview goes here..."}</p>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>₹{form.sellingPrice}</span>
                    {form.originalPrice > form.sellingPrice && (
                      <>
                        <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "14px" }}>₹{form.originalPrice}</span>
                        <span style={{ color: "#10B981", fontSize: "12.5px", fontWeight: "700" }}>{calculateDiscount()}% OFF</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", fontWeight: "600" }}>Valid for {form.durationValue} {form.durationUnit}</span>
                  </div>

                  {form.maxAITests > 0 && (
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "-6px" }}>
                      ⚡ Includes up to <strong>{form.maxAITests} AI tests</strong>
                    </div>
                  )}

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                    <p style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>FEATURES INCLUDED</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {form.features.map(feat => (
                        <div key={feat} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--text-primary)" }}>
                          <Check size={14} style={{ color: "#10B981" }} />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    disabled 
                    style={{
                      marginTop: "10px",
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "none",
                      background: "var(--violet, #6E3FF3)",
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: "14px",
                      opacity: 0.8
                    }}
                  >
                    Subscribe Now
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminAiPlans;
