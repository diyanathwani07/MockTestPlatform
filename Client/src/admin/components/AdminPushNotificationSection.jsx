import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Send,
  Smartphone,
  Users,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CheckSquare,
  Square,
  ExternalLink,
  Laptop,
  Radio,
  Sparkles,
  Info,
  ShieldCheck,
  BellRing,
  X,
  AlertTriangle
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const QUICK_LINKS = [
  { label: "My Exams", path: "/dashboard/exams" },
  { label: "Practice Tests", path: "/dashboard/practice" },
  { label: "Test Results", path: "/dashboard/results" },
  { label: "AI Plans & Pricing", path: "/dashboard/pricing" },
  { label: "Help & Support", path: "/help-support" }
];

const PRESET_MESSAGES = [
  {
    label: "New Mock Exam Live",
    title: "New Mock Examination Published!",
    message: "A new full-length mock test has just been uploaded. Log in to take the exam and benchmark your All-India rank today!",
    link: "/dashboard/exams"
  },
  {
    label: "Daily Practice Reminder",
    title: "Daily Practice Reminder",
    message: "Keep your daily study streak going! Spend 15 minutes practicing questions and reviewing flashcards on PrepMark today.",
    link: "/dashboard/practice"
  },
  {
    label: "Performance Analysis",
    title: "Your Performance Analysis is Ready",
    message: "Review your detailed diagnostic analytics and identify high-yield topic areas to improve your score.",
    link: "/dashboard/results"
  },
  {
    label: "Special Announcement",
    title: "Important Notice from Teaching Pariksha",
    message: "Please check your student dashboard for newly added study materials and exam schedule updates.",
    link: "/dashboard"
  }
];

export default function AdminPushNotificationSection() {
  // Candidate students state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [totalEnrolledStudents, setTotalEnrolledStudents] = useState(0);

  // Audience Mode: "single" | "selected" | "all"
  const [audienceMode, setAudienceMode] = useState("single");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Form fields
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/dashboard/exams");

  // Dispatch & Feedback states
  const [sending, setSending] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Test push to admin device state
  const [testingDevice, setTestingDevice] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const getAuthHeaders = () => {
    const t = localStorage.getItem("token") || localStorage.getItem("adminToken");
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // Fetch candidate users with debouncing
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setErrorMsg("");
      const res = await axios.get(
        `${API}/api/notifications/admin/users?search=${encodeURIComponent(userSearch)}&limit=100`,
        { headers: getAuthHeaders() }
      );
      if (res.data?.success) {
        setUsers(res.data.data || []);
        if (typeof res.data.totalEnrolledStudents === "number") {
          setTotalEnrolledStudents(res.data.totalEnrolledStudents);
        }
      }
    } catch (err) {
      console.warn("[AdminPushSection] Push users endpoint failed, falling back to admin users:", err.message);
      try {
        const fallbackRes = await axios.get(
          `${API}/api/admin/users`,
          { headers: getAuthHeaders() }
        );
        const rawList = Array.isArray(fallbackRes.data) ? fallbackRes.data : fallbackRes.data?.data || [];
        const filtered = rawList.filter(u => {
          if (!userSearch.trim()) return true;
          const q = userSearch.toLowerCase();
          return (
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.phone?.toLowerCase().includes(q)
          );
        });
        setUsers(filtered);
        setTotalEnrolledStudents(rawList.length);
      } catch (fallbackErr) {
        setErrorMsg(err.response?.data?.message || err.message || "Failed to load candidate students.");
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 350);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Recipient multi-selection helpers
  const toggleSelectUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = users.map((u) => u._id);
    setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...ids])));
  };

  const handleDeselectAll = () => {
    setSelectedUserIds([]);
  };

  // Apply quick preset templates
  const applyPreset = (preset) => {
    setTitle(preset.title);
    setMessage(preset.message);
    setLink(preset.link);
    setErrorMsg("");
  };

  // Input Validation
  const validateForm = () => {
    if (!title.trim()) {
      setErrorMsg("Please enter a notification title.");
      return false;
    }
    if (title.trim().length > 100) {
      setErrorMsg("Notification title cannot exceed 100 characters.");
      return false;
    }
    if (!message.trim()) {
      setErrorMsg("Please enter a notification message.");
      return false;
    }
    if (message.trim().length > 500) {
      setErrorMsg("Notification message cannot exceed 500 characters.");
      return false;
    }
    if (link && link.trim() !== "") {
      const clean = link.trim();
      if (!clean.startsWith("/") || clean.startsWith("//")) {
        setErrorMsg("Destination link must start with a single '/' (e.g. /dashboard/exams). External URLs are not permitted.");
        return false;
      }
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(clean)) {
        setErrorMsg("External protocol URLs are not allowed.");
        return false;
      }
    }

    if (audienceMode === "single" && !selectedUser) {
      setErrorMsg("Please select a student recipient from the list.");
      return false;
    }
    if (audienceMode === "selected" && selectedUserIds.length === 0) {
      setErrorMsg("Please select at least one student recipient.");
      return false;
    }

    setErrorMsg("");
    return true;
  };

  // Trigger Send flow
  const handleInitiateSend = () => {
    if (!validateForm()) return;
    if (audienceMode === "all") {
      setShowConfirmModal(true);
    } else {
      executeSendPush();
    }
  };

  // Execute Dispatch
  const executeSendPush = async () => {
    setShowConfirmModal(false);
    setSending(true);
    setErrorMsg("");
    setDispatchResult(null);

    try {
      const payload = {
        targetAudience: audienceMode,
        title: title.trim(),
        message: message.trim(),
        link: link.trim() || "/dashboard"
      };

      if (audienceMode === "single") {
        payload.targetUserId = selectedUser?._id;
      } else if (audienceMode === "selected") {
        payload.targetUserIds = selectedUserIds;
      }

      const res = await axios.post(`${API}/api/notifications/admin/send`, payload, {
        headers: getAuthHeaders()
      });

      setDispatchResult(res.data);
    } catch (err) {
      console.error("[AdminPushSection] Dispatch Error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to dispatch push notification.");
    } finally {
      setSending(false);
    }
  };

  // Test Notification to Admin Device
  const handleTestMyDevice = async () => {
    setTestingDevice(true);
    setTestResult(null);
    const testTitle = title.trim() || "PrepMark Test Push Notification";
    const testMsg = message.trim() || "This is a test notification verifying your device is receiving push alerts.";
    const testLink = link.trim() || "/dashboard";

    try {
      const res = await axios.post(
        `${API}/api/notifications/admin/test-my-device`,
        { title: testTitle, message: testMsg, link: testLink },
        { headers: getAuthHeaders() }
      );
      setTestResult(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        let shownLocally = false;
        try {
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification(testTitle, {
                body: testMsg,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                data: { url: testLink }
              });
              shownLocally = true;
            } else {
              new Notification(testTitle, { body: testMsg, icon: "/favicon.ico" });
              shownLocally = true;
            }
          }
        } catch (localNotifErr) {
          console.warn("[AdminPushSection] Client notification fallback error:", localNotifErr);
        }

        if (shownLocally) {
          setTestResult({
            success: true,
            message: "Test push notification displayed on your device! (Remote server at mocktestplatform.onrender.com returned 404 because new Server routes are pending deployment to Render)."
          });
        } else {
          setTestResult({
            success: false,
            message: "Server returned 404: The backend push route has not been deployed to Render yet. Please start your local server (npm run dev in Server) or deploy new Server changes to Render."
          });
        }
      } else {
        setTestResult({
          success: false,
          message: err.response?.data?.message || err.message || "Failed to send test push to admin device."
        });
      }
    } finally {
      setTestingDevice(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* SECTION HEADER & TEST DEVICE ACTION */}
      <div
        style={{
          background: "var(--bg-card, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "16px",
          padding: "22px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary-foreground, #ffffff)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
              }}
            >
              <Send size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "700", color: "var(--text-primary, #0f172a)" }}>
                Push Notification Composer
              </h2>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text-secondary, #64748b)", maxWidth: "620px" }}>
            Compose and broadcast high-priority push notifications to student mobile and web devices via Firebase Cloud Messaging.
          </p>
        </div>

        {/* Send Test to My Device Button */}
        <button
          type="button"
          onClick={handleTestMyDevice}
          disabled={testingDevice}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 18px",
            borderRadius: "10px",
            border: "1.5px solid var(--primary)",
            background: "transparent",
            color: "var(--primary)",
            fontSize: "13.5px",
            fontWeight: "700",
            cursor: testingDevice ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
          }}
        >
          {testingDevice ? <RefreshCw size={15} className="animate-spin" /> : <Smartphone size={16} />}
          <span>{testingDevice ? "Testing FCM..." : "Send Test to My Device"}</span>
        </button>
      </div>

      {/* TEST RESULT NOTIFICATION BANNER */}
      {testResult && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "12px",
            background: testResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${testResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: testResult.success ? "#059669" : "#dc2626",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            fontSize: "13.5px"
          }}
        >
          {testResult.success ? <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: "2px" }} /> : <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "700" }}>
              {testResult.success ? "Test Push Sent to Your Device!" : "Test Push Notification Notice"}
            </div>
            <div style={{ fontSize: "12.5px", marginTop: "2px", opacity: 0.9 }}>
              {testResult.message}
            </div>
            {testResult.success && (
              <div style={{ fontSize: "12px", marginTop: "4px", color: "var(--text-secondary, #475569)" }}>
                FCM Accepted: {testResult.fcmAccepted} | Registered Devices Found: {testResult.deviceTokensFound}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setTestResult(null)}
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: "2px" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* DISPATCH RESULT BANNER */}
      {dispatchResult && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "12px",
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "var(--text-primary, #0f172a)",
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "14.5px", color: "#059669" }}>
              <CheckCircle2 size={18} />
              <span>{dispatchResult.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setDispatchResult(null)}
              style={{ background: "transparent", border: "none", color: "var(--text-secondary, #64748b)", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "4px", fontSize: "12.5px", color: "var(--text-secondary, #475569)" }}>
            <span>Target Audience: <strong>{dispatchResult.targetAudience}</strong></span>
            <span>Total In-App Created: <strong>{dispatchResult.inAppNotificationsCreated}</strong></span>
            <span>FCM Tokens Found: <strong>{dispatchResult.deviceTokensFound}</strong></span>
            <span>FCM Accepted: <strong style={{ color: "#059669" }}>{dispatchResult.fcmAccepted}</strong></span>
            {dispatchResult.fcmFailed > 0 && <span style={{ color: "#dc2626" }}>FCM Failed: <strong>{dispatchResult.fcmFailed}</strong></span>}
          </div>
          <div style={{ fontSize: "11.5px", marginTop: "2px", color: "var(--text-muted, #64748b)", fontStyle: "italic" }}>
            * Note: "FCM Accepted" verifies Google FCM servers accepted the notification into their distribution queues. Actual handset delivery depends on device connectivity and battery settings.
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMsg && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "12px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "14px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg("")}
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE: LEFT COMPOSER & RECIPIENTS, RIGHT PREVIEW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
        
        {/* LEFT COLUMN: AUDIENCE & COMPOSITION FORM */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* 1. RECIPIENT AUDIENCE CARD */}
          <div
            style={{
              background: "var(--bg-card, #ffffff)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={17} style={{ color: "var(--primary)" }} />
                <label style={{ fontSize: "14.5px", fontWeight: "700", color: "var(--text-primary, #0f172a)" }}>
                  Step 1: Select Target Recipients
                </label>
              </div>
              {totalEnrolledStudents > 0 && (
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: "600",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: "var(--bg-input, #ffffff)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    color: "var(--primary)"
                  }}
                >
                  {totalEnrolledStudents} Enrolled
                </span>
              )}
            </div>

            {/* Audience Tabs - Harmonized with Sidebar Theme */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
              {[
                { mode: "single", label: "Single Student", icon: User },
                { mode: "selected", label: "Selected Students", icon: CheckSquare },
                { mode: "all", label: "All Enrolled", icon: BellRing }
              ].map(({ mode, label, icon: Icon }) => {
                const active = audienceMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAudienceMode(mode);
                      setErrorMsg("");
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "12px 8px",
                      borderRadius: "10px",
                      border: active ? "1.5px solid var(--primary)" : "1px solid var(--border-color, #e2e8f0)",
                      background: active
                        ? "var(--primary)"
                        : "var(--bg-input, #ffffff)",
                      color: active ? "var(--primary-foreground, #ffffff)" : "var(--text-secondary, #475569)",
                      boxShadow: active ? "0 3px 10px rgba(0, 0, 0, 0.15)" : "none",
                      cursor: "pointer",
                      fontSize: "12.5px",
                      fontWeight: active ? "700" : "600",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <Icon size={16} color={active ? "var(--primary-foreground, #ffffff)" : "currentColor"} />
                    <span style={{ color: active ? "var(--primary-foreground, #ffffff)" : "inherit" }}>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* AUDIENCE MODE: ALL ENROLLED */}
            {audienceMode === "all" && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "var(--bg-input, #fbfbfe)",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  color: "var(--text-primary, #0f172a)",
                  fontSize: "13.5px",
                  lineHeight: "1.5"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "4px", color: "var(--primary)" }}>
                  <Info size={16} />
                  <span>Platform-Wide Broadcast</span>
                </div>
                <p style={{ margin: "0 0 10px 0", color: "var(--text-secondary, #475569)", fontSize: "13px" }}>
                  This notification will be delivered to every active registered student with push notifications enabled. A confirmation modal will appear before transmitting.
                </p>
                <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-secondary, #475569)" }}>
                  <span>Targeted Accounts: <strong>{totalEnrolledStudents || "All Enrolled"}</strong></span>
                  <span>Batch Delivery: <strong>500 tokens / slice</strong></span>
                </div>
              </div>
            )}

            {/* AUDIENCE MODE: SINGLE OR SELECTED */}
            {audienceMode !== "all" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Search input */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "var(--bg-input, #ffffff)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    borderRadius: "10px",
                    padding: "8px 12px"
                  }}
                >
                  <Search size={15} style={{ color: "var(--text-muted, #94a3b8)", flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Search student by name, email, or mobile..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--text-primary, #0f172a)",
                      fontSize: "13px"
                    }}
                  />
                  {userSearch && (
                    <button
                      type="button"
                      onClick={() => setUserSearch("")}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted, #94a3b8)",
                        cursor: "pointer",
                        padding: 0
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Multi-selection control bar */}
                {audienceMode === "selected" && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                    <span style={{ color: "var(--primary)", fontWeight: "700" }}>
                      {selectedUserIds.length} Student(s) Selected
                    </span>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        style={{ background: "transparent", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0, fontWeight: "600" }}
                      >
                        Select Filtered ({users.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        style={{ background: "transparent", border: "none", color: "var(--text-muted, #64748b)", cursor: "pointer", padding: 0 }}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}

                {/* Candidate Students List */}
                <div
                  style={{
                    maxHeight: "230px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    borderRadius: "10px",
                    padding: "6px",
                    background: "var(--bg-input, #fbfbfe)"
                  }}
                >
                  {loadingUsers ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted, #94a3b8)", fontSize: "13px" }}>
                      <RefreshCw size={16} className="animate-spin" style={{ display: "inline-block", marginRight: "8px" }} />
                      Loading candidate students...
                    </div>
                  ) : users.length === 0 ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: "13px" }}>
                      No students found matching "{userSearch}"
                    </div>
                  ) : (
                    users.map((u) => {
                      const isSelected =
                        audienceMode === "single"
                          ? selectedUser?._id === u._id
                          : selectedUserIds.includes(u._id);

                      return (
                        <div
                          key={u._id}
                          onClick={() => {
                            if (audienceMode === "single") {
                              setSelectedUser(u);
                            } else {
                              toggleSelectUser(u._id);
                            }
                          }}
                          style={{
                            padding: "9px 12px",
                            borderRadius: "8px",
                            border: isSelected
                              ? "1.5px solid var(--primary)"
                              : "1px solid var(--border-color, #e2e8f0)",
                            background: "var(--bg-card, #ffffff)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            transition: "all 0.12s ease"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {audienceMode === "single" ? (
                              <div
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "50%",
                                  border: isSelected ? "5px solid var(--primary)" : "1.5px solid var(--border-color, #cbd5e1)",
                                  background: "#ffffff",
                                  boxSizing: "border-box"
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "4px",
                                  border: isSelected ? "1px solid var(--primary)" : "1.5px solid var(--border-color, #cbd5e1)",
                                  background: isSelected ? "var(--primary)" : "transparent",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--primary-foreground, #ffffff)"
                                }}
                              >
                                {isSelected && <CheckSquare size={12} />}
                              </div>
                            )}

                            <div>
                              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary, #0f172a)" }}>
                                {u.fullName || u.name || "Student"}
                              </div>
                              <div style={{ fontSize: "11.5px", color: "var(--text-secondary, #64748b)" }}>
                                {u.email || u.phone || "No contact info"}
                              </div>
                            </div>
                          </div>

                          {/* Device badge - High Contrast in All Themes */}
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              background: u.hasAndroid
                                ? "rgba(16, 185, 129, 0.12)"
                                : u.hasWeb
                                ? "rgba(59, 130, 246, 0.12)"
                                : "rgba(100, 116, 139, 0.12)",
                              border: u.hasAndroid
                                ? "1px solid rgba(16, 185, 129, 0.25)"
                                : u.hasWeb
                                ? "1px solid rgba(59, 130, 246, 0.25)"
                                : "1px solid rgba(100, 116, 139, 0.2)",
                              color: u.hasAndroid ? "#059669" : u.hasWeb ? "#2563eb" : "var(--text-muted, #64748b)"
                            }}
                          >
                            {u.hasAndroid ? "Android (FCM)" : u.hasWeb ? "Web Browser" : "No device"}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. NOTIFICATION CONTENT COMPOSER */}
          <div
            style={{
              background: "var(--bg-card, #ffffff)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={17} style={{ color: "var(--primary)" }} />
                <label style={{ fontSize: "14.5px", fontWeight: "700", color: "var(--text-primary, #0f172a)" }}>
                  Step 2: Compose Notification
                </label>
              </div>

              {/* Preset Templates Trigger */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {PRESET_MESSAGES.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    style={{
                      padding: "4px 9px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color, #e2e8f0)",
                      background: "var(--bg-input, #ffffff)",
                      color: "var(--text-secondary, #475569)",
                      fontSize: "11.5px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12.5px" }}>
                <span style={{ color: "var(--text-primary, #0f172a)", fontWeight: "600" }}>Notification Title *</span>
                <span style={{ color: title.length > 90 ? "#dc2626" : "var(--text-muted, #94a3b8)" }}>{title.length} / 100</span>
              </div>
              <input
                type="text"
                value={title}
                maxLength={100}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New BPSC TRE 4.0 Mock Test Published!"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  background: "var(--bg-input, #ffffff)",
                  color: "var(--text-primary, #0f172a)",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Message Textarea */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12.5px" }}>
                <span style={{ color: "var(--text-primary, #0f172a)", fontWeight: "600" }}>Notification Body Message *</span>
                <span style={{ color: message.length > 450 ? "#dc2626" : "var(--text-muted, #94a3b8)" }}>{message.length} / 500</span>
              </div>
              <textarea
                rows={4}
                value={message}
                maxLength={500}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the message that students will see on their mobile notification drawer and lockscreen..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  background: "var(--bg-input, #ffffff)",
                  color: "var(--text-primary, #0f172a)",
                  fontSize: "13.5px",
                  lineHeight: "1.5",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Destination Link Input */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12.5px" }}>
                <span style={{ color: "var(--text-primary, #0f172a)", fontWeight: "600" }}>
                  Destination In-App Route (Optional)
                </span>
                <span style={{ color: "var(--text-muted, #94a3b8)" }}>Must start with /</span>
              </div>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/dashboard/exams"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  background: "var(--bg-input, #ffffff)",
                  color: "var(--text-primary, #0f172a)",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />

              {/* Quick links */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-muted, #94a3b8)", alignSelf: "center" }}>Quick Pick:</span>
                {QUICK_LINKS.map((ql) => {
                  const isSelected = link === ql.path;
                  return (
                    <button
                      key={ql.path}
                      type="button"
                      onClick={() => setLink(ql.path)}
                      style={{
                        padding: "3px 9px",
                        borderRadius: "6px",
                        border: isSelected ? "1.5px solid var(--primary)" : "1px solid var(--border-color, #e2e8f0)",
                        background: isSelected ? "var(--primary)" : "var(--bg-input, #ffffff)",
                        color: isSelected ? "var(--primary-foreground, #ffffff)" : "var(--text-secondary, #64748b)",
                        fontSize: "11.5px",
                        fontWeight: isSelected ? "700" : "500",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      {ql.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Action Button - Matches Sidebar Theme */}
            <button
              type="button"
              onClick={handleInitiateSend}
              disabled={sending}
              style={{
                marginTop: "10px",
                padding: "13px 24px",
                borderRadius: "12px",
                border: "none",
                background: "var(--primary)",
                color: "var(--primary-foreground, #ffffff)",
                fontSize: "14.5px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: sending ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
                transition: "all 0.15s ease"
              }}
            >
              {sending ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  <span>Transmitting Push Broadcast...</span>
                </>
              ) : (
                <>
                  <Send size={17} />
                  <span>
                    Send Push Notification ({audienceMode === "all" ? "All Students" : audienceMode === "single" ? (selectedUser?.fullName || "Single Student") : `${selectedUserIds.length} Students`})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE HANDSET PREVIEWS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* LIVE PREVIEW CONTAINER */}
          <div
            style={{
              background: "var(--bg-card, #ffffff)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Smartphone size={17} style={{ color: "var(--primary)" }} />
                <label style={{ fontSize: "14.5px", fontWeight: "700", color: "var(--text-primary, #0f172a)" }}>
                  Live Mobile Notification Preview
                </label>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-secondary, #64748b)" }}>
              Real-time representation of how the notification banner appears in student Android status bars and Web notification centers.
            </p>

            {/* MOCK PHONE LOCKSCREEN NOTIFICATION BANNER - INHERITS GLOBAL THEME */}
            <div
              style={{
                marginTop: "10px",
                background: "var(--bg-card, #ffffff)",
                border: "1.5px solid var(--border-color, #e2e8f0)",
                borderRadius: "16px",
                padding: "16px 18px",
                boxShadow: "0 4px 18px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                transition: "all 0.2s ease"
              }}
            >
              {/* Header row: App icon, name, timestamp */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "6px",
                      background: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--primary-foreground, #ffffff)",
                      fontSize: "11px",
                      fontWeight: "800"
                    }}
                  >
                    P
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary, #0f172a)" }}>
                    PrepMark
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)" }}>•</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted, #64748b)" }}>
                    Just now
                  </span>
                </div>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              </div>

              {/* Title & Body */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "var(--text-primary, #0f172a)",
                    overflowWrap: "anywhere"
                  }}
                >
                  {title.trim() || "Notification Title Appears Here"}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary, #334155)",
                    lineHeight: "1.45",
                    overflowWrap: "anywhere"
                  }}
                >
                  {message.trim() || "Notification body text will be displayed here for students on mobile and desktop."}
                </div>
              </div>

              {/* Link pill if set */}
              {link.trim() && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    marginTop: "4px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "var(--bg-input, #ffffff)",
                    border: "1.5px solid var(--primary)",
                    color: "var(--primary)",
                    fontSize: "11.5px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <ExternalLink size={12} />
                  <span>Opens: {link.trim()}</span>
                </div>
              )}
            </div>

            {/* SECURITY & PROTOCOL GUARANTEES CARD - Fixed Theme & Plain English */}
            <div
              style={{
                marginTop: "16px",
                padding: "16px 18px",
                borderRadius: "12px",
                background: "var(--bg-input, #fbfbfe)",
                border: "1px solid var(--border-color, #e2e8f0)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "13px",
                color: "var(--text-secondary, #475569)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary, #0f172a)", fontWeight: "700" }}>
                <ShieldCheck size={17} style={{ color: "#10b981", flexShrink: 0 }} />
                <span>Protocol & Safety Guarantees</span>
              </div>
              <ul style={{ margin: "2px 0 0 0", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "7px", lineHeight: "1.5" }}>
                <li>Multicast chunking respects Google FCM hard limit (max 500 tokens per payload).</li>
                <li>Device tokens are deduplicated; students with multiple sessions will not receive duplicate pushes.</li>
                <li>Invalid and unregistered FCM tokens are automatically purged upon return.</li>
                <li>In-app notification records are simultaneously written for student portal feeds.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR BULK DISPATCH */}
      {showConfirmModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "var(--bg-card, #ffffff)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#f59e0b" }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "var(--text-primary, #0f172a)" }}>
                Confirm Platform-Wide Broadcast
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text-secondary, #475569)", lineHeight: "1.5" }}>
              You are about to transmit a push notification to <strong>ALL {totalEnrolledStudents || "active"} registered students</strong> on PrepMark. This will immediately display on their devices and notify them in real time.
            </p>

            <div
              style={{
                background: "var(--bg-input, #fbfbfe)",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "12.5px",
                color: "var(--text-primary, #0f172a)",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}
            >
              <div><strong>Title:</strong> {title}</div>
              <div><strong>Route:</strong> {link || "/dashboard"}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  background: "var(--bg-input, #ffffff)",
                  color: "var(--text-secondary, #475569)",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSendPush}
                style={{
                  padding: "9px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: "var(--primary)",
                  color: "var(--primary-foreground, #ffffff)",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.15)"
                }}
              >
                Confirm & Send Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
