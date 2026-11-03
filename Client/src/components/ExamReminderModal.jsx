import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Calendar,
  Clock,
  Volume2,
  Bell,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  Users,
  User,
  Info,
  Search,
  CheckSquare,
  Smartphone,
  Globe
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../css/ExamReminderModal.css";

export default function ExamReminderModal({ quiz, onClose, onScheduled }) {
  const { user, role } = useAuth();
  const isAdminOrTeacher = ["admin", "superadmin", "teacher", "manager"].includes(role);

  const [timingType, setTimingType] = useState("30_MIN_BEFORE");
  const [customTime, setCustomTime] = useState("");
  const [language, setLanguage] = useState("en");
  const [voice, setVoice] = useState("Aoede");
  const [customMessage, setCustomMessage] = useState("");
  const [recipientMode, setRecipientMode] = useState("self"); // "self" | "selected" | "enrolled"
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [totalEnrolled, setTotalEnrolled] = useState(0);

  const [existingReminder, setExistingReminder] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Format quiz duration cleanly (converting stored seconds >= 300 to minutes)
  const formatDuration = (val) => {
    if (!val && val !== 0) return "Standard Duration";
    const num = Number(val);
    if (isNaN(num)) return `${val} mins`;
    const mins = num >= 300 ? Math.round(num / 60) : Math.round(num);
    return `${mins} mins`;
  };

  // State for user's planned exam date and time
  const [examDate, setExamDate] = useState(() => {
    if (quiz?.scheduledDate) {
      const d = new Date(quiz.scheduledDate);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().split("T")[0];
  });

  const [examTime, setExamTime] = useState(() => {
    if (quiz?.scheduledDate) {
      const d = new Date(quiz.scheduledDate);
      if (!isNaN(d.getTime())) return d.toTimeString().slice(0, 5);
    }
    return "10:00";
  });

  // Derive dynamic exam date object from user's selection
  const examDateObj = React.useMemo(() => {
    try {
      if (examDate && examTime) {
        const [y, m, d] = examDate.split("-").map(Number);
        const [hh, mm] = examTime.split(":").map(Number);
        return new Date(y, m - 1, d, hh, mm);
      }
      if (examDate) {
        const [y, m, d] = examDate.split("-").map(Number);
        return new Date(y, m - 1, d, 10, 0);
      }
    } catch {
      // fallback
    }
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }, [examDate, examTime]);

  // Compute calculated reminder time based on timingType
  const calculateReminderTime = () => {
    if (timingType === "EXACT_TIME") {
      return customTime ? new Date(customTime) : null;
    }
    const offsetMs = {
      "15_MIN_BEFORE": 15 * 60 * 1000,
      "30_MIN_BEFORE": 30 * 60 * 1000,
      "1_HOUR_BEFORE": 60 * 60 * 1000,
      "1_DAY_BEFORE": 24 * 60 * 60 * 1000,
    }[timingType] || 30 * 60 * 1000;

    return new Date(examDateObj.getTime() - offsetMs);
  };

  const calculatedTime = calculateReminderTime();

  // Load any existing reminder for this quiz
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        setLoadingExisting(true);
        const token = localStorage.getItem("token");
        if (!token || !quiz?._id) return;

        const res = await axios.get(`${apiUrl}/api/ai-voice/exam-reminders?quizId=${quiz._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data?.data && res.data.data.length > 0) {
          // Find any active reminder (PENDING or PROCESSING)
          const active = res.data.data.find(r => ["PENDING", "PROCESSING"].includes(r.status));
          setExistingReminder(active || res.data.data[0]);
        }
      } catch (err) {
        console.warn("[ExamReminderModal] Could not fetch existing reminder:", err.message);
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchExisting();
  }, [quiz?._id]);

  // Load students for Admin/Teacher multi-selection
  useEffect(() => {
    if (isAdminOrTeacher) {
      const fetchStudents = async () => {
        try {
          setLoadingStudents(true);
          const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
          const res = await axios.get(`${apiUrl}/api/ai-voice/admin/users?limit=100`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.data?.success) {
            setStudentsList(res.data.data || []);
            if (typeof res.data.totalEnrolledStudents === "number") {
              setTotalEnrolled(res.data.totalEnrolledStudents);
            }
          }
        } catch (err) {
          console.warn("[ExamReminderModal] Could not fetch students:", err.message);
        } finally {
          setLoadingStudents(false);
        }
      };
      fetchStudents();
    }
  }, [isAdminOrTeacher]);

  const toggleStudent = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const filteredStudents = studentsList.filter((s) => {
    if (!studentSearch.trim()) return true;
    const term = studentSearch.toLowerCase();
    return (
      (s.fullName && s.fullName.toLowerCase().includes(term)) ||
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.phone && String(s.phone).includes(term))
    );
  });

  const selectAllFiltered = () => {
    const ids = filteredStudents.map((s) => s._id);
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAll = () => {
    setSelectedUserIds([]);
  };

  // Live preview text generator
  const getPreviewText = () => {
    const studentName = user?.fullName || user?.name || "Student";
    const title = quiz?.title || "Exam";
    const tz = "Asia/Kolkata";
    const formattedDate = examDateObj.toLocaleDateString("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric" });
    const formattedTime = examDateObj.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true });

    if (customMessage.trim()) {
      return customMessage
        .replace(/{taskTitle}/g, title)
        .replace(/{studentName}/g, studentName)
        .replace(/{examDate}/g, formattedDate)
        .replace(/{examTime}/g, formattedTime);
    }

    if (language === "hi") {
      return `नमस्ते ${studentName}! PrepMark की ओर से आपकी परीक्षा '${title}' ${formattedDate} को निर्धारित है। कृपया समय पर तैयार रहें!`;
    }
    return `Hello ${studentName}! This is your PrepMark voice reminder: your exam '${title}' is scheduled for ${formattedDate} at ${formattedTime}. Please prepare well!`;
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!calculatedTime || isNaN(calculatedTime.getTime())) {
      setError("Please choose a valid reminder time.");
      return;
    }

    if (calculatedTime.getTime() <= Date.now()) {
      setError("Scheduled reminder time must be in the future.");
      return;
    }

    if (isAdminOrTeacher && recipientMode === "selected" && selectedUserIds.length === 0) {
      setError("Please select at least one student to receive this reminder.");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");

      const payload = {
        quizId: quiz._id,
        examDate: examDateObj.toISOString(),
        timingType,
        customScheduledTime: timingType === "EXACT_TIME" ? calculatedTime.toISOString() : null,
        language,
        voice: isAdminOrTeacher ? voice : (voice || "Aoede"),
        reminderAudioText: customMessage.trim() || null,
        recipients:
          isAdminOrTeacher && recipientMode === "enrolled"
            ? "ALL_ENROLLED"
            : isAdminOrTeacher && recipientMode === "selected"
            ? selectedUserIds
            : null,
        targetAudience:
          isAdminOrTeacher && recipientMode === "enrolled"
            ? "all"
            : isAdminOrTeacher && recipientMode === "selected"
            ? "selected"
            : "single",
        targetUserIds:
          isAdminOrTeacher && recipientMode === "selected" ? selectedUserIds : undefined
      };

      const res = await axios.post(`${apiUrl}/api/ai-voice/exam-reminder`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(res.data?.message || "Exam voice reminder scheduled successfully!");
      if (res.data?.data) {
        setExistingReminder(Array.isArray(res.data.data) ? res.data.data[0] : res.data.data);
      }
      if (onScheduled) onScheduled(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule voice reminder.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReminder = async () => {
    if (!existingReminder?._id) return;
    setError("");
    setSuccess("");

    try {
      setCancelling(true);
      const token = localStorage.getItem("token");
      await axios.patch(`${apiUrl}/api/ai-voice/exam-reminder/${existingReminder._id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess("Scheduled voice reminder cancelled successfully.");
      setExistingReminder(prev => ({ ...prev, status: "CANCELLED" }));
      if (onScheduled) onScheduled();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel reminder.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="erm-overlay" onClick={onClose}>
      <div className="erm-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="erm-header">
          <div className="erm-header-left">
            <div className="erm-header-icon">
              <Volume2 size={20} />
            </div>
            <div className="erm-header-titles">
              <h3 className="erm-header-title">
                Exam Voice Reminder
              </h3>
              <span className="erm-header-subtitle">
                Automated audio phone-call reminder before exam starts
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="erm-close-x-btn"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="erm-body">
          {/* Target Exam Details Card */}
          <div className="erm-target-exam-card">
            <div className="erm-target-badge">
              Target Exam
            </div>
            <div className="erm-target-title">
              {quiz?.title || "Exam Paper"}
            </div>
            <div className="erm-target-meta">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <Calendar size={13} style={{ color: "var(--primary, #8a55fc)" }} />
                {examDateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <Clock size={13} style={{ color: "var(--primary, #8a55fc)" }} />
                {formatDuration(quiz?.duration)}
              </span>
              {quiz?.subject && (
                <span style={{ padding: "2px 8px", borderRadius: "100px", background: "rgba(138,85,252,0.15)", color: "var(--primary, #8a55fc)", fontWeight: "600", fontSize: "11px" }}>
                  {quiz.subject}
                </span>
              )}
            </div>
          </div>

          {/* Active Reminder Banner (if already scheduled) */}
          {existingReminder && ["PENDING", "PROCESSING"].includes(existingReminder.status) && (
            <div
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "12px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle2 size={18} style={{ color: "#10b981", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#10b981" }}>
                    Active Reminder Scheduled
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary, #cbd5e1)" }}>
                    Dispatches on: {new Date(existingReminder.scheduledTime).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelReminder}
                disabled={cancelling}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Trash2 size={13} />
                {cancelling ? "Cancelling..." : "Cancel"}
              </button>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSchedule} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Reminder Timing Selector */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
                Reminder Timing
              </label>
              <div className="erm-timing-grid">
                {[
                  { id: "15_MIN_BEFORE", label: "15m Before" },
                  { id: "30_MIN_BEFORE", label: "30m Before" },
                  { id: "1_HOUR_BEFORE", label: "1h Before" },
                  { id: "1_DAY_BEFORE", label: "1 Day Before" },
                  { id: "EXACT_TIME", label: "Custom Time" }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTimingType(opt.id)}
                    className="erm-timing-btn"
                    style={{
                      border: timingType === opt.id ? "1.5px solid #7c3aed" : "1px solid var(--border-color, rgba(255,255,255,0.12))",
                      background: timingType === opt.id ? "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" : "transparent",
                      color: timingType === opt.id ? "#ffffff" : "var(--text-secondary, #cbd5e1)",
                      fontWeight: timingType === opt.id ? "700" : "500",
                      boxShadow: timingType === opt.id ? "0 2px 8px rgba(124, 58, 237, 0.35)" : "none"
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {timingType === "EXACT_TIME" && (
                <div style={{ marginTop: "10px" }}>
                  <input
                    type="datetime-local"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="erm-field-input"
                  />
                </div>
              )}

              {/* Calculated Dispatch Notification */}
              {calculatedTime && !isNaN(calculatedTime.getTime()) && (
                <div className="erm-dispatch-notice">
                  <Clock size={13} style={{ color: "var(--primary, #8a55fc)", flexShrink: 0, marginTop: "2px" }} />
                  <span>Call dispatches: <strong>{calculatedTime.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</strong> (Asia/Kolkata)</span>
                </div>
              )}
            </div>

            {/* Recipient Selection (Admin/Teacher view) */}
            {isAdminOrTeacher && (
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
                  Recipient Target
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("self")}
                    style={{
                      padding: "9px 8px",
                      borderRadius: "8px",
                      border: recipientMode === "self" ? "1.5px solid #7c3aed" : "1px solid var(--border-color, rgba(255,255,255,0.12))",
                      background: recipientMode === "self" ? "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" : "transparent",
                      color: recipientMode === "self" ? "#ffffff" : "var(--text-secondary, #cbd5e1)",
                      boxShadow: recipientMode === "self" ? "0 2px 8px rgba(124, 58, 237, 0.35)" : "none",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px"
                    }}
                  >
                    <User size={13} /> Only Me (Test)
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientMode("selected")}
                    style={{
                      padding: "9px 8px",
                      borderRadius: "8px",
                      border: recipientMode === "selected" ? "1.5px solid #7c3aed" : "1px solid var(--border-color, rgba(255,255,255,0.12))",
                      background: recipientMode === "selected" ? "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" : "transparent",
                      color: recipientMode === "selected" ? "#ffffff" : "var(--text-secondary, #cbd5e1)",
                      boxShadow: recipientMode === "selected" ? "0 2px 8px rgba(124, 58, 237, 0.35)" : "none",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px"
                    }}
                  >
                    <CheckSquare size={13} /> Selected {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientMode("enrolled")}
                    style={{
                      padding: "9px 8px",
                      borderRadius: "8px",
                      border: recipientMode === "enrolled" ? "1.5px solid #7c3aed" : "1px solid var(--border-color, rgba(255,255,255,0.12))",
                      background: recipientMode === "enrolled" ? "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" : "transparent",
                      color: recipientMode === "enrolled" ? "#ffffff" : "var(--text-secondary, #cbd5e1)",
                      boxShadow: recipientMode === "enrolled" ? "0 2px 8px rgba(124, 58, 237, 0.35)" : "none",
                      color: recipientMode === "enrolled" ? "var(--primary, #8a55fc)" : "var(--text-secondary, #cbd5e1)",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px"
                    }}
                  >
                    <Users size={13} /> All Enrolled {totalEnrolled > 0 && `(${totalEnrolled})`}
                  </button>
                </div>

                {/* Sub-view when "enrolled" */}
                {recipientMode === "enrolled" && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(138, 85, 252, 0.1)",
                      border: "1px solid rgba(138, 85, 252, 0.25)",
                      fontSize: "12px",
                      color: "var(--text-secondary, #cbd5e1)",
                      lineHeight: "1.4"
                    }}
                  >
                    ✨ Broadcast reminder: will automatically schedule phone-call reminder for all <strong>{totalEnrolled || "enrolled"}</strong> registered students.
                  </div>
                )}

                {/* Sub-view when "selected" */}
                {recipientMode === "selected" && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "12px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-color, rgba(255,255,255,0.12))",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }}
                  >
                    {/* Search bar */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "7px 10px",
                        background: "rgba(255, 255, 255, 0.04)",
                        borderRadius: "7px",
                        border: "1px solid var(--border-color, rgba(255,255,255,0.1))"
                      }}
                    >
                      <Search size={14} style={{ color: "var(--text-muted, #94a3b8)" }} />
                      <input
                        type="text"
                        placeholder="Search student by name, email, phone..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: "var(--text-primary, #ffffff)",
                          fontSize: "12px",
                          width: "100%"
                        }}
                      />
                    </div>

                    {/* Toolbar */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--primary, #8a55fc)" }}>
                        {selectedUserIds.length} of {studentsList.length} students selected
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={selectAllFiltered}
                          style={{
                            padding: "3px 7px",
                            borderRadius: "5px",
                            border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                            background: "rgba(138, 85, 252, 0.12)",
                            color: "var(--primary, #8a55fc)",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          Select All ({filteredStudents.length})
                        </button>
                        {selectedUserIds.length > 0 && (
                          <button
                            type="button"
                            onClick={deselectAll}
                            style={{
                              padding: "3px 7px",
                              borderRadius: "5px",
                              border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                              background: "transparent",
                              color: "var(--text-muted, #94a3b8)",
                              fontSize: "11px",
                              cursor: "pointer"
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Student List */}
                    <div
                      style={{
                        maxHeight: "180px",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        paddingRight: "2px"
                      }}
                    >
                      {loadingStudents ? (
                        <div style={{ padding: "14px", textAlign: "center", color: "var(--text-muted, #94a3b8)", fontSize: "12px" }}>
                          Loading student list...
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div style={{ padding: "14px", textAlign: "center", color: "var(--text-muted, #94a3b8)", fontSize: "12px" }}>
                          No students found matching "{studentSearch}".
                        </div>
                      ) : (
                        filteredStudents.map((s) => {
                          const isChecked = selectedUserIds.includes(s._id);
                          return (
                            <div
                              key={s._id}
                              onClick={() => toggleStudent(s._id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "7px 10px",
                                borderRadius: "7px",
                                background: isChecked ? "rgba(138, 85, 252, 0.15)" : "rgba(255, 255, 255, 0.02)",
                                border: isChecked ? "1px solid var(--primary, #8a55fc)" : "1px solid var(--border-color, rgba(255,255,255,0.08))",
                                cursor: "pointer",
                                transition: "all 0.12s ease"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleStudent(s._id)}
                                  style={{ accentColor: "var(--primary, #8a55fc)", cursor: "pointer", width: "15px", height: "15px" }}
                                />
                                <div
                                  style={{
                                    width: "26px",
                                    height: "26px",
                                    borderRadius: "50%",
                                    background: isChecked ? "var(--primary, #8a55fc)" : "rgba(255, 255, 255, 0.08)",
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "11px",
                                    fontWeight: "700"
                                  }}
                                >
                                  {(s.fullName || s.name || "S").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary, #ffffff)" }}>
                                    {s.fullName || s.name}
                                  </div>
                                  <div style={{ fontSize: "10.5px", color: "var(--text-muted, #94a3b8)" }}>
                                    {s.email}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                {s.hasAndroid && (
                                  <span
                                    title="Android FCM Ready"
                                    style={{
                                      fontSize: "10px",
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      background: "rgba(16, 185, 129, 0.15)",
                                      color: "#10b981",
                                      fontWeight: "600"
                                    }}
                                  >
                                    Android
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Planned Exam Date & Time (Gives user choice for exam date/time) */}
            <div className="erm-date-time-grid">
              <div className="erm-field-group">
                <label className="erm-field-label">
                  Planned Exam Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="erm-field-input"
                />
              </div>

              <div className="erm-field-group">
                <label className="erm-field-label">
                  Planned Exam Time
                </label>
                <input
                  type="time"
                  value={examTime}
                  onChange={(e) => setExamTime(e.target.value)}
                  className="erm-field-input"
                />
              </div>
            </div>

            {/* Language & Voice Row (Gemini Voice is hidden for students, only visible to Admins/Teachers) */}
            <div style={{ display: "grid", gridTemplateColumns: isAdminOrTeacher ? "1fr 1fr" : "1fr", gap: "12px" }}>
              <div className="erm-field-group">
                <label className="erm-field-label">
                  Call Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="erm-field-input"
                >
                  <option value="en" style={{ background: "#1e1b2e" }}>English</option>
                  <option value="hi" style={{ background: "#1e1b2e" }}>Hindi (हिंदी)</option>
                  <option value="auto" style={{ background: "#1e1b2e" }}>Auto Detect (Hindi / English)</option>
                </select>
              </div>

              {isAdminOrTeacher && (
                <div className="erm-field-group">
                  <label className="erm-field-label">
                    Gemini Voice (Admin only)
                  </label>
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="erm-field-input"
                  >
                    <option value="Aoede" style={{ background: "#1e1b2e" }}>Aoede (Female, Balanced)</option>
                    <option value="Charon" style={{ background: "#1e1b2e" }}>Charon (Male, Deep)</option>
                    <option value="Fenrir" style={{ background: "#1e1b2e" }}>Fenrir (Male, Energetic)</option>
                    <option value="Kore" style={{ background: "#1e1b2e" }}>Kore (Female, Calming)</option>
                    <option value="Puck" style={{ background: "#1e1b2e" }}>Puck (Male, Youthful)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Custom Message / Placeholders */}
            <div>
              <div className="erm-script-header">
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary, #ffffff)" }}>
                  Reminder Script (Optional Customization)
                </label>
                <span className="erm-script-helper">
                  Supports &#123;studentName&#125;, &#123;taskTitle&#125;, &#123;examDate&#125;
                </span>
              </div>
              <textarea
                rows={3}
                placeholder="Leave blank to use default template..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                maxLength={500}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                  backgroundColor: "var(--bg-input, rgba(255,255,255,0.05))",
                  color: "var(--text-primary, #ffffff)",
                  fontSize: "13px",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Live Audio Script Preview */}
            <div className="erm-preview-card">
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "700", color: "var(--primary, #8a55fc)", textTransform: "uppercase", marginBottom: "4px" }}>
                <Sparkles size={12} /> Live Speech Script Preview
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary, #cbd5e1)", fontStyle: "italic", lineHeight: 1.5 }}>
                "{getPreviewText()}"
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="erm-footer-actions">
              <button
                type="button"
                onClick={onClose}
                className="erm-cancel-btn"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || (isAdminOrTeacher && recipientMode === "selected" && selectedUserIds.length === 0)}
                className="erm-submit-btn"
              >
                <Bell size={15} style={{ color: "#ffffff", flexShrink: 0 }} />
                <span>
                  {submitting
                    ? "Scheduling..."
                    : recipientMode === "enrolled"
                    ? `Schedule for All Enrolled (${totalEnrolled || "All"})`
                    : recipientMode === "selected"
                    ? `Schedule for ${selectedUserIds.length} Selected Students`
                    : "Schedule Voice Reminder"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
