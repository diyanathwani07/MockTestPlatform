import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  PhoneCall,
  Phone,
  PhoneOff,
  User,
  Users,
  Search,
  Sparkles,
  Volume2,
  Play,
  Square,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Smartphone,
  Globe,
  Radio,
  Send
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PRESET_TEMPLATES = [
  {
    id: "mentorship",
    label: "Mentorship & Review",
    lang: "en",
    title: "Mock Test Diagnostic & Mentorship Call",
    text: "Hello {studentName}! This is your mentor from PrepMark AI calling to follow up on your test preparation. Please check your personalized performance analysis and practice your high-yield topics today!"
  },
  {
    id: "study_reminder_hi",
    label: "Study Reminder (Hindi)",
    lang: "hi",
    title: "दैनिक अध्ययन अनुस्मारक (PrepMark)",
    text: "नमस्ते {studentName}! PrepMark की ओर से यह आपका अध्ययन अनुस्मारक है। आपकी परीक्षा की तैयारी को मजबूत करने के लिए कृपया आज का मॉक टेस्ट समय पर पूरा करें। शुभकामनाएं!"
  },
  {
    id: "exam_alert",
    label: "Upcoming Exam Alert",
    lang: "en",
    title: "Important Exam Reminder Call",
    text: "Hello {studentName}! You have an upcoming mock examination scheduled very soon on PrepMark. Log in, check your syllabus topics, and start your revision now. All the best!"
  },
  {
    id: "streak_motivation",
    label: "Daily Motivation",
    lang: "en",
    title: "Daily Practice & Streak Motivation",
    text: "Hello {studentName}! Consistency is the secret to cracking competitive exams. Keep your daily study streak going by taking 15 minutes to review your flashcards on PrepMark today!"
  }
];

export default function AdminScheduleCallSection({ voiceSettings }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [taskTitle, setTaskTitle] = useState("Mock Test Diagnostic & Mentorship Call");
  const [taskDescription, setTaskDescription] = useState("");
  const [reminderAudioText, setReminderAudioText] = useState(
    "Hello {studentName}! This is your mentor from PrepMark AI calling to follow up on your test preparation. Please check your personalized performance analysis and practice your high-yield topics today!"
  );
  const [voice, setVoice] = useState(voiceSettings?.defaultVoice || "Aoede");
  const [language, setLanguage] = useState("auto");
  const [timingMode, setTimingMode] = useState("NOW"); // "NOW" | "SCHEDULED"
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });
  const [scheduledTime, setScheduledTime] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return d.toTimeString().slice(0, 5);
  });

  // Call Submission & Status
  const [submitting, setSubmitting] = useState(false);
  const [callResult, setCallResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Audio Preview states
  const [previewingAudio, setPreviewingAudio] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState(null);
  const audioPlayerRef = useRef(null);

  // Scheduled Calls History
  const [recentCalls, setRecentCalls] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [userFetchError, setUserFetchError] = useState("");

  const getAuthHeaders = () => {
    const t = localStorage.getItem("token") || localStorage.getItem("adminToken");
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // Fetch candidate users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setUserFetchError("");
      const res = await axios.get(`${API}/api/ai-voice/admin/users?search=${encodeURIComponent(userSearch)}`, {
        headers: getAuthHeaders()
      });
      if (res.data?.success) {
        setUsers(res.data.data || []);
      }
    } catch (err) {
      console.warn("[AdminScheduleCall] Failed to fetch users:", err.message);
      setUserFetchError(err.response?.data?.message || err.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch recent call schedules
  const fetchRecentCalls = async () => {
    try {
      setLoadingHistory(true);
      const res = await axios.get(`${API}/api/ai-voice/schedule`, {
        headers: getAuthHeaders()
      });
      if (res.data?.success) {
        setRecentCalls(res.data.data || []);
      }
    } catch (err) {
      console.warn("[AdminScheduleCall] Failed to fetch recent calls:", err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRecentCalls();
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 350);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Apply template
  const applyTemplate = (tmpl) => {
    setTaskTitle(tmpl.title);
    setReminderAudioText(tmpl.text);
    if (tmpl.lang) setLanguage(tmpl.lang);
  };

  // Preview TTS voice audio
  const handlePreviewAudio = async () => {
    if (!reminderAudioText.trim()) return;

    if (isPlayingPreview && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }

    try {
      setPreviewingAudio(true);
      const sampleText = reminderAudioText
        .replace(/{studentName}/g, selectedUser ? (selectedUser.fullName || selectedUser.name) : "Student")
        .replace(/{taskTitle}/g, taskTitle);

      const res = await axios.post(
        `${API}/api/voice-settings/preview`,
        {
          provider: "gemini",
          text: sampleText,
          lang: language === "auto" ? "en" : language,
          voice: voice || "Aoede"
        },
        { headers: getAuthHeaders() }
      );

      if (res.data?.success && res.data.audioUrl) {
        setPreviewAudioUrl(res.data.audioUrl);
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
        const audio = new Audio(res.data.audioUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => setIsPlayingPreview(false);
        audio.play();
        setIsPlayingPreview(true);
      }
    } catch (err) {
      console.error("[AdminScheduleCall] Preview error:", err.message);
      setErrorMsg("Failed to generate voice preview: " + (err.response?.data?.message || err.message));
    } finally {
      setPreviewingAudio(false);
    }
  };

  // Submit / Dispatch Call
  const handleDispatchCall = async () => {
    setErrorMsg("");
    setCallResult(null);

    if (!selectedUser) {
      setErrorMsg("Please select a student/user to receive the call.");
      return;
    }
    if (!taskTitle.trim()) {
      setErrorMsg("Please provide a call title.");
      return;
    }
    if (!reminderAudioText.trim()) {
      setErrorMsg("Please provide the AI voice message for this call.");
      return;
    }

    let finalTime = new Date();
    if (timingMode === "SCHEDULED") {
      try {
        const [y, m, d] = scheduledDate.split("-").map(Number);
        const [hh, mm] = scheduledTime.split(":").map(Number);
        finalTime = new Date(y, m - 1, d, hh, mm);
        if (isNaN(finalTime.getTime())) {
          setErrorMsg("Invalid date or time selected.");
          return;
        }
      } catch (_) {
        setErrorMsg("Invalid schedule date/time format.");
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        targetUserId: selectedUser._id,
        taskTitle: taskTitle.trim(),
        taskDescription: taskDescription.trim(),
        reminderAudioText: reminderAudioText.trim(),
        voice: voice || "Aoede",
        language: language || "auto",
        callNow: timingMode === "NOW",
        scheduledTime: finalTime.toISOString()
      };

      const res = await axios.post(`${API}/api/ai-voice/admin/schedule-call`, payload, {
        headers: getAuthHeaders()
      });

      if (res.data?.success) {
        setCallResult({
          message: res.data.message || (timingMode === "NOW" ? "AI Voice Call dispatched immediately!" : "Call scheduled successfully!"),
          details: res.data.data
        });
        fetchRecentCalls();
      }
    } catch (err) {
      console.error("[AdminScheduleCall] Dispatch error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to schedule AI voice call.");
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel an existing schedule
  const handleCancelSchedule = async (scheduleId) => {
    if (!window.confirm("Are you sure you want to cancel this scheduled AI voice call?")) return;
    try {
      await axios.patch(`${API}/api/ai-voice/schedule/${scheduleId}/cancel`, {}, {
        headers: getAuthHeaders()
      });
      fetchRecentCalls();
    } catch (err) {
      alert("Failed to cancel schedule: " + (err.response?.data?.message || err.message));
    }
  };

  const resolvedPreviewText = reminderAudioText
    .replace(/{studentName}/g, selectedUser ? (selectedUser.fullName || selectedUser.name) : "Student")
    .replace(/{taskTitle}/g, taskTitle || "Your Study Task");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* SECTION BANNER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          padding: "20px 24px",
          background: "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(79, 70, 229, 0.08))",
          borderRadius: "16px",
          border: "1px solid rgba(124, 58, 237, 0.25)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 6px 16px rgba(124, 58, 237, 0.35)"
            }}
          >
            <PhoneCall size={24} />
          </div>
          <div>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
              FCM AI Voice Calling Agent & Scheduler
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
              Trigger real-time AI voice phone calls to any registered student. Rings in real-time on Android (even when app is closed) and on Web!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchUsers();
            fetchRecentCalls();
          }}
          disabled={loadingUsers || loadingHistory}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-card)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600"
          }}
        >
          <RefreshCw size={14} className={loadingUsers || loadingHistory ? "animate-spin" : ""} /> Refresh Data
        </button>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {callResult && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "16px 20px",
            background: "rgba(16, 185, 129, 0.12)",
            borderRadius: "12px",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#10b981"
          }}
        >
          <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>
              {callResult.message}
            </div>
            {callResult.details?.dispatchedImmediately && (
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                ⚡ Dispatched via Dual-Channel (High-Priority FCM Data Push + Socket.IO Room). Target device will ring immediately!
              </div>
            )}
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              Schedule ID: {callResult.details?.schedule?._id} | Status: {callResult.details?.schedule?.status}
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 18px",
            background: "rgba(239, 68, 68, 0.12)",
            borderRadius: "12px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            fontSize: "13.5px"
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TWO-COLUMN WORKFLOW GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "24px"
        }}
      >
        {/* COLUMN 1: USER SELECTION */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "20px",
            background: "var(--bg-card)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={18} style={{ color: "var(--primary)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
              Step 1: Select Student / Recipient
            </h3>
          </div>
          <span style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "-8px" }}>
            Search student by name, email, or phone. See real-time FCM Android readiness.
          </span>

          {/* Search bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "10px",
              border: "1px solid var(--border-color)"
            }}
          >
            <Search size={16} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "13px",
                width: "100%"
              }}
            />
          </div>

          {/* Selected user preview pill */}
          {selectedUser ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "rgba(124, 58, 237, 0.12)",
                borderRadius: "10px",
                border: "1.5px solid var(--primary)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "var(--primary)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "14px"
                  }}
                >
                  {(selectedUser.fullName || selectedUser.name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "13.5px", color: "var(--text-primary)" }}>
                    {selectedUser.fullName || selectedUser.name}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                    {selectedUser.email} {selectedUser.phone ? `• ${selectedUser.phone}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: "700",
                    background: selectedUser.hasAndroid ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.15)",
                    color: selectedUser.hasAndroid ? "#10b981" : "#3b82f6"
                  }}
                >
                  {selectedUser.hasAndroid ? "🟢 Android FCM Ready" : selectedUser.hasWeb ? "💻 Web App" : "⚪ Registered"}
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "12px",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "10px",
                border: "1px dashed var(--border-color)",
                textAlign: "center",
                fontSize: "12.5px",
                color: "var(--text-muted)"
              }}
            >
              No student selected yet. Pick one from the list below.
            </div>
          )}

          {/* Users List with scroll */}
          <div
            style={{
              maxHeight: "320px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              paddingRight: "4px"
            }}
          >
            {loadingUsers ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                <RefreshCw size={18} className="animate-spin" style={{ display: "inline-block", marginRight: "8px" }} />
                Loading users...
              </div>
            ) : userFetchError ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#ef4444", fontSize: "12.5px" }}>
                ⚠️ {userFetchError}
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12.5px" }}>
                No matching users found.
              </div>
            ) : (
              users.map((u) => {
                const isSelected = selectedUser?._id === u._id;
                return (
                  <div
                    key={u._id}
                    onClick={() => setSelectedUser(u)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: isSelected ? "rgba(124, 58, 237, 0.15)" : "rgba(255, 255, 255, 0.02)",
                      border: isSelected ? "1.5px solid var(--primary)" : "1px solid var(--border-color)",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: isSelected ? "var(--primary)" : "rgba(255, 255, 255, 0.08)",
                          color: isSelected ? "#fff" : "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "700"
                        }}
                      >
                        {(u.fullName || u.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                          {u.fullName || u.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {u.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {u.hasAndroid && (
                        <span
                          title="Android device registered with FCM push"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "2px 7px",
                            borderRadius: "5px",
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#10b981",
                            fontSize: "10.5px",
                            fontWeight: "700"
                          }}
                        >
                          <Smartphone size={11} /> Android
                        </span>
                      )}
                      {u.hasWeb && !u.hasAndroid && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "2px 7px",
                            borderRadius: "5px",
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "#3b82f6",
                            fontSize: "10.5px",
                            fontWeight: "600"
                          }}
                        >
                          <Globe size={11} /> Web
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: CALL SCRIPT & CONFIGURATION */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "20px",
            background: "var(--bg-card)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} style={{ color: "var(--primary)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
              Step 2: AI Voice Message & Settings
            </h3>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
              Quick Templates:
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {PRESET_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)",
                    fontSize: "11.5px",
                    cursor: "pointer",
                    fontWeight: "500",
                    transition: "all 0.15s ease"
                  }}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Call Title */}
          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
              Call Title / Subject:
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Mock Test Diagnostic & Mentorship Call"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "13px"
              }}
            />
          </div>

          {/* Script Textarea */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--text-secondary)" }}>
                AI Voice Script (Spoken to student):
              </label>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {reminderAudioText.length} / 1000 chars
              </span>
            </div>
            <textarea
              rows={4}
              value={reminderAudioText}
              onChange={(e) => setReminderAudioText(e.target.value)}
              placeholder="Write what the AI voice will speak upon student answering..."
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "13px",
                lineHeight: "1.5",
                resize: "vertical"
              }}
            />
            <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "3px" }}>
              Placeholders: <code style={{ color: "var(--primary)" }}>{"{studentName}"}</code>, <code style={{ color: "var(--primary)" }}>{"{taskTitle}"}</code>
            </span>
          </div>

          {/* Voice & Language Dropdowns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                AI Voice:
              </label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "12.5px"
                }}
              >
                <option value="Aoede">Aoede (Female - Broadcast Tone)</option>
                <option value="Charon">Charon (Male - Deep & Academic)</option>
                <option value="Fenrir">Fenrir (Male - Resonant & Bold)</option>
                <option value="Kore">Kore (Female - Warm Student Guide)</option>
                <option value="Puck">Puck (Male - Dynamic & Energetic)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                Language:
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "12.5px"
                }}
              >
                <option value="auto">Auto-Detect</option>
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
              </select>
            </div>
          </div>

          {/* Voice Preview Button */}
          <div>
            <button
              type="button"
              onClick={handlePreviewAudio}
              disabled={previewingAudio}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: isPlayingPreview ? "rgba(124, 58, 237, 0.15)" : "transparent",
                color: isPlayingPreview ? "var(--primary)" : "var(--text-secondary)",
                fontSize: "12.5px",
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              {previewingAudio ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : isPlayingPreview ? (
                <Square size={14} />
              ) : (
                <Play size={14} />
              )}
              {isPlayingPreview ? "Stop Preview Audio" : "Listen Voice Sample"}
            </button>
          </div>
        </div>
      </div>

      {/* DISPATCH CONTROLS & TIMING CARD */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          padding: "20px 24px",
          background: "var(--bg-card)",
          borderRadius: "16px",
          border: "1px solid var(--border-color)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={18} style={{ color: "var(--primary)" }} />
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
            Step 3: Call Timing & Immediate Dispatch
          </h3>
        </div>

        {/* Timing Mode Radios */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              background: timingMode === "NOW" ? "rgba(124, 58, 237, 0.15)" : "rgba(255, 255, 255, 0.03)",
              border: timingMode === "NOW" ? "1.5px solid var(--primary)" : "1px solid var(--border-color)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              color: timingMode === "NOW" ? "var(--primary)" : "var(--text-secondary)"
            }}
          >
            <input
              type="radio"
              name="timingMode"
              checked={timingMode === "NOW"}
              onChange={() => setTimingMode("NOW")}
              style={{ accentColor: "var(--primary)" }}
            />
            ⚡ Call Now (Real-Time Dispatch)
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              background: timingMode === "SCHEDULED" ? "rgba(124, 58, 237, 0.15)" : "rgba(255, 255, 255, 0.03)",
              border: timingMode === "SCHEDULED" ? "1.5px solid var(--primary)" : "1px solid var(--border-color)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              color: timingMode === "SCHEDULED" ? "var(--primary)" : "var(--text-secondary)"
            }}
          >
            <input
              type="radio"
              name="timingMode"
              checked={timingMode === "SCHEDULED"}
              onChange={() => setTimingMode("SCHEDULED")}
              style={{ accentColor: "var(--primary)" }}
            />
            📅 Schedule for Later
          </label>
        </div>

        {/* Date & Time Picker if Scheduled */}
        {timingMode === "SCHEDULED" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Date:
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "13px"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Time:
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "13px"
                }}
              />
            </div>
          </div>
        )}

        {/* Main Dispatch Action Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" }}>
          <button
            type="button"
            onClick={handleDispatchCall}
            disabled={submitting || !selectedUser}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 28px",
              borderRadius: "10px",
              border: "none",
              background: !selectedUser
                ? "rgba(255, 255, 255, 0.1)"
                : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "700",
              cursor: selectedUser && !submitting ? "pointer" : "not-allowed",
              boxShadow: selectedUser ? "0 4px 16px rgba(124, 58, 237, 0.4)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            {submitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Synthesizing Audio & Dispatching Call...
              </>
            ) : timingMode === "NOW" ? (
              <>
                <PhoneCall size={18} />
                Call Student Now (Instant Real-Time)
              </>
            ) : (
              <>
                <Calendar size={18} />
                Schedule AI Voice Call
              </>
            )}
          </button>

          {!selectedUser && (
            <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
              * Select a student in Step 1 to enable calling
            </span>
          )}
        </div>
      </div>

      {/* RECENT CALL SCHEDULES TABLE */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "20px 24px",
          background: "var(--bg-card)",
          borderRadius: "16px",
          border: "1px solid var(--border-color)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: "0 0 2px 0", fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
              Scheduled & Dispatched Calls Log
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Real-time monitoring of all automated and manual AI voice call dispatches
            </span>
          </div>

          <button
            type="button"
            onClick={fetchRecentCalls}
            disabled={loadingHistory}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "6px",
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            <RefreshCw size={12} className={loadingHistory ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loadingHistory ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            <RefreshCw size={16} className="animate-spin" style={{ display: "inline-block", marginRight: "8px" }} />
            Loading call logs...
          </div>
        ) : recentCalls.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            No calls scheduled yet. Use the form above to dispatch your first AI voice call!
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "10px 12px" }}>Recipient</th>
                  <th style={{ padding: "10px 12px" }}>Call Title</th>
                  <th style={{ padding: "10px 12px" }}>Scheduled Time</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px" }}>Voice Audio</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.slice(0, 15).map((item) => {
                  const studentName = item.user?.fullName || item.user?.name || "Student";
                  const studentEmail = item.user?.email || "";
                  const dateStr = item.scheduledTime ? new Date(item.scheduledTime).toLocaleString() : "Now";

                  let badgeColor = "#94a3b8";
                  let badgeBg = "rgba(148, 163, 184, 0.15)";
                  if (item.status === "DISPATCHED") {
                    badgeColor = "#10b981";
                    badgeBg = "rgba(16, 185, 129, 0.15)";
                  } else if (item.status === "COMPLETED") {
                    badgeColor = "#3b82f6";
                    badgeBg = "rgba(59, 130, 246, 0.15)";
                  } else if (item.status === "PENDING" || item.status === "PROCESSING") {
                    badgeColor = "#f59e0b";
                    badgeBg = "rgba(245, 158, 11, 0.15)";
                  } else if (item.status === "FAILED") {
                    badgeColor = "#ef4444";
                    badgeBg = "rgba(239, 68, 68, 0.15)";
                  }

                  return (
                    <tr
                      key={item._id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        color: "var(--text-primary)"
                      }}
                    >
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: "600" }}>{studentName}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{studentEmail}</div>
                      </td>
                      <td style={{ padding: "12px", maxWidth: "220px" }}>
                        <div style={{ fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.taskTitle}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.reminderAudioText}
                        </div>
                      </td>
                      <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "5px",
                            fontSize: "11px",
                            fontWeight: "700",
                            background: badgeBg,
                            color: badgeColor
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                          {item.preGeneratedAudioStatus === "READY"
                            ? `Ready (${item.audioDurationSeconds || 0}s)`
                            : item.preGeneratedAudioStatus || "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        {item.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => handleCancelSchedule(item._id)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

