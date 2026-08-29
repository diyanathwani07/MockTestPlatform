import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FileText, BarChart3 } from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css"; // Reuse premium dashboard themes
import MuiDatePicker from "../components/MuiDatePicker";

const CreateCustomQuiz = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [quizType, setQuizType] = useState("exam"); // "exam" or "practice"
  const [loading, setLoading] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(true);
  const [previousQuizzes, setPreviousQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [fetchingPrevious, setFetchingPrevious] = useState(true);
  const [activeTab, setActiveTab] = useState("custom");
  const [selectedDate, setSelectedDate] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [filterMode, setFilterMode] = useState("all"); // "all", "practice", "exam"
  const navigate = useNavigate();

  // AI Test Builder States
  const [customMode, setCustomMode] = useState("manual"); // "manual" or "ai"
  const [premiumStatus, setPremiumStatus] = useState({ isPremium: false, aiCredits: 0 });
  const [fetchingPremium, setFetchingPremium] = useState(true);
  const [exams, setExams] = useState([]);
  const [examSubjects, setExamSubjects] = useState({});
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedAiSubject, setSelectedAiSubject] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuantity, setAiQuantity] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiLanguage, setAiLanguage] = useState("English + Hindi");
  const [followExamPattern, setFollowExamPattern] = useState(true);
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);
  const [aiLoadingSteps, setAiLoadingSteps] = useState({
    active: false,
    step: 0, // 0: preparando pattern, 1: generating, 2: validating
  });

  const getStableRank = (id) => {
    if (!id) return 1;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 50) + 1;
  };

  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/ai-tests/premium-status`,
          { headers }
        );
        setPremiumStatus(response.data);
      } catch (error) {
        console.error("Failed to fetch premium status:", error);
      } finally {
        setFetchingPremium(false);
      }
    };

    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/questions/subjects`,
          { headers }
        );
        setSubjects(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        setFetchingSubjects(false);
      }
    };

    const fetchExamsAndQuizzes = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/quizzes`,
          { headers }
        );
        const quizzesList = Array.isArray(response.data) ? response.data : [];
        
        // Extract unique exams and map subjects to exams
        const examsSet = new Set();
        const subjectsMap = {}; // examName -> Set of subjects
        
        quizzesList.forEach(q => {
          if (q.examName && q.examName.trim()) {
            const exName = q.examName.trim();
            examsSet.add(exName);
            if (!subjectsMap[exName]) {
              subjectsMap[exName] = new Set();
            }
            if (q.subject && q.subject.trim()) {
              subjectsMap[exName].add(q.subject.trim());
            }
          }
        });

        // Convert sets to arrays
        const finalExams = Array.from(examsSet);
        const finalSubjectsMap = {};
        Object.keys(subjectsMap).forEach(key => {
          finalSubjectsMap[key] = Array.from(subjectsMap[key]);
        });

        setExams(finalExams);
        setExamSubjects(finalSubjectsMap);

        // Fetch custom quizzes
        const responseCustom = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/quizzes?quizType=custom`,
          { headers }
        );
        setPreviousQuizzes(Array.isArray(responseCustom.data) ? responseCustom.data : []);

        // Fetch user results
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const resultsResponse = await axios.get(
            `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/results/${user.id || user._id}`,
            { headers }
          );
          setResults(Array.isArray(resultsResponse.data) ? resultsResponse.data : []);
        }
      } catch (error) {
        console.error("Failed to fetch quizzes or results:", error);
      } finally {
        setFetchingPrevious(false);
      }
    };

    fetchPremiumStatus();
    fetchSubjects();
    fetchExamsAndQuizzes();
  }, []);

  const handleCreate = async () => {
    if (!selectedSubject) {
      alert("Please select a subject.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/quizzes/custom`,
        {
          subject: selectedSubject,
          quantity: parseInt(quantity, 10),
          publishAs: quizType,
        },
        { headers }
      );
      const newQuiz = response.data;
      // Prepend to the list of previous custom tests
      setPreviousQuizzes(prev => [newQuiz, ...prev]);
      setSelectedSubject("");
      alert("Custom practice test created successfully! Start it from the list on the right.");
    } catch (error) {
      console.error("Failed to create custom quiz:", error);
      alert(error.response?.data?.message || "Failed to create custom quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAITest = async () => {
    setAiLoadingSteps({ active: true, step: 0 });
    
    // Simulate progression steps
    const timer1 = setTimeout(() => {
      setAiLoadingSteps(prev => ({ ...prev, step: 1 }));
    }, 1500);
    
    const timer2 = setTimeout(() => {
      setAiLoadingSteps(prev => ({ ...prev, step: 2 }));
    }, 4500);

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/ai-tests/generate`,
        {
          examName: selectedExam,
          subject: selectedAiSubject,
          topic: aiTopic,
          quantity: aiQuantity,
          difficulty: aiDifficulty,
          language: aiLanguage,
          followExamPattern,
          includeExplanations
        },
        { headers }
      );
      
      clearTimeout(timer1);
      clearTimeout(timer2);
      
      setPremiumStatus(prev => ({ ...prev, aiCredits: response.data.creditsRemaining }));
      setShowAiConfirmModal(false);
      setAiLoadingSteps({ active: false, step: 0 });
      
      // Fetch latest custom quizzes list
      const responseCustom = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/quizzes?quizType=custom`,
        { headers }
      );
      setPreviousQuizzes(Array.isArray(responseCustom.data) ? responseCustom.data : []);

      alert("AI Custom Test generated successfully! Starting your test now...");
      
      // Redirect directly to the existing test player
      navigate(`/quiz/${response.data.quizId}`);
    } catch (error) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      console.error("AI Generation Error:", error);
      alert(error.response?.data?.message || "Failed to generate AI custom test. Please try again.");
      setAiLoadingSteps({ active: false, step: 0 });
    }
  };

  const triggerDelete = (quizId) => {
    setQuizToDelete(quizId);
    setShowConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!quizToDelete) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
      const url = `${baseUrl}/api/quizzes/custom/${quizToDelete}`;
      console.log("DELETE custom quiz →", url);
      await axios.delete(url, { headers });
      setPreviousQuizzes(prev => prev.filter(q => q._id !== quizToDelete));
      setShowConfirmModal(false);
      setQuizToDelete(null);
    } catch (error) {
      console.error("Failed to delete custom quiz:", error);
      console.error("Response:", error.response?.status, error.response?.data);
      alert(error.response?.data?.message || "Failed to delete quiz.");
    }
  };

  const quantityOptions = [5, 10, 15, 20, 25, 30, 50];

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Custom Test" />
        
        <div className="sd-content" style={{ paddingTop: "20px", maxWidth: "100%" }}>
          {/* Navigation Tabs */}
          <div style={{ 
            display: "flex", 
            gap: "16px", 
            borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))", 
            marginBottom: "32px",
            paddingBottom: "12px",
            width: "100%"
          }}>
            <button 
              onClick={() => setActiveTab("custom")}
              style={{
                background: "none",
                border: "none",
                color: activeTab === "custom" ? "#9061F9" : "var(--text-muted, #777)",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
                padding: "8px 16px",
                borderBottom: activeTab === "custom" ? "3px solid #9061F9" : "3px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
            >
              <FileText size={18} />
              Custom Test
            </button>
            <button 
              onClick={() => setActiveTab("results")}
              style={{
                background: "none",
                border: "none",
                color: activeTab === "results" ? "#9061F9" : "var(--text-muted, #777)",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
                padding: "8px 16px",
                borderBottom: activeTab === "results" ? "3px solid #9061F9" : "3px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s"
              }}
            >
              <BarChart3 size={18} />
              Results
            </button>
          </div>

          {activeTab === "custom" ? (
            <div className="custom-quiz-container" style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start", width: "100%" }}>
              {/* Creation Card */}
              <div 
                className="sd-custom-quiz-card"
                style={{ 
                  background: "var(--bg-card, #131428)", 
                  border: "1px solid var(--border-color, rgba(255,255,255,0.08))", 
                  borderRadius: "16px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
                  width: "100%",
                  maxWidth: "430px",
                  padding: "24px",
                  margin: "0"
                }}
              >
                {/* Mode sub-toggles inside the card */}
                <div style={{ display: "flex", borderBottom: "1.5px solid var(--border-color, rgba(255,255,255,0.08))", marginBottom: "24px", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setCustomMode("manual")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "none",
                      border: "none",
                      borderBottom: customMode === "manual" ? "2.5px solid var(--violet, #9061F9)" : "2.5px solid transparent",
                      color: customMode === "manual" ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: "700",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    From Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomMode("ai")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "none",
                      border: "none",
                      borderBottom: customMode === "ai" ? "2.5px solid var(--violet, #9061F9)" : "2.5px solid transparent",
                      color: customMode === "ai" ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: "700",
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.2s"
                    }}
                  >
                    AI Test Builder <span style={{ fontSize: "11px", backgroundColor: "rgba(144, 97, 249, 0.15)", padding: "2px 6px", borderRadius: "8px", color: "#9061F9", fontWeight: "800" }}>🔒 Premium</span>
                  </button>
                </div>

                {customMode === "manual" ? (
                  <>
                    {/* Header block inside the card container */}
                    <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <h2 style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
                        Create Your Own Quiz
                      </h2>
                      <p style={{ color: "var(--text-muted)", fontSize: "13.5px", margin: 0 }}>
                        Configure a custom practice exam by selecting your target subject and number of questions.
                      </p>
                    </div>

                    {/* Mode Selector */}
                    <div style={{ marginBottom: "24px" }}>
                      <label 
                        style={{ 
                          display: "block", 
                          fontSize: "14px", 
                          fontWeight: "600", 
                          color: "var(--text-primary)", 
                          marginBottom: "10px" 
                        }}
                      >
                        Select Test Mode
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={() => setQuizType("exam")}
                          style={{
                            padding: "10px 0",
                            borderRadius: "8px",
                            fontWeight: "700",
                            fontSize: "14px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            border: quizType === "exam" 
                              ? "1.5px solid var(--violet, #6E3FF3)" 
                              : "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                            background: quizType === "exam" 
                              ? "var(--violet, #6E3FF3)" 
                              : "transparent",
                            color: quizType === "exam" ? "#ffffff" : "var(--text-secondary)"
                          }}
                        >
                          Exam Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuizType("practice")}
                          style={{
                            padding: "10px 0",
                            borderRadius: "8px",
                            fontWeight: "700",
                            fontSize: "14px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            border: quizType === "practice" 
                              ? "1.5px solid var(--violet, #6E3FF3)" 
                              : "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                            background: quizType === "practice" 
                              ? "var(--violet, #6E3FF3)" 
                              : "transparent",
                            color: quizType === "practice" ? "#ffffff" : "var(--text-secondary)"
                          }}
                        >
                          Practice Mode
                        </button>
                      </div>
                    </div>

                    {/* Subject selector */}
                    <div style={{ marginBottom: "24px" }}>
                      <label 
                        style={{ 
                          display: "block", 
                          fontSize: "14px", 
                          fontWeight: "600", 
                          color: "var(--text-primary)", 
                          marginBottom: "8px" 
                        }}
                      >
                        Select Target Subject
                      </label>
                      {fetchingSubjects ? (
                        <div 
                          style={{ 
                            height: "46px", 
                            background: "rgba(255,255,255,0.05)", 
                            borderRadius: "8px", 
                            animation: "pulse 1.5s infinite" 
                          }}
                        ></div>
                      ) : subjects.length > 0 ? (
                        <select
                          value={selectedSubject}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            background: "var(--bg-input, #fafafa)",
                            color: "var(--text-primary)",
                            border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                            outline: "none",
                            fontSize: "15px"
                          }}
                        >
                          <option value="">-- Choose a Subject --</option>
                          {subjects.map((sub, idx) => (
                            <option key={idx} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p style={{ color: "#ef4444", fontSize: "14px", margin: "4px 0" }}>No subjects available in the question bank.</p>
                      )}
                    </div>

                    {/* Quantity selector */}
                    <div style={{ marginBottom: "28px" }}>
                      <label 
                        style={{ 
                          display: "block", 
                          fontSize: "14px", 
                          fontWeight: "600", 
                          color: "var(--text-primary)", 
                          marginBottom: "12px" 
                        }}
                      >
                        Number of Questions
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))", gap: "10px" }}>
                        {quantityOptions.map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => setQuantity(qty)}
                            style={{
                              padding: "10px 0",
                              borderRadius: "8px",
                              fontWeight: "700",
                              fontSize: "14px",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              border: quantity === qty 
                                ? "1.5px solid var(--violet, #6E3FF3)" 
                                : "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                              background: quantity === qty 
                                ? "var(--violet, #6E3FF3)" 
                                : "transparent",
                              color: quantity === qty ? "#ffffff" : "var(--text-secondary)"
                            }}
                          >
                            {qty}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={handleCreate}
                      disabled={loading || !selectedSubject}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "15px",
                        cursor: (loading || !selectedSubject) ? "not-allowed" : "pointer",
                        transition: "all 0.25s ease",
                        border: "none",
                        background: (loading || !selectedSubject) ? "var(--border-color, #333)" : "var(--violet, #6E3FF3)",
                        color: (loading || !selectedSubject) ? "var(--text-muted, #777)" : "#ffffff",
                        boxShadow: (loading || !selectedSubject) ? "none" : "0 4px 10px rgba(110, 63, 243, 0.15)"
                      }}
                    >
                      {loading ? "Generating Practice Test..." : "Create Custom Quiz"}
                    </button>
                  </>
                ) : fetchingPremium ? (
                  <div style={{ color: "var(--text-secondary)", fontSize: "14px", padding: "20px 0", textAlign: "center" }}>
                    Loading Premium entitlements...
                  </div>
                ) : !premiumStatus.isPremium ? (
                  <div style={{ textAlign: "center", padding: "16px 0", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ fontSize: "40px" }}>🔒</div>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px 0" }}>AI Test Builder</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", margin: 0, lineHeight: "1.5" }}>
                        Premium Feature: Create personalized exam-style tests using Gemini AI.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard/pricing")}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: "700",
                        fontSize: "14px",
                        cursor: "pointer",
                        background: "var(--violet, #6E3FF3)",
                        color: "#fff",
                        marginTop: "8px"
                      }}
                    >
                      View Plans
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Entitlement Metrics */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px", background: "rgba(144, 97, 249, 0.08)", padding: "8px 12px", borderRadius: "8px", border: "1px dashed rgba(144, 97, 249, 0.2)" }}>
                      <span>Status: <strong>Active Premium</strong></span>
                      <span>AI Credits: <strong>{premiumStatus.aiCredits} remaining</strong></span>
                    </div>

                    {/* AI Configuration Form */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      
                      {/* Exam Select */}
                      <div>
                        <label style={{ display: "block", fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Select Exam</label>
                        <select
                          value={selectedExam}
                          onChange={(e) => { setSelectedExam(e.target.value); setSelectedAiSubject(""); }}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "var(--bg-input, #fafafa)", color: "var(--text-primary)", border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))", outline: "none", fontSize: "14px" }}
                        >
                          <option value="">-- Choose target Exam --</option>
                          {exams.map((ex, idx) => <option key={idx} value={ex}>{ex}</option>)}
                        </select>
                      </div>

                      {/* Subject Select */}
                      <div>
                        <label style={{ display: "block", fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Select Subject</label>
                        <select
                          value={selectedAiSubject}
                          onChange={(e) => setSelectedAiSubject(e.target.value)}
                          disabled={!selectedExam}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "var(--bg-input, #fafafa)", color: "var(--text-primary)", border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))", outline: "none", fontSize: "14px", cursor: !selectedExam ? "not-allowed" : "pointer" }}
                        >
                          <option value="">-- Choose target Subject --</option>
                          {examSubjects[selectedExam]?.map((sub, idx) => <option key={idx} value={sub}>{sub}</option>)}
                        </select>
                      </div>

                      {/* Topic Input */}
                      <div>
                        <label style={{ display: "block", fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Topic</label>
                        <input
                          type="text"
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          placeholder="e.g. Fundamental Rights"
                          style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "var(--bg-input, #fafafa)", color: "var(--text-primary)", border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))", outline: "none", fontSize: "14px" }}
                        />
                      </div>

                      {/* AI Question Count */}
                      <div>
                        <label style={{ display: "block", fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>Number of Questions</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                          {[10, 20, 30, 50].map((qty) => (
                            <button
                              key={qty}
                              type="button"
                              onClick={() => setAiQuantity(qty)}
                              style={{ padding: "8px 0", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer", border: aiQuantity === qty ? "1.5px solid var(--violet, #6E3FF3)" : "1.5px solid var(--border-color, rgba(255,255,255,0.1))", background: aiQuantity === qty ? "var(--violet, #6E3FF3)" : "transparent", color: aiQuantity === qty ? "#ffffff" : "var(--text-secondary)", transition: "all 0.15s ease" }}
                            >
                              {qty}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Difficulty Selector */}
                      <div>
                        <label style={{ display: "block", fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>Difficulty</label>
                        <div style={{ display: "flex", gap: "16px" }}>
                          {["easy", "medium", "hard"].map((level) => (
                            <label key={level} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer", textTransform: "capitalize" }}>
                              <input
                                type="radio"
                                name="aiDifficulty"
                                value={level}
                                checked={aiDifficulty === level}
                                onChange={(e) => setAiDifficulty(e.target.value)}
                                style={{ accentColor: "var(--violet, #6E3FF3)" }}
                              />
                              {level}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Language Selection */}
                      <div>
                        <label style={{ display: "block", fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>Language</label>
                        <div style={{ display: "flex", gap: "16px" }}>
                          {["english", "hindi", "English + Hindi"].map((lang) => (
                            <label key={lang} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer" }}>
                              <input
                                type="radio"
                                name="aiLanguage"
                                value={lang}
                                checked={aiLanguage === lang}
                                onChange={(e) => setAiLanguage(e.target.value)}
                                style={{ accentColor: "var(--violet, #6E3FF3)" }}
                              />
                              {lang === "English + Hindi" ? "Bilingual" : lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Follow Exam Pattern */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginTop: "4px" }}>
                        <input
                          type="checkbox"
                          id="followPattern"
                          checked={followExamPattern}
                          onChange={(e) => setFollowExamPattern(e.target.checked)}
                          style={{ accentColor: "var(--violet, #6E3FF3)", marginTop: "3px", cursor: "pointer" }}
                        />
                        <div>
                          <label htmlFor="followPattern" style={{ display: "block", fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)", cursor: "pointer" }}>Follow Exam Pattern</label>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Use the selected exam's marking rules and option structure.</span>
                        </div>
                      </div>

                      {/* Include Explanations */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <input
                          type="checkbox"
                          id="includeExplanations"
                          checked={includeExplanations}
                          onChange={(e) => setIncludeExplanations(e.target.checked)}
                          style={{ accentColor: "var(--violet, #6E3FF3)", marginTop: "3px", cursor: "pointer" }}
                        />
                        <div>
                          <label htmlFor="includeExplanations" style={{ display: "block", fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)", cursor: "pointer" }}>Include Explanations</label>
                        </div>
                      </div>

                      {/* Generate button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedExam || !selectedAiSubject) {
                            alert("Please select target Exam and Subject.");
                            return;
                          }
                          setShowAiConfirmModal(true);
                        }}
                        style={{
                          width: "100%",
                          padding: "14px",
                          borderRadius: "8px",
                          fontWeight: "700",
                          fontSize: "15px",
                          cursor: "pointer",
                          transition: "all 0.25s ease",
                          border: "none",
                          background: "var(--violet, #6E3FF3)",
                          color: "#ffffff",
                          boxShadow: "0 4px 10px rgba(110, 63, 243, 0.15)",
                          marginTop: "8px"
                        }}
                      >
                        Generate AI Test
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Previous Custom Quizzes List */}
              <div className="custom-quiz-list">
                <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>
                  Your Custom Tests
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>
                  Access and re-take your previously generated custom practice sessions.
                </p>

                <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                  {["all", "practice", "exam"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFilterMode(mode)}
                      style={{
                        padding: "6px 16px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        textTransform: "capitalize",
                        transition: "all 0.2s",
                        border: filterMode === mode ? "1.5px solid var(--violet)" : "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                        background: filterMode === mode ? "var(--violet)" : "transparent",
                        color: filterMode === mode ? "#ffffff" : "var(--text-secondary)"
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {fetchingPrevious ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading tests...</div>
                ) : previousQuizzes.filter(q => filterMode === "all" || q.publishAs === filterMode).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {previousQuizzes.filter(q => filterMode === "all" || q.publishAs === filterMode).map((quiz) => (
                      <div 
                        key={quiz._id} 
                        className="custom-quiz-item"
                      >
                        <div>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                            {quiz.title} <span style={{ fontSize: "11px", color: quiz.publishAs === "practice" ? "#10b981" : "#8B5CF6", marginLeft: "8px", background: quiz.publishAs === "practice" ? "rgba(16, 185, 129, 0.1)" : "rgba(139, 92, 246, 0.1)", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>{quiz.publishAs === "practice" ? "Practice" : "Exam"}</span>
                          </h4>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Created: {new Date(quiz.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <button
                            onClick={() => {
                              if (quiz.publishAs === "practice") {
                                navigate(`/dashboard/practice/test/${quiz._id}`);
                              } else {
                                navigate(`/quiz/${quiz._id}`);
                              }
                            }}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "20px",
                              border: "none",
                              background: "rgba(110, 63, 243, 0.15)",
                              color: "#9061F9",
                              fontWeight: "600",
                              fontSize: "13px",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            Start Test
                          </button>
                          <button
                            onClick={() => triggerDelete(quiz._id)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "20px",
                              border: "none",
                              background: "rgba(239, 68, 68, 0.15)",
                              color: "#ef4444",
                              fontWeight: "600",
                              fontSize: "13px",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = "#ef4444";
                              e.target.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "rgba(239, 68, 68, 0.15)";
                              e.target.style.color = "#ef4444";
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📝</div>
                    <p style={{ margin: 0, fontSize: "14px" }}>
                      {filterMode === "all" 
                        ? "You haven't generated any custom tests yet." 
                        : `You haven't generated any custom ${filterMode} tests yet.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Results Tab View (exactly matching layout from user's Image 2) */
            /* Results Tab View (exactly matching layout from user's Image 2 with added Calendar search/filter) */
            <div style={{ width: "100%", maxWidth: "850px" }}>
              {/* Date Filter Bar */}
              <div 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "16px 20px", 
                  borderRadius: "12px", 
                  background: "var(--bg-card, #131428)",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                  marginBottom: "20px",
                  gap: "16px",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "320px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap" }}>Filter by Attempt Date:</span>
                  <MuiDatePicker value={selectedDate} onChange={setSelectedDate} label="mm-dd-yyyy" />
                </div>
              </div>

              {fetchingPrevious ? (
                <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading attempt history...</div>
              ) : (() => {
                const filteredResults = results
                  .filter(r => previousQuizzes.some(pq => pq._id.toString() === r.quizId?.toString()))
                  .filter(r => {
                    if (!selectedDate) return true;
                    const attemptDate = new Date(r.createdAt).toISOString().split('T')[0];
                    return attemptDate === selectedDate;
                  });

                return filteredResults.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {filteredResults.map((res) => (
                      <div 
                        key={res._id} 
                        className="result-list-item"
                      >
                        {/* Left: Icon, Title, Date/Time, Status */}
                        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                          <div style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "12px",
                            background: "rgba(110, 63, 243, 0.1)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            color: "#9061F9"
                          }}>
                            <FileText size={24} />
                          </div>
                          <div>
                            <h4 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
                              {res.subject || res.quizTitle || "Custom Test"}
                            </h4>
                            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>
                              <span>Attempted on {new Date(res.createdAt).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span>|</span>
                              <span>Time: {new Date(res.createdAt).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <span style={{
                              padding: "4px 10px",
                              borderRadius: "20px",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#10B981",
                              fontWeight: "600",
                              fontSize: "11px",
                              textTransform: "uppercase"
                            }}>
                              Completed
                            </span>
                          </div>
                        </div>

                        {/* Middle: Stats (Score, Accuracy, Rank) */}
                        <div className="result-item-stats">
                          {/* Score */}
                          <div style={{ textAlign: "center", minWidth: "80px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Score</span>
                            <span style={{ fontSize: "16px", fontWeight: "700", color: "#10B981" }}>{res.score} / {res.total}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>{((res.score / (res.total || 1)) * 100).toFixed(0)}%</span>
                          </div>

                          {/* Accuracy */}
                          <div style={{ textAlign: "center", minWidth: "80px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Accuracy</span>
                            <span style={{ fontSize: "16px", fontWeight: "700", color: "#9061F9" }}>{((res.correct / (res.correct + res.incorrect || 1)) * 100).toFixed(0)}%</span>
                          </div>

                          {/* Rank */}
                          <div style={{ textAlign: "center", minWidth: "80px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Rank</span>
                            <span style={{ fontSize: "16px", fontWeight: "700", color: "#D97706" }}>#{getStableRank(res._id)}</span>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="result-item-actions">
                          <button
                            onClick={() => navigate("/result", { state: res })}
                            style={{
                              width: "100%",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "none",
                              background: "rgba(110, 63, 243, 0.15)",
                              color: "#9061F9",
                              fontWeight: "600",
                              fontSize: "13px",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = "#9061F9";
                              e.target.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "rgba(110, 63, 243, 0.15)";
                              e.target.style.color = "#9061F9";
                            }}
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => navigate(`/quiz/${res.quizId}`)}
                            style={{
                              width: "100%",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                              background: "#ffffff",
                              color: "#0a0a0a",
                              fontWeight: "600",
                              fontSize: "13px",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            Reattempt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📊</div>
                    <p style={{ margin: 0, fontSize: "14px" }}>
                      {selectedDate 
                        ? `No attempt results found for ${new Date(selectedDate).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}.`
                        : "No attempt results found. Finish a test to view your stats here!"}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Modern custom confirmation modal for deleting quiz */}
      {showConfirmModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 20, 0.75)",
          backdropFilter: "blur(10px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 100000,
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            background: "var(--bg-card, #131428)",
            border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.08))",
            borderRadius: "20px",
            padding: "32px 28px",
            maxWidth: "420px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#ef4444"
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Delete Custom Test?</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Are you sure you want to delete this custom test? This action is permanent and cannot be undone.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "8px" }}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setQuizToDelete(null);
                }}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "30px",
                  border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "30px",
                  border: "none",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)"
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Test Builder Confirmation Modal */}
      {showAiConfirmModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 20, 0.75)",
          backdropFilter: "blur(10px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 100000,
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            background: "var(--bg-card, #131428)",
            border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.08))",
            borderRadius: "20px",
            padding: "32px 28px",
            maxWidth: "460px",
            width: "90%",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              Confirm AI Test Generation
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--text-muted)" }}>Exam:</span>
                <strong style={{ color: "var(--text-primary)" }}>{selectedExam}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--text-muted)" }}>Subject:</span>
                <strong style={{ color: "var(--text-primary)" }}>{selectedAiSubject}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--text-muted)" }}>Topic:</span>
                <strong style={{ color: "var(--text-primary)" }}>{aiTopic || "General Topic"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--text-muted)" }}>Questions:</span>
                <strong style={{ color: "var(--text-primary)" }}>{aiQuantity}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--text-muted)" }}>Difficulty:</span>
                <strong style={{ color: "var(--text-primary)", textTransform: "capitalize" }}>{aiDifficulty}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--text-muted)" }}>Language:</span>
                <strong style={{ color: "var(--text-primary)" }}>{aiLanguage}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--text-muted)" }}>Exam Pattern:</span>
                <strong style={{ color: "var(--text-primary)" }}>{followExamPattern ? `${selectedExam} Rules` : "Standard Rules"}</strong>
              </div>
            </div>

            <div style={{
              background: "rgba(144, 97, 249, 0.06)",
              border: "1px dashed rgba(144, 97, 249, 0.2)",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              textAlign: "center"
            }}>
              <div>⚡ <strong>{aiQuantity} AI credits</strong> will be consumed</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>AI Credits Remaining: {premiumStatus.aiCredits} → {premiumStatus.aiCredits - aiQuantity}</div>
            </div>

            <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setShowAiConfirmModal(false)}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "8px",
                  border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAITest}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--violet, #6E3FF3)",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 14px rgba(110, 63, 243, 0.4)"
                }}
              >
                Generate Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Test Generation Progress Overlay */}
      {aiLoadingSteps.active && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 20, 0.85)",
          backdropFilter: "blur(12px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000000,
        }}>
          <div style={{
            background: "var(--bg-card, #131428)",
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
            borderRadius: "20px",
            padding: "40px 32px",
            maxWidth: "400px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
                Creating your personalized test...
              </h3>
              <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text-secondary)" }}>
                Gemini is preparing your test questions.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", textAlign: "left", padding: "16px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: aiLoadingSteps.step >= 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                <span style={{ color: aiLoadingSteps.step > 0 ? "#10b981" : "var(--violet)", fontWeight: "bold" }}>
                  {aiLoadingSteps.step > 0 ? "✓" : "•"}
                </span>
                <span>Reading exam pattern</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: aiLoadingSteps.step >= 1 ? "var(--text-primary)" : "var(--text-muted)" }}>
                <span style={{ color: aiLoadingSteps.step > 1 ? "#10b981" : aiLoadingSteps.step === 1 ? "var(--violet)" : "var(--text-muted)", fontWeight: "bold" }}>
                  {aiLoadingSteps.step > 1 ? "✓" : "•"}
                </span>
                <span>Generating questions</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: aiLoadingSteps.step >= 2 ? "var(--text-primary)" : "var(--text-muted)" }}>
                <span style={{ color: aiLoadingSteps.step === 2 ? "var(--violet)" : "var(--text-muted)", fontWeight: "bold" }}>•</span>
                <span>Validating questions</span>
              </div>
            </div>

            {/* Spinner */}
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "3px solid rgba(144, 97, 249, 0.15)",
              borderTopColor: "var(--violet, #6E3FF3)",
              animation: "spin 1s linear infinite"
            }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCustomQuiz;
