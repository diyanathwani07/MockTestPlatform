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

  // AI Description Generator (AppX Screenshot 8 Feature)
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

  // Save handler
  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a course title.");
      setActiveTab(1);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        detailedDescription: description.trim(),
        thumbnail: thumbnail.trim(),
        price: Number(price) || 0,
        mrp: Number(mrp) || 0,
        isFeatured,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden animate-scaleUp"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP HEADER (AppX Bar) ── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {folderId ? "Edit:" : "Create:"}
            </span>
            <h2 className="text-base font-bold m-0 uppercase tracking-tight truncate max-w-xl" style={{ color: "var(--text-primary)" }}>
              {title.trim() || "PRELIMS LANGUAGE COURSE (HINDI, ENGLISH & URDU)"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              style={{ color: "var(--text-secondary)" }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold hover:opacity-75 rounded-xl transition-colors bg-transparent border-none cursor-pointer"
            >
              <X size={15} />
              <span>Close</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ backgroundColor: "#6E3FF3", color: "#ffffff" }}
              className="btn-prepmark-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-all border-none cursor-pointer disabled:opacity-60 hover:opacity-90"
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* ── STEPPER BAR (AppX 4 Steps) ── */}
        <div
          className="px-6 py-3 border-b flex items-center gap-6 overflow-x-auto shrink-0 text-xs font-semibold"
          style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-color)" }}
        >
          {[
            { id: 1, label: "Basic Course Information" },
            { id: 2, label: "Pricing" },
            { id: 3, label: "Content" },
            { id: 4, label: "Additional Settings" }
          ].map((step) => {
            const isActive = activeTab === step.id;
            const isCompleted = activeTab > step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveTab(step.id)}
                className={`flex items-center gap-2 border-none bg-transparent cursor-pointer transition-colors py-1 ${isActive
                    ? "font-bold border-b-2"
                    : isCompleted
                      ? "font-semibold"
                      : "hover:opacity-80"
                  }`}
                style={{
                  color: isActive ? "var(--text-primary)" : isCompleted ? "#10b981" : "var(--text-muted)",
                  borderBottomColor: isActive ? "#6E3FF3" : "transparent"
                }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
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
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: STEP CONTENT (7.5 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between">
            {loading ? (
              <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-primary mb-2" />
                <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Loading course settings...</span>
              </div>
            ) : (
              <div>
                {/* ── STEP 1: BASIC COURSE INFORMATION ── */}
                {activeTab === 1 && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {/* Title */}
                      <div className="w-full sm:flex-1">
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                          Title <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <BookOpen size={16} className="absolute left-3.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                          <input
                            type="text"
                            required
                            placeholder="e.g. PRELIMS LANGUAGE COURSE (HINDI, ENGLISH & URDU)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{
                              backgroundColor: "var(--bg-input)",
                              borderColor: "var(--border-color)",
                              color: "var(--text-primary)"
                            }}
                            className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Price */}
                      <div className="w-full sm:w-48 shrink-0">
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                          Price (₹) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-xs font-bold pointer-events-none" style={{ color: "var(--text-muted)" }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value) || 0)}
                            style={{
                              backgroundColor: "var(--bg-input)",
                              borderColor: "var(--border-color)",
                              color: "var(--text-primary)"
                            }}
                            className="w-full pl-8 pr-3.5 py-2.5 text-xs font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Final price student pays</p>
                      </div>
                    </div>

                    {/* Featured Course Toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-input border border-gray-200/80 dark:border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isFeatured ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-gray-200 dark:bg-secondary text-gray-500"}`}>
                          <Star size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-foreground m-0">Featured Course Badge</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">Highlight this course on student banners & top shelves</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFeatured}
                          onChange={(e) => setIsFeatured(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* AI Generation Tool Banner (AppX Feature) */}
                    <div
                      className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3"
                      style={{
                        backgroundColor: "rgba(110, 63, 243, 0.08)",
                        borderColor: "rgba(110, 63, 243, 0.25)"
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white"
                          style={{ backgroundColor: "#6E3FF3" }}
                        >
                          NEW
                        </span>
                        <p className="text-xs font-medium m-0" style={{ color: "var(--text-primary)" }}>
                          Let our AI tool work its magic to generate a compelling course description in seconds!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateAiDescription}
                        disabled={aiGenerating}
                        className="btn-prepmark-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: "#6E3FF3", color: "#ffffff" }}
                      >
                        <Sparkles size={14} className={aiGenerating ? "animate-spin" : ""} />
                        <span>{aiGenerating ? "Generating..." : "Generate using AI"}</span>
                      </button>
                    </div>

                    {/* Course Description */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        Course Description
                      </label>
                      <textarea
                        rows={6}
                        placeholder="Write detailed syllabus, lecture schedule, and course features..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{
                          backgroundColor: "var(--bg-input)",
                          borderColor: "var(--border-color)",
                          color: "var(--text-primary)"
                        }}
                        className="w-full p-3.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y leading-relaxed font-sans"
                      />
                    </div>

                    {/* Thumbnail Cover URL & Presets */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                        Cover Thumbnail URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/banner.png"
                        value={thumbnail}
                        onChange={(e) => setThumbnail(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-input border border-gray-200 dark:border-border rounded-xl text-gray-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">AppX Presets:</span>
                        {PRESET_BANNERS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setThumbnail(p.url)}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 dark:bg-secondary hover:bg-gray-200 dark:hover:bg-accent text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-border cursor-pointer transition-colors"
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
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* MRP */}
                      <div className="p-4 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-input shadow-xs">
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Original MRP (₹)
                        </label>
                        <div className="flex items-center">
                          <span className="text-gray-400 text-sm font-bold mr-2">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={mrp}
                            onChange={(e) => setMrp(e.target.value)}
                            className="w-full text-base font-bold text-gray-900 dark:text-foreground border-none bg-transparent focus:outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Crossed-out anchor price</p>
                      </div>

                      {/* Selling Price */}
                      <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
                        <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
                          Discounted Selling Price (₹)
                        </label>
                        <div className="flex items-center">
                          <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold mr-2">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full text-base font-bold text-emerald-900 dark:text-emerald-200 border-none bg-transparent focus:outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                          {discountPercent > 0 ? `Student saves ${discountPercent}% off MRP` : "No discount applied"}
                        </p>
                      </div>
                    </div>

                    {/* Validity Settings */}
                    <div className="p-5 rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-input">
                      <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">
                        Course Validity Period
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: "date", label: "Fixed Expiry Date", desc: "e.g. 30/06/2027" },
                          { id: "days", label: "Days from Enrollment", desc: "e.g. 365 Days" },
                          { id: "lifetime", label: "Lifetime Access", desc: "Permanent access" }
                        ].map((v) => (
                          <div
                            key={v.id}
                            onClick={() => setValidityType(v.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${validityType === v.id
                                ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold"
                                : "border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-accent text-gray-700 dark:text-gray-300"
                              }`}
                          >
                            <p className="text-xs font-bold m-0">{v.label}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 mt-0.5">{v.desc}</p>
                          </div>
                        ))}
                      </div>

                      {validityType === "date" && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-border flex items-center gap-3">
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Select Expiry Date:</label>
                          <input
                            type="date"
                            value={validityDate}
                            onChange={(e) => setValidityDate(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-card border border-gray-200 dark:border-border rounded-lg text-gray-800 dark:text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {validityType === "days" && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-border flex items-center gap-3">
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Days of Access:</label>
                          <input
                            type="number"
                            min="1"
                            value={validityDays}
                            onChange={(e) => setValidityDays(e.target.value)}
                            className="w-28 px-3 py-1.5 text-xs bg-gray-50 dark:bg-card border border-gray-200 dark:border-border rounded-lg text-gray-800 dark:text-foreground focus:outline-none focus:border-primary font-bold"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── STEP 3: CONTENT / QUIZ BINDER ── */}
                {activeTab === 3 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider m-0">
                          Quizzes Linked Inside This Course ({linkedQuizzes.length})
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 mt-0.5">
                          Students enrolled in this course will gain immediate access to these tests
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          fetchAvailableQuizzes();
                          setShowAddQuizPicker(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl border-none cursor-pointer shadow-xs transition-colors"
                      >
                        <Plus size={14} />
                        <span>Link Quizzes</span>
                      </button>
                    </div>

                    {/* Linked Quizzes Table */}
                    {linkedQuizzes.length === 0 ? (
                      <div className="p-12 text-center text-gray-400 bg-gray-50/50 dark:bg-input/40 rounded-2xl border border-dashed border-gray-300 dark:border-border">
                        <Layers size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 m-0">No quizzes linked to this course yet</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Click "Link Quizzes" above to attach existing tests</p>
                      </div>
                    ) : (
                      <div className="border border-gray-200 dark:border-border rounded-2xl overflow-hidden bg-white dark:bg-card shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-input/80 border-b border-gray-200 dark:border-border text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px]">
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Quiz Name</th>
                              <th className="py-2.5 px-3">Questions</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-border">
                            {linkedQuizzes.map((q, idx) => (
                              <tr key={q._id} className="hover:bg-gray-50/80 dark:hover:bg-accent/40 transition-colors">
                                <td className="py-2 px-3 text-gray-400 font-semibold">{idx + 1}</td>
                                <td className="py-2 px-3 font-semibold text-gray-800 dark:text-foreground">{q.title}</td>
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{q.questionCount || 0} Qs</td>
                                <td className="py-2 px-3">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${q.status === "Published" || q.published ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-gray-100 dark:bg-secondary text-gray-600 dark:text-gray-300"}`}>
                                    {q.status === "Published" || q.published ? "Published" : "Draft"}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleUnlinkQuiz(q._id)}
                                    className="text-red-500 hover:text-red-700 p-1 bg-transparent border-none cursor-pointer"
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
                      <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 mt-4 animate-fadeIn">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase">
                            Select Tests to Link into This Course:
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAddQuizPicker(false)}
                            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs bg-transparent border-none cursor-pointer font-bold"
                          >
                            Done
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {allAvailableQuizzes.length === 0 ? (
                            <p className="text-xs text-gray-400 py-2">No unassigned quizzes available</p>
                          ) : (
                            allAvailableQuizzes.map((quiz) => (
                              <div
                                key={quiz._id}
                                className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-border text-xs hover:border-primary transition-colors"
                              >
                                <span className="font-semibold text-gray-800 dark:text-foreground truncate mr-2">{quiz.title}</span>
                                <button
                                  type="button"
                                  onClick={() => handleLinkQuiz(quiz)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-primary rounded-lg border-none cursor-pointer shrink-0"
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
                  <div className="space-y-5 animate-fadeIn">
                    {/* Exam Series Binding */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                        Target Exam Series
                      </label>
                      <select
                        value={examSeriesId}
                        onChange={(e) => setExamSeriesId(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-input border border-gray-200 dark:border-border rounded-xl text-gray-900 dark:text-foreground focus:outline-none focus:border-primary font-medium"
                      >
                        <option value="">No Specific Series (General Master Course)</option>
                        {examSeriesList.map((exam) => (
                          <option key={exam._id} value={exam._id}>
                            {exam.title || exam.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tags Input */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                        Tags & Keywords (Press Enter to add)
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white dark:bg-input border border-gray-200 dark:border-border rounded-xl min-h-[42px]">
                        {tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-secondary text-gray-800 dark:text-gray-200"
                          >
                            <span>#{t}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(t)}
                              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-transparent border-none p-0 cursor-pointer"
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
                          className="flex-1 min-w-[80px] text-xs bg-transparent border-none p-1 focus:outline-none text-gray-900 dark:text-foreground"
                        />
                      </div>
                    </div>

                    {/* Display Order / Rank (sortOrder) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                        Display Order / Rank (sortOrder)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-input border border-gray-200 dark:border-border rounded-xl text-gray-900 dark:text-foreground focus:outline-none focus:border-primary font-medium"
                      />
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 block">
                        Lower numerical rank displays first in list and grid views (e.g. -10, 0, 10).
                      </span>
                    </div>

                    {/* Instructions */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                        Special Instructions / Guidelines for Students
                      </label>
                      <textarea
                        rows={4}
                        placeholder="e.g. Tests will unlock every Monday at 9:00 AM. Requires desktop or app."
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="w-full p-3.5 text-xs bg-white dark:bg-input border border-gray-200 dark:border-border rounded-xl text-gray-800 dark:text-foreground focus:outline-none focus:border-primary resize-none font-sans"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100 dark:border-border">
              <button
                type="button"
                disabled={activeTab === 1}
                onClick={() => setActiveTab((prev) => Math.max(1, prev - 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-accent border-none cursor-pointer disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={15} />
                <span>Previous</span>
              </button>

              {activeTab < 4 ? (
                <button
                  type="button"
                  onClick={() => setActiveTab((prev) => Math.min(4, prev + 1))}
                  style={{ backgroundColor: "#6E3FF3", color: "#ffffff" }}
                  className="btn-prepmark-primary inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer shadow-md transition-all"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ backgroundColor: "#6E3FF3", color: "#ffffff" }}
                  className="btn-prepmark-primary inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer shadow-md transition-all"
                >
                  <Save size={15} />
                  <span>{saving ? "Saving..." : "Save Course"}</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: APPX LIVE PREVIEW CARD (4.5 cols) */}
          <div
            className="lg:col-span-5 xl:col-span-4 border-t lg:border-t-0 lg:border-l pt-6 lg:pt-0 pl-0 lg:pl-6 flex flex-col items-center"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="w-full sticky top-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  PREVIEW
                </span>
                <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  Live Student View
                </span>
              </div>

              {/* Exact AppX Preview Card */}
              <div
                className="w-full rounded-2xl border overflow-hidden shadow-lg transition-all flex flex-col justify-between"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                {/* Banner Thumbnail */}
                <div className="h-44 w-full bg-gradient-to-br from-indigo-900 via-gray-900 to-black relative overflow-hidden flex items-center justify-center">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt="Course Banner"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="text-white/40 flex flex-col items-center gap-1">
                      <BookOpen size={36} />
                      <span className="text-xs">No Cover Image</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-gray-950 shadow-xs flex items-center gap-1">
                        <Star size={10} />
                        <span>Featured</span>
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
                        {discountPercent}% Off
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-foreground m-0 line-clamp-2 leading-snug">
                      {title.trim() || "PRELIMS LANGUAGE COURSE (HINDI, ENGLISH & URDU)"}
                    </h3>

                    {/* Price & MRP Row */}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-base font-extrabold text-gray-900 dark:text-foreground">
                        {price > 0 ? `Rs. ${price}/-` : "Free"}
                      </span>
                      {mrp > price && price > 0 && (
                        <span className="text-xs text-gray-400 line-through">
                          ₹{mrp}
                        </span>
                      )}
                      {discountPercent > 0 && (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {discountPercent}% Off
                        </span>
                      )}
                    </div>

                    {/* Validity */}
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400 dark:text-gray-500" />
                      <span>
                        Validity : {validityType === "date" ? (validityDate || "30/06/2027") : validityType === "days" ? `${validityDays} Days` : "Lifetime"}
                      </span>
                    </div>
                  </div>

                  {/* Footer Tags & Enroll Button */}
                  <div className="pt-3 mt-3 border-t border-gray-100 dark:border-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200/50 dark:border-pink-800/40">
                        course
                      </span>
                      {isFeatured && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40">
                          featured
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-primary">
                      Enroll Now →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
