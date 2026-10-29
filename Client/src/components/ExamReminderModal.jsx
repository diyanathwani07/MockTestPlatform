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
  Info
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ExamReminderModal({ quiz, onClose, onScheduled }) {
  const { user, role } = useAuth();
  const isAdminOrTeacher = ["admin", "superadmin", "teacher", "manager"].includes(role);

  const [timingType, setTimingType] = useState("30_MIN_BEFORE");
  const [customTime, setCustomTime] = useState("");
  const [language, setLanguage] = useState("en");
  const [voice, setVoice] = useState("Aoede");
  const [customMessage, setCustomMessage] = useState("");
  const [recipientMode, setRecipientMode] = useState("self"); // "self" or "enrolled"
  const [existingReminder, setExistingReminder] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Format quiz duration cleanly (converting stored seconds >= 60 to minutes)
  const formatDuration = (val) => {
    if (!val && val !== 0) return "Standard Duration";
    const num = Number(val);
    if (isNaN(num)) return `${val} mins`;
    const mins = num >= 60 ? Math.round(num / 60) : num;
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

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const payload = {
        quizId: quiz._id,
        examDate: examDateObj.toISOString(),
        timingType,
        customScheduledTime: timingType === "EXACT_TIME" ? calculatedTime.toISOString() : null,
        language,
        voice: isAdminOrTeacher ? voice : (voice || "Aoede"),
        reminderAudioText: customMessage.trim() || null,
        recipients: (isAdminOrTeacher && recipientMode === "enrolled") ? "ALL_ENROLLED" : null
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--bg-card, #1e1b2e)",
          border: "1px solid var(--border-color, rgba(255,255,255,0.12))",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
          color: "var(--text-primary, #ffffff)",
          display: "flex",
          flexDirection: "column"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff"
              }}
            >
              <Volume2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700" }}>
                Exam Voice Reminder
              </h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted, #94a3b8)" }}>
                Automated audio phone-call reminder before exam starts
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted, #94a3b8)",
              padding: "6px",
              borderRadius: "8px",
              display: "flex"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Target Exam Details Card */}
          <div
            style={{
              backgroundColor: "var(--bg-input, rgba(255,255,255,0.04))",
              border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
              borderRadius: "12px",
              padding: "14px 16px"
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--primary, #8a55fc)", letterSpacing: "0.5px", marginBottom: "4px" }}>
              Target Exam
            </div>
            <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "6px" }}>
              {quiz?.title || "Exam Paper"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "12.5px", color: "var(--text-secondary, #cbd5e1)" }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px" }}>
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
                    style={{
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: timingType === opt.id ? "1.5px solid var(--primary, #8a55fc)" : "1px solid var(--border-color, rgba(255,255,255,0.12))",
                      backgroundColor: timingType === opt.id ? "rgba(138, 85, 252, 0.15)" : "transparent",
                      color: timingType === opt.id ? "var(--primary, #8a55fc)" : "var(--text-secondary, #cbd5e1)",
                      fontSize: "12.5px",
                      fontWeight: timingType === opt.id ? "700" : "500",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
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
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                      backgroundColor: "var(--bg-input, rgba(255,255,255,0.05))",
                      color: "var(--text-primary, #ffffff)",
                      fontSize: "13.5px"
                    }}
                  />
                </div>
              )}

              {/* Calculated Dispatch Notification */}
              {calculatedTime && !isNaN(calculatedTime.getTime()) && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted, #94a3b8)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={12} style={{ color: "var(--primary, #8a55fc)" }} />
                  <span>Call dispatches: <strong style={{ color: "var(--text-primary, #fff)" }}>{calculatedTime.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</strong> (Asia/Kolkata)</span>
                </div>
              )}
            </div>

            {/* Recipient Selection (Admin/Teacher view) */}
            {isAdminOrTeacher && (
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
                  Recipient Target
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("self")}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: recipientMode === "self" ? "1.5px solid var(--primary, #8a55fc)" : "1px solid var(--border-color, rgba(255,255,255,0.12))",
                      backgroundColor: recipientMode === "self" ? "rgba(138, 85, 252, 0.15)" : "transparent",
                      color: recipientMode === "self" ? "var(--primary, #8a55fc)" : "var(--text-secondary, #cbd5e1)",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    <User size={14} /> Only Me (Test)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("enrolled")}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: recipientMode === "enrolled" ? "1.5px solid var(--primary, #8a55fc)" : "1px solid var(--border-color, rgba(255,255,255,0.12))",
                      backgroundColor: recipientMode === "enrolled" ? "rgba(138, 85, 252, 0.15)" : "transparent",
                      color: recipientMode === "enrolled" ? "var(--primary, #8a55fc)" : "var(--text-secondary, #cbd5e1)",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    <Users size={14} /> All Enrolled Students
                  </button>
                </div>
              </div>
            )}

            {/* Planned Exam Date & Time (Gives user choice for exam date/time) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Planned Exam Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setExamDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                    backgroundColor: "var(--bg-input, rgba(255,255,255,0.05))",
                    color: "var(--text-primary, #ffffff)",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Planned Exam Time
                </label>
                <input
                  type="time"
                  value={examTime}
                  onChange={(e) => setExamTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                    backgroundColor: "var(--bg-input, rgba(255,255,255,0.05))",
                    color: "var(--text-primary, #ffffff)",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {/* Language & Voice Row (Gemini Voice is hidden for students, only visible to Admins/Teachers) */}
            <div style={{ display: "grid", gridTemplateColumns: isAdminOrTeacher ? "1fr 1fr" : "1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Call Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                    backgroundColor: "var(--bg-input, rgba(255,255,255,0.05))",
                    color: "var(--text-primary, #ffffff)",
                    fontSize: "13px"
                  }}
                >
                  <option value="en" style={{ background: "#1e1b2e" }}>English</option>
                  <option value="hi" style={{ background: "#1e1b2e" }}>Hindi (हिंदी)</option>
                  <option value="auto" style={{ background: "#1e1b2e" }}>Auto Detect (Hindi / English)</option>
                </select>
              </div>

              {isAdminOrTeacher && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                    Gemini Voice (Admin only)
                  </label>
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                      backgroundColor: "var(--bg-input, rgba(255,255,255,0.05))",
                      color: "var(--text-primary, #ffffff)",
                      fontSize: "13px"
                    }}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600" }}>
                  Reminder Script (Optional Customization)
                </label>
                <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)" }}>
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
                  resize: "vertical"
                }}
              />
            </div>

            {/* Live Audio Script Preview */}
            <div
              style={{
                backgroundColor: "rgba(138, 85, 252, 0.08)",
                border: "1px dashed rgba(138, 85, 252, 0.3)",
                borderRadius: "10px",
                padding: "12px 14px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "700", color: "var(--primary, #8a55fc)", textTransform: "uppercase", marginBottom: "4px" }}>
                <Sparkles size={12} /> Live Speech Script Preview
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary, #cbd5e1)", fontStyle: "italic", lineHeight: 1.5 }}>
                "{getPreviewText()}"
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                  backgroundColor: "transparent",
                  color: "var(--text-secondary, #cbd5e1)",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="exam-reminder-submit-btn"
                style={{
                  padding: "10px 22px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  backgroundColor: "#7c3aed",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(124, 58, 237, 0.4)",
                  width: "auto",
                  minHeight: "42px",
                  whiteSpace: "nowrap"
                }}
              >
                <Bell size={15} style={{ color: "#ffffff", flexShrink: 0 }} />
                <span style={{ color: "#ffffff" }}>
                  {submitting ? "Scheduling..." : "Schedule Voice Reminder"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
