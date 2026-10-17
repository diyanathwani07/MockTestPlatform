import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar";
import AdminSidebar from "../components/AdminSidebar";
import CreateLiveExamModal from "./CreateLiveExamModal";
import AttendanceModal from "./AttendanceModal";
import {
  Radio,
  Plus,
  Search,
  Calendar,
  Clock,
  Video,
  Users,
  Copy,
  Check,
  Edit2,
  Trash2,
  Square,
  ExternalLink,
  AlertCircle,
  Activity,
  ShieldAlert,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useConfirm } from "../../context/ConfirmContext";

export default function LiveExamsList() {
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [exams, setExams] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [copiedId, setCopiedId] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [attendanceExam, setAttendanceExam] = useState(null);

  const fetchLiveExams = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/live-exams?status=${statusTab}&search=${search}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExams(res.data?.exams || []);
      if (res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch (err) {
      console.error("Failed to fetch live examinations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveExams();
  }, [statusTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLiveExams();
  };

  const handleCopyLink = (exam) => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/live-exam/${exam.shareSlug || exam.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(exam._id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleEndExam = async (exam) => {
    const confirmed = await confirm({
      title: "End Live Examination Immediately?",
      message: `Are you sure you want to conclude "${exam.title}" right now? All active in-progress attempts will be submitted and the exam will be closed.`,
      type: "danger",
      confirmText: "End Examination Now",
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/live-exams/${exam._id}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchLiveExams();
    } catch (err) {
      console.error("End Exam Error:", err);
      alert(err.response?.data?.message || "Failed to end examination.");
    }
  };

  const handleDeleteExam = async (exam) => {
    const isCompleted = exam.status === "completed";
    const confirmed = await confirm({
      title: isCompleted ? "Delete Examination Record?" : "Cancel Examination?",
      message: isCompleted
        ? `Are you sure you want to delete "${exam.title}"? This will remove this examination record from the active list.`
        : `Are you sure you want to cancel "${exam.title}"? This will cancel the examination and revoke student access.`,
      type: "danger",
      confirmText: isCompleted ? "Delete Exam" : "Cancel Exam",
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/live-exams/${exam._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLiveExams();
    } catch (err) {
      console.error("Delete Exam Error:", err);
      alert(err.response?.data?.message || "Failed to delete examination.");
    }
  };

  // Status counters (use global counts from server across all exams; fallback to exams array)
  const totalCount = counts ? counts.total : exams.length;
  const liveCount = counts ? counts.live : exams.filter((e) => e.status === "live" || e.status === "lobby").length;
  const scheduledCount = counts ? counts.scheduled : exams.filter((e) => e.status === "scheduled").length;
  const completedCount = counts ? counts.completed : exams.filter((e) => e.status === "completed").length;

  const getStatusBadge = (status) => {
    switch (status) {
      case "live":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px #10b981",
                display: "inline-block",
              }}
            />
            LIVE NOW
          </span>
        );
      case "lobby":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700",
              backgroundColor: "rgba(139, 92, 246, 0.15)",
              color: "#8b5cf6",
              border: "1px solid rgba(139, 92, 246, 0.3)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#8b5cf6",
                display: "inline-block",
              }}
            />
            LOBBY OPEN
          </span>
        );
      case "completed":
        return (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
              backgroundColor: "rgba(100, 116, 139, 0.15)",
              color: "#94a3b8",
            }}
          >
            CONCLUDED
          </span>
        );
      case "cancelled":
        return (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
            }}
          >
            CANCELLED
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#3b82f6",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            SCHEDULED
          </span>
        );
    }
  };

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <AdminSidebar />

      <div className="admin-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-page)" }}>
        <AdminNavbar title="Live Examinations" />

        <div className="admin-content" style={{ flex: 1, padding: "24px", maxWidth: "1400px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          {/* Header Action Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                Live Examinations
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                Schedule, monitor, and manage real-time timed mock examinations
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={fetchLiveExams}
                title="Refresh examinations list"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                <RefreshCw size={15} /> Refresh
              </button>
              <button
                onClick={() => {
                  setEditingExam(null);
                  setShowCreateModal(true);
                }}
                style={{
                  backgroundColor: "var(--primary)",
                  border: "none",
                  color: "var(--primary-foreground)",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "700",
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
                }}
              >
                <Plus size={18} /> Schedule Live Exam
              </button>
            </div>
          </div>

          {/* Metric Counter Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1.5px solid var(--border-color)",
                borderRadius: "14px",
                padding: "16px 20px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>
                Total Exams
              </span>
              <h3 style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>
                {totalCount}
              </h3>
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1.5px solid var(--border-color)",
                borderRadius: "14px",
                padding: "16px 20px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600", textTransform: "uppercase" }}>
                Active / Live Now
              </span>
              <h3 style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: "800", color: "#10b981" }}>
                {liveCount}
              </h3>
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1.5px solid var(--border-color)",
                borderRadius: "14px",
                padding: "16px 20px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "600", textTransform: "uppercase" }}>
                Scheduled Ahead
              </span>
              <h3 style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: "800", color: "#3b82f6" }}>
                {scheduledCount}
              </h3>
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1.5px solid var(--border-color)",
                borderRadius: "14px",
                padding: "16px 20px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>
                Completed
              </span>
              <h3 style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>
                {completedCount}
              </h3>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1.5px solid var(--border-color)",
              borderRadius: "16px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { val: "all", label: "All", count: counts?.total },
                { val: "live", label: "Live / Lobby", count: counts?.live },
                { val: "scheduled", label: "Scheduled", count: counts?.scheduled },
                { val: "completed", label: "Completed", count: counts?.completed },
                { val: "cancelled", label: "Cancelled", count: counts?.cancelled },
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => setStatusTab(tab.val)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    backgroundColor: statusTab === tab.val ? "var(--primary)" : "transparent",
                    color: statusTab === tab.val ? "var(--primary-foreground)" : "var(--text-secondary)",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: "700",
                        backgroundColor:
                          statusTab === tab.val
                            ? "rgba(255, 255, 255, 0.25)"
                            : "var(--border-color)",
                        color:
                          statusTab === tab.val
                            ? "var(--primary-foreground)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearchSubmit} style={{ position: "relative", minWidth: "260px" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-secondary)",
                }}
              />
              <input
                type="text"
                placeholder="Search live exams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-page)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </form>
          </div>

          {/* Live Examinations List Cards */}
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>
              Loading examinations...
            </div>
          ) : exams.length === 0 ? (
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1.5px dashed var(--border-color)",
                borderRadius: "16px",
                padding: "60px 20px",
                textAlign: "center",
              }}
            >
              <Radio size={40} style={{ color: "var(--text-secondary)", opacity: 0.5, marginBottom: "12px" }} />
              <h3 style={{ margin: "0 0 6px", color: "var(--text-primary)", fontSize: "17px" }}>No Examinations Found</h3>
              <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "13px" }}>
                {statusTab !== "all" ? `No exams found under status "${statusTab}".` : "Schedule your first live examination to begin."}
              </p>
              <button
                onClick={() => {
                  setEditingExam(null);
                  setShowCreateModal(true);
                }}
                style={{
                  backgroundColor: "var(--primary)",
                  border: "none",
                  color: "var(--primary-foreground)",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                + Schedule Live Exam
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {exams.map((exam) => {
                const startDate = new Date(exam.scheduledStartTime);
                const endDate = new Date(exam.scheduledEndTime);
                const isLive = exam.status === "live" || exam.status === "lobby";

                return (
                  <div
                    key={exam._id}
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: `1.5px solid ${isLive ? "rgba(16, 185, 129, 0.4)" : "var(--border-color)"}`,
                      borderRadius: "16px",
                      padding: "20px 24px",
                      boxShadow: isLive ? "0 4px 20px rgba(16, 185, 129, 0.08)" : "0 4px 15px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    {/* Card Top Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
                            {exam.title}
                          </h3>
                          {getStatusBadge(exam.status)}
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                          Blueprint: <strong style={{ color: "var(--text-primary)" }}>{exam.quizId?.title || "Exam"}</strong>
                          {exam.quizId?.subject && ` • Subject: ${exam.quizId.subject}`}
                          {exam.quizId?.examName && ` • Category: ${exam.quizId.examName}`}
                        </p>
                      </div>

                      {/* Share Link Button */}
                      <button
                        onClick={() => handleCopyLink(exam)}
                        title="Copy student share link"
                        style={{
                          backgroundColor: copiedId === exam._id ? "rgba(16, 185, 129, 0.15)" : "var(--bg-page)",
                          border: `1px solid ${copiedId === exam._id ? "#10b981" : "var(--border-color)"}`,
                          color: copiedId === exam._id ? "#10b981" : "var(--text-primary)",
                          padding: "6px 14px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {copiedId === exam._id ? <Check size={14} /> : <Copy size={14} />}
                        {copiedId === exam._id ? "Link Copied!" : "Copy Share Link"}
                      </button>
                    </div>

                    {/* Metadata Badges Row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "18px",
                        flexWrap: "wrap",
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        paddingTop: "6px",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Calendar size={15} color="var(--primary)" />
                        <span>
                          {startDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={15} color="var(--primary)" />
                        <span>
                          {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({exam.duration}m limit)
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Video size={15} color={exam.webcamRule === "mandatory" ? "#f59e0b" : "#64748b"} />
                        <span>
                          Webcam:{" "}
                          <strong style={{ color: exam.webcamRule === "mandatory" ? "#f59e0b" : "inherit", textTransform: "capitalize" }}>
                            {exam.webcamRule}
                          </strong>
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Users size={15} color="var(--text-secondary)" />
                        <span>
                          Attempts: <strong>{exam.stats?.total || 0}</strong> (Taking: {exam.stats?.inProgress || 0} • Submitted: {exam.stats?.submitted || 0})
                        </span>
                      </div>

                      <div>
                        <span>
                          Results: <strong style={{ textTransform: "capitalize" }}>{exam.resultReleaseMode}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: "10px",
                        paddingTop: "10px",
                        borderTop: "1px solid var(--border-color)",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => setAttendanceExam(exam)}
                        style={{
                          backgroundColor: "var(--bg-page)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-primary)",
                          padding: "7px 14px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        <Users size={14} /> Attendance ({exam.stats?.total || 0})
                      </button>

                      <button
                        onClick={() => {
                          setEditingExam(exam);
                          setShowCreateModal(true);
                        }}
                        title="Edit examination details, webcam rules, results, or reschedule"
                        style={{
                          backgroundColor: "var(--bg-page)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-primary)",
                          padding: "7px 14px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Edit2 size={14} /> Edit
                      </button>

                      {isLive && (
                        <button
                          onClick={() => handleEndExam(exam)}
                          style={{
                            backgroundColor: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#ef4444",
                            padding: "7px 14px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          <Square size={14} /> End Exam
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteExam(exam)}
                        title={exam.status === "completed" ? "Delete examination record" : "Cancel examination"}
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          color: "#ef4444",
                          padding: "7px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "12px",
                          fontWeight: "600",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Trash2 size={14} /> {exam.status === "completed" ? "Delete" : "Cancel"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Live Exam Modal */}
      <CreateLiveExamModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingExam(null);
        }}
        onCreated={() => {
          fetchLiveExams();
        }}
        editExam={editingExam}
      />

      {/* Attendance Modal */}
      {attendanceExam && (
        <AttendanceModal
          isOpen={Boolean(attendanceExam)}
          onClose={() => setAttendanceExam(null)}
          examId={attendanceExam._id}
          examTitle={attendanceExam.title}
        />
      )}
    </div>
  );
}
