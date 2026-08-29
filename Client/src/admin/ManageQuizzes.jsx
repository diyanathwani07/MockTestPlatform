import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminNavbar from "./components/AdminNavbar";
import AdminSidebar from "./components/AdminSidebar";
import { Eye, Edit2, Calendar, Trash2, Copy, Search, EyeOff, UploadCloud, Tag, AlertTriangle, X, FileText, CheckCircle, ChevronDown, ChevronUp, Grid, List, User } from "lucide-react";
import MuiDatePicker from "../components/MuiDatePicker";
import { useConfirm } from "../context/ConfirmContext";
import { useAuth } from "../context/AuthContext";

function ManageQuizzes() {
  const confirm = useConfirm();
  const { user: currentUser, hasPermission } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvParsed, setCsvParsed] = useState({ exams: [], errors: [] });
  const [csvStep, setCsvStep] = useState("upload"); // "upload" | "preview" | "result"
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [importMode, setImportMode] = useState("skip"); // "skip" | "update"
  const [showConfigureExams, setShowConfigureExams] = useState(false);
  const [importedExamsList, setImportedExamsList] = useState([]);
  const [showPreviewSubmenu, setShowPreviewSubmenu] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [selectedExportQuiz, setSelectedExportQuiz] = useState(null);
  const [viewMode, setViewMode] = useState("active"); // "active" or "recycle"
  const [ownershipTab, setOwnershipTab] = useState("mine"); // "mine" or "all"
  const navigate = useNavigate();

  const closeImportModal = () => {
    setShowBulkImportModal(false);
    setCsvFile(null);
    setCsvParsed({ exams: [], errors: [] });
    setCsvStep("upload");
    setCsvImporting(false);
    setCsvResult(null);
    setDragOver(false);
    setImportMode("skip");
  };

  const parseCSVText = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return { error: "Empty CSV file" };

    const header = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const required = ["examName", "examCode", "subject", "sectionMode"];
    const missing = required.filter(col => !header.includes(col));
    if (missing.length > 0) {
      return { error: `Missing required columns: ${missing.join(", ")}` };
    }

    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = [];
      let current = "";
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(current.trim().replace(/^["']|["']$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      cols.push(current.trim().replace(/^["']|["']$/g, ""));

      if (cols.length < required.length) {
        errors.push(`Row ${i + 1}: Malformed row or missing columns.`);
        continue;
      }

      const rowObj = {};
      header.forEach((colName, index) => {
        rowObj[colName] = cols[index] !== undefined ? cols[index].trim() : "";
      });

      const { examName, examCode, subject, sectionMode, sectionName, questionEnglish, questionHindi, optionA, optionB, optionC, optionD, correctAnswer, explanation } = rowObj;

      if (!examName || !examCode || !subject || !sectionMode) {
        errors.push(`Row ${i + 1}: Required fields (examName, examCode, subject, sectionMode) cannot be empty.`);
        continue;
      }

      const normSectionMode = sectionMode.toLowerCase();
      if (normSectionMode !== "single" && normSectionMode !== "multi") {
        errors.push(`Row ${i + 1}: sectionMode must be 'single' or 'multi' (got '${sectionMode}').`);
        continue;
      }

      // Check if this row contains any question data
      const hasQuestionData = questionEnglish || optionA || optionB || optionC || optionD || correctAnswer;
      const rowErrors = [];

      if (hasQuestionData) {
        if (!questionEnglish) {
          rowErrors.push(`Row ${i + 1}: Missing questionEnglish`);
        }
        if (!optionA || !optionB) {
          rowErrors.push(`Row ${i + 1}: At least Option A and Option B are required`);
        }
        if (!correctAnswer) {
          rowErrors.push(`Row ${i + 1}: Missing correctAnswer`);
        } else {
          const ansUpper = correctAnswer.toUpperCase();
          if (!["A", "B", "C", "D"].includes(ansUpper)) {
            rowErrors.push(`Row ${i + 1}: correctAnswer must be A, B, C, or D (got '${correctAnswer}')`);
          } else {
            // Check if selected option is filled
            const chosenOptionText = rowObj[`option${ansUpper}`];
            if (!chosenOptionText) {
              rowErrors.push(`Row ${i + 1}: The correct option (Option ${ansUpper}) is empty`);
            }
          }
        }
      }

      rows.push({
        rowIndex: i + 1,
        examName,
        examCode,
        subject,
        sectionMode: normSectionMode,
        sectionName: sectionName || "General",
        questionEnglish: questionEnglish || "",
        questionHindi: questionHindi || "",
        optionA: optionA || "",
        optionB: optionB || "",
        optionC: optionC || "",
        optionD: optionD || "",
        correctAnswer: correctAnswer || "",
        explanation: explanation || "",
        hasQuestionData,
        rowErrors
      });
    }

    if (rows.length === 0 && errors.length === 0) {
      return { error: "No data rows found in CSV." };
    }

    const examsMap = {};
    rows.forEach(row => {
      if (!examsMap[row.examCode]) {
        examsMap[row.examCode] = {
          examCode: row.examCode,
          examName: row.examName,
          sectionMode: row.sectionMode,
          rows: [],
          warnings: [],
          errors: []
        };
      }
      const exam = examsMap[row.examCode];

      const hasDuplicateSubject = exam.rows.some(r => r.subject.toLowerCase() === row.subject.toLowerCase());
      if (hasDuplicateSubject) {
        exam.warnings.push(`Duplicate subject: "${row.subject}"`);
      }

      if (exam.sectionMode !== row.sectionMode) {
        exam.errors.push(`Mismatched sectionMode (${exam.sectionMode} vs ${row.sectionMode})`);
      }

      if (exam.examName.toLowerCase() !== row.examName.toLowerCase()) {
        exam.warnings.push(`Mismatched exam name ("${exam.examName}" vs "${row.examName}")`);
      }

      if (row.rowErrors && row.rowErrors.length > 0) {
        exam.errors.push(...row.rowErrors);
      }
      exam.rows.push(row);
    });

    return { exams: Object.values(examsMap), errors };
  };

  const handleCSVFileSelected = (file) => {
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseCSVText(text);
      if (parsed.error) {
        alert(parsed.error);
        setCsvFile(null);
      } else {
        setCsvParsed({
          exams: parsed.exams || [],
          errors: parsed.errors || []
        });
        setCsvStep("preview");
      }
    };
    reader.readAsText(file);
  };

  const downloadCSVEmailTemplate = () => {
    const csvContent = "examName,examCode,subject,sectionMode,sectionName,questionEnglish,questionHindi,optionA,optionB,optionC,optionD,correctAnswer,explanation\n" +
      "UPTET Paper 1,UPTET-P1,Child Development,single,General,What is Child Development?,बाल विकास क्या है?,Study of growth,Study of games,Study of food,Study of art,A,It studies child growth\n" +
      "UPTET Paper 1,UPTET-P1,Mathematics,single,General,What is 2+2?,2+2 क्या है?,3,4,5,6,B,Basic arithmetic addition\n" +
      "CTET Paper 1,CTET-P1,Child Development,multi,Child Development,,,,,,\n" +
      "CTET Paper 1,CTET-P1,Mathematics,multi,Mathematics,,,,,,\n" +
      "CTET Paper 1,CTET-P1,EVS,multi,Environmental Studies,,,,,";
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bulk_exam_series_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImportSubmit = async () => {
    if (csvParsed.exams.length === 0) return;
    setCsvImporting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/quizzes/bulk-import`,
        {
          exams: csvParsed.exams,
          mode: importMode // "skip" | "update"
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );
      setCsvResult(response.data);
      // Store list of created and updated exams so we can show "Configure Exams"
      const configuredList = [
        ...(response.data.created || []),
        ...(response.data.updated || [])
      ];
      setImportedExamsList(configuredList);
      setCsvStep("result");
      fetchQuizzes();
    } catch (error) {
      console.error("Bulk Import Error:", error);
      alert(error.response?.data?.message || "Failed to import CSV");
    } finally {
      setCsvImporting(false);
    }
  };

  const fetchQuizzes = async (mode = viewMode) => {
    try {
      setLoading(true);
      const endpoint = mode === "recycle" 
        ? `${import.meta.env.VITE_API_URL}/api/quizzes?deleted=true`
        : `${import.meta.env.VITE_API_URL}/api/quizzes`;
      const response = await axios.get(endpoint);
      setQuizzes(response.data);
    } catch (error) {
      console.error("Fetch Quizzes Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes(viewMode);
  }, [viewMode]);

  const checkIsMine = (quiz) => {
    const creatorId = quiz.createdBy?._id || quiz.createdBy?.id || quiz.createdBy;
    const currentUserId = currentUser?._id || currentUser?.id;
    if (!creatorId || !currentUserId) return false;
    return String(creatorId) === String(currentUserId);
  };

  const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
  const filteredQuizzes = quizzes.filter(q => {
    const isMine = checkIsMine(q);
    if (ownershipTab === "mine" && !isMine) return false;

    const titleText = (q.title || "").toLowerCase();
    const subjectText = (q.subject || "").toLowerCase();
    const matchesSearch = searchTerms.every(term => titleText.includes(term) || subjectText.includes(term));
    
    let matchesDate = true;
    if (filterDate && q.createdAt) {
      const qDate = new Date(q.createdAt).toISOString().split('T')[0];
      matchesDate = qDate === filterDate;
    }

    let matchesType = true;
    const isMulti = q.sections && q.sections.length > 1;
    if (filterType === "Single") matchesType = !isMulti;
    if (filterType === "Multi") matchesType = isMulti;

    return matchesSearch && matchesDate && matchesType;
  });

  const handleDuplicateQuiz = async (quizId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${import.meta.env.VITE_API_URL}/api/quizzes/${quizId}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Quiz duplicated successfully!");
      fetchQuizzes();
    } catch (error) {
      console.error("Failed to duplicate quiz:", error);
      alert(error.response?.data?.message || "Failed to duplicate quiz.");
    }
  };

  const handleDelete = async (id, title) => {
    const isConfirmed = await confirm({
      title: "Move to Recycle Bin?",
      message: `Are you sure you want to move "${title}" to the recycle bin?`,
      type: "warning",
      confirmText: "Move",
    });
    if (isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/quizzes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuizzes(quizzes.filter(q => q._id !== id));
      } catch (error) {
        console.error("Delete Quiz Error:", error);
        alert("Failed to move quiz to recycle bin.");
      }
    }
  };

  const handleRestore = async (id, title) => {
    const isConfirmed = await confirm({
      title: "Restore Assessment?",
      message: `Restore "${title}"?`,
      type: "info",
      confirmText: "Restore",
    });
    if (isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        await axios.put(`${import.meta.env.VITE_API_URL}/api/quizzes/${id}/restore`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuizzes(quizzes.filter(q => q._id !== id));
      } catch (error) {
        console.error("Restore Quiz Error:", error);
        alert("Failed to restore quiz.");
      }
    }
  };

  const handlePermanentDelete = async (id, title) => {
    const isConfirmed = await confirm({
      title: "Permanently Delete?",
      message: `WARNING: Are you sure you want to PERMANENTLY delete "${title}"? This cannot be undone.`,
      type: "danger",
      confirmText: "Delete Permanently",
    });
    if (isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/quizzes/${id}/permanent`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuizzes(quizzes.filter(q => q._id !== id));
      } catch (error) {
        console.error("Permanent Delete Quiz Error:", error);
        alert("Failed to permanently delete quiz.");
      }
    }
  };

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <AdminSidebar />

      <div className="admin-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-page)" }}>
        <AdminNavbar title={<><span className="hidden sm:inline">Manage </span>Quizzes</>} />

        <div className="admin-content manage-quizzes-view-container" style={{ flex: 1, textAlign: "left" }}>

          {/* ─── APEX COMMAND BAR ─── */}
          <div className="armored-admin-card manage-command-bar-card" style={{ 
            backgroundColor: "var(--bg-card)", 
            border: "1.5px solid var(--border-color)", 
            borderRadius: "16px", 
            marginBottom: "28px", 
            boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            textAlign: "left"
          }}>
            
            <div className="manage-quizzes-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ textAlign: "left" }}>
                <h2 style={{ fontSize: isMobile ? "16px" : "22px", fontWeight: "700", color: "var(--text-primary)", fontFamily: "'Fraunces', serif", margin: "0 0 4px 0" }}>
                  {viewMode === "active" ? "Manage Quizzes" : "Recycle Bin"}
                </h2>
                <span style={{ fontSize: "13px", color: "var(--violet)", fontWeight: "600" }}>
                  {quizzes.length} Total Quizzes | {quizzes.filter(checkIsMine).length} Created by You
                </span>
              </div>
              
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "8px", backgroundColor: "var(--bg-page)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <button
                    onClick={() => setViewMode("active")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      backgroundColor: viewMode === "active" ? "var(--violet)" : "transparent",
                      color: viewMode === "active" ? "white" : "var(--text-secondary)",
                    }}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setViewMode("recycle")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      backgroundColor: viewMode === "recycle" ? "var(--red)" : "transparent",
                      color: viewMode === "recycle" ? "white" : "var(--text-secondary)",
                    }}
                  >
                    Recycle Bin
                  </button>
                </div>

                <button
                  onClick={() => navigate('/admin/create-quiz')}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    backgroundColor: "transparent",
                    color: "var(--text-primary)",
                    border: "1.5px solid var(--border-color)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.target.style.borderColor = "var(--violet)"; e.target.style.color = "var(--violet)"; }}
                  onMouseLeave={(e) => { e.target.style.borderColor = "var(--border-color)"; e.target.style.color = "var(--text-primary)"; }}
                >
                  + Create Exam
                </button>

                <button
                  onClick={() => setShowBulkImportModal(true)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    backgroundColor: "var(--violet)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <UploadCloud size={14} /> Bulk Upload Exam Series
                </button>
              </div>
            </div>

            {/* Ownership Tabs */}
            <div style={{ 
              display: "flex", 
              borderBottom: "1.5px solid var(--border-color)", 
              width: "100%", 
              marginBottom: "16px",
              overflowX: "auto",
              scrollbarWidth: "none"
            }}>
              <button
                onClick={() => setOwnershipTab("mine")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: ownershipTab === "mine" ? "2.5px solid var(--violet)" : "2.5px solid transparent",
                  backgroundColor: "transparent",
                  color: ownershipTab === "mine" ? "var(--violet)" : "var(--text-secondary)",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap"
                }}
              >
                <User size={15} />
                My Quizzes
              </button>
              <button
                onClick={() => setOwnershipTab("all")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: ownershipTab === "all" ? "2.5px solid var(--violet)" : "2.5px solid transparent",
                  backgroundColor: "transparent",
                  color: ownershipTab === "all" ? "var(--violet)" : "var(--text-secondary)",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap"
                }}
              >
                <Grid size={15} />
                All Quizzes
              </button>
            </div>

            <div className="manage-quizzes-filter-row" style={{ display: "flex", gap: "8px", width: "100%", maxWidth: "100%", overflowX: "auto", flexWrap: "wrap", paddingBottom: "4px" }}>
              {/* Sleek Rounded Search Bar */}
              <div style={{ 
                flex: isMobile ? "0 1 150px" : "0 1 240px",
                minWidth: "120px",
                maxWidth: isMobile ? "150px" : "240px",
                display: "flex", alignItems: "center", gap: "6px", 
                backgroundColor: "var(--bg-input, #FAFAFC)", border: "1px solid var(--border-color)", 
                borderRadius: "8px", padding: "6px 12px",
                boxShadow: "none", position: "relative"
              }}>
                <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "12px", color: "var(--text-primary)", fontWeight: "500", paddingRight: "18px" }}
                />
                {searchTerm && (
                  <span 
                    onClick={() => setSearchTerm("")}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                    title="Clear search"
                  >
                    ✕
                  </span>
                )}
              </div>

              {/* Date Filter */}
              <div style={{ 
                flex: isMobile ? "1 1 auto" : "0 1 180px",
                minWidth: "150px"
              }}>
                <MuiDatePicker value={filterDate} onChange={setFilterDate} label="mm-dd-yyyy" />
              </div>

              {/* Type Filter */}
              <div style={{ 
                flex: "0 1 125px",
                minWidth: "120px",
                maxWidth: "125px",
                display: "flex", alignItems: "center", gap: "4px", 
                backgroundColor: "var(--bg-input, #FAFAFC)", border: "1px solid var(--border-color)", 
                borderRadius: "8px", padding: "6px 12px"
              }}>
                <Tag size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ 
                    border: "none", 
                    background: "transparent", 
                    outline: "none", 
                    fontSize: "12px", 
                    color: "var(--text-primary)", 
                    fontWeight: "500", 
                    width: "100%",
                    cursor: "pointer"
                  }}
                >
                  <option value="all">Types</option>
                  <option value="exams">Exams</option>
                  <option value="practice">Practice</option>
                </select>
              </div>
            </div>

          </div>

          {/* BULK IMPORT EXAM SERIES MODAL */}
          {showBulkImportModal && (
            <div className="modal-overlay" style={{ justifyContent: "center", zIndex: 1000 }} onClick={closeImportModal}>
              <div className="ticket-modal center-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "560px", width: "95%" }}>
                <div className="modal-header">
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <UploadCloud size={20} className="text-violet" />
                    Bulk Upload Exam Series
                  </h3>
                  <button className="close-btn" onClick={closeImportModal}>
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body" style={{ padding: "24px 30px" }}>
                  {csvStep === "upload" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleCSVFileSelected(e.dataTransfer.files[0]); }}
                        style={{
                          border: "2px dashed " + (dragOver ? "#6E3FF3" : "var(--border-color)"),
                          borderRadius: "12px",
                          padding: "40px 20px",
                          textAlign: "center",
                          backgroundColor: dragOver ? "rgba(110, 63, 243, 0.08)" : "var(--bg-sidebar)",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onClick={() => document.getElementById("bulk-csv-input").click()}
                      >
                        <input
                          id="bulk-csv-input"
                          type="file"
                          accept=".csv"
                          style={{ display: "none" }}
                          onChange={(e) => { if (e.target.files[0]) handleCSVFileSelected(e.target.files[0]); }}
                        />
                        <UploadCloud size={40} style={{ color: "var(--violet)", marginBottom: "12px" }} />
                        <h4 style={{ margin: "0 0 4px 0", color: "var(--text-primary)" }}>
                          Drag and drop your CSV file here
                        </h4>
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                          or click to browse from device
                        </p>
                      </div>

                      {/* Limitation Warning Alert */}
                      <div style={{ display: "flex", gap: "10px", backgroundColor: "rgba(234, 179, 8, 0.06)", border: "1px solid rgba(234, 179, 8, 0.2)", borderRadius: "10px", padding: "12px 16px", textAlign: "left" }}>
                        <AlertTriangle size={20} style={{ color: "#eab308", flexShrink: 0, marginTop: "2px" }} />
                        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                          <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "2px" }}>Note on importing questions via CSV:</strong>
                          CSV questions only support a single correct answer and explanation (Exam format). For richer per-wrong-option explanations, use the existing <strong>Import Qs (.docx)</strong> button inside the exam builder after creating the exam.
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(110, 63, 243, 0.06)", border: "1px solid rgba(110, 63, 243, 0.2)", borderRadius: "10px", padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FileText size={18} style={{ color: "var(--violet)" }} />
                          <div style={{ textAlign: "left" }}>
                            <span style={{ fontSize: "12.5px", fontWeight: "700", display: "block", color: "var(--text-primary)" }}>Need the CSV structure template?</span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Download the recommended structure template</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={downloadCSVEmailTemplate}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--violet)",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer"
                          }}
                        >
                          Download Template
                        </button>
                      </div>
                    </div>
                  )}

                  {csvStep === "preview" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <h4 style={{ margin: 0, color: "var(--text-primary)", textAlign: "left" }}>Bulk Upload Preview</h4>

                      {/* Conflict settings */}
                      <div style={{ backgroundColor: "var(--bg-sidebar)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "14px 16px", textAlign: "left" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", display: "block", marginBottom: "8px", color: "var(--text-primary)" }}>
                          If an Exam Code already exists:
                        </span>
                        <div style={{ display: "flex", gap: "16px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", color: "var(--text-secondary)" }}>
                            <input
                              type="radio"
                              name="importMode"
                              value="skip"
                              checked={importMode === "skip"}
                              onChange={() => setImportMode("skip")}
                              style={{ width: "auto", height: "auto" }}
                            />
                            Skip Import
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", color: "var(--text-secondary)" }}>
                            <input
                              type="radio"
                              name="importMode"
                              value="update"
                              checked={importMode === "update"}
                              onChange={() => setImportMode("update")}
                              style={{ width: "auto", height: "auto" }}
                            />
                            Update Existing
                          </label>
                        </div>
                      </div>

                      {/* Validation / Errors Summary */}
                      {csvParsed.errors.length > 0 && (
                        <div style={{ border: "1px solid #fecaca", backgroundColor: "rgba(239, 68, 68, 0.05)", borderRadius: "10px", padding: "12px 16px", textAlign: "left" }}>
                          <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                            ⚠ CSV Validation Errors ({csvParsed.errors.length}):
                          </span>
                          <div style={{ maxHeight: "80px", overflowY: "auto", fontSize: "11.5px", color: "#f87171" }}>
                            {csvParsed.errors.map((err, index) => (
                              <div key={index}>• {err}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Exams list preview */}
                      <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "10px", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "var(--bg-page)" }}>
                        {csvParsed.exams.map((exam) => {
                          const isDuplicate = quizzes.some(q => (q.examCode || "").trim().toLowerCase() === exam.examCode.toLowerCase() && !q.isDeleted);
                          const hasErrors = exam.errors.length > 0;
                          return (
                            <div key={exam.examCode} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "10px", textAlign: "left" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <strong style={{ fontSize: "13.5px", color: hasErrors ? "#ef4444" : "var(--text-primary)" }}>
                                  {hasErrors ? "✗ " : "✓ "} {exam.examName} ({exam.examCode})
                                </strong>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize", padding: "2px 8px", backgroundColor: "var(--bg-sidebar)", borderRadius: "100px" }}>
                                  {exam.sectionMode} Mode
                                </span>
                              </div>
                              <div style={{ paddingLeft: "16px", fontSize: "12px", marginTop: "4px", color: "var(--text-secondary)" }}>
                                {exam.rows.map((r, i) => (
                                  <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>• Subject: {r.subject}</span>
                                    {exam.sectionMode === "multi" && (
                                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                        Section: {r.sectionName}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {isDuplicate && (
                                <div style={{ color: "#eab308", fontSize: "11px", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <AlertTriangle size={12} /> Already exists (will be {importMode === "skip" ? "skipped" : "updated"})
                                </div>
                              )}
                              {exam.errors.map((err, i) => (
                                <div key={i} style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px" }}>
                                  ✗ {err}
                                </div>
                              ))}
                              {exam.warnings.map((warn, i) => (
                                <div key={i} style={{ color: "#eab308", fontSize: "11px", marginTop: "4px" }}>
                                  ⚠ {warn}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
                        <span>Ready to Import: {csvParsed.exams.filter(e => e.errors.length === 0).length} Exams</span>
                        {csvParsed.exams.some(e => e.errors.length > 0) && (
                          <span style={{ color: "#ef4444" }}>Errors block import for those exams</span>
                        )}
                      </div>
                    </div>
                  )}

                  {csvStep === "result" && csvResult && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div style={{ textAlign: "center", padding: "10px 0" }}>
                        <CheckCircle size={50} style={{ color: "#22c55e", marginBottom: "12px" }} />
                        <h4 style={{ margin: "0 0 4px 0", color: "var(--text-primary)" }}>Bulk Import Complete</h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                          {csvResult.message}
                        </p>
                      </div>

                      <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "10px", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "var(--bg-page)" }}>
                        {importedExamsList.map((exam) => (
                          <div key={exam.examCode || exam._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "var(--bg-sidebar)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                            <div style={{ textAlign: "left" }}>
                              <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text-primary)", display: "block" }}>
                                {exam.examName}
                              </span>
                              <span style={{ fontSize: "11px", color: "var(--violet)", fontWeight: "600" }}>
                                Code: {exam.examCode} • ⚠ Needs Configuration
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                closeImportModal();
                                if (exam.isModular || exam.sectionMode === "multi") {
                                  navigate(`/admin/edit-quiz-multi/${exam._id}`);
                                } else {
                                  navigate(`/admin/edit-quiz/${exam._id}`);
                                }
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                backgroundColor: "var(--violet)",
                                color: "#fff",
                                border: "none",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer"
                              }}
                            >
                              Configure Exam
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer" style={{ padding: "20px 30px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  {csvStep === "preview" && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setCsvStep("upload")}
                      style={{ padding: "10px 20px", borderRadius: "10px", minHeight: "38px", cursor: "pointer" }}
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeImportModal}
                    style={{ padding: "10px 20px", borderRadius: "10px", minHeight: "38px", cursor: "pointer" }}
                  >
                    {csvStep === "result" ? "Close" : "Cancel"}
                  </button>
                  {csvStep === "preview" && (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={csvImporting || csvParsed.exams.filter(e => e.errors.length === 0).length === 0}
                      onClick={handleCSVImportSubmit}
                      style={{ padding: "10px 20px", borderRadius: "10px", backgroundColor: "var(--violet)", color: "#fff", border: "none", minHeight: "38px", cursor: "pointer" }}
                    >
                      {csvImporting ? "Importing..." : "Confirm Import"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── DATA TABLE ─── */}
          <div className="armored-admin-card" style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", padding: 0, overflowX: "auto", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
            {loading ? (
              <div style={{ padding: "64px 20px", textAlign: "center", color: "var(--text-secondary)", fontSize: "15px" }}>
                ⏳ Loading quizzes from database...
              </div>
            ) : isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
                {filteredQuizzes.length > 0 ? (
                  filteredQuizzes.map((quiz) => {
                    const isMine = checkIsMine(quiz);
                    const creatorName = quiz.createdBy?.fullName || "Staff Account";
                    const firstLetter = creatorName.charAt(0).toUpperCase() || "S";
                    const colors = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
                    const charCode = creatorName.charCodeAt(0) || 0;
                    const bgColor = colors[charCode % colors.length];

                    return (
                      <div key={quiz._id} style={{ 
                        backgroundColor: "var(--bg-card)", 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "12px", 
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        position: "relative"
                      }}>
                        {/* Title and Badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
                            <span style={{ fontSize: "11px", color: "var(--violet)", fontWeight: "700" }}>{quiz.examName || "—"} • {quiz.subject}</span>
                            <strong style={{ fontSize: "15px", color: "var(--text-primary)" }}>{quiz.title}</strong>
                          </div>
                          
                          {/* Actions button */}
                          <div style={{ position: "relative" }}>
                            <button 
                              onClick={(e) => {
                                if (activeDropdown === quiz._id) {
                                  setActiveDropdown(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setDropdownPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                                  setActiveDropdown(quiz._id);
                                }
                              }}
                              style={{ 
                                background: "transparent", 
                                border: "none", 
                                color: "var(--text-primary)", 
                                fontSize: "18px", 
                                fontWeight: "bold",
                                cursor: "pointer", 
                                outline: "none"
                              }}
                            >
                              ⋮
                            </button>
                            {activeDropdown === quiz._id && (
                              <>
                                <div onClick={() => setActiveDropdown(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: "transparent" }} />
                                <div style={{ 
                                  position: "fixed", 
                                  top: `${dropdownPos.top}px`,
                                  right: `${dropdownPos.right}px`, 
                                  backgroundColor: "var(--bg-card)", 
                                  border: "1.5px solid var(--border-color)", 
                                  borderRadius: "10px", 
                                  padding: "6px 0", 
                                  minWidth: "130px", 
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)", 
                                  zIndex: 9999,
                                  textAlign: "left"
                                }}>
                                  {viewMode === "active" ? (
                                    <>
                                      <div onClick={() => { setActiveDropdown(null); navigate(`/quiz/${quiz._id}?preview=true`, { state: { subject: quiz.subject, title: quiz.title } }); }} style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }} onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"} onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}><Eye size={15} /> Preview</div>
                                      <div onClick={() => { setActiveDropdown(null); handleDuplicateQuiz(quiz._id); }} style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }} onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"} onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}><Copy size={15} /> Duplicate Quiz</div>
                                      {(() => {
                                        const hasEditPermission = isMine || role === "superadmin" || hasPermission("edit_others_quizzes") || hasPermission("manage_all_quizzes");
                                        if (!hasEditPermission) return null;
                                        return (
                                          <>
                                            <div onClick={() => { setActiveDropdown(null); navigate(quiz.sections && quiz.sections.length > 1 ? `/admin/edit-quiz-multi/${quiz._id}` : `/admin/edit-quiz/${quiz._id}`); }} style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}><Edit2 size={15} /> Edit</div>
                                            <div onClick={() => { setActiveDropdown(null); handleDelete(quiz._id, quiz.title); }} style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--red)", display: "flex", alignItems: "center", gap: "8px" }}><Trash2 size={15} /> Delete</div>
                                          </>
                                        );
                                      })()}
                                    </>
                                  ) : (
                                    <>
                                      <div onClick={() => { setActiveDropdown(null); handleRestore(quiz._id, quiz.title); }} style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}><Eye size={15} /> Restore</div>
                                      <div onClick={() => { setActiveDropdown(null); handlePermanentDelete(quiz._id, quiz.title); }} style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--red)", display: "flex", alignItems: "center", gap: "8px" }}><Trash2 size={15} /> Delete Permanently</div>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Mid Section: Created By & Date */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", padding: "10px 0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: bgColor, color: "#fff", display: "flex", alignItems: "center", justifyContext: "center", fontSize: "11px", fontWeight: "bold" }}>
                              {firstLetter}
                            </div>
                            <span style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)" }}>
                              {isMine ? "You" : creatorName}
                            </span>
                          </div>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "500" }}>
                            {new Date(quiz.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        {/* Bottom Row: Type & Status */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", backgroundColor: "var(--bg-sidebar)", padding: "4px 10px", borderRadius: "6px" }}>
                            {quiz.quizType === "practice" ? "Practice Set" : (quiz.sections && quiz.sections.length > 1 ? "Full Length" : "Sectional")}
                          </span>
                          <span style={{
                            backgroundColor: quiz.status === "Published" ? "#E4F8F0" : "#F1F5F9",
                            color: quiz.status === "Published" ? "#10B981" : "#475569",
                            padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700"
                          }}>
                            {quiz.status || "Draft"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                    📭 No matching quizzes found.
                  </div>
                )}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-page)", borderBottom: "1.5px solid var(--border-color)", fontSize: "11px", color: "var(--text-primary)", textTransform: "uppercase" }}>
                    {ownershipTab !== "mine" && <th style={{ padding: "18px 28px", fontWeight: "700" }}>Created By</th>}
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Exam</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Subject</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Title</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Created On</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Type</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Status</th>
                    <th style={{ padding: "18px 28px", fontWeight: "700", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="report-table-body">
                  {filteredQuizzes.length > 0 ? (
                    filteredQuizzes.map((quiz) => (
                      <tr key={quiz._id} style={{ borderBottom: "1px solid var(--border-color)", fontSize: "14px" }}>
                        
                        {ownershipTab !== "mine" && (
                          <td style={{ padding: "18px 28px", whiteSpace: "nowrap" }}>
                            {(() => {
                              const isMine = checkIsMine(quiz);
                              const creatorName = quiz.createdBy?.fullName || "System Admin";
                              const firstLetter = creatorName.charAt(0).toUpperCase();
                              const colors = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
                              const charCode = creatorName.charCodeAt(0) || 0;
                              const bgColor = colors[charCode % colors.length];
                              return (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{
                                    width: "26px",
                                    height: "26px",
                                    borderRadius: "50%",
                                    backgroundColor: bgColor,
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    textTransform: "uppercase"
                                  }}>
                                    {firstLetter}
                                  </div>
                                  <span style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "13.5px" }}>
                                    {isMine ? "You" : creatorName}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                        )}

                        <td style={{ padding: "18px 24px", fontWeight: "700", color: "var(--violet)", whiteSpace: "nowrap" }}>
                          {quiz.examName || "—"}
                        </td>
                        
                        <td style={{ padding: "18px 24px", color: "var(--text-secondary)", fontWeight: "600", whiteSpace: "nowrap" }}>
                          {quiz.subject}
                        </td>
                        
                        <td style={{ padding: "18px 24px", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {quiz.title}
                            {(quiz.sections && quiz.sections.length > 1) ? (
                              <span style={{ fontSize: "10px", backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#3B82F6", border: "1px solid #3B82F6", padding: "2px 6px", borderRadius: "4px", fontWeight: "700", textTransform: "uppercase" }}>Multi</span>
                            ) : (
                              <span style={{ fontSize: "10px", backgroundColor: "rgba(139, 92, 246, 0.2)", color: "#8B5CF6", border: "1px solid #8B5CF6", padding: "2px 6px", borderRadius: "4px", fontWeight: "700", textTransform: "uppercase" }}>Single</span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: "18px 24px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "13.5px", whiteSpace: "nowrap" }}>
                          {new Date(quiz.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>

                        <td style={{ padding: "18px 24px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "13.5px", whiteSpace: "nowrap" }}>
                          {quiz.quizType === "practice" ? "Practice Set" : (quiz.sections && quiz.sections.length > 1 ? "Full Length" : "Sectional")}
                        </td>
                        
                        <td style={{ padding: "18px 24px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{
                              backgroundColor: 
                                quiz.status === "Published" ? "#E4F8F0" : 
                                quiz.status === "Scheduled" ? "#EFF6FF" : "#F1F5F9",
                              color: 
                                quiz.status === "Published" ? "#10B981" : 
                                quiz.status === "Scheduled" ? "#3B82F6" : "#475569",
                              padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", display: "inline-block", width: "max-content"
                            }}>
                              {quiz.status || "Draft"}
                            </span>
                            {quiz.scheduledDate && (
                              <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600" }}>
                                {new Date(quiz.scheduledDate).toLocaleDateString('en-GB').replace(/\//g, '-')}, {new Date(quiz.scheduledDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: "18px 28px", textAlign: "right", overflow: "visible", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", position: "relative" }}>
                            <button 
                              onClick={(e) => {
                                if (activeDropdown === quiz._id) {
                                  setActiveDropdown(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setDropdownPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                                  setActiveDropdown(quiz._id);
                                }
                              }}
                              style={{ 
                                background: "transparent", 
                                border: "none", 
                                color: "var(--text-primary)", 
                                fontSize: "18px", 
                                fontWeight: "bold",
                                cursor: "pointer", 
                                padding: "4px 12px",
                                outline: "none"
                              }}
                              title="Quiz Actions"
                            >
                              ⋮
                            </button>
                            
                            {activeDropdown === quiz._id && (
                              <>
                                {/* Global backdrop to dismiss dropdown on outer click */}
                                <div 
                                  onClick={() => setActiveDropdown(null)}
                                  style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: "transparent" }}
                                />
                                
                                {/* Floating context dropdown menu */}
                                <div style={{ 
                                  position: "fixed", 
                                  top: `${dropdownPos.top}px`,
                                  right: `${dropdownPos.right}px`, 
                                  backgroundColor: "var(--bg-card)", 
                                  border: "1.5px solid var(--border-color)", 
                                  borderRadius: "10px", 
                                  padding: "6px 0", 
                                  minWidth: "130px", 
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)", 
                                  zIndex: 9999,
                                  textAlign: "left"
                                }}>
                                  {viewMode === "active" ? (
                                    <>
                                      <div 
                                        style={{ position: "relative" }}
                                        onMouseEnter={() => setShowPreviewSubmenu(quiz._id)}
                                        onMouseLeave={() => setShowPreviewSubmenu(null)}
                                      >
                                        <div 
                                          style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}
                                          onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px", pointerEvents: "none" }}>
                                            <Eye size={15} /> Preview
                                          </div>
                                          <span style={{ fontSize: "9px", color: "var(--text-secondary)", pointerEvents: "none" }}>▶</span>
                                        </div>

                                        {showPreviewSubmenu === quiz._id && (
                                          <div style={{ 
                                            position: "absolute", 
                                            left: "-135px", 
                                            top: "0px",
                                            backgroundColor: "var(--bg-card)", 
                                            border: "1.5px solid var(--border-color)", 
                                            borderRadius: "10px", 
                                            padding: "6px 0", 
                                            minWidth: "130px", 
                                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", 
                                            zIndex: 99999,
                                            textAlign: "left"
                                          }}>
                                            <div 
                                              onClick={() => { 
                                                setActiveDropdown(null); 
                                                setShowPreviewSubmenu(null);
                                                navigate(`/quiz/${quiz._id}?preview=true`, { state: { subject: quiz.subject, title: quiz.title, duration: quiz.duration, examName: quiz.examName } }); 
                                              }}
                                              style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s" }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                            >
                                              Preview Exam
                                            </div>
                                            <div 
                                              onClick={() => { 
                                                setActiveDropdown(null); 
                                                setShowPreviewSubmenu(null);
                                                navigate(`/dashboard/practice/test/${quiz._id}?preview=true`, { state: { subject: quiz.subject, title: quiz.title, duration: quiz.duration, examName: quiz.examName } }); 
                                              }}
                                              style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s" }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                            >
                                              Preview Practice
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Duplicate Quiz */}
                                      <div 
                                        onClick={() => { setActiveDropdown(null); handleDuplicateQuiz(quiz._id); }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                      >
                                        <Copy size={15} /> Duplicate Quiz
                                      </div>

                                      {(() => {
                                        const isMine = checkIsMine(quiz);
                                        const hasEditPermission = isMine || role === "superadmin" || hasPermission("edit_others_quizzes") || hasPermission("manage_all_quizzes");
                                        if (!hasEditPermission) return null;
                                        return (
                                          <>
                                            <div 
                                              onClick={() => { 
                                                setActiveDropdown(null); 
                                                if (quiz.sections && quiz.sections.length > 1) {
                                                  navigate(`/admin/edit-quiz-multi/${quiz._id}`);
                                                } else {
                                                  navigate(`/admin/edit-quiz/${quiz._id}`); 
                                                }
                                              }}
                                              style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                            >
                                              <Edit2 size={15} /> Edit
                                            </div>
                                            {!(quiz.sections && quiz.sections.length > 1) && (
                                            <div 
                                              onClick={() => { 
                                                setActiveDropdown(null); 
                                                navigate(`/admin/edit-quiz-multi/${quiz._id}`);
                                              }}
                                              style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                            >
                                              <Edit2 size={15} /> Edit as Multi
                                            </div>
                                            )}
                                            <div 
                                              onClick={() => { 
                                                setActiveDropdown(null); 
                                                if (quiz.sections && quiz.sections.length > 1) {
                                                  navigate(`/admin/edit-quiz-multi/${quiz._id}`);
                                                } else {
                                                  navigate(`/admin/edit-quiz/${quiz._id}`); 
                                                }
                                              }}
                                              style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                            >
                                              <Calendar size={15} /> Schedule
                                            </div>
                                            {quiz.status === "Published" || quiz.published ? (
                                              <div 
                                                onClick={async () => {
                                                   setActiveDropdown(null);
                                                   const isConfirmed = await confirm({
                                                     title: "Unpublish Assessment?",
                                                     message: `Are you sure you want to unpublish "${quiz.title}"? Students will no longer see it.`,
                                                     type: "warning",
                                                     confirmText: "Unpublish",
                                                   });
                                                   if (isConfirmed) {
                                                     try {
                                                       const token = localStorage.getItem("token");
                                                       await axios.put(`${import.meta.env.VITE_API_URL}/api/quizzes/${quiz._id}`, { published: false, status: "Draft" }, { headers: { Authorization: `Bearer ${token}` }});
                                                       fetchQuizzes();
                                                     } catch (error) { console.error("Failed to unpublish", error); }
                                                   }
                                                 }}
                                                style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                              >
                                                <EyeOff size={15} /> Unpublish
                                              </div>
                                            ) : (
                                              <div 
                                                onClick={async () => {
                                                  setActiveDropdown(null);
                                                  try {
                                                    const token = localStorage.getItem("token");
                                                    await axios.put(`${import.meta.env.VITE_API_URL}/api/quizzes/${quiz._id}`, { published: true, status: "Published", scheduledDate: null }, { headers: { Authorization: `Bearer ${token}` }});
                                                    fetchQuizzes();
                                                  } catch (error) { console.error("Failed to publish", error); }
                                                }}
                                                style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                              >
                                                <UploadCloud size={15} /> Publish
                                              </div>
                                            )}
                                            {quiz.sections && quiz.sections.length > 0 && (
                                              <div 
                                                onClick={() => { setActiveDropdown(null); setSelectedExportQuiz(quiz); }}
                                                style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                              >
                                                <Copy size={15} /> Duplicate Section
                                              </div>
                                            )}
                                            <div 
                                              onClick={() => { setActiveDropdown(null); handleDelete(quiz._id, quiz.title); }}
                                              style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--red)", transition: "background 0.15s", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(226, 67, 107, 0.08)"}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                            >
                                              <Trash2 size={15} /> Delete
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </>
                                  ) : (
                                    <>
                                      <div 
                                        onClick={() => { setActiveDropdown(null); handleRestore(quiz._id, quiz.title); }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                      >
                                        <Eye size={15} /> Restore
                                      </div>
                                      <div 
                                        onClick={() => { setActiveDropdown(null); handlePermanentDelete(quiz._id, quiz.title); }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--red)", transition: "background 0.15s", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(226, 67, 107, 0.08)"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                      >
                                        <Trash2 size={15} /> Delete Permanently
                                      </div>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ padding: "64px 20px", textAlign: "center" }}>
                        {ownershipTab === "mine" ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "28px" }}>📭</span>
                            <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "16px", fontWeight: "700" }}>No quizzes created yet</h4>
                            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13.5px" }}>You haven't created any quizzes. Create your first quiz to see it here.</p>
                            <button
                              onClick={() => navigate('/admin/create-quiz')}
                              style={{
                                padding: "8px 16px",
                                borderRadius: "8px",
                                backgroundColor: "var(--violet)",
                                color: "#fff",
                                border: "none",
                                fontWeight: "700",
                                fontSize: "13.0px",
                                cursor: "pointer",
                                marginTop: "8px"
                              }}
                            >
                              + Create Quiz
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "15px" }}>
                            📭 No matching quizzes found.
                          </span>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Export Section Modal */}
          {selectedExportQuiz && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "16px",
                padding: "24px",
                width: "90%",
                maxWidth: "500px",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
              }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>Create Standalone Quiz from Section</h3>
                <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                  Select a section from <strong>{selectedExportQuiz.title}</strong> to create a new standalone, draft quiz.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "250px", overflowY: "auto", marginBottom: "24px" }}>
                  {selectedExportQuiz.sections.map((sec) => {
                    const sectionData = sec.sectionId;
                    if (!sectionData) return null;
                    const secId = sectionData._id || sectionData;
                    return (
                      <div key={secId} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        backgroundColor: "var(--bg-sidebar)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "10px",
                        gap: "12px"
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{sectionData.title}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "capitalize" }}>
                            {sectionData.type} Section • {
                              sectionData.type === 'coding' && sectionData.subsections ? (
                                ((sectionData.subsections.easy?.length || 0) + (sectionData.subsections.medium?.length || 0) + (sectionData.subsections.hard?.length || 0))
                              ) : (
                                sectionData.questions?.length || 0
                              )
                            } Questions
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem("token");
                              await axios.post(
                                `${import.meta.env.VITE_API_URL}/api/quizzes/export-section`,
                                { quizId: selectedExportQuiz._id, sectionId: secId },
                                { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                              );
                              alert(`Successfully created "${sectionData.title}" as standalone quiz.`);
                              setSelectedExportQuiz(null);
                              fetchQuizzes();
                            } catch (err) {
                              console.error(err);
                              alert(err.response?.data?.message || "Failed to create standalone quiz.");
                            }
                          }}
                          style={{
                            padding: "8px 14px",
                            borderRadius: "8px",
                            backgroundColor: "var(--violet)",
                            color: "#fff",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "opacity 0.2s"
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.target.style.opacity = "1"}
                        >
                          Create Standalone
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setSelectedExportQuiz(null)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      backgroundColor: "transparent",
                      border: "1.5px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default ManageQuizzes;