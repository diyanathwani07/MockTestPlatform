import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Save,
  Sparkles,
  BookOpen,
  IndianRupee,
  Calendar,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  RefreshCw,
  Tag,
  FileText,
  Star,
  ExternalLink,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

const PRESET_BANNERS = [
  { label: "Indigo Modern", url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80" },
  { label: "Amber Study", url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80" },
  { label: "Emerald Exam", url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&auto=format&fit=crop&q=80" },
  { label: "Purple Batch", url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80" }
];

export default function AppXCourseEditorModal({
  isOpen,
  onClose,
  onSaveSuccess,
  folderId = null,
  parentFolderId = null,
  baseUrl = "",
  examSeriesList = []
}) {
  const [activeTab, setActiveTab] = useState(1); // 1: Basic, 2: Pricing, 3: Content, 4: Settings
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(299);
  const [mrp, setMrp] = useState(999);
  const [isFeatured, setIsFeatured] = useState(false);
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [examSeriesId, setExamSeriesId] = useState("");
  const [validityType, setValidityType] = useState("date"); // "lifetime" | "days" | "date"
  const [validityDays, setValidityDays] = useState(365);
  const [validityDate, setValidityDate] = useState("2027-06-30");
  const [instructions, setInstructions] = useState("");
  const [tags, setTags] = useState(["course"]);
  const [newTagInput, setNewTagInput] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  // Content / Linked Quizzes
  const [linkedQuizzes, setLinkedQuizzes] = useState([]);
  const [allAvailableQuizzes, setAllAvailableQuizzes] = useState([]);
  const [showAddQuizPicker, setShowAddQuizPicker] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Load existing folder data if editing
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(1);

    if (folderId) {
      loadFolderData(folderId);
    } else {
      // Defaults for new course
      setTitle("");
      setPrice(299);
      setMrp(999);
      setIsFeatured(false);
      setDescription("");
      setThumbnail(PRESET_BANNERS[0].url);
      setExamSeriesId("");
      setValidityType("date");
      setValidityDate("2027-06-30");
      setInstructions("");
      setTags(["course"]);
      setSortOrder(0);
      setLinkedQuizzes([]);
    }
  }, [isOpen, folderId]);

  const loadFolderData = async (id) => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/api/quizzes/folders/${id}`, getAuthHeaders());
      if (res.data?.success && res.data.folder) {
        const f = res.data.folder;
        setTitle(f.title || "");
        setPrice(f.price ?? 299);
        setMrp(f.mrp ?? 999);
        setIsFeatured(Boolean(f.isFeatured));
        setDescription(f.description || f.detailedDescription || "");
        setThumbnail(f.thumbnail || PRESET_BANNERS[0].url);
        setExamSeriesId(f.examSeriesId?._id || f.examSeriesId || "");
        setValidityType(f.validityType || "date");
        setValidityDays(f.validityDays || 365);
        if (f.validityDate) {
          setValidityDate(new Date(f.validityDate).toISOString().split("T")[0]);
        }
        setInstructions(f.instructions || "");
        setTags(f.tags && f.tags.length > 0 ? f.tags : ["course"]);
        setSortOrder(f.sortOrder ?? 0);
        setLinkedQuizzes(res.data.quizzes || []);
      }
    } catch (err) {
      console.error("Failed to load folder data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available unassigned quizzes for linking
  const fetchAvailableQuizzes = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/quizzes/explorer`, getAuthHeaders());
      if (res.data?.success) {
        const currentIds = new Set(linkedQuizzes.map((q) => q._id));
        setAllAvailableQuizzes((res.data.quizzes || []).filter((q) => !currentIds.has(q._id)));
      }
    } catch (err) {
      console.error("Failed to fetch available quizzes:", err);
    }
  };

  // AI Description Generator (AppX Feature)
  const handleGenerateAiDescription = () => {
    setAiGenerating(true);
    setTimeout(() => {
      const generated = `🔥 Comprehensive Master Preparation for ${title || "Competitive Examinations"}.\n\n` +
        `• Complete Syllabus Coverage with High-Yield Subject Modules\n` +
        `• 1000+ Mock Tests & Live Practice Sets with Detailed AI Video & Text Solutions\n` +
        `• Real Exam Simulation (Latest Pattern & Negative Marking)\n` +
        `• In-Depth Performance Analytics, All-India Rank (AIR) & Weakness Diagnosis\n` +
        `• Bilingual (Hindi & English) with Instant Doubts Support.`;
      setDescription(generated);
      setAiGenerating(false);
    }, 600);
  };

  // Tags management
  const handleAddTag = (e) => {
    if (e.key === "Enter" && newTagInput.trim()) {
      e.preventDefault();
      const clean = newTagInput.trim().toLowerCase();
      if (!tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Link / Unlink Quizzes
  const handleLinkQuiz = (quiz) => {
    setLinkedQuizzes([...linkedQuizzes, quiz]);
    setAllAvailableQuizzes(allAvailableQuizzes.filter((q) => q._id !== quiz._id));
  };

  const handleUnlinkQuiz = (quizId) => {
    setLinkedQuizzes(linkedQuizzes.filter((q) => q._id !== quizId));
  };

  // Submit Handler
  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please provide a course title.");
      setActiveTab(1);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        price: Number(price) || 0,
        mrp: Number(mrp) || 0,
        isFeatured,
        description: description.trim(),
        thumbnail: thumbnail.trim(),
        examSeriesId: examSeriesId || null,
        parentId: parentFolderId || null,
        validityType,
        validityDays: Number(validityDays) || 365,
        validityDate: validityType === "date" && validityDate ? new Date(validityDate) : null,
        instructions: instructions.trim(),
        tags,
        sortOrder: Number(sortOrder) || 0,
        linkedQuizIds: linkedQuizzes.map((q) => q._id)
      };

      if (folderId) {
        await axios.patch(`${baseUrl}/api/quizzes/folders/${folderId}`, payload, getAuthHeaders());
      } else {
        await axios.post(`${baseUrl}/api/quizzes/folders`, payload, getAuthHeaders());
      }

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save course:", err);
      alert(err.response?.data?.message || "Failed to save course changes.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Calculate discount percentage
  const discountPercent = mrp > 0 && price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "95vw",
          maxWidth: "1080px",
          height: "88vh",
          maxHeight: "860px",
          minHeight: "560px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
          borderRadius: "20px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.45)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP HEADER (AppX Bar) ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-card)",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", flexShrink: 0 }}>
              {folderId ? "Edit:" : "Create:"}
            </span>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title.trim() || "PRELIMS LANGUAGE COURSE (HINDI, ENGLISH & URDU)"}
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "12.5px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              <X size={15} />
              <span>Close</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 20px",
                fontSize: "12.5px",
                fontWeight: "700",
                backgroundColor: "#6E3FF3",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 2px 10px rgba(110, 63, 243, 0.35)",
                transition: "all 0.15s"
              }}
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* ── STEPPER BAR (AppX 4 Steps) ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 24px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-input)",
            overflowX: "auto",
            flexShrink: 0
          }}
        >
          {[
            { id: 1, label: "Basic Course Information" },
            { id: 2, label: "Pricing & Validity" },
            { id: 3, label: "Content (Quizzes)" },
            { id: 4, label: "Additional Settings" }
          ].map((step) => {
            const isActive = activeTab === step.id;
            const isCompleted = activeTab > step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveTab(step.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: isActive ? "var(--bg-card)" : "transparent",
                  color: isActive ? "var(--text-primary)" : isCompleted ? "#10b981" : "var(--text-muted)",
                  boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  cursor: "pointer",
                  fontSize: "12.5px",
                  fontWeight: isActive ? "700" : "500",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease"
                }}
              >
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "700",
                    backgroundColor: isActive ? "#6E3FF3" : isCompleted ? "#10b981" : "var(--bg-input)",
                    color: isActive || isCompleted ? "#ffffff" : "var(--text-secondary)",
                    border: isActive || isCompleted ? "none" : "1px solid var(--border-color)"
                  }}
                >
                  {isCompleted ? "✓" : step.id}
                </span>
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── MAIN BODY (2 Columns: Left Form + Right Sticky Preview) ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "grid", gridTemplateColumns: "1fr 340px", gap: "28px" }}>
          {/* LEFT COLUMN: STEP CONTENT */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {loading ? (
              <div style={{ padding: "60px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <RefreshCw size={26} className="animate-spin" style={{ color: "#6E3FF3" }} />
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Loading course settings...</span>
              </div>
            ) : (
              <div>
                {/* ── STEP 1: BASIC COURSE INFORMATION ── */}
                {activeTab === 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "16px", alignItems: "start" }}>
                      {/* Title */}
                      <div>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                          Title <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <BookOpen size={16} style={{ position: "absolute", left: "14px", color: "var(--text-muted)", pointerEvents: "none" }} />
                          <input
                            type="text"
                            required
                            placeholder="e.g. PRELIMS LANGUAGE COURSE (HINDI, ENGLISH & URDU)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{
                              width: "100%",
                              height: "42px",
                              paddingLeft: "42px",
                              paddingRight: "14px",
                              fontSize: "13px",
                              fontWeight: "600",
                              backgroundColor: "var(--bg-input)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "10px",
                              color: "var(--text-primary)",
                              outline: "none"
                            }}
                          />
                        </div>
                      </div>

                      {/* Price */}
                      <div>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                          Price (₹) <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <span style={{ position: "absolute", left: "14px", fontSize: "13px", fontWeight: "700", color: "var(--text-muted)", pointerEvents: "none" }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value) || 0)}
                            style={{
                              width: "100%",
                              height: "42px",
                              paddingLeft: "32px",
                              paddingRight: "14px",
                              fontSize: "14px",
                              fontWeight: "700",
                              backgroundColor: "var(--bg-input)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "10px",
                              color: "var(--text-primary)",
                              outline: "none"
                            }}
                          />
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "10.5px", color: "var(--text-muted)" }}>Final price student pays</p>
                      </div>
                    </div>

                    {/* Featured Course Toggle */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        backgroundColor: "var(--bg-input)",
                        border: "1px solid var(--border-color)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isFeatured ? "rgba(245, 158, 11, 0.15)" : "var(--bg-card)",
                            color: isFeatured ? "#f59e0b" : "var(--text-muted)",
                            border: "1px solid var(--border-color)"
                          }}
                        >
                          <Star size={18} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: "12.5px", fontWeight: "700", color: "var(--text-primary)" }}>Featured Course Badge</p>
                          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--text-secondary)" }}>Highlight this course on student banners & top shelves</p>
                        </div>
                      </div>
                      <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={isFeatured}
                          onChange={(e) => setIsFeatured(e.target.checked)}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            cursor: "pointer",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: isFeatured ? "#6E3FF3" : "var(--border-color)",
                            transition: "0.2s",
                            borderRadius: "24px"
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              content: '""',
                              height: "18px",
                              width: "18px",
                              left: isFeatured ? "23px" : "3px",
                              bottom: "3px",
                              backgroundColor: "#ffffff",
                              transition: "0.2s",
                              borderRadius: "50%"
                            }}
                          />
                        </span>
                      </label>
                    </div>

                    {/* AI Generation Tool Banner (AppX Feature) */}
                    <div
                      style={{
                        padding: "14px 18px",
                        borderRadius: "14px",
                        border: "1px solid rgba(110, 63, 243, 0.3)",
                        backgroundColor: "rgba(110, 63, 243, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "10px",
                            fontWeight: "800",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            color: "#ffffff",
                            backgroundColor: "#6E3FF3"
                          }}
                        >
                          NEW
                        </span>
                        <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>
                          Let our AI tool work its magic to generate a compelling course description in seconds!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateAiDescription}
                        disabled={aiGenerating}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 16px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: "700",
                          backgroundColor: "#6E3FF3",
                          color: "#ffffff",
                          border: "none",
                          cursor: aiGenerating ? "not-allowed" : "pointer",
                          boxShadow: "0 2px 8px rgba(110, 63, 243, 0.35)"
                        }}
                      >
                        <Sparkles size={14} className={aiGenerating ? "animate-spin" : ""} />
                        <span>{aiGenerating ? "Generating..." : "Generate using AI"}</span>
                      </button>
                    </div>

                    {/* Course Description */}
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Course Description
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Write detailed syllabus, lecture schedule, and course features..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          fontSize: "13px",
                          backgroundColor: "var(--bg-input)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "10px",
                          color: "var(--text-primary)",
                          outline: "none",
                          resize: "vertical",
                          fontFamily: "inherit",
                          lineHeight: "1.5",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    {/* Thumbnail Cover URL & Presets */}
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Cover Thumbnail URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/banner.png"
                        value={thumbnail}
                        onChange={(e) => setThumbnail(e.target.value)}
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 14px",
                          fontSize: "12.5px",
                          backgroundColor: "var(--bg-input)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "10px",
                          color: "var(--text-primary)",
                          outline: "none",
                          marginBottom: "10px",
                          boxSizing: "border-box"
                        }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--text-muted)" }}>AppX Presets:</span>
                        {PRESET_BANNERS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setThumbnail(p.url)}
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              backgroundColor: thumbnail === p.url ? "rgba(110, 63, 243, 0.12)" : "var(--bg-input)",
                              color: thumbnail === p.url ? "#6E3FF3" : "var(--text-secondary)",
                              border: thumbnail === p.url ? "1px solid #6E3FF3" : "1px solid var(--border-color)",
                              cursor: "pointer"
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: PRICING & VALIDITY ── */}
                {activeTab === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      {/* MRP */}
                      <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-input)" }}>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                          Original MRP (₹)
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-muted)" }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            value={mrp}
                            onChange={(e) => setMrp(Number(e.target.value) || 0)}
                            style={{ width: "100%", fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", backgroundColor: "transparent", border: "none", outline: "none" }}
                          />
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--text-muted)" }}>Crossed-out anchor price</p>
                      </div>

                      {/* Selling Price */}
                      <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.3)", backgroundColor: "rgba(16, 185, 129, 0.08)" }}>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "#10b981", marginBottom: "4px" }}>
                          Discounted Selling Price (₹)
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "15px", fontWeight: "700", color: "#10b981" }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value) || 0)}
                            style={{ width: "100%", fontSize: "18px", fontWeight: "700", color: "#10b981", backgroundColor: "transparent", border: "none", outline: "none" }}
                          />
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "11px", fontWeight: "600", color: "#10b981" }}>
                          {discountPercent > 0 ? `Student saves ${discountPercent}% off MRP` : "No discount applied"}
                        </p>
                      </div>
                    </div>

                    {/* Validity Settings */}
                    <div style={{ padding: "18px", borderRadius: "14px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-input)" }}>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                        Course Validity Period
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                        {[
                          { id: "date", label: "Fixed Expiry Date", desc: "e.g. 30/06/2027" },
                          { id: "days", label: "Days from Enrollment", desc: "e.g. 365 Days" },
                          { id: "lifetime", label: "Lifetime Access", desc: "Permanent access" }
                        ].map((v) => (
                          <div
                            key={v.id}
                            onClick={() => setValidityType(v.id)}
                            style={{
                              padding: "12px",
                              borderRadius: "10px",
                              border: validityType === v.id ? "1.5px solid #6E3FF3" : "1px solid var(--border-color)",
                              backgroundColor: validityType === v.id ? "rgba(110, 63, 243, 0.1)" : "var(--bg-card)",
                              color: validityType === v.id ? "var(--primary)" : "var(--text-primary)",
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <p style={{ margin: 0, fontSize: "12.5px", fontWeight: "700" }}>{v.label}</p>
                            <p style={{ margin: "2px 0 0 0", fontSize: "10.5px", color: "var(--text-secondary)" }}>{v.desc}</p>
                          </div>
                        ))}
                      </div>

                      {validityType === "date" && (
                        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "10px" }}>
                          <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Select Expiry Date:</label>
                          <input
                            type="date"
                            value={validityDate}
                            onChange={(e) => setValidityDate(e.target.value)}
                            style={{ height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)", fontSize: "12px", outline: "none" }}
                          />
                        </div>
                      )}

                      {validityType === "days" && (
                        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "10px" }}>
                          <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Days of Access:</label>
                          <input
                            type="number"
                            min="1"
                            value={validityDays}
                            onChange={(e) => setValidityDays(Number(e.target.value) || 365)}
                            style={{ width: "90px", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)", fontSize: "13px", fontWeight: "700", outline: "none" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── STEP 3: CONTENT / QUIZ BINDER ── */}
                {activeTab === 3 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-primary)" }}>
                          Quizzes Linked Inside This Course ({linkedQuizzes.length})
                        </h4>
                        <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--text-secondary)" }}>
                          Students enrolled in this course will gain immediate access to these tests
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          fetchAvailableQuizzes();
                          setShowAddQuizPicker(true);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: "700",
                          backgroundColor: "#6E3FF3",
                          color: "#ffffff",
                          border: "none",
                          cursor: "pointer"
                        }}
                      >
                        <Plus size={14} />
                        <span>Link Quizzes</span>
                      </button>
                    </div>

                    {/* Linked Quizzes Table */}
                    {linkedQuizzes.length === 0 ? (
                      <div style={{ padding: "48px 24px", textAlign: "center", borderRadius: "14px", border: "1.5px dashed var(--border-color)", backgroundColor: "var(--bg-input)" }}>
                        <Layers size={36} style={{ color: "var(--text-muted)", marginBottom: "8px" }} />
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>No quizzes linked to this course yet</p>
                        <p style={{ margin: "4px 0 0 0", fontSize: "11.5px", color: "var(--text-secondary)" }}>Click "Link Quizzes" above to attach existing tests</p>
                      </div>
                    ) : (
                      <div style={{ borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden", backgroundColor: "var(--bg-card)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                          <thead>
                            <tr style={{ backgroundColor: "var(--bg-input)", borderBottom: "1px solid var(--border-color)", fontSize: "10.5px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                              <th style={{ padding: "10px 14px" }}>#</th>
                              <th style={{ padding: "10px 14px" }}>Quiz Name</th>
                              <th style={{ padding: "10px 14px" }}>Questions</th>
                              <th style={{ padding: "10px 14px" }}>Status</th>
                              <th style={{ padding: "10px 14px", textAlign: "right" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedQuizzes.map((q, idx) => (
                              <tr key={q._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: "600" }}>{idx + 1}</td>
                                <td style={{ padding: "10px 14px", fontWeight: "600", color: "var(--text-primary)" }}>{q.title}</td>
                                <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{q.questionCount || 0} Qs</td>
                                <td style={{ padding: "10px 14px" }}>
                                  <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "10.5px", fontWeight: "700", backgroundColor: q.status === "Published" || q.published ? "rgba(16, 185, 129, 0.1)" : "var(--bg-input)", color: q.status === "Published" || q.published ? "#10b981" : "var(--text-secondary)" }}>
                                    {q.status === "Published" || q.published ? "Published" : "Draft"}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUnlinkQuiz(q._id)}
                                    style={{ color: "#ef4444", padding: "4px", backgroundColor: "transparent", border: "none", cursor: "pointer" }}
                                    title="Unlink from course"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Quiz Picker Drawer / Popover */}
                    {showAddQuizPicker && (
                      <div style={{ padding: "16px", borderRadius: "14px", backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-primary)" }}>
                            Select Tests to Link into This Course:
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAddQuizPicker(false)}
                            style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)", backgroundColor: "transparent", border: "none", cursor: "pointer" }}
                          >
                            Done
                          </button>
                        </div>
                        <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                          {allAvailableQuizzes.length === 0 ? (
                            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", padding: "10px 0" }}>No unassigned quizzes available</p>
                          ) : (
                            allAvailableQuizzes.map((quiz) => (
                              <div
                                key={quiz._id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  backgroundColor: "var(--bg-card)",
                                  border: "1px solid var(--border-color)",
                                  fontSize: "12.5px"
                                }}
                              >
                                <span style={{ fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "8px" }}>
                                  {quiz.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleLinkQuiz(quiz)}
                                  style={{ padding: "4px 10px", fontSize: "11px", fontWeight: "700", color: "#ffffff", backgroundColor: "#6E3FF3", borderRadius: "6px", border: "none", cursor: "pointer", flexShrink: 0 }}
                                >
                                  + Add
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 4: ADDITIONAL SETTINGS ── */}
                {activeTab === 4 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {/* Exam Series Binding */}
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Target Exam Series
                      </label>
                      <select
                        value={examSeriesId}
                        onChange={(e) => setExamSeriesId(e.target.value)}
                        style={{
                          width: "100%",
                          height: "42px",
                          padding: "0 14px",
                          fontSize: "13px",
                          fontWeight: "500",
                          backgroundColor: "var(--bg-input)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "10px",
                          color: "var(--text-primary)",
                          outline: "none",
                          cursor: "pointer"
                        }}
                      >
                        <option value="" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>
                          No Specific Series (General Master Course)
                        </option>
                        {examSeriesList.map((exam) => (
                          <option key={exam._id} value={exam._id} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>
                            {exam.title || exam.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tags Input */}
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Tags & Keywords (Press Enter to add)
                      </label>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 12px",
                          backgroundColor: "var(--bg-input)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "10px",
                          minHeight: "42px"
                        }}
                      >
                        {tags.map((t, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "600",
                              backgroundColor: "var(--bg-card)",
                              border: "1px solid var(--border-color)",
                              color: "var(--text-primary)"
                            }}
                          >
                            <span>#{t}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(t)}
                              style={{ color: "var(--text-muted)", backgroundColor: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          placeholder="Add tag..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          style={{ flex: 1, minWidth: "90px", fontSize: "12px", backgroundColor: "transparent", border: "none", outline: "none", color: "var(--text-primary)" }}
                        />
                      </div>
                    </div>

                    {/* Display Order / Rank */}
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Display Order / Rank (sortOrder)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                        placeholder="0"
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 14px",
                          fontSize: "13px",
                          fontWeight: "600",
                          backgroundColor: "var(--bg-input)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "10px",
                          color: "var(--text-primary)",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                        Lower numerical rank displays first in list and grid views (e.g. -10, 0, 10).
                      </span>
                    </div>

                    {/* Instructions */}
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Special Instructions / Guidelines for Students
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Tests will unlock every Monday at 9:00 AM. Requires desktop or app."
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          fontSize: "12.5px",
                          backgroundColor: "var(--bg-input)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "10px",
                          color: "var(--text-primary)",
                          outline: "none",
                          resize: "none",
                          fontFamily: "inherit",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: APPX LIVE PREVIEW CARD */}
          <div
            style={{
              borderLeft: "1px solid var(--border-color)",
              paddingLeft: "24px",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ position: "sticky", top: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                  PREVIEW
                </span>
                <span style={{ fontSize: "10.5px", fontWeight: "500", color: "var(--text-secondary)" }}>
                  Live Student View
                </span>
              </div>

              {/* Exact AppX Preview Card */}
              <div
                style={{
                  width: "100%",
                  borderRadius: "16px",
                  border: "1px solid var(--border-color)",
                  overflow: "hidden",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-primary)"
                }}
              >
                {/* Banner Thumbnail */}
                <div style={{ height: "160px", width: "100%", backgroundColor: "var(--bg-input)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt="Course Banner"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <div style={{ color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <BookOpen size={32} />
                      <span style={{ fontSize: "11.5px" }}>No Cover Image</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    {isFeatured && (
                      <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "700", backgroundColor: "#f59e0b", color: "#000000", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Star size={10} />
                        <span>Featured</span>
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "700", backgroundColor: "#10b981", color: "#ffffff" }}>
                        {discountPercent}% Off
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "13.5px", fontWeight: "700", color: "var(--text-primary)", lineHeight: "1.4", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {title.trim() || "PRELIMS LANGUAGE COURSE (HINDI, ENGLISH & URDU)"}
                  </h3>

                  {/* Price & MRP Row */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "10px" }}>
                    <span style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)" }}>
                      {price > 0 ? `Rs. ${price}/-` : "Free"}
                    </span>
                    {mrp > price && price > 0 && (
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", textDecoration: "line-through" }}>
                        ₹{mrp}
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b981" }}>
                        {discountPercent}% Off
                      </span>
                    )}
                  </div>

                  {/* Validity */}
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Calendar size={12} style={{ color: "var(--text-muted)" }} />
                    <span>
                      Validity : {validityType === "date" ? (validityDate || "30/06/2027") : validityType === "days" ? `${validityDays} Days` : "Lifetime"}
                    </span>
                  </div>

                  {/* Footer Tags & Enroll Button */}
                  <div style={{ paddingTop: "12px", marginTop: "12px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "600", backgroundColor: "rgba(110, 63, 243, 0.12)", color: "#6E3FF3" }}>
                      course
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#6E3FF3" }}>
                      Enroll Now →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── STICKY MODAL FOOTER ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 24px",
            borderTop: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-card)",
            flexShrink: 0
          }}
        >
          <button
            type="button"
            disabled={activeTab === 1}
            onClick={() => setActiveTab((prev) => Math.max(1, prev - 1))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "600",
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              cursor: activeTab === 1 ? "not-allowed" : "pointer",
              opacity: activeTab === 1 ? 0.4 : 1
            }}
          >
            <ChevronLeft size={15} />
            <span>Previous</span>
          </button>

          {activeTab < 4 ? (
            <button
              type="button"
              onClick={() => setActiveTab((prev) => Math.min(4, prev + 1))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 22px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "700",
                backgroundColor: "#6E3FF3",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(110, 63, 243, 0.3)"
              }}
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 22px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "700",
                backgroundColor: "#6E3FF3",
                color: "#ffffff",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(110, 63, 243, 0.3)"
              }}
            >
              <Save size={15} />
              <span>{saving ? "Saving..." : "Save Course"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
