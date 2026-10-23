import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Video,
  VideoOff,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Award,
  Sparkles,
  Lock,
  ChevronRight,
  RefreshCw,
  Palette,
  Edit3,
  X,
  Check,
} from "lucide-react";
import Logo from "../../components/Logo";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../context/ThemeContext";
import "../../css/LiveExam.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const parseInstructions = (rawText, examData) => {
  if (!rawText || !rawText.trim()) {
    const lateEntryText = examData?.allowLateEntry
      ? `Entry permitted up to ${examData?.entryWindowMinutes || 15} minutes after start.`
      : "Late entry is strictly prohibited.";
    return [
      {
        title: "Server-Authoritative Clock",
        body: "The countdown timer is synced with the official examination server. When time expires, your answers will automatically submit.",
      },
      {
        title: "Network & Disconnection Safety",
        body: "Your selected answers are periodically auto-saved. If you experience a brief disconnection or accidental page refresh, simply return to this link to resume.",
      },
      {
        title: "Single Attempt Rule",
        body: "You are permitted exactly one attempt. Once submitted, answers cannot be edited.",
      },
      {
        title: "Late Entry",
        body: lateEntryText,
      },
    ];
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const cleanLine = line.replace(/^([•\-\*]|\d+[\.\)])\s*/, "").trim();
    const colonIdx = cleanLine.indexOf(":");
    if (colonIdx > 0 && colonIdx < 45) {
      return {
        title: cleanLine.slice(0, colonIdx).trim(),
        body: cleanLine.slice(colonIdx + 1).trim(),
      };
    }
    return {
      title: null,
      body: cleanLine,
    };
  });
};

function LiveExamLobby() {
  const { slugOrToken } = useParams();
  const navigate = useNavigate();
  const { toggleThemePicker } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exam, setExam] = useState(null);
  const [studentState, setStudentState] = useState(null);

  // Time tracking with server clock synchronization
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
  const [countdownType, setCountdownType] = useState("start"); // "lobby" | "start" | "end" | "none"

  // Webcam Verification State
  const [webcamStatus, setWebcamStatus] = useState("none"); // "none" | "testing" | "granted" | "denied"
  const [webcamError, setWebcamError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Start Action Loading
  const [starting, setStarting] = useState(false);

  // Check auth
  const token = localStorage.getItem("token");
  const isAuthenticated = Boolean(token);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = Boolean(user && (user.role === "admin" || user.role === "superadmin"));

  // Inline Instructions Editing State (Admin Only)
  const [showEditInstructionsModal, setShowEditInstructionsModal] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [editInstructionsError, setEditInstructionsError] = useState("");

  const handleOpenEditInstructions = () => {
    setInstructionsDraft(exam?.instructions || "");
    setEditInstructionsError("");
    setShowEditInstructionsModal(true);
  };

  const handleSaveInstructions = async () => {
    if (!exam?._id) return;
    try {
      setSavingInstructions(true);
      setEditInstructionsError("");
      await axios.put(
        `${API_BASE}/api/live-exams/${exam._id}`,
        { instructions: instructionsDraft },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setExam((prev) => ({
        ...prev,
        instructions: instructionsDraft.trim(),
      }));
      setShowEditInstructionsModal(false);
    } catch (err) {
      console.error("Error saving instructions:", err);
      setEditInstructionsError(err.response?.data?.message || "Failed to update instructions.");
    } finally {
      setSavingInstructions(false);
    }
  };

  // Cleanup webcam stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Fetch Exam Data & Student Attempt
  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch public metadata (zero answer leakage)
      const pubRes = await axios.get(`${API_BASE}/api/live-exams/public/${slugOrToken}`);
      setExam(pubRes.data);

      // Calculate server clock offset
      if (pubRes.data.serverTime) {
        const serverTime = new Date(pubRes.data.serverTime).getTime();
        setServerOffsetMs(serverTime - Date.now());
      }

      // 2. If authenticated, fetch student attempt state and join lobby
      if (token) {
        try {
          const authHeaders = { Authorization: `Bearer ${token}` };
          const stateRes = await axios.get(`${API_BASE}/api/live-exams/student-state/${slugOrToken}`, {
            headers: authHeaders,
          });
          setStudentState(stateRes.data);

          // If student has not yet entered lobby or in-progress, record lobby join
          if (!stateRes.data.attempt || stateRes.data.attempt.status === "registered") {
            await axios.post(
              `${API_BASE}/api/live-exams/${pubRes.data._id}/join-lobby`,
              {},
              { headers: authHeaders }
            );
          }
        } catch (err) {
          console.warn("Could not fetch student state:", err.response?.data?.message || err.message);
        }
      }
    } catch (err) {
      console.error("Failed to load live exam lobby:", err);
      setError(err.response?.data?.message || "Failed to load examination details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamDetails();
  }, [slugOrToken]);

  // Real-time Countdown Timer (ticking every second)
  useEffect(() => {
    if (!exam) return;

    const interval = setInterval(() => {
      const now = Date.now() + serverOffsetMs;
      const startTime = new Date(exam.scheduledStartTime).getTime();
      const endTime = new Date(exam.scheduledEndTime).getTime();
      const lobbyStartTime = startTime - (exam.entryWindowMinutes || 15) * 60 * 1000;

      let target = null;
      let type = "none";

      if (now < lobbyStartTime) {
        target = lobbyStartTime;
        type = "lobby";
      } else if (now < startTime) {
        target = startTime;
        type = "start";
      } else if (now < endTime) {
        target = endTime;
        type = "end";
      }

      setCountdownType(type);

      if (target) {
        const diff = Math.max(0, target - now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining({ days, hours, minutes, seconds, totalMs: diff });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [exam, serverOffsetMs]);

  // Request & Verify Webcam (Strictly Local Preview)
  const handleVerifyWebcam = async () => {
    try {
      setWebcamStatus("testing");
      setWebcamError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser or device does not support camera access.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setWebcamStatus("granted");
    } catch (err) {
      console.error("Camera verification failed:", err);
      setWebcamStatus("denied");
      setWebcamError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access in your browser site settings."
          : err.name === "NotFoundError"
          ? "No camera found on this device."
          : err.message || "Failed to access camera."
      );
    }
  };

  // Start or Resume Exam
  const handleStartExam = async () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("redirect_after_login", `/live-exam/${slugOrToken}`);
      navigate(`/login?redirect=/live-exam/${slugOrToken}`);
      return;
    }

    if (exam.webcamRule === "mandatory" && webcamStatus !== "granted") {
      alert("Please complete camera verification before starting.");
      return;
    }

    try {
      setStarting(true);
      const res = await axios.post(
        `${API_BASE}/api/live-exams/${exam._id}/start-attempt`,
        { webcamStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Stop camera preview before navigating to player
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      navigate(`/live-exam/play/${res.data.attemptId}`);
    } catch (err) {
      console.error("Failed to start attempt:", err);
      alert(err.response?.data?.message || "Failed to start examination. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="live-exam-page" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="loader" style={{ width: "42px", height: "42px", border: "4px solid var(--primary, #7c3aed)", borderBottomColor: "transparent", borderRadius: "50%", animation: "rotation 1s linear infinite" }}></div>
        <p style={{ marginTop: "16px", color: "var(--text-secondary)", fontSize: "14px" }}>Entering examination lobby...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="live-exam-page">
        <header className="live-exam-header">
          <div className="live-exam-header-left"><Logo /></div>
          <div className="live-exam-header-right"><ThemeToggle /></div>
        </header>
        <div className="live-lobby-container" style={{ textAlign: "center", marginTop: "60px" }}>
          <div className="live-card">
            <ShieldAlert size={48} color="#ef4444" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>Examination Unavailable</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>{error || "The live examination link is invalid or has expired."}</p>
            <Link to="/dashboard" className="live-btn-primary">Return to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const isLiveNow = countdownType === "end";
  const nowMs = Date.now() + serverOffsetMs;
  const isPastEndTime = exam.scheduledEndTime && nowMs >= new Date(exam.scheduledEndTime).getTime();
  const isCompleted =
    exam.status === "completed" ||
    isPastEndTime ||
    (countdownType === "none" && timeRemaining.totalMs === 0 && new Date() > new Date(exam.scheduledEndTime));
  const attempt = studentState?.attempt;
  const isAlreadySubmitted = attempt && ["submitted", "auto_submitted"].includes(attempt.status);
  const isInProgress = attempt && attempt.status === "in_progress";

  return (
    <div className="live-exam-page">
      {/* Header */}
      <header className="live-exam-header">
        <div className="live-exam-header-left">
          <Logo />
          <span className="live-header-pill" style={{ fontSize: "13px", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "1px", background: "rgba(124, 58, 237, 0.12)", padding: "4px 10px", borderRadius: "6px" }}>
            Live Exam
          </span>
        </div>
        <div className="live-exam-header-right">
          <ThemeToggle />
          <button
            type="button"
            onClick={toggleThemePicker}
            className="live-btn-secondary live-btn-theme-picker"
            style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Themes & Colors"
            aria-label="Customize Theme"
          >
            <Palette size={16} />
            <span className="live-btn-theme-text" style={{ fontSize: "12px" }}>Theme</span>
          </button>
          {isAuthenticated ? (
            <div className="live-header-user-pill" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", background: "rgba(255,255,255,0.05)", padding: "6px 14px", borderRadius: "20px" }}>
              <span>{user.fullName || "Candidate"}</span>
            </div>
          ) : (
            <Link
              to={`/login?redirect=/live-exam/${slugOrToken}`}
              className="live-btn-primary"
              style={{ padding: "8px 18px", fontSize: "13px" }}
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Lobby Container */}
      <div className="live-lobby-container">
        {/* Banner if not authenticated */}
        {!isAuthenticated && (
          <div className="live-signin-banner" style={{ background: "rgba(124, 58, 237, 0.12)", border: "1.5px solid var(--primary)", borderRadius: "14px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>Sign in required</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Please log in to your PrepMark account to record your attendance and begin.</div>
            </div>
            <Link
              to={`/login?redirect=/live-exam/${slugOrToken}`}
              className="live-btn-primary"
              style={{ padding: "8px 18px", fontSize: "13px", flexShrink: 0 }}
            >
              Log In Now
            </Link>
          </div>
        )}

        {/* Top Info Card */}
        <div className="live-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <span className={`live-badge ${isLiveNow ? "live-badge-live" : countdownType === "start" ? "live-badge-lobby" : isCompleted ? "live-badge-completed" : "live-badge-scheduled"}`}>
              {isLiveNow ? "⚡ LIVE NOW" : countdownType === "start" ? "⌛ LOBBY OPEN" : isCompleted ? "✓ CONCLUDED" : "📅 SCHEDULED"}
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>
              {exam.examName} · {exam.subject}
            </span>
          </div>

          <h1 className="live-exam-title">{exam.title}</h1>
          <p className="live-exam-subtitle">
            Scheduled: {new Date(exam.scheduledStartTime).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })},{" "}
            {new Date(exam.scheduledStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
            {new Date(exam.scheduledEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>

          {/* Key Metrics Grid */}
          <div className="live-meta-grid">
            <div className="live-meta-item">
              <div className="live-meta-icon"><Clock size={18} /></div>
              <div>
                <div className="live-meta-label">Duration</div>
                <div className="live-meta-val">{exam.duration} Minutes</div>
              </div>
            </div>

            <div className="live-meta-item">
              <div className="live-meta-icon"><HelpCircle size={18} /></div>
              <div>
                <div className="live-meta-label">Questions</div>
                <div className="live-meta-val">{exam.totalQuestions || "—"} Total</div>
              </div>
            </div>

            <div className="live-meta-item">
              <div className="live-meta-icon"><Award size={18} /></div>
              <div>
                <div className="live-meta-label">Marking</div>
                <div className="live-meta-val">+{exam.marksPerQuestion} / -{exam.negativeMarking}</div>
              </div>
            </div>

            <div className="live-meta-item">
              <div className="live-meta-icon"><Video size={18} /></div>
              <div>
                <div className="live-meta-label">Webcam</div>
                <div className="live-meta-val" style={{ textTransform: "capitalize" }}>{exam.webcamRule}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Countdown Display */}
        {!isCompleted && !isAlreadySubmitted && (
          <div className="live-countdown-box">
            <div className="live-countdown-title">
              {countdownType === "lobby" && "Lobby Opens In"}
              {countdownType === "start" && "Examination Commences In"}
              {countdownType === "end" && "⚡ Examination Is Live! Time Remaining"}
            </div>

            <div className="live-countdown-digits">
              {timeRemaining.days > 0 && (
                <div className="live-countdown-unit">
                  <div className="live-countdown-num">{String(timeRemaining.days).padStart(2, "0")}</div>
                  <div className="live-countdown-lbl">Days</div>
                </div>
              )}
              <div className="live-countdown-unit">
                <div className="live-countdown-num">{String(timeRemaining.hours).padStart(2, "0")}</div>
                <div className="live-countdown-lbl">Hours</div>
              </div>
              <div className="live-countdown-unit">
                <div className="live-countdown-num">{String(timeRemaining.minutes).padStart(2, "0")}</div>
                <div className="live-countdown-lbl">Minutes</div>
              </div>
              <div className="live-countdown-unit">
                <div className="live-countdown-num" style={{ color: isLiveNow ? "#ef4444" : "var(--text-primary)" }}>
                  {String(timeRemaining.seconds).padStart(2, "0")}
                </div>
                <div className="live-countdown-lbl">Seconds</div>
              </div>
            </div>
          </div>
        )}

        {/* Existing Attempt Warning / Status (when exam is still ongoing) */}
        {isAlreadySubmitted && !isCompleted && (
          <div className="live-card" style={{ borderColor: "#10b981", textAlign: "center" }}>
            <CheckCircle2 size={44} color="#10b981" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "6px" }}>Examination Completed</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
              Your answers have been securely recorded. Results will be announced according to the administrator's schedule.
            </p>
            {attempt.resultId && (
              <Link to={`/result/${attempt.resultId}`} className="live-btn-primary">
                View Result & Analysis
              </Link>
            )}
          </div>
        )}

        {/* Concluded / Ended Status Card (clean message when exam has ended) */}
        {isCompleted && (
          <div className="live-card" style={{ textAlign: "center", padding: "36px 20px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>
              The Examination Has Ended
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "420px", margin: "0 auto 24px", lineHeight: "1.6" }}>
              The scheduled time window for this live examination has concluded. Submissions are now closed.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              {attempt?.resultId && (
                <Link
                  to={`/result/${attempt.resultId}`}
                  className="live-btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
                >
                  View Result & Analysis <ArrowRight size={16} />
                </Link>
              )}
              <Link
                to="/dashboard"
                className={attempt?.resultId ? "live-btn-secondary" : "live-btn-primary"}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Webcam Readiness Check Section (only shown when exam is active/upcoming) */}
        {exam.webcamRule !== "disabled" && !isAlreadySubmitted && !isCompleted && (
          <div className="live-card live-webcam-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Video size={20} color="var(--primary)" />
                <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
                  Camera Readiness Check {exam.webcamRule === "mandatory" ? "(Mandatory)" : "(Optional)"}
                </h3>
              </div>
              {webcamStatus === "granted" && (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#10b981", fontWeight: "700" }}>
                  <CheckCircle2 size={16} /> Verified
                </span>
              )}
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 16px" }}>
              {exam.webcamRule === "mandatory"
                ? "This live examination requires camera readiness. Camera preview runs strictly locally in your browser to verify your setup. No video is recorded or streamed."
                : "You may optionally verify your camera readiness for this examination."}
            </p>

            {webcamStatus === "granted" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <div className="webcam-preview-wrapper">
                  <video ref={videoRef} autoPlay playsInline muted />
                </div>
                <span style={{ fontSize: "13px", color: "#10b981", fontWeight: "600" }}>
                  ✓ Camera preview active and ready
                </span>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleVerifyWebcam}
                  disabled={webcamStatus === "testing"}
                  className="live-btn-camera"
                >
                  <Video size={18} color="var(--primary)" />
                  <span>{webcamStatus === "testing" ? "Accessing Camera..." : "Test & Verify Camera"}</span>
                </button>

                {webcamError && (
                  <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "13px" }}>
                    {webcamError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions Card (only shown when exam is active/upcoming) */}
        {!isCompleted && !isAlreadySubmitted && (
          <div className="live-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <HelpCircle size={18} color="var(--primary)" /> Important Examination Instructions
              </h3>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenEditInstructions}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(110, 63, 243, 0.12)",
                    border: "1px solid rgba(110, 63, 243, 0.3)",
                    color: "var(--primary, #8B5CF6)",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Edit3 size={13} /> Edit Instructions
                </button>
              )}
            </div>

            <ul className="live-instructions-list" style={{ margin: 0, paddingLeft: "20px", color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.7" }}>
              {parseInstructions(exam.instructions, exam).map((item, idx) => (
                <li key={idx} style={{ marginBottom: "6px" }}>
                  {item.title ? (
                    <>
                      <strong style={{ color: "var(--text-primary)" }}>{item.title}:</strong> {item.body}
                    </>
                  ) : (
                    <span>{item.body}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button Section (only shown when exam is active/upcoming) */}
        {!isAlreadySubmitted && !isCompleted && (
          <div className="live-action-section" style={{ textAlign: "center", marginTop: "32px" }}>
            {!isAuthenticated ? (
              <Link
                to={`/login?redirect=/live-exam/${slugOrToken}`}
                className="live-btn-primary"
                style={{ width: "100%", maxWidth: "380px" }}
              >
                Sign In to Start Examination <ArrowRight size={18} />
              </Link>
            ) : isInProgress ? (
              <button
                type="button"
                onClick={handleStartExam}
                disabled={starting}
                className="live-btn-primary"
                style={{ width: "100%", maxWidth: "380px", background: "#10b981", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)" }}
              >
                {starting ? "Resuming..." : "Resume In-Progress Exam"} <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartExam}
                disabled={starting || !isLiveNow || (exam.webcamRule === "mandatory" && webcamStatus !== "granted")}
                className="live-btn-primary"
                style={{ width: "100%", maxWidth: "380px" }}
              >
                {starting
                  ? "Starting Examination..."
                  : !isLiveNow
                  ? "Waiting for Exam to Open..."
                  : exam.webcamRule === "mandatory" && webcamStatus !== "granted"
                  ? "Verify Camera to Start"
                  : "Start Examination Now"}
                <ArrowRight size={18} />
              </button>
            )}

            {!isLiveNow && !isCompleted && !isAlreadySubmitted && (
              <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                The "Start Examination" button will automatically activate once the clock reaches start time.
              </p>
            )}
          </div>
        )}

        {/* Inline Instructions Editor Modal (Admin Only) */}
        {showEditInstructionsModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
              padding: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--bg-card, #1c1a2e)",
                border: "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
                borderRadius: "16px",
                width: "100%",
                maxWidth: "600px",
                padding: "24px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                color: "var(--text-primary, #ffffff)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Edit3 size={18} color="var(--primary)" /> Edit Examination Instructions
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditInstructionsModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary, #94a3b8)",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--text-secondary, #94a3b8)", lineHeight: "1.5" }}>
                Each line will be displayed as a bullet point in the student lobby. Use <strong>Title: Description</strong> to bold headings.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "8px" }}>
                <button
                  type="button"
                  onClick={() =>
                    setInstructionsDraft(
`Server-Authoritative Clock: The countdown timer is synced with the official examination server. When time expires, your answers will automatically submit.
Network & Disconnection Safety: Your selected answers are periodically auto-saved. If you experience a brief disconnection or accidental page refresh, simply return to this link to resume.
Single Attempt Rule: You are permitted exactly one attempt. Once submitted, answers cannot be edited.
Late Entry: ${exam?.allowLateEntry ? `Entry permitted up to ${exam.entryWindowMinutes || 15} minutes after start.` : "Late entry is strictly prohibited."}`
                    )
                  }
                  style={{
                    background: "rgba(110, 63, 243, 0.12)",
                    border: "1px solid rgba(110, 63, 243, 0.3)",
                    color: "var(--primary, #8B5CF6)",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "11.5px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Load Default Template
                </button>
                {instructionsDraft && (
                  <button
                    type="button"
                    onClick={() => setInstructionsDraft("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary, #94a3b8)",
                      fontSize: "11.5px",
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <textarea
                rows="7"
                value={instructionsDraft}
                onChange={(e) => setInstructionsDraft(e.target.value)}
                placeholder={`Write your examination instructions here...\nExample:\nNegative Marking: 0.25 marks deducted for wrong answers.\nRough Sheets: Rough paper is allowed.`}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                  backgroundColor: "var(--bg-page, #12121a)",
                  color: "var(--text-primary, #ffffff)",
                  fontSize: "13px",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: "1.5",
                  boxSizing: "border-box",
                }}
              />

              {editInstructionsError && (
                <div style={{ marginTop: "10px", color: "#ef4444", fontSize: "12.5px" }}>
                  {editInstructionsError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                <button
                  type="button"
                  onClick={() => setShowEditInstructionsModal(false)}
                  disabled={savingInstructions}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                    color: "var(--text-primary, #ffffff)",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveInstructions}
                  disabled={savingInstructions}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    background: "var(--primary, #6366f1)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {savingInstructions ? "Saving..." : "Save Instructions"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveExamLobby;
