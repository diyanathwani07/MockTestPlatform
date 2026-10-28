import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import mammoth from "mammoth";
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
  FileText,
  UploadCloud,
  FileAudio,
  Trash2,
  Bell,
  Plus,
  Search,
  Users
} from "lucide-react";
import ExamReminderModal from "../components/ExamReminderModal";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";
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

  // Word-to-Speech (DOCX Import) states
  const [docxFile, setDocxFile] = useState(null);
  const [docxFileName, setDocxFileName] = useState("");
  const [docxFileSize, setDocxFileSize] = useState(0);
  const [docxText, setDocxText] = useState("");
  const [docxStats, setDocxStats] = useState({ charCount: 0, wordCount: 0 });
  const [docxExtracting, setDocxExtracting] = useState(false);
  const [docxGeneratingAudio, setDocxGeneratingAudio] = useState(false);
  const [docxVoice, setDocxVoice] = useState("Aoede");
  const [docxLang, setDocxLang] = useState("en");
  const [docxAudioUrl, setDocxAudioUrl] = useState(null);
  const [isPlayingDocxAudio, setIsPlayingDocxAudio] = useState(false);
  const [docxAudioDuration, setDocxAudioDuration] = useState(null);
  const [docxDragActive, setDocxDragActive] = useState(false);
  const [docxError, setDocxError] = useState(null);
  const [docxWarning, setDocxWarning] = useState(null);
  const docxFileInputRef = useRef(null);
  const docxAudioRef = useRef(null);

  // Exam Reminders Tab states
  const [scheduledReminders, setScheduledReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [reminderFilter, setReminderFilter] = useState("ALL");
  const [reminderSearch, setReminderSearch] = useState("");
  const [reminderModalQuiz, setReminderModalQuiz] = useState(null);
  const [eligibleQuizzes, setEligibleQuizzes] = useState([]);
  const [showQuizPicker, setShowQuizPicker] = useState(false);
  const [cancellingReminderId, setCancellingReminderId] = useState(null);

  const token = localStorage.getItem("token");

  // Show auto-dismissing toast notification
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
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

  const fetchScheduledReminders = async () => {
    try {
      setLoadingReminders(true);
      const res = await axios.get(`${API}/api/ai-voice/exam-reminders`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data?.success) {
        setScheduledReminders(res.data.data || []);
      }
    } catch (err) {
      console.warn("Could not load exam reminders:", err.message);
    } finally {
      setLoadingReminders(false);
    }
  };

  const fetchEligibleQuizzes = async () => {
    try {
      const res = await axios.get(`${API}/api/ai-voice/eligible-exams`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data?.success) {
        setEligibleQuizzes(res.data.data || []);
      }
    } catch (err) {
      console.warn("Could not load eligible quizzes:", err.message);
    }
  };

  useEffect(() => {
    if (activeTab === "reminders") {
      fetchScheduledReminders();
      fetchEligibleQuizzes();
    }
  }, [activeTab]);

  const handleCancelReminderAdmin = async (id, taskTitle) => {
    if (!window.confirm(`Are you sure you want to cancel the voice reminder for "${taskTitle}"?`)) return;
    try {
      setCancellingReminderId(id);
      await axios.patch(`${API}/api/ai-voice/exam-reminder/${id}/cancel`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      showToast("Voice reminder cancelled successfully.");
      fetchScheduledReminders();
    } catch (err) {
      showToast(extractErrorMessage(err, "Failed to cancel reminder."), "error");
    } finally {
      setCancellingReminderId(null);
    }
  };

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
      if (docxAudioRef.current && isPlayingDocxAudio) {
        docxAudioRef.current.pause();
        setIsPlayingDocxAudio(false);
      }
      audioRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch(err => {
        console.error("Playback error:", err);
        setIsPlayingPreview(false);
      });
    }
  };

  // Execute DOCX extraction via backend API
  const executeDocxExtraction = async (fileToExtract) => {
    const target = fileToExtract || docxFile;
    if (!target) {
      showToast("Please choose a Word document (.docx) first.", "error");
      return;
    }

    if (!target.name.toLowerCase().endsWith(".docx")) {
      const err = "Invalid file type. Only Word documents (.docx) are supported.";
      setDocxError(err);
      showToast(err, "error");
      return;
    }

    if (target.size > 10 * 1024 * 1024) {
      const err = "Document exceeds the maximum 10 MB file size limit.";
      setDocxError(err);
      showToast(err, "error");
      return;
    }

    setDocxExtracting(true);
    setDocxError(null);
    setDocxWarning(null);

    try {
      let text = "";

      // 1. Instant client-side parsing with Mammoth (takes ~5-10ms)
      try {
        const arrayBuffer = await target.arrayBuffer();
        const clientResult = await mammoth.extractRawText({ arrayBuffer });
        text = (clientResult?.value || "").trim();
      } catch (clientErr) {
        console.warn("[VoiceSettings] Client-side extraction error, falling back to server:", clientErr);
      }

      // 2. If client parsing didn't produce text, fall back to backend endpoint
      if (!text) {
        const formData = new FormData();
        formData.append("file", target);

        const res = await axios.post(`${API}/api/voice-settings/extract-docx`, formData, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (res.data?.success) {
          text = res.data.text || "";
        } else {
          throw new Error(res.data?.error || "Failed to extract text from Word document.");
        }
      }

      if (!text) {
        throw new Error("The uploaded Word document contains no readable text.");
      }

      setDocxText(text);
      const charCount = text.length;
      const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
      setDocxStats({ charCount, wordCount });

      // Auto-detect Hindi script: U+0900 to U+097F
      const isHindi = /[\u0900-\u097F]/.test(text);
      if (isHindi) {
        setDocxLang("hi");
        setDocxVoice(settings.hindiVoice || "Aoede");
      } else {
        setDocxLang("en");
        setDocxVoice(settings.englishVoice || "Aoede");
      }

      if (charCount > 3000) {
        const warn =
          `Document contains ${charCount.toLocaleString()} characters. Single speech generation limit is 3,000 characters. Please trim the text before generating.`;
        setDocxWarning(warn);
        showToast(`Extracted ${charCount.toLocaleString()} chars. (TTS limit: 3,000 chars)`, "info");
      } else {
        setDocxWarning(null);
        showToast(`Extracted ${charCount.toLocaleString()} characters (${wordCount.toLocaleString()} words) instantly!`, "success");
      }
    } catch (err) {
      console.error("[VoiceSettings] DOCX extraction error:", err);
      const errMsg = extractErrorMessage(err, "Failed to extract text from Word document.");
      setDocxError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setDocxExtracting(false);
    }
  };

  // Handle file selection from drag-and-drop or file picker
  const handleDocxFileSelect = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      const err = "Invalid file type. Please select a valid .docx Word document.";
      setDocxError(err);
      showToast(err, "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      const err = "Selected document exceeds 10 MB limit.";
      setDocxError(err);
      showToast(err, "error");
      return;
    }

    setDocxFile(file);
    setDocxFileName(file.name);
    setDocxFileSize(file.size);
    setDocxError(null);
    setDocxWarning(null);
    setDocxAudioUrl(null);
    if (docxAudioRef.current) {
      docxAudioRef.current.pause();
      setIsPlayingDocxAudio(false);
    }

    // Auto-trigger text extraction
    executeDocxExtraction(file);
  };

  // Handle manual edits to extracted text
  const handleDocxTextChange = (e) => {
    const val = e.target.value;
    setDocxText(val);
    const charCount = val.length;
    const wordCount = val.trim() ? val.trim().split(/\s+/).length : 0;
    setDocxStats({ charCount, wordCount });

    if (charCount > 3000) {
      setDocxWarning(`Text exceeds single speech synthesis limit of 3,000 characters (${charCount.toLocaleString()} / 3,000). Please trim to generate speech.`);
    } else {
      setDocxWarning(null);
    }
  };

  // Generate speech from Word doc text via Gemini TTS
  const handleGenerateDocxSpeech = async () => {
    if (!docxText || !docxText.trim()) {
      showToast("Please extract or enter text before generating speech.", "error");
      return;
    }

    if (docxText.length > 3000) {
      showToast(`Text exceeds the 3,000 character limit (${docxText.length.toLocaleString()} chars). Please shorten before generating speech.`, "error");
      return;
    }

    try {
      setDocxGeneratingAudio(true);
      if (docxAudioRef.current) {
        docxAudioRef.current.pause();
        setIsPlayingDocxAudio(false);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlayingPreview(false);
      }

      const selectedPrompt =
        docxLang === "hi" ? settings.hindiPrompt : settings.englishPrompt;

      const res = await axios.post(
        `${API}/api/voice-settings/test`,
        {
          sampleText: docxText.trim(),
          lang: docxLang,
          voice: docxVoice,
          customPrompt: selectedPrompt
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      if (res.data?.success && res.data.audioUrl) {
        setDocxAudioUrl(res.data.audioUrl);
        setDocxAudioDuration(res.data.durationSeconds || null);
        showToast("Speech generated successfully! Playing audio...", "success");

        // Auto play generated audio
        setTimeout(() => {
          if (docxAudioRef.current) {
            docxAudioRef.current.load();
            docxAudioRef.current.play().then(() => {
              setIsPlayingDocxAudio(true);
            }).catch(e => {
              console.warn("Auto-play prevented by browser policy:", e);
            });
          }
        }, 100);
      } else {
        throw new Error(res.data?.error || "Speech generation failed.");
      }
    } catch (err) {
      console.error("[VoiceSettings] docx TTS error:", err);
      showToast(extractErrorMessage(err, "Failed to generate speech from document text."), "error");
    } finally {
      setDocxGeneratingAudio(false);
    }
  };

  // Toggle playback of docx generated audio
  const handleToggleDocxPlayback = () => {
    if (!docxAudioRef.current || !docxAudioUrl) return;
    if (isPlayingDocxAudio) {
      docxAudioRef.current.pause();
      setIsPlayingDocxAudio(false);
    } else {
      if (audioRef.current && isPlayingPreview) {
        audioRef.current.pause();
        setIsPlayingPreview(false);
      }
      docxAudioRef.current.play().then(() => {
        setIsPlayingDocxAudio(true);
      }).catch(err => {
        console.error("Playback error:", err);
        setIsPlayingDocxAudio(false);
      });
    }
  };

  // Clear docx state
  const handleClearDocx = () => {
    setDocxFile(null);
    setDocxFileName("");
    setDocxFileSize(0);
    setDocxText("");
    setDocxStats({ charCount: 0, wordCount: 0 });
    setDocxError(null);
    setDocxWarning(null);
    setDocxAudioUrl(null);
    setDocxAudioDuration(null);
    setIsPlayingDocxAudio(false);
    if (docxAudioRef.current) {
      docxAudioRef.current.pause();
    }
    if (docxFileInputRef.current) {
      docxFileInputRef.current.value = "";
    }
    showToast("Word document and speech player reset.", "info");
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

        <div className="admin-content" style={{ maxWidth: "1280px", margin: 0, paddingBottom: "80px" }}>
          {/* Toast Notification Banner */}
          {toast && (
            <div
              style={{
                position: "fixed",
                top: "24px",
                right: "24px",
                maxWidth: "calc(100vw - 32px)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 20px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#ffffff",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
                background:
                  toast.type === "error"
                    ? "#EF4444"
                    : toast.type === "info"
                    ? "#3B82F6"
                    : "#10B981",
                wordBreak: "break-word",
                animation: "slideIn 0.25s ease-out"
              }}
            >
              {toast.type === "error" ? <AlertTriangle size={18} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={18} style={{ flexShrink: 0 }} />}
              <span>{toast.message}</span>
            </div>
          )}

          {/* Sticky Dirty Header Notice */}
          {isDirty && (
            <div
              style={{
                marginBottom: "24px",
                padding: "14px 20px",
                borderRadius: "14px",
                background: "linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.06))",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "14px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#FBBF24", fontWeight: 600, fontSize: "14px" }}>
                <AlertTriangle size={18} style={{ color: "#FBBF24" }} />
                <span>You have unsaved changes to voice settings.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    borderRadius: "9px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "#FDE68A",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                >
                  <RotateCcw size={13} />
                  <span>Discard Changes</span>
                </button>
              </div>
            </div>
          )}

          {/* Page Top Header with Title, Status & Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "24px"
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25))",
                    border: "1px solid rgba(139, 92, 246, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary)"
                  }}
                >
                  <Volume2 size={20} />
                </div>
                <h1 style={{ fontSize: "24px", fontWeight: "700", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: "var(--text-primary)", margin: 0 }}>
                  Voice Settings
                </h1>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: settings.enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: settings.enabled ? "#10B981" : "#EF4444",
                    border: `1px solid ${settings.enabled ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                  }}
                >
                  {settings.enabled ? "Subsystem Active" : "Subsystem Disabled"}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                Configure Gemini multimodal text-to-speech voices, automated calling schedules, retry escalation rules, and reminder defaults.
              </p>
              {lastUpdatedAt && (
                <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                  Last updated: <strong>{formatDateTime(lastUpdatedAt)}</strong>
                  {updatedByMeta && (
                    <span> by <strong>{updatedByMeta.fullName || updatedByMeta.name || updatedByMeta.email || "Admin"}</strong></span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={fetchSettings}
                disabled={loading}
                title="Refresh from server"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "var(--bg-card, rgba(255, 255, 255, 0.04))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500
                }}
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isDirty}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 18px",
                  borderRadius: "10px",
                  background: isDirty ? "var(--primary)" : "rgba(255, 255, 255, 0.08)",
                  color: isDirty ? "var(--primary-foreground, #000)" : "var(--text-muted)",
                  border: "none",
                  cursor: isDirty ? "pointer" : "not-allowed",
                  fontSize: "13px",
                  fontWeight: 600,
                  transition: "all 0.15s ease"
                }}
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>

          {/* Master Subsystem Toggle Card */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "14px",
              background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: settings.enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.12)",
                  color: settings.enabled ? "#10B981" : "#EF4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <PhoneCall size={22} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 2px 0", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                  Master Voice Reminders Switch
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                  {settings.enabled
                    ? "Voice calling sweeps and automated audio dispatch are globally active across all scheduled tasks."
                    : "Voice calling subsystem is paused globally. Push notifications and scheduled timers will not trigger voice calls."}
                </p>
              </div>
            </div>

            <label
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                cursor: "pointer"
              }}
            >
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                style={{ srOnly: true, width: 0, height: 0, opacity: 0 }}
              />
              <div
                style={{
                  width: "48px",
                  height: "26px",
                  background: settings.enabled ? "#10B981" : "rgba(255, 255, 255, 0.14)",
                  border: settings.enabled
                    ? "1px solid rgba(16, 185, 129, 0.6)"
                    : "1px solid rgba(255, 255, 255, 0.18)",
                  borderRadius: "13px",
                  position: "relative",
                  boxShadow: settings.enabled
                    ? "0 0 10px rgba(16, 185, 129, 0.35)"
                    : "inset 0 1px 3px rgba(0, 0, 0, 0.3)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: settings.enabled ? "24px" : "2px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.4)",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                />
              </div>
            </label>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
              marginBottom: "24px",
              overflowX: "auto",
              paddingBottom: "8px"
            }}
          >
            {[
              { id: "voice", label: "Voice & Language", icon: Mic },
              { id: "schedule", label: "Calling Schedule", icon: Calendar },
              { id: "retry", label: "Retry Rules", icon: Sliders },
              { id: "templates", label: "Reminder Defaults", icon: Sparkles },
              { id: "reminders", label: "Exam Reminders", icon: Bell }
            ].map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: "none",
                    background: active ? "var(--primary)" : "transparent",
                    color: active ? "var(--primary-foreground, #000)" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: active ? "600" : "500",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap"
                  }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Voice & Language */}
          {activeTab === "voice" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* TTS Engine info banner */}
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Sparkles size={22} style={{ color: "var(--primary)" }} />
                  <div>
                    <h4 style={{ margin: "0 0 2px 0", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                      AI Model: {settings.model}
                    </h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                      Gemini Multimodal Live Audio Preview produces natural 24,000 Hz, 16-bit PCM voice synthesis with high intelligibility.
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: "rgba(139, 92, 246, 0.2)",
                    color: "var(--primary)"
                  }}
                >
                  Official Gemini TTS
                </span>
              </div>

              {/* Language & Voice Selector Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "20px"
                }}
              >
                {/* Default Language Selection */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>
                    Default Language Strategy
                  </label>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 14px 0" }}>
                    Select how the system chooses between English and Hindi voice synthesis for task titles.
                  </p>
                  <select
                    value={settings.defaultLanguage || "auto"}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultLanguage: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "14px"
                    }}
                  >
                    <option value="auto">Auto-Detect (Hindi / English)</option>
                    <option value="en">Always English</option>
                    <option value="hi">Always Hindi</option>
                  </select>
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.06))",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      lineHeight: "1.4"
                    }}
                  >
                    {settings.defaultLanguage === "hi"
                      ? "All reminders are generated using the Hindi voice model."
                      : settings.defaultLanguage === "en"
                      ? "All reminders are generated using the English voice model."
                      : "Devanagari text triggers Hindi synthesis, Latin text triggers English."}
                  </div>
                </div>

                {/* English Voice Selector */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>
                    English Voice Persona
                  </label>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 14px 0" }}>
                    Voice model used for English reminder playback.
                  </p>
                  <select
                    value={settings.englishVoice || "Aoede"}
                    onChange={(e) => setSettings(prev => ({ ...prev, englishVoice: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "14px"
                    }}
                  >
                    {GEMINI_VOICES.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender})
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.06))",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      lineHeight: "1.4"
                    }}
                  >
                    <strong style={{ color: "var(--text-primary)" }}>
                      {GEMINI_VOICES.find(v => v.id === (settings.englishVoice || "Aoede"))?.name} ({GEMINI_VOICES.find(v => v.id === (settings.englishVoice || "Aoede"))?.gender}):
                    </strong>{" "}
                    {GEMINI_VOICES.find(v => v.id === (settings.englishVoice || "Aoede"))?.description}
                  </div>
                </div>

                {/* Hindi Voice Selector */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>
                    Hindi Voice Persona
                  </label>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 14px 0" }}>
                    Voice model used for Hindi reminder playback.
                  </p>
                  <select
                    value={settings.hindiVoice || "Aoede"}
                    onChange={(e) => setSettings(prev => ({ ...prev, hindiVoice: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "14px"
                    }}
                  >
                    {GEMINI_VOICES.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender})
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.06))",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      lineHeight: "1.4"
                    }}
                  >
                    <strong style={{ color: "var(--text-primary)" }}>
                      {GEMINI_VOICES.find(v => v.id === (settings.hindiVoice || "Aoede"))?.name} ({GEMINI_VOICES.find(v => v.id === (settings.hindiVoice || "Aoede"))?.gender}):
                    </strong>{" "}
                    {GEMINI_VOICES.find(v => v.id === (settings.hindiVoice || "Aoede"))?.description}
                  </div>
                </div>
              </div>

              {/* Custom System Prompts */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                  gap: "20px"
                }}
              >
                {/* English Prompt */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                      English System Instruction Prompt
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {(settings.englishPrompt || "").length} chars
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 12px 0" }}>
                    Directs the Gemini TTS vocal delivery, cadence, and broadcast tone for English reminders.
                  </p>
                  <textarea
                    rows={4}
                    value={settings.englishPrompt || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, englishPrompt: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      resize: "vertical"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, englishPrompt: DEFAULT_SETTINGS.englishPrompt }))}
                    style={{
                      marginTop: "8px",
                      background: "transparent",
                      border: "none",
                      color: "var(--primary)",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    Reset to default English instruction
                  </button>
                </div>

                {/* Hindi Prompt */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                      Hindi System Instruction Prompt
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {(settings.hindiPrompt || "").length} chars
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 12px 0" }}>
                    Directs Hindi pronunciation, news-anchor tone, and clarity for Sanskrit/Hindi academic vocabulary.
                  </p>
                  <textarea
                    rows={4}
                    value={settings.hindiPrompt || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, hindiPrompt: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      resize: "vertical"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, hindiPrompt: DEFAULT_SETTINGS.hindiPrompt }))}
                    style={{
                      marginTop: "8px",
                      background: "transparent",
                      border: "none",
                      color: "var(--primary)",
                      fontSize: "12px",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    Reset to default Hindi instruction
                  </button>
                </div>
              </div>

              {/* Real-time Voice Preview Tester Card */}
              <div
                style={{
                  padding: "24px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(139, 92, 246, 0.2)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Volume2 size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>
                      Live Audio Sample Preview
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                      Test live Gemini TTS rendering with current persona settings before saving.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
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
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)",
                        fontSize: "13px"
                      }}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (हिंदी)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Preview Voice
                    </label>
                    <select
                      value={previewVoice}
                      onChange={(e) => setPreviewVoice(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)",
                        fontSize: "13px"
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

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Sample Reminder Text
                  </label>
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                      color: "var(--text-primary)",
                      fontSize: "13px"
                    }}
                  />
                </div>

                {/* Actions & Player */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleGeneratePreview}
                    disabled={generatingPreview}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 18px",
                      borderRadius: "10px",
                      background: "var(--primary)",
                      color: "var(--primary-foreground, #000)",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: generatingPreview ? "not-allowed" : "pointer"
                    }}
                  >
                    {generatingPreview ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
                    <span>{generatingPreview ? "Synthesizing Audio..." : "Generate & Test Audio"}</span>
                  </button>

                  {previewAudioUrl && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "6px 14px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)"
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleTogglePlayback}
                        style={{
                          background: "var(--primary)",
                          color: "var(--primary-foreground, #000)",
                          border: "none",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                      >
                        {isPlayingPreview ? <Square size={12} /> : <Play size={12} />}
                      </button>
                      <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
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

              {/* Word-to-Speech Converter (DOCX Import) */}
              <div
                style={{
                  padding: "24px",
                  borderRadius: "14px",
                  background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "rgba(16, 185, 129, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#10B981"
                      }}
                    >
                      <FileAudio size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>
                        Word-to-Speech Converter
                      </h3>
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                        Import a Word (.docx) document, extract plain text, review or edit, and generate voice audio.
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                      color: "var(--text-secondary)",
                      fontWeight: 500
                    }}
                  >
                    Max 3,000 chars / 10 MB docx
                  </span>
                </div>

                {/* File Upload Drop Area */}
                <input
                  type="file"
                  ref={docxFileInputRef}
                  accept=".docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleDocxFileSelect(e.target.files[0]);
                    }
                  }}
                  style={{ display: "none" }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDocxDragActive(true);
                  }}
                  onDragLeave={() => setDocxDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDocxDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleDocxFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    if (docxFileInputRef.current) {
                      docxFileInputRef.current.click();
                    }
                  }}
                  style={{
                    border: docxDragActive
                      ? "2px dashed var(--primary)"
                      : "2px dashed var(--border-color, rgba(255, 255, 255, 0.15))",
                    borderRadius: "12px",
                    padding: "24px 16px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: docxDragActive
                      ? "rgba(16, 185, 129, 0.05)"
                      : "rgba(0, 0, 0, 0.15)",
                    transition: "all 0.2s ease",
                    marginBottom: "16px"
                  }}
                >
                  <UploadCloud
                    size={36}
                    style={{
                      margin: "0 auto 8px auto",
                      color: docxDragActive ? "var(--primary)" : "var(--text-secondary)"
                    }}
                  />
                  <p style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {docxFile ? docxFileName : "Click or drag & drop a .docx Word document here"}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                    {docxFile
                      ? `${(docxFileSize / 1024).toFixed(1)} KB • Click or drop another document to replace`
                      : "Supports standard Microsoft Word (.docx) files up to 10 MB"}
                  </p>
                </div>

                {/* File info and extraction action if file is selected */}
                {docxFile && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                      marginBottom: "16px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <FileText size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "280px"
                        }}
                      >
                        {docxFileName}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        ({(docxFileSize / 1024).toFixed(1)} KB)
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          executeDocxExtraction(docxFile);
                        }}
                        disabled={docxExtracting}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
                          color: "var(--text-primary)",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: docxExtracting ? "not-allowed" : "pointer"
                        }}
                      >
                        {docxExtracting ? <RefreshCw size={13} className="animate-spin" /> : <FileText size={13} />}
                        <span>{docxExtracting ? "Extracting..." : "Re-extract"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearDocx();
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          background: "transparent",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          color: "#EF4444",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer"
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {docxError && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      marginBottom: "16px",
                      color: "#EF4444",
                      fontSize: "13px"
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ flex: 1 }}>{docxError}</div>
                  </div>
                )}

                {/* Limit Warning Banner */}
                {docxWarning && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      marginBottom: "16px",
                      color: "#F59E0B",
                      fontSize: "13px"
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ flex: 1 }}>{docxWarning}</div>
                  </div>
                )}

                {/* Text Area for Review & Editing */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Extracted Text (Review & Edit)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: docxStats.charCount > 3000 ? "#EF4444" : docxStats.charCount > 0 ? "#10B981" : "var(--text-secondary)"
                        }}
                      >
                        {docxStats.charCount.toLocaleString()} / 3,000 chars
                      </span>
                      {docxStats.wordCount > 0 && (
                        <span style={{ color: "var(--text-secondary)" }}>
                          ({docxStats.wordCount.toLocaleString()} words)
                        </span>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={docxText}
                    onChange={handleDocxTextChange}
                    placeholder="Extracted plain text will appear here once you upload a .docx file. You can also paste or edit text directly before synthesizing audio..."
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: docxStats.charCount > 3000
                        ? "1px solid rgba(239, 68, 68, 0.5)"
                        : "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      resize: "vertical",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                  />
                </div>

                {/* Voice and Language Selectors */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    marginBottom: "18px"
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Target Voice
                    </label>
                    <select
                      value={docxVoice}
                      onChange={(e) => setDocxVoice(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)",
                        fontSize: "13px"
                      }}
                    >
                      {GEMINI_VOICES.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.gender})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Language Mode
                    </label>
                    <select
                      value={docxLang}
                      onChange={(e) => setDocxLang(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)",
                        fontSize: "13px"
                      }}
                    >
                      <option value="en">English (Broadcast Tone)</option>
                      <option value="hi">Hindi (हिंदी प्रामाणिक वाचक)</option>
                    </select>
                  </div>
                </div>

                {/* Actions & Player */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleGenerateDocxSpeech}
                    disabled={docxGeneratingAudio || !docxText.trim() || docxStats.charCount > 3000}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 18px",
                      borderRadius: "10px",
                      background: docxStats.charCount > 3000 || !docxText.trim()
                        ? "rgba(255, 255, 255, 0.1)"
                        : "var(--primary)",
                      color: docxStats.charCount > 3000 || !docxText.trim()
                        ? "var(--text-secondary)"
                        : "var(--primary-foreground, #000)",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: docxGeneratingAudio || !docxText.trim() || docxStats.charCount > 3000 ? "not-allowed" : "pointer"
                    }}
                  >
                    {docxGeneratingAudio ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
                    <span>{docxGeneratingAudio ? "Synthesizing Audio..." : "Generate Speech"}</span>
                  </button>

                  {docxText && (
                    <button
                      type="button"
                      onClick={handleClearDocx}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "transparent",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
                        color: "var(--text-secondary)",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer"
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Clear</span>
                    </button>
                  )}

                  {docxAudioUrl && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "6px 14px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)"
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleToggleDocxPlayback}
                        style={{
                          background: "var(--primary)",
                          color: "var(--primary-foreground, #000)",
                          border: "none",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                      >
                        {isPlayingDocxAudio ? <Square size={12} /> : <Play size={12} />}
                      </button>
                      <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
                        {isPlayingDocxAudio ? "Playing speech..." : "Speech ready"}
                        {docxAudioDuration ? ` (${docxAudioDuration}s)` : ""}
                      </span>
                      <a
                        href={docxAudioUrl}
                        download={`voice-${docxVoice.toLowerCase()}-${Date.now()}.wav`}
                        style={{
                          fontSize: "11px",
                          color: "var(--primary)",
                          textDecoration: "underline",
                          marginLeft: "6px"
                        }}
                      >
                        Download WAV
                      </a>
                    </div>
                  )}

                  {/* Hidden audio element for Word-to-Speech */}
                  <audio
                    ref={docxAudioRef}
                    src={docxAudioUrl || ""}
                    onEnded={() => setIsPlayingDocxAudio(false)}
                    onError={() => setIsPlayingDocxAudio(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Calling Schedule */}
          {activeTab === "schedule" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Schedule active switch */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "14px",
                  background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px"
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                    Enforce Calling Schedule Hours
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                    When enabled, automated reminders will strictly trigger only within the permitted time windows and days configured below.
                  </p>
                </div>
                <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settings.callingSchedule?.enabled ?? true}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        callingSchedule: { ...prev.callingSchedule, enabled: e.target.checked }
                      }))
                    }
                    style={{ srOnly: true, width: 0, height: 0, opacity: 0 }}
                  />
                  <div
                    style={{
                      width: "48px",
                      height: "26px",
                      background: settings.callingSchedule?.enabled ? "#10B981" : "rgba(255, 255, 255, 0.14)",
                      border: settings.callingSchedule?.enabled
                        ? "1px solid rgba(16, 185, 129, 0.6)"
                        : "1px solid rgba(255, 255, 255, 0.18)",
                      borderRadius: "13px",
                      position: "relative",
                      boxShadow: settings.callingSchedule?.enabled
                        ? "0 0 10px rgba(16, 185, 129, 0.35)"
                        : "inset 0 1px 3px rgba(0, 0, 0, 0.3)",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "2px",
                        left: settings.callingSchedule?.enabled ? "24px" : "2px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#ffffff",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.4)",
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                      }}
                    />
                  </div>
                </label>
              </div>

              {/* Permitted Days Selector */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "14px",
                  background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                  <div>
                    <h4 style={{ margin: "0 0 2px 0", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                      Permitted Calling Days
                    </h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                      Tasks scheduled on non-permitted days will not trigger voice calls.
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={handleSelectAllDays}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)",
                        cursor: "pointer"
                      }}
                    >
                      All Days
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectWeekdays}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)",
                        cursor: "pointer"
                      }}
                    >
                      Weekdays Only
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectWeekends}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)",
                        cursor: "pointer"
                      }}
                    >
                      Weekends Only
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {WEEK_DAYS.map(day => {
                    const isSelected = (settings.callingSchedule?.allowedDays || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          background: isSelected ? "var(--primary)" : "rgba(255, 255, 255, 0.05)",
                          color: isSelected ? "var(--primary-foreground, #000)" : "var(--text-secondary)",
                          border: isSelected ? "none" : "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        {isSelected && <Check size={14} />}
                        <span>{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Window & Timezone Card */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "20px"
                }}
              >
                {/* Start Time */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>
                    Daily Window Start Time
                  </label>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 12px 0" }}>
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
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "14px"
                    }}
                  />
                </div>

                {/* End Time */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>
                    Daily Window End Time
                  </label>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 12px 0" }}>
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
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "14px"
                    }}
                  />
                </div>

                {/* Time Zone */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>
                    Operational Time Zone
                  </label>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 12px 0" }}>
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
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "14px"
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
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "20px"
                }}
              >
                {/* Max Retry Attempts */}
                <div
                  style={{
                    padding: "22px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                      Max Retry Attempts
                    </label>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: "rgba(139, 92, 246, 0.15)",
                        color: "var(--primary)"
                      }}
                    >
                      {settings.retryRules?.maxRetryAttempts || 3} Attempts
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 16px 0" }}>
                    Number of consecutive automated retry calls before marking a scheduled reminder as missed. (Range: 1 – 5).
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                      style={{ flex: 1, accentColor: "var(--primary)" }}
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
                      style={{
                        width: "60px",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)",
                        textAlign: "center",
                        fontSize: "14px",
                        fontWeight: 600
                      }}
                    />
                  </div>
                </div>

                {/* Retry Delay Minutes */}
                <div
                  style={{
                    padding: "22px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                      Retry Interval (Minutes)
                    </label>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "#3B82F6"
                      }}
                    >
                      {settings.retryRules?.retryDelayMinutes || 15} Mins
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 16px 0" }}>
                    Waiting period between consecutive retry calls if the student did not answer. (Range: 1 – 60 mins).
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                      style={{ flex: 1, accentColor: "#3B82F6" }}
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
                      style={{
                        width: "60px",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        background: "rgba(0, 0, 0, 0.25)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                        color: "var(--text-primary)",
                        textAlign: "center",
                        fontSize: "14px",
                        fontWeight: 600
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Simulation projection card */}
              <div
                style={{
                  padding: "18px 22px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                }}
              >
                <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Info size={16} style={{ color: "var(--primary)" }} />
                  <span>Escalation Timeline Simulation</span>
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "12px" }}>
                  <div style={{ padding: "8px 14px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)", fontSize: "12px", color: "#10B981" }}>
                    <strong>Initial Dispatch:</strong> At scheduled task time
                  </div>
                  {Array.from({ length: settings.retryRules?.maxRetryAttempts || 3 }).map((_, idx) => {
                    const delay = (idx + 1) * (settings.retryRules?.retryDelayMinutes || 15);
                    return (
                      <div key={idx} style={{ padding: "8px 14px", borderRadius: "8px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.25)", fontSize: "12px", color: "#60A5FA" }}>
                        <strong>Retry #{idx + 1}:</strong> +{delay} mins
                      </div>
                    );
                  })}
                  <div style={{ padding: "8px 14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", fontSize: "12px", color: "#F87171" }}>
                    <strong>Resolution:</strong> Mark Missed after {((settings.retryRules?.maxRetryAttempts || 3) * (settings.retryRules?.retryDelayMinutes || 15))} mins total
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Reminder Defaults & Templates */}
          {activeTab === "templates" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Default Lead Timing */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "14px",
                  background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                    Default Lead Time Before Task (Minutes)
                  </label>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: "rgba(139, 92, 246, 0.15)",
                      color: "var(--primary)"
                    }}
                  >
                    {settings.reminderDefaults?.defaultTimingMinutes || 15} Mins Before
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 14px 0" }}>
                  When students create a reminder without specifying custom timing, the call triggers this many minutes prior to the scheduled exam/task. (0 = Exact time).
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "400px" }}>
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
                    style={{
                      width: "120px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "14px"
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    minutes before scheduled task
                  </span>
                </div>
              </div>

              {/* Message Templates */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                  gap: "20px"
                }}
              >
                {/* English Template */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                    English Reminder Message Template
                  </label>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 10px 0" }}>
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
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      lineHeight: "1.5"
                    }}
                  />
                  <div style={{ marginTop: "10px", padding: "10px 14px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.04)", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Sample Rendered Output:</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {(settings.reminderDefaults?.defaultTemplateEnglish || "").replace("{taskTitle}", "CTET Mock Exam Paper 1")}
                    </span>
                  </div>
                </div>

                {/* Hindi Template */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "14px",
                    background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
                  }}
                >
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                    Hindi Reminder Message Template
                  </label>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 10px 0" }}>
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
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      lineHeight: "1.5"
                    }}
                  />
                  <div style={{ marginTop: "10px", padding: "10px 14px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.04)", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Sample Rendered Output:</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {(settings.reminderDefaults?.defaultTemplateHindi || "").replace("{taskTitle}", "सीटीईटी मॉक टेस्ट पेपर १")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SCHEDULED EXAM REMINDERS */}
          {activeTab === "reminders" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Top Action Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  padding: "16px 20px",
                  background: "var(--bg-card)",
                  borderRadius: "14px",
                  border: "1px solid var(--border-color)"
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
                    Scheduled Exam & Quiz Reminders
                  </h3>
                  <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                    Monitor, filter, and manage automated voice dispatches across all mock examinations
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={fetchScheduledReminders}
                    disabled={loadingReminders}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600"
                    }}
                  >
                    <RefreshCw size={14} className={loadingReminders ? "animate-spin" : ""} /> Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuizPicker(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 18px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "700",
                      boxShadow: "0 4px 14px rgba(124, 58, 237, 0.4)"
                    }}
                  >
                    <Plus size={16} /> Schedule Exam Reminder
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {["ALL", "PENDING", "DISPATCHED", "COMPLETED", "CANCELLED", "FAILED"].map((statusKey) => {
                    const isSelected = reminderFilter === statusKey;
                    return (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => setReminderFilter(statusKey)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "100px",
                          border: isSelected ? "1.5px solid var(--primary)" : "1px solid var(--border-color)",
                          background: isSelected ? "rgba(138, 85, 252, 0.15)" : "transparent",
                          color: isSelected ? "var(--primary)" : "var(--text-secondary)",
                          fontSize: "12px",
                          fontWeight: isSelected ? "700" : "500",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        {statusKey === "ALL" ? "All Reminders" : statusKey.charAt(0) + statusKey.slice(1).toLowerCase()}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "var(--bg-input, rgba(255,255,255,0.05))",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    minWidth: "220px"
                  }}
                >
                  <Search size={14} style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search by exam or recipient..."
                    value={reminderSearch}
                    onChange={(e) => setReminderSearch(e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--text-primary)",
                      fontSize: "12.5px",
                      width: "100%"
                    }}
                  />
                </div>
              </div>

              {/* Reminders Table */}
              <div
                style={{
                  background: "var(--bg-card)",
                  borderRadius: "14px",
                  border: "1px solid var(--border-color)",
                  overflow: "hidden"
                }}
              >
                {loadingReminders ? (
                  <SkeletonTable rows={5} columns={6} style={{ border: "none" }} />
                ) : (() => {
                  const filtered = scheduledReminders.filter((rem) => {
                    if (reminderFilter !== "ALL" && rem.status !== reminderFilter) return false;
                    if (reminderSearch.trim()) {
                      const q = reminderSearch.toLowerCase();
                      const title = (rem.taskTitle || rem.quiz?.title || "").toLowerCase();
                      const student = (rem.user?.fullName || rem.user?.name || rem.user?.email || "").toLowerCase();
                      return title.includes(q) || student.includes(q);
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                        <Bell size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                          No voice reminders found
                        </div>
                        <div style={{ fontSize: "12.5px" }}>
                          {scheduledReminders.length === 0
                            ? "No voice reminders have been scheduled yet. Click 'Schedule Exam Reminder' to create one."
                            : "No reminders match the active search or status filter."}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(255,255,255,0.02)", color: "var(--text-muted)", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            <th style={{ padding: "14px 18px", fontWeight: "700" }}>Target Exam</th>
                            <th style={{ padding: "14px 18px", fontWeight: "700" }}>Recipient</th>
                            <th style={{ padding: "14px 18px", fontWeight: "700" }}>Scheduled Dispatch</th>
                            <th style={{ padding: "14px 18px", fontWeight: "700" }}>Status</th>
                            <th style={{ padding: "14px 18px", fontWeight: "700" }}>Attempts</th>
                            <th style={{ padding: "14px 18px", fontWeight: "700", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((rem) => {
                            const isPending = rem.status === "PENDING";
                            const isDispatched = rem.status === "DISPATCHED";
                            const isCompleted = rem.status === "COMPLETED";
                            const isCancelled = rem.status === "CANCELLED";
                            const isFailed = rem.status === "FAILED";

                            const statusColor = isPending ? "#3b82f6" : isDispatched ? "#8a55fc" : isCompleted ? "#10b981" : isCancelled ? "#94a3b8" : "#ef4444";
                            const statusBg = isPending ? "rgba(59, 130, 246, 0.12)" : isDispatched ? "rgba(138, 85, 252, 0.12)" : isCompleted ? "rgba(16, 185, 129, 0.12)" : isCancelled ? "rgba(148, 163, 184, 0.12)" : "rgba(239, 68, 68, 0.12)";

                            return (
                              <tr key={rem._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                <td style={{ padding: "14px 18px" }}>
                                  <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                                    {rem.taskTitle || rem.quiz?.title || "Exam Paper"}
                                  </div>
                                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                                    {rem.quiz?.subject ? `${rem.quiz.subject} • ` : ""}{rem.reminderTimingType ? rem.reminderTimingType.replace(/_/g, " ") : "Custom"}
                                  </div>
                                </td>
                                <td style={{ padding: "14px 18px" }}>
                                  <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>
                                    {rem.user?.fullName || rem.user?.name || "Student"}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                    {rem.user?.email || ""}
                                  </div>
                                </td>
                                <td style={{ padding: "14px 18px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-primary)" }}>
                                    <Clock size={13} style={{ color: "var(--primary)" }} />
                                    <span>
                                      {new Date(rem.scheduledTime).toLocaleString("en-GB", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "numeric",
                                        minute: "2-digit"
                                      })}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                    {rem.timeZone || "Asia/Kolkata"}
                                  </div>
                                </td>
                                <td style={{ padding: "14px 18px" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "3px 10px",
                                      borderRadius: "100px",
                                      fontSize: "11px",
                                      fontWeight: "700",
                                      color: statusColor,
                                      background: statusBg
                                    }}
                                  >
                                    {rem.status}
                                  </span>
                                  {rem.lastDispatchError && (
                                    <div style={{ fontSize: "10.5px", color: "#f87171", marginTop: "3px", maxWidth: "200px" }} title={rem.lastDispatchError}>
                                      {rem.lastDispatchError.slice(0, 45)}...
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>
                                  {rem.dispatchAttempts || 0} / 3
                                </td>
                                <td style={{ padding: "14px 18px", textAlign: "right" }}>
                                  {isPending && (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelReminderAdmin(rem._id, rem.taskTitle)}
                                      disabled={cancellingReminderId === rem._id}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid rgba(239,68,68,0.3)",
                                        background: "rgba(239,68,68,0.1)",
                                        color: "#ef4444",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        fontWeight: "600"
                                      }}
                                    >
                                      <Trash2 size={12} />
                                      {cancellingReminderId === rem._id ? "Cancelling..." : "Cancel"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Quick Quiz Picker Modal to Schedule Reminder */}
          {showQuizPicker && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(4px)",
                zIndex: 10000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px"
              }}
              onClick={() => setShowQuizPicker(false)}
            >
              <div
                style={{
                  background: "var(--bg-card, #1e1b2e)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "16px",
                  width: "100%",
                  maxWidth: "500px",
                  maxHeight: "80vh",
                  overflowY: "auto",
                  padding: "20px",
                  color: "var(--text-primary)"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Select Exam or Quiz</h4>
                  <button onClick={() => setShowQuizPicker(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {eligibleQuizzes.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                      No active exams or quizzes found to schedule reminders for.
                    </div>
                  ) : (
                    eligibleQuizzes.map((quiz) => (
                      <div
                        key={quiz._id}
                        onClick={() => {
                          setReminderModalQuiz(quiz);
                          setShowQuizPicker(false);
                        }}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "10px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-input, rgba(255,255,255,0.03))",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
                      >
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "13.5px" }}>{quiz.title}</div>
                          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {quiz.subject || "General"} • {quiz.duration} mins
                          </div>
                        </div>
                        <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600" }}>Select →</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Exam Reminder Modal */}
          {reminderModalQuiz && (
            <ExamReminderModal
              quiz={reminderModalQuiz}
              onClose={() => setReminderModalQuiz(null)}
              onScheduled={() => {
                setReminderModalQuiz(null);
                fetchScheduledReminders();
                showToast("Voice reminder scheduled successfully!");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
