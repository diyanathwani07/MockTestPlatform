import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Search, Check, BookOpen, Loader2, ChevronLeft, ChevronRight, Layers, BookMarked } from "lucide-react";
import { useExam } from "../context/ExamContext";

export default function ChangeExamModal() {
  const {
    isChangeExamOpen,
    closeChangeExamModal,
    selectedExam,
    selectedStructure,
    selectedSubject,
    setFullExamSelection,
  } = useExam();

  // Step: 1 = pick exam, 2 = pick structure, 3 = pick subject
  const [step, setStep] = useState(1);
  const [examSeriesList, setExamSeriesList] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [structureLoading, setStructureLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  // Transient selections (before confirm)
  const [pickedExam, setPickedExam] = useState(null);
  const [pickedStructure, setPickedStructure] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isChangeExamOpen) {
      setStep(1);
      setSearchQuery("");
      setError("");
      setPickedExam(null);
      setPickedStructure(null);
      setStructures([]);
      fetchSeries();
    }
  }, [isChangeExamOpen]);

  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

  const fetchSeries = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${baseUrl}/api/exam-series`);
      const published = (Array.isArray(res.data) ? res.data : []).filter((s) => s.isPublished !== false);
      setExamSeriesList(published);
    } catch (err) {
      console.error("Failed to fetch exam series list:", err);
      setError("Failed to load exam series. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStructures = async (examId) => {
    setStructureLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/api/exam-structures?examSeriesId=${examId}`);
      const list = Array.isArray(res.data) ? res.data : [];
      // Only show active structures with active subjects
      const active = list.filter((s) => s.isActive !== false);
      setStructures(active);
      return active;
    } catch (err) {
      console.error("Failed to fetch structures:", err);
      setStructures([]);
      return [];
    } finally {
      setStructureLoading(false);
    }
  };

  if (!isChangeExamOpen) return null;

  // ─── Step 1: Pick exam ───
  const handleSelectExam = async (series) => {
    setPickedExam(series);
    // Fetch structures for this exam
    const structs = await fetchStructures(series._id);
    if (structs.length === 0) {
      // No structures → confirm immediately with just exam
      setFullExamSelection({ exam: series, structure: null, subject: null });
      closeChangeExamModal();
    } else {
      setStep(2);
    }
  };

  // ─── Step 2: Pick structure or "All" ───
  const handleSelectStructure = (structure) => {
    if (structure === null) {
      // "All Structures" — confirm with just exam
      setFullExamSelection({ exam: pickedExam, structure: null, subject: null });
      closeChangeExamModal();
      return;
    }
    setPickedStructure(structure);
    // Check if structure has subjects
    const subjects = (structure.subjects || []).filter((s) => s.isActive !== false);
    if (subjects.length === 0) {
      // No subjects → confirm with exam + structure
      setFullExamSelection({ exam: pickedExam, structure, subject: null });
      closeChangeExamModal();
    } else {
      setStep(3);
    }
  };

  // ─── Step 3: Pick subject or "All" ───
  const handleSelectSubject = (subjectName) => {
    setFullExamSelection({
      exam: pickedExam,
      structure: pickedStructure,
      subject: subjectName, // null means "All Subjects"
    });
    closeChangeExamModal();
  };

  const handleBack = () => {
    if (step === 3) {
      setPickedStructure(null);
      setStep(2);
    } else if (step === 2) {
      setPickedExam(null);
      setStructures([]);
      setStep(1);
    }
  };

  const filteredExamList = examSeriesList.filter(
    (s) =>
      (s.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStepTitle = () => {
    if (step === 1) return "Select Your Target Exam";
    if (step === 2) return `${pickedExam?.title} — Select Structure`;
    if (step === 3) return `${pickedStructure?.name} — Select Subject`;
    return "Select Exam";
  };

  const getStepSubtitle = () => {
    if (step === 1) return "Filter dashboard tests & practice content by exam";
    if (step === 2) return "Choose a paper, level, or post structure";
    if (step === 3) return "Narrow down to a specific subject";
    return "";
  };

  const activeSubjects = step === 3 && pickedStructure
    ? (pickedStructure.subjects || []).filter((s) => s.isActive !== false)
    : [];

  return (
    <div
      className="avatar-modal-overlay"
      onClick={closeChangeExamModal}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 10, 20, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999999,
        padding: "16px",
      }}
    >
      <div
        className="avatar-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card, #131428)",
          border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.1))",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {step > 1 && (
              <button
                onClick={handleBack}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "none",
                  color: "var(--text-secondary, #94a3b8)",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: step === 1
                  ? "rgba(110, 63, 243, 0.15)"
                  : step === 2
                  ? "rgba(59, 130, 246, 0.15)"
                  : "rgba(16, 185, 129, 0.15)",
                color: step === 1
                  ? "var(--violet, #6E3FF3)"
                  : step === 2
                  ? "#3B82F6"
                  : "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {step === 1 ? <BookOpen size={20} /> : step === 2 ? <Layers size={20} /> : <BookMarked size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary, #ffffff)" }}>
                {getStepTitle()}
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary, rgba(255, 255, 255, 0.6))" }}>
                {getStepSubtitle()}
              </p>
            </div>
          </div>
          <button
            onClick={closeChangeExamModal}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary, #94a3b8)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{ padding: "12px 24px 4px 24px", display: "flex", alignItems: "center", gap: "8px" }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: "3px",
                borderRadius: "2px",
                background: s <= step
                  ? "var(--violet, #6E3FF3)"
                  : "var(--border-color, rgba(255, 255, 255, 0.1))",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Search Input — only on Step 1 */}
        {step === 1 && (
          <div style={{ padding: "12px 24px 8px 24px" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  color: "var(--text-muted, #64748b)",
                }}
              />
              <input
                type="text"
                placeholder="Search exam (e.g. UPTET, CTET, SSC CGL)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 42px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                  background: "var(--bg-input, rgba(255, 255, 255, 0.05))",
                  color: "var(--text-primary, #ffffff)",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div
          style={{
            padding: "8px 24px 20px 24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* ─── STEP 1: EXAM LIST ─── */}
          {step === 1 && (
            <>
              {loading ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-secondary)" }}>
                  <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px auto", color: "var(--violet, #6E3FF3)" }} />
                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                  <p style={{ margin: 0, fontSize: "14px" }}>Loading exam series...</p>
                </div>
              ) : error ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#ef4444", fontSize: "14px" }}>{error}</div>
              ) : filteredExamList.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
                  No exam series found matching &quot;{searchQuery}&quot;.
                </div>
              ) : (
                <>
                  <div
                    onClick={() => {
                      setFullExamSelection({ exam: null, structure: null, subject: null });
                      closeChangeExamModal();
                    }}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: !selectedExam
                        ? "1.5px solid var(--violet, #6E3FF3)"
                        : "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                      background: !selectedExam
                        ? "rgba(110, 63, 243, 0.12)"
                        : "var(--bg-input, rgba(255, 255, 255, 0.03))",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "rgba(110, 63, 243, 0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Layers size={20} color="#6E3FF3" />
                      </div>
                      <div>
                        <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "700", color: "var(--text-primary, #ffffff)" }}>
                          All Exams
                        </h4>
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary, rgba(255,255,255,0.6))" }}>
                          View content for all exams
                        </p>
                      </div>
                    </div>
                    {!selectedExam ? (
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--violet, #6E3FF3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={14} color="white" strokeWidth={3} />
                      </div>
                    ) : (
                      <ChevronRight size={18} color="var(--text-muted, #64748b)" />
                    )}
                  </div>
                  
                  {filteredExamList.map((series) => {
                  const isSelected = selectedExam && selectedExam._id === series._id;
                  return (
                    <div
                      key={series._id}
                      onClick={() => handleSelectExam(series)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        border: isSelected
                          ? "1.5px solid var(--violet, #6E3FF3)"
                          : "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                        background: isSelected
                          ? "rgba(110, 63, 243, 0.12)"
                          : "var(--bg-input, rgba(255, 255, 255, 0.03))",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "var(--bg-input, rgba(255, 255, 255, 0.03))";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: "rgba(255, 255, 255, 0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                          }}
                        >
                          {series.icon || "📚"}
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-primary, #ffffff)" }}>
                            {series.title}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary, rgba(255, 255, 255, 0.6))", marginTop: "2px" }}>
                            Category: {series.category || "General"}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isSelected && (
                          <div
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              background: "var(--violet, #6E3FF3)",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Check size={14} />
                          </div>
                        )}
                        <ChevronRight size={16} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                      </div>
                    </div>
                  );
                })}
                </>
              )}
            </>
          )}

          {/* ─── STEP 2: STRUCTURE LIST ─── */}
          {step === 2 && (
            <>
              {structureLoading ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-secondary)" }}>
                  <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px auto", color: "#3B82F6" }} />
                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                  <p style={{ margin: 0, fontSize: "14px" }}>Loading structures...</p>
                </div>
              ) : (
                <>
                  {/* "All Structures" option */}
                  <div
                    onClick={() => handleSelectStructure(null)}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                      background: "rgba(59, 130, 246, 0.08)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(59, 130, 246, 0.08)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#3B82F6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Layers size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-primary, #ffffff)" }}>
                          All Structures
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary, rgba(255, 255, 255, 0.6))", marginTop: "2px" }}>
                          Show content across all papers/levels
                        </div>
                      </div>
                    </div>
                  </div>

                  {structures.map((structure) => {
                    const isSelected = selectedStructure && selectedStructure._id === structure._id;
                    const subjectCount = (structure.subjects || []).filter((s) => s.isActive !== false).length;
                    return (
                      <div
                        key={structure._id}
                        onClick={() => handleSelectStructure(structure)}
                        style={{
                          padding: "14px 16px",
                          borderRadius: "12px",
                          border: isSelected
                            ? "1.5px solid #3B82F6"
                            : "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                          background: isSelected
                            ? "rgba(59, 130, 246, 0.12)"
                            : "var(--bg-input, rgba(255, 255, 255, 0.03))",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "var(--bg-input, rgba(255, 255, 255, 0.03))";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "10px",
                              background: "rgba(255, 255, 255, 0.05)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "18px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <Layers size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-primary, #ffffff)" }}>
                              {structure.name}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary, rgba(255, 255, 255, 0.6))", marginTop: "2px" }}>
                              {subjectCount} {subjectCount === 1 ? "subject" : "subjects"}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {isSelected && (
                            <div
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                background: "#3B82F6",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Check size={14} />
                            </div>
                          )}
                          {subjectCount > 0 && (
                            <ChevronRight size={16} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* ─── STEP 3: SUBJECT LIST ─── */}
          {step === 3 && (
            <>
              {/* "All Subjects" option */}
              <div
                onClick={() => handleSelectSubject(null)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                  background: "rgba(16, 185, 129, 0.08)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10B981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BookMarked size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-primary, #ffffff)" }}>
                      All Subjects
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary, rgba(255, 255, 255, 0.6))", marginTop: "2px" }}>
                      Show content across all subjects in {pickedStructure?.name}
                    </div>
                  </div>
                </div>
              </div>

              {activeSubjects.map((subject) => {
                const isSelected = selectedSubject === subject.name;
                return (
                  <div
                    key={subject.name}
                    onClick={() => handleSelectSubject(subject.name)}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: isSelected
                        ? "1.5px solid #10B981"
                        : "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                      background: isSelected
                        ? "rgba(16, 185, 129, 0.12)"
                        : "var(--bg-input, rgba(255, 255, 255, 0.03))",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "var(--bg-input, rgba(255, 255, 255, 0.03))";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <BookMarked size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-primary, #ffffff)" }}>
                          {subject.name}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "#10B981",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
