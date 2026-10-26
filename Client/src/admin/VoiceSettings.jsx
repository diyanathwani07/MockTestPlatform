import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Volume2,
  Mic,
  Play,
  Square,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  Clock,
  Calendar,
  RefreshCw,
  Sparkles,
  Languages,
  PhoneCall,
  Sliders,
  CheckCircle2,
  Info,
  ShieldCheck,
  Radio,
  X
} from "lucide-react";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";

const API = import.meta.env.VITE_API_URL || "";

const extractErrorMessage = (err, fallback = "An error occurred") => {
  if (!err) return fallback;
  const raw =
    err.response?.data?.error ||
    err.response?.data?.message ||
    err.message ||
    fallback;
  if (typeof raw === "string") {
    try {
      if (raw.trim().startsWith("{") && raw.includes('"message"')) {
        const parsed = JSON.parse(raw);
        return parsed.error?.message || parsed.message || raw;
      }
    } catch (_) {}
    return raw;
  }
  if (typeof raw === "object" && raw !== null) {
    return raw.message || JSON.stringify(raw);
  }
  return String(raw);
};

const GEMINI_VOICES = [
  { id: "Aoede", name: "Aoede", gender: "Female", description: "Clear, articulated, steady broadcasting tone (Recommended Default)" },
  { id: "Charon", name: "Charon", gender: "Male", description: "Deep, authoritative, serious educational tone" },
  { id: "Fenrir", name: "Fenrir", gender: "Male", description: "Resonant, bold, confident pacing" },
  { id: "Kore", name: "Kore", gender: "Female", description: "Warm, supportive, calming student guide" },
  { id: "Puck", name: "Puck", gender: "Male", description: "Energetic, dynamic, enthusiastic reminder voice" }
];

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST - UTC+05:30)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" }
];

const DEFAULT_SETTINGS = {
  model: "gemini-2.5-flash-preview-tts",
  englishVoice: "Aoede",
  hindiVoice: "Aoede",
  defaultLanguage: "auto",
  englishPrompt:
    "You are an articulate, professional news anchor and educator. Read this news report aloud clearly in an engaging, natural, steady broadcasting tone with precise pronunciation.",
  hindiPrompt:
    "आप एक पेशेवर और स्पष्ट समाचार वाचक (News Broadcaster) हैं। इस समाचार को सहज, प्रामाणिक और प्रभावशाली हिंदी उच्चारण में स्पष्ट रूप से पढ़कर सुनाएं। कठिन शब्दों और तकनीकी नामों का उच्चारण अत्यंत स्पष्ट रखें।",
  callingSchedule: {
    enabled: true,
    allowedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    startTime: "08:00",
    endTime: "21:00",
    timeZone: "Asia/Kolkata"
  },
  retryRules: {
    maxRetryAttempts: 3,
    retryDelayMinutes: 15
  },
  reminderDefaults: {
    defaultTimingMinutes: 15,
    defaultTemplateEnglish:
      "Hello! This is your study reminder from Teaching Pariksha AI regarding: {taskTitle}.",
    defaultTemplateHindi:
      "नमस्ते! यह टीचिंग परीक्षा AI की ओर से आपके अध्ययन कार्य '{taskTitle}' के लिए एक अनुस्मारक है।"
  },
  enabled: true
};

export default function VoiceSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("voice"); // 'voice' | 'schedule' | 'retry' | 'templates'
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_SETTINGS);
  const [updatedByMeta, setUpdatedByMeta] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [toast, setToast] = useState(null);

  // Audio preview states
  const [previewText, setPreviewText] = useState("Hello! This is a test reminder from Teaching Pariksha AI.");
  const [previewLang, setPreviewLang] = useState("en");
  const [previewVoice, setPreviewVoice] = useState("Aoede");
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewDuration, setPreviewDuration] = useState(null);
  const audioRef = useRef(null);

  const token = localStorage.getItem("token");

  // Show auto-dismissing toast notification
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Check if form is dirty
  const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  // Warn before leaving if dirty
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Fetch Voice Settings on Mount
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/voice-settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success && res.data.settings) {
        const fetched = {
          ...DEFAULT_SETTINGS,
          ...res.data.settings,
          callingSchedule: {
            ...DEFAULT_SETTINGS.callingSchedule,
            ...(res.data.settings.callingSchedule || {})
          },
          retryRules: {
            ...DEFAULT_SETTINGS.retryRules,
            ...(res.data.settings.retryRules || {})
          },
          reminderDefaults: {
            ...DEFAULT_SETTINGS.reminderDefaults,
            ...(res.data.settings.reminderDefaults || {})
          }
        };

        setSettings(fetched);
        setOriginalSettings(fetched);
        setUpdatedByMeta(res.data.settings.updatedBy || null);
        setLastUpdatedAt(res.data.settings.updatedAt || null);
        setPreviewVoice(fetched.englishVoice || "Aoede");
      }
    } catch (err) {
      console.error("[VoiceSettings] Fetch error:", err);
      showToast(extractErrorMessage(err, "Failed to load voice configuration"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Settings
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!token) {
      showToast("Authentication required to save settings.", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await axios.put(`${API}/api/voice-settings`, settings, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.data?.success) {
        const updated = {
          ...DEFAULT_SETTINGS,
          ...res.data.settings,
          callingSchedule: {
            ...DEFAULT_SETTINGS.callingSchedule,
            ...(res.data.settings.callingSchedule || {})
          },
          retryRules: {
            ...DEFAULT_SETTINGS.retryRules,
            ...(res.data.settings.retryRules || {})
          },
          reminderDefaults: {
            ...DEFAULT_SETTINGS.reminderDefaults,
            ...(res.data.settings.reminderDefaults || {})
          }
        };

        setSettings(updated);
        setOriginalSettings(updated);
        setUpdatedByMeta(res.data.settings.updatedBy || null);
        setLastUpdatedAt(res.data.settings.updatedAt || new Date().toISOString());
        showToast("Voice reminder settings saved successfully!", "success");
      }
    } catch (err) {
      console.error("[VoiceSettings] Save error:", err);
      showToast(extractErrorMessage(err, "Failed to save settings. Please try again."), "error");
    } finally {
      setSaving(false);
    }
  };

  // Revert / Discard unsaved changes
  const handleReset = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings)));
    showToast("Unsaved changes discarded", "info");
  };

  // Live Audio Sample Preview Generator
  const handleGeneratePreview = async () => {
    if (!previewText || previewText.trim() === "") {
      showToast("Please enter a sample text to preview.", "error");
      return;
    }

    try {
      setGeneratingPreview(true);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlayingPreview(false);
      }

      const selectedPrompt =
        previewLang === "hi" ? settings.hindiPrompt : settings.englishPrompt;

      const res = await axios.post(
        `${API}/api/voice-settings/test`,
        {
          sampleText: previewText.trim(),
          lang: previewLang,
          voice: previewVoice,
          customPrompt: selectedPrompt
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      if (res.data?.success && res.data.audioUrl) {
        setPreviewAudioUrl(res.data.audioUrl);
        setPreviewDuration(res.data.durationSeconds || null);
        showToast("Audio sample generated successfully! Playing preview...", "success");

        // Auto play generated audio
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.play().then(() => {
              setIsPlayingPreview(true);
            }).catch(e => {
              console.warn("Auto-play prevented by browser policy:", e);
            });
          }
        }, 100);
      } else {
        throw new Error(res.data?.error || "Preview generation failed");
      }
    } catch (err) {
      console.error("[VoiceSettings] Audio preview error:", err);
      showToast(extractErrorMessage(err, "Failed to generate audio sample preview"), "error");
    } finally {
      setGeneratingPreview(false);
    }
  };

  // Toggle playback of the current preview
  const handleTogglePlayback = () => {
    if (!audioRef.current || !previewAudioUrl) return;
    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch(err => {
        console.error("Playback error:", err);
        setIsPlayingPreview(false);
      });
    }
  };

  // Toggle allowed day helper
  const toggleDay = (day) => {
    const currentDays = settings.callingSchedule?.allowedDays || [];
    let updated;
    if (currentDays.includes(day)) {
      if (currentDays.length === 1) {
        showToast("At least one calling day must be permitted.", "error");
        return;
      }
      updated = currentDays.filter(d => d !== day);
    } else {
      updated = [...currentDays, day];
    }
    setSettings(prev => ({
      ...prev,
      callingSchedule: { ...prev.callingSchedule, allowedDays: updated }
    }));
  };

  // Select all days
  const handleSelectAllDays = () => {
    setSettings(prev => ({
      ...prev,
      callingSchedule: { ...prev.callingSchedule, allowedDays: [...WEEK_DAYS] }
    }));
  };

  // Weekdays only
  const handleSelectWeekdays = () => {
    setSettings(prev => ({
      ...prev,
      callingSchedule: {
        ...prev.callingSchedule,
        allowedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      }
    }));
  };

  // Weekends only
  const handleSelectWeekends = () => {
    setSettings(prev => ({
      ...prev,
      callingSchedule: {
        ...prev.callingSchedule,
        allowedDays: ["Saturday", "Sunday"]
      }
    }));
  };

  // Format date helper
  const formatDateTime = (isoString) => {
    if (!isoString) return "Never";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title="Voice Settings" parentText="Dashboard" parentLink="/admin/dashboard" />

        <div className="admin-content" style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "80px" }}>
          {/* Toast Notification Banner */}
          {toast && (
            <div
              className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:top-6 z-[9999] max-w-md w-auto mx-auto sm:mx-0 flex items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl text-sm font-medium shadow-2xl transition-all duration-200"
              style={{
                color: "#ffffff",
                background:
                  toast.type === "error"
                    ? "#DC2626"
                    : toast.type === "info"
                    ? "#2563EB"
                    : "#059669",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)"
              }}
            >
              <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                {toast.type === "error" ? (
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 sm:mt-0 text-white" />
                ) : (
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5 sm:mt-0 text-white" />
                )}
                <span className="break-words text-xs sm:text-sm leading-snug">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="shrink-0 p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer text-white"
                aria-label="Dismiss toast"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Unsaved Changes Banner */}
          {isDirty && (
            <div
              className="mb-5 px-4 py-3 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md"
              style={{
                background: "linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.08))",
                border: "1px solid rgba(245, 158, 11, 0.35)"
              }}
            >
              <div className="flex items-center gap-2.5 font-semibold text-xs sm:text-sm" style={{ color: "#FBBF24" }}>
                <AlertTriangle size={17} className="shrink-0" style={{ color: "#FBBF24" }} />
                <span>You have unsaved changes to voice settings.</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    color: "#FDE68A"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
                >
                  <RotateCcw size={12} />
                  <span>Discard</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                  style={{
                    background: "#F59E0B",
                    color: "#000000",
                    border: "none",
                    cursor: saving ? "not-allowed" : "pointer"
                  }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.background = "#FBBF24")}
                  onMouseLeave={(e) => !saving && (e.currentTarget.style.background = "#F59E0B")}
                >
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Page Top Header with Title, Status & Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--primary)] shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25))",
                    border: "1px solid rgba(139, 92, 246, 0.4)"
                  }}
                >
                  <Volume2 size={20} />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] m-0">
                  Voice Settings
                </h1>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
                  style={{
                    background: settings.enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: settings.enabled ? "#10B981" : "#EF4444",
                    border: `1px solid ${settings.enabled ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                  }}
                >
                  {settings.enabled ? "Subsystem Active" : "Subsystem Disabled"}
                </span>
              </div>
              <p className="m-0 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Configure Gemini multimodal text-to-speech voices, automated calling schedules, retry escalation rules, and reminder defaults.
              </p>
              {lastUpdatedAt && (
                <div className="mt-1.5 text-xs text-[var(--text-muted)]">
                  Last updated: <strong>{formatDateTime(lastUpdatedAt)}</strong>
                  {updatedByMeta && (
                    <span> by <strong>{updatedByMeta.fullName || updatedByMeta.name || updatedByMeta.email || "Admin"}</strong></span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end sm:justify-start shrink-0">
              <button
                type="button"
                onClick={fetchSettings}
                disabled={loading}
                title="Refresh from server"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: "var(--bg-card, rgba(255, 255, 255, 0.04))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                  color: "var(--text-secondary)"
                }}
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                style={{
                  background: isDirty ? "var(--primary)" : "rgba(255, 255, 255, 0.08)",
                  color: isDirty ? "var(--primary-foreground, #000)" : "var(--text-muted)",
                  border: "none",
                  cursor: isDirty ? "pointer" : "not-allowed"
                }}
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>

          {/* Master Subsystem Toggle Card */}
          <div
            className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card,rgba(255,255,255,0.03))] border border-[var(--border-color,rgba(255,255,255,0.08))] mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0"
                style={{
                  background: settings.enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.12)",
                  color: settings.enabled ? "#10B981" : "#EF4444"
                }}
              >
                <PhoneCall size={20} />
              </div>
              <div>
                <h3 className="m-0 mb-1 text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                  Master Voice Reminders Switch
                </h3>
                <p className="m-0 text-xs sm:text-sm text-[var(--text-secondary)] leading-snug">
                  {settings.enabled
                    ? "Voice calling sweeps and automated audio dispatch are globally active across all scheduled tasks."
                    : "Voice calling subsystem is paused globally. Push notifications and scheduled timers will not trigger voice calls."}
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer self-end sm:self-center shrink-0">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only"
              />
              <div
                className="rounded-full transition-colors relative"
                style={{
                  background: settings.enabled ? "var(--primary)" : "rgba(255, 255, 255, 0.2)",
                  width: "48px",
                  height: "26px"
                }}
              >
                <div
                  className="absolute top-[3px] rounded-full bg-white transition-all shadow-md"
                  style={{
                    left: settings.enabled ? "25px" : "3px",
                    width: "20px",
                    height: "20px"
                  }}
                />
              </div>
            </label>
          </div>

          {/* Navigation Tabs */}
          <div
            className="flex items-center gap-2 border-b border-[var(--border-color,rgba(255,255,255,0.08))] mb-6 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {[
              { id: "voice", label: "Voice & Language", icon: Mic },
              { id: "schedule", label: "Calling Schedule", icon: Calendar },
              { id: "retry", label: "Retry Rules", icon: Sliders },
              { id: "templates", label: "Reminder Defaults", icon: Sparkles }
            ].map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className="inline-flex items-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer"
                  style={{
                    border: "none",
                    background: active ? "var(--primary)" : "transparent",
                    color: active ? "var(--primary-foreground, #000)" : "var(--text-secondary)",
                    fontWeight: active ? "600" : "500",
                    whiteSpace: "nowrap"
                  }}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Voice & Language */}
          {activeTab === "voice" && (
            <div className="flex flex-col gap-5 sm:gap-6">
              {/* TTS Engine info banner */}
              <div
                className="p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
                style={{
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))",
                  border: "1px solid rgba(139, 92, 246, 0.25)"
                }}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <Sparkles size={20} className="text-[var(--primary)] shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <h4 className="m-0 mb-0.5 text-sm font-semibold text-[var(--text-primary)]">
                      AI Model: {settings.model}
                    </h4>
                    <p className="m-0 text-xs text-[var(--text-secondary)] leading-snug">
                      Gemini Multimodal Live Audio Preview produces natural 24,000 Hz, 16-bit PCM voice synthesis with high intelligibility.
                    </p>
                  </div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-md text-xs font-semibold shrink-0"
                  style={{
                    background: "rgba(139, 92, 246, 0.2)",
                    color: "var(--primary)"
                  }}
                >
                  Official Gemini TTS
                </span>
              </div>

              {/* Language & Voice Selector Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Default Language Selection */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                    Default Language Strategy
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-3.5 leading-snug">
                    Select how the system chooses between English and Hindi voice synthesis for task titles.
                  </p>
                  <select
                    value={settings.defaultLanguage || "auto"}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultLanguage: e.target.value }))}
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)"
                    }}
                  >
                    <option value="auto">Auto-Detect (Devanagari text triggers Hindi, Latin text triggers English)</option>
                    <option value="en">Always English</option>
                    <option value="hi">Always Hindi</option>
                  </select>
                </div>

                {/* English Voice Selector */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                    English Voice Persona
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-3.5 leading-snug">
                    Voice model used for English reminder playback.
                  </p>
                  <select
                    value={settings.englishVoice || "Aoede"}
                    onChange={(e) => setSettings(prev => ({ ...prev, englishVoice: e.target.value }))}
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)"
                    }}
                  >
                    {GEMINI_VOICES.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender}) - {v.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hindi Voice Selector */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                    Hindi Voice Persona
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-3.5 leading-snug">
                    Voice model used for Hindi reminder playback.
                  </p>
                  <select
                    value={settings.hindiVoice || "Aoede"}
                    onChange={(e) => setSettings(prev => ({ ...prev, hindiVoice: e.target.value }))}
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)"
                    }}
                  >
                    {GEMINI_VOICES.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender}) - {v.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom System Prompts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {/* English Prompt */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-semibold text-[var(--text-primary)]">
                      English System Instruction Prompt
                    </label>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {(settings.englishPrompt || "").length} chars
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-3 leading-snug">
                    Directs the Gemini TTS vocal delivery, cadence, and broadcast tone for English reminders.
                  </p>
                  <textarea
                    rows={4}
                    value={settings.englishPrompt || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, englishPrompt: e.target.value }))}
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      lineHeight: "1.5",
                      resize: "vertical"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, englishPrompt: DEFAULT_SETTINGS.englishPrompt }))}
                    className="mt-2 text-xs text-[var(--primary)] hover:underline cursor-pointer p-0 bg-transparent border-none"
                  >
                    Reset to default English instruction
                  </button>
                </div>

                {/* Hindi Prompt */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-semibold text-[var(--text-primary)]">
                      Hindi System Instruction Prompt
                    </label>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {(settings.hindiPrompt || "").length} chars
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-3 leading-snug">
                    Directs Hindi pronunciation, news-anchor tone, and clarity for Sanskrit/Hindi academic vocabulary.
                  </p>
                  <textarea
                    rows={4}
                    value={settings.hindiPrompt || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, hindiPrompt: e.target.value }))}
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      lineHeight: "1.5",
                      resize: "vertical"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, hindiPrompt: DEFAULT_SETTINGS.hindiPrompt }))}
                    className="mt-2 text-xs text-[var(--primary)] hover:underline cursor-pointer p-0 bg-transparent border-none"
                  >
                    Reset to default Hindi instruction
                  </button>
                </div>
              </div>

              {/* Real-time Voice Preview Tester Card */}
              <div
                className="p-4 sm:p-6 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))"
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(139, 92, 246, 0.2)",
                      color: "var(--primary)"
                    }}
                  >
                    <Volume2 size={18} />
                  </div>
                  <div>
                    <h3 className="m-0 text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                      Live Audio Sample Preview
                    </h3>
                    <p className="m-0 text-xs text-[var(--text-secondary)]">
                      Test live Gemini TTS rendering with current persona settings before saving.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Preview Language
                    </label>
                    <select
                      value={previewLang}
                      onChange={(e) => {
                        const l = e.target.value;
                        setPreviewLang(l);
                        if (l === "hi") {
                          setPreviewText("नमस्ते! यह टीचिंग परीक्षा AI की ओर से आपका अध्ययन अनुस्मारक है।");
                          setPreviewVoice(settings.hindiVoice || "Aoede");
                        } else {
                          setPreviewText("Hello! This is a test reminder from Teaching Pariksha AI.");
                          setPreviewVoice(settings.englishVoice || "Aoede");
                        }
                      }}
                      className="w-full rounded-xl text-xs sm:text-sm"
                      style={{
                        padding: "8px 12px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)"
                      }}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (हिंदी)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Preview Voice
                    </label>
                    <select
                      value={previewVoice}
                      onChange={(e) => setPreviewVoice(e.target.value)}
                      className="w-full rounded-xl text-xs sm:text-sm"
                      style={{
                        padding: "8px 12px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)"
                      }}
                    >
                      {GEMINI_VOICES.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.gender})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Sample Reminder Text
                  </label>
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                      color: "var(--text-primary)"
                    }}
                  />
                </div>

                {/* Actions & Player */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleGeneratePreview}
                    disabled={generatingPreview}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                    style={{
                      background: "var(--primary)",
                      color: "var(--primary-foreground, #000)",
                      border: "none",
                      cursor: generatingPreview ? "not-allowed" : "pointer"
                    }}
                  >
                    {generatingPreview ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                    <span>{generatingPreview ? "Synthesizing Audio..." : "Generate & Test Audio"}</span>
                  </button>

                  {previewAudioUrl && (
                    <div
                      className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2.5 px-3.5 py-2 rounded-xl"
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)"
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleTogglePlayback}
                        className="rounded-full flex items-center justify-center cursor-pointer shrink-0"
                        style={{
                          background: "var(--primary)",
                          color: "var(--primary-foreground, #000)",
                          border: "none",
                          width: "28px",
                          height: "28px"
                        }}
                      >
                        {isPlayingPreview ? <Square size={12} /> : <Play size={12} />}
                      </button>
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {isPlayingPreview ? "Playing audio..." : "Preview ready"}
                        {previewDuration ? ` (${previewDuration}s)` : ""}
                      </span>
                    </div>
                  )}

                  {/* Hidden audio element */}
                  <audio
                    ref={audioRef}
                    src={previewAudioUrl || ""}
                    onEnded={() => setIsPlayingPreview(false)}
                    onError={() => setIsPlayingPreview(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Calling Schedule */}
          {activeTab === "schedule" && (
            <div className="flex flex-col gap-5 sm:gap-6">
              {/* Schedule active switch */}
              <div
                className="p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4"
                style={{
                  background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                }}
              >
                <div>
                  <h3 className="m-0 mb-1 text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                    Enforce Calling Schedule Hours
                  </h3>
                  <p className="m-0 text-xs sm:text-sm text-[var(--text-secondary)] leading-snug">
                    When enabled, automated reminders will strictly trigger only within the permitted time windows and days configured below.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.callingSchedule?.enabled ?? true}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        callingSchedule: { ...prev.callingSchedule, enabled: e.target.checked }
                      }))
                    }
                    className="sr-only"
                  />
                  <div
                    className="rounded-full transition-colors relative"
                    style={{
                      background: settings.callingSchedule?.enabled ? "var(--primary)" : "rgba(255, 255, 255, 0.2)",
                      width: "48px",
                      height: "26px"
                    }}
                  >
                    <div
                      className="absolute top-[3px] rounded-full bg-white transition-all shadow-md"
                      style={{
                        left: settings.callingSchedule?.enabled ? "25px" : "3px",
                        width: "20px",
                        height: "20px"
                      }}
                    />
                  </div>
                </label>
              </div>

              {/* Permitted Days Selector */}
              <div
                className="p-4 sm:p-5 rounded-2xl"
                style={{
                  background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                  <div>
                    <h4 className="m-0 mb-0.5 text-sm font-semibold text-[var(--text-primary)]">
                      Permitted Calling Days
                    </h4>
                    <p className="m-0 text-xs text-[var(--text-secondary)]">
                      Tasks scheduled on non-permitted days will not trigger voice calls.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSelectAllDays}
                      className="px-2.5 py-1 text-xs rounded-lg cursor-pointer transition-colors"
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)"
                      }}
                    >
                      All Days
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectWeekdays}
                      className="px-2.5 py-1 text-xs rounded-lg cursor-pointer transition-colors"
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)"
                      }}
                    >
                      Weekdays Only
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectWeekends}
                      className="px-2.5 py-1 text-xs rounded-lg cursor-pointer transition-colors"
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)"
                      }}
                    >
                      Weekends Only
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map(day => {
                    const isSelected = (settings.callingSchedule?.allowedDays || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium cursor-pointer transition-all"
                        style={{
                          background: isSelected ? "var(--primary)" : "rgba(255, 255, 255, 0.05)",
                          color: isSelected ? "var(--primary-foreground, #000)" : "var(--text-secondary)",
                          border: isSelected ? "none" : "1px solid var(--border-color, rgba(255, 255, 255, 0.1))"
                        }}
                      >
                        {isSelected && <Check size={13} />}
                        <span>{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Window & Timezone Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Start Time */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                    Daily Window Start Time
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-3 leading-snug">
                    No automated voice calls before this hour.
                  </p>
                  <input
                    type="time"
                    value={settings.callingSchedule?.startTime || "08:00"}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        callingSchedule: { ...prev.callingSchedule, startTime: e.target.value }
                      }))
                    }
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)"
                    }}
                  />
                </div>

                {/* End Time */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                    Daily Window End Time
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-3 leading-snug">
                    No automated voice calls after this hour.
                  </p>
                  <input
                    type="time"
                    value={settings.callingSchedule?.endTime || "21:00"}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        callingSchedule: { ...prev.callingSchedule, endTime: e.target.value }
                      }))
                    }
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)"
                    }}
                  />
                </div>

                {/* Time Zone */}
                <div
                  className="p-4 sm:p-5 rounded-2xl sm:col-span-2 lg:col-span-1"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                    Operational Time Zone
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-3 leading-snug">
                    Reference time zone for calling window boundaries.
                  </p>
                  <select
                    value={settings.callingSchedule?.timeZone || "Asia/Kolkata"}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        callingSchedule: { ...prev.callingSchedule, timeZone: e.target.value }
                      }))
                    }
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)"
                    }}
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Retry Rules */}
          {activeTab === "retry" && (
            <div className="flex flex-col gap-5 sm:gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Max Retry Attempts */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-semibold text-[var(--text-primary)]">
                      Max Retry Attempts
                    </label>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: "rgba(139, 92, 246, 0.15)",
                        color: "var(--primary)"
                      }}
                    >
                      {settings.retryRules?.maxRetryAttempts || 3} Attempts
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-4 leading-snug">
                    Number of consecutive automated retry calls before marking a scheduled reminder as missed. (Range: 1 – 5).
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={settings.retryRules?.maxRetryAttempts || 3}
                      onChange={(e) =>
                        setSettings(prev => ({
                          ...prev,
                          retryRules: {
                            ...prev.retryRules,
                            maxRetryAttempts: parseInt(e.target.value, 10)
                          }
                        }))
                      }
                      className="flex-1"
                      style={{ accentColor: "var(--primary)" }}
                    />
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={settings.retryRules?.maxRetryAttempts || 3}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setSettings(prev => ({
                            ...prev,
                            retryRules: {
                              ...prev.retryRules,
                              maxRetryAttempts: Math.max(1, Math.min(5, val))
                            }
                          }));
                        }
                      }}
                      className="w-14 text-center rounded-xl font-semibold text-sm"
                      style={{
                        padding: "6px 8px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)"
                      }}
                    />
                  </div>
                </div>

                {/* Retry Delay Minutes */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-semibold text-[var(--text-primary)]">
                      Retry Interval (Minutes)
                    </label>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "#3B82F6"
                      }}
                    >
                      {settings.retryRules?.retryDelayMinutes || 15} Mins
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-4 leading-snug">
                    Waiting period between consecutive retry calls if the student did not answer. (Range: 1 – 60 mins).
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={60}
                      step={1}
                      value={settings.retryRules?.retryDelayMinutes || 15}
                      onChange={(e) =>
                        setSettings(prev => ({
                          ...prev,
                          retryRules: {
                            ...prev.retryRules,
                            retryDelayMinutes: parseInt(e.target.value, 10)
                          }
                        }))
                      }
                      className="flex-1"
                      style={{ accentColor: "#3B82F6" }}
                    />
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={settings.retryRules?.retryDelayMinutes || 15}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setSettings(prev => ({
                            ...prev,
                            retryRules: {
                              ...prev.retryRules,
                              retryDelayMinutes: Math.max(1, Math.min(60, val))
                            }
                          }));
                        }
                      }}
                      className="w-14 text-center rounded-xl font-semibold text-sm"
                      style={{
                        padding: "6px 8px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Simulation projection card */}
              <div
                className="p-4 sm:p-5 rounded-2xl"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                }}
              >
                <h4 className="m-0 mb-2 text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Info size={16} className="text-[var(--primary)]" />
                  <span>Escalation Timeline Simulation</span>
                </h4>
                <div className="flex flex-wrap gap-2 mt-3">
                  <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)", color: "#10B981" }}>
                    <strong>Initial Dispatch:</strong> At task time
                  </div>
                  {Array.from({ length: settings.retryRules?.maxRetryAttempts || 3 }).map((_, idx) => {
                    const delay = (idx + 1) * (settings.retryRules?.retryDelayMinutes || 15);
                    return (
                      <div key={idx} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.25)", color: "#60A5FA" }}>
                        <strong>Retry #{idx + 1}:</strong> +{delay} mins
                      </div>
                    );
                  })}
                  <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#F87171" }}>
                    <strong>Resolution:</strong> Mark Missed after {((settings.retryRules?.maxRetryAttempts || 3) * (settings.retryRules?.retryDelayMinutes || 15))} mins total
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Reminder Defaults & Templates */}
          {activeTab === "templates" && (
            <div className="flex flex-col gap-5 sm:gap-6">
              {/* Default Lead Timing */}
              <div
                className="p-4 sm:p-5 rounded-2xl"
                style={{
                  background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                }}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-semibold text-[var(--text-primary)]">
                    Default Lead Time Before Task (Minutes)
                  </label>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(139, 92, 246, 0.15)",
                      color: "var(--primary)"
                    }}
                  >
                    {settings.reminderDefaults?.defaultTimingMinutes || 15} Mins Before
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] m-0 mb-3.5 leading-snug">
                  When students create a reminder without specifying custom timing, the call triggers this many minutes prior to the scheduled exam/task. (0 = Exact time).
                </p>
                <div className="flex items-center gap-3 max-w-sm">
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    value={settings.reminderDefaults?.defaultTimingMinutes ?? 15}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setSettings(prev => ({
                          ...prev,
                          reminderDefaults: {
                            ...prev.reminderDefaults,
                            defaultTimingMinutes: Math.max(0, Math.min(1440, val))
                          }
                        }));
                      }
                    }}
                    className="w-24 rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)"
                    }}
                  />
                  <span className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    minutes before scheduled task
                  </span>
                </div>
              </div>

              {/* Message Templates */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {/* English Template */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                    English Reminder Message Template
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-2.5">
                    Available placeholder variables: <code style={{ color: "var(--primary)" }}>{"{taskTitle}"}</code>
                  </p>
                  <textarea
                    rows={4}
                    value={settings.reminderDefaults?.defaultTemplateEnglish || ""}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        reminderDefaults: {
                          ...prev.reminderDefaults,
                          defaultTemplateEnglish: e.target.value
                        }
                      }))
                    }
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      lineHeight: "1.5"
                    }}
                  />
                  <div className="mt-2.5 p-3 rounded-xl text-xs" style={{ background: "rgba(255, 255, 255, 0.04)" }}>
                    <span className="block mb-1 text-[var(--text-muted)] font-medium">Sample Rendered Output:</span>
                    <span className="text-[var(--text-primary)]">
                      {(settings.reminderDefaults?.defaultTemplateEnglish || "").replace("{taskTitle}", "CTET Mock Exam Paper 1")}
                    </span>
                  </div>
                </div>

                {/* Hindi Template */}
                <div
                  className="p-4 sm:p-5 rounded-2xl"
                  style={{
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                    Hindi Reminder Message Template
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] m-0 mb-2.5">
                    Available placeholder variables: <code style={{ color: "var(--primary)" }}>{"{taskTitle}"}</code>
                  </p>
                  <textarea
                    rows={4}
                    value={settings.reminderDefaults?.defaultTemplateHindi || ""}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        reminderDefaults: {
                          ...prev.reminderDefaults,
                          defaultTemplateHindi: e.target.value
                        }
                      }))
                    }
                    className="w-full rounded-xl text-xs sm:text-sm"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      lineHeight: "1.5"
                    }}
                  />
                  <div className="mt-2.5 p-3 rounded-xl text-xs" style={{ background: "rgba(255, 255, 255, 0.04)" }}>
                    <span className="block mb-1 text-[var(--text-muted)] font-medium">Sample Rendered Output:</span>
                    <span className="text-[var(--text-primary)]">
                      {(settings.reminderDefaults?.defaultTemplateHindi || "").replace("{taskTitle}", "सीटीईटी मॉक टेस्ट पेपर १")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
