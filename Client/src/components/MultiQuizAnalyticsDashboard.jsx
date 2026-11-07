import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Award,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Zap,
  BookOpen,
  HelpCircle,
  CheckCircle,
  XCircle,
  Check,
  History,
  ArrowRight,
  Layers,
  Sparkles,
  BarChart2
} from "lucide-react";
import "../css/MultiQuizAnalytics.css";

export default function MultiQuizAnalyticsDashboard({
  resultId,
  initialData,
  onViewSolutions,
  onBackToOverview
}) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sectionFilter, setSectionFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/results/analytics/${resultId}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }
        );

        if (isMounted && res.data?.success) {
          setAnalytics(res.data);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to fetch performance analytics:", err);
        // Fallback: Compute authoritative analytics from initialData if API fails
        if (isMounted && initialData) {
          const fallback = buildClientFallbackAnalytics(initialData);
          setAnalytics(fallback);
        } else if (isMounted) {
          setError("Unable to load performance analytics. Please try again.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (resultId) {
      fetchAnalytics();
    } else if (initialData) {
      setAnalytics(buildClientFallbackAnalytics(initialData));
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [resultId, initialData]);

  if (loading) {
    return (
      <div className="mqa-container" style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ display: "inline-block", width: "40px", height: "40px", border: "3px solid rgba(139, 92, 246, 0.2)", borderTopColor: "#8B5CF6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
        <p style={{ marginTop: "16px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600" }}>
          Analyzing multi-section performance & generating recommendations...
        </p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="mqa-card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <AlertTriangle size={36} color="#F59E0B" style={{ margin: "0 auto 12px" }} />
        <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700" }}>Analytics Unavailable</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 16px" }}>
          {error || "Section-level analytics could not be computed for this test."}
        </p>
        <button
          onClick={onBackToOverview}
          style={{
            padding: "10px 20px",
            borderRadius: "12px",
            background: "#8B5CF6",
            color: "#FFFFFF",
            border: "none",
            fontWeight: "700",
            cursor: "pointer"
          }}
        >
          Return to Overview
        </button>
      </div>
    );
  }

  const { sections = [], summary = {}, recommendations = [], history = {} } = analytics;

  const formatSeconds = (sec) => {
    if (!sec && sec !== 0) return "0s";
    const s = Math.round(Number(sec));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  };

  return (
    <div className="mqa-container">
      {/* 1. Header Overview Metrics */}
      <div className="mqa-card">
        <div className="mqa-card-header">
          <h3 className="mqa-card-title">
            <Sparkles size={20} color="#8B5CF6" /> Performance Diagnosis
          </h3>
          <span className="mqa-badge-pill" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6" }}>
            <Layers size={13} /> {sections.length} {sections.length === 1 ? "Section" : "Sections"} Evaluated
          </span>
        </div>

        <div className="mqa-summary-grid">
          {/* Strongest Section */}
          <div className="mqa-stat-box">
            <div className="mqa-stat-icon" style={{ background: "rgba(34, 197, 94, 0.12)", color: "#16A34A" }}>
              <Award size={22} />
            </div>
            <div className="mqa-stat-info">
              <p className="mqa-stat-label">Strongest Section</p>
              <h4 className="mqa-stat-value" title={summary.strongestSection && summary.strongestSection.accuracy > 0 ? summary.strongestSection.sectionTitle : "None yet"}>
                {summary.strongestSection && summary.strongestSection.accuracy > 0 ? summary.strongestSection.sectionTitle : "None yet"}
              </h4>
              <span style={{ fontSize: "11px", color: summary.strongestSection && summary.strongestSection.accuracy > 0 ? "#16A34A" : "var(--text-secondary)", fontWeight: "700" }}>
                {summary.strongestSection && summary.strongestSection.accuracy > 0 ? `${summary.strongestSection.accuracy}% Acc` : "Attempt more questions"}
              </span>
            </div>
          </div>

          {/* Weakest Section */}
          <div className="mqa-stat-box">
            <div className="mqa-stat-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#DC2626" }}>
              <AlertTriangle size={22} />
            </div>
            <div className="mqa-stat-info">
              <p className="mqa-stat-label">Needs Attention</p>
              <h4 className="mqa-stat-value" title={summary.weakestSection?.sectionTitle || "None"}>
                {summary.weakCount > 0
                  ? summary.weakestSection?.sectionTitle
                  : (sections.every(s => s.attempted === 0) ? "All Unattempted" : (summary.weakestSection?.sectionTitle || "All on Track"))}
              </h4>
              <span style={{ fontSize: "11px", color: summary.weakCount > 0 ? "#DC2626" : "var(--text-secondary)", fontWeight: "700" }}>
                {summary.weakCount > 0
                  ? `${summary.weakestSection?.accuracy}% Acc`
                  : (sections.every(s => s.attempted === 0) ? "0 questions answered" : "Maintaining benchmark")}
              </span>
            </div>
          </div>

          {/* Strong vs Weak Tally */}
          <div className="mqa-stat-box">
            <div className="mqa-stat-icon" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" }}>
              <BarChart2 size={22} />
            </div>
            <div className="mqa-stat-info">
              <p className="mqa-stat-label">Section Standing</p>
              <h4 className="mqa-stat-value">
                <span style={{ color: "#16A34A" }}>{summary.strongCount || 0}</span> Strong • <span style={{ color: "#DC2626" }}>{summary.weakCount || 0}</span> Weak
              </h4>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                {summary.averageCount || 0} Average {sections.filter(s => s.strength === "unattempted").length > 0 ? `• ${sections.filter(s => s.strength === "unattempted").length} Unattempted` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Detailed Section-Wise Performance Analysis */}
      <div className="mqa-card">
        <div className="mqa-card-header">
          <h3 className="mqa-card-title">
            <Layers size={20} color="#8B5CF6" /> Section-Wise Performance Breakdown
          </h3>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Authoritative section results
          </span>
        </div>

        {/* Filter Chips (Image 10: Strengths & Weaknesses topic filters) */}
        <div className="mqa-filter-chips">
          <button 
            className={`mqa-filter-chip ${sectionFilter === "all" ? "active" : ""}`}
            onClick={() => setSectionFilter("all")}
          >
            All ({sections.length})
          </button>
          <button 
            className={`mqa-filter-chip ${sectionFilter === "weak" ? "active" : ""}`}
            onClick={() => setSectionFilter("weak")}
          >
            Weak ({summary.weakCount || 0})
          </button>
          <button 
            className={`mqa-filter-chip ${sectionFilter === "average" ? "active" : ""}`}
            onClick={() => setSectionFilter("average")}
          >
            Average ({summary.averageCount || 0})
          </button>
          <button 
            className={`mqa-filter-chip ${sectionFilter === "strong" ? "active" : ""}`}
            onClick={() => setSectionFilter("strong")}
          >
            Strong ({summary.strongCount || 0})
          </button>
        </div>

        <div className="mqa-sections-grid">
          {sections
            .filter(sec => sectionFilter === "all" || sec.strength === sectionFilter)
            .map((sec, idx) => {
            const strengthClass =
              sec.strength === "strong"
                ? "mqa-tag-strong"
                : sec.strength === "weak"
                ? "mqa-tag-weak"
                : sec.strength === "unattempted"
                ? "mqa-tag-unattempted"
                : "mqa-tag-average";

            const strengthLabel =
              sec.strength === "strong"
                ? "Strong ★"
                : sec.strength === "weak"
                ? "Needs Work ⚠"
                : sec.strength === "unattempted"
                ? "Unattempted"
                : "Average";

            const progressColor =
              sec.strength === "strong"
                ? "#22C55E"
                : sec.strength === "weak"
                ? "#EF4444"
                : "#F59E0B";

            return (
              <div key={sec.sectionId || idx} className="mqa-section-row">
                <div className="mqa-sec-top">
                  <div className="mqa-sec-title-wrap">
                    <h4 className="mqa-sec-name">{sec.sectionTitle}</h4>
                    <span className={`mqa-badge-pill ${strengthClass}`}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "15px", fontWeight: "800", color: "#8B5CF6" }}>
                      {sec.score} <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500" }}>/ {sec.maxMarks}</span>
                    </span>
                  </div>
                </div>

                {/* Accuracy Bar */}
                <div className="mqa-progress-wrap">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", fontWeight: "700" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Section Accuracy</span>
                    <span style={{ color: progressColor }}>{sec.accuracy}%</span>
                  </div>
                  <div className="mqa-progress-bar-bg">
                    <div
                      className="mqa-progress-bar-fill"
                      style={{ width: `${Math.min(100, Math.max(0, sec.accuracy))}%`, backgroundColor: progressColor }}
                    ></div>
                  </div>
                </div>

                {/* Specific Section Insights & Badges */}
                <div className="mqa-sec-tip">
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span className="mqa-sub-pill wrong">✕ {sec.incorrect} Incorrect</span>
                    <span className="mqa-sub-pill skipped">? {sec.unanswered} Skipped</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>• {formatSeconds(sec.timeTaken)} spent</span>
                  </div>
                  <p className="mqa-sec-coach-text">
                    {sec.attempted === 0
                      ? "Section unattempted — answering questions here will establish diagnostic data."
                      : sec.incorrect > sec.correct
                      ? "Mostly wrong answers — revise fundamental concepts & review solutions."
                      : sec.unanswered > sec.attempted
                      ? "High unanswered count — practice timed drills to improve section pacing."
                      : sec.accuracy >= 75
                      ? "Excellent accuracy and grasp — challenge yourself with advanced practice sets."
                      : "Balanced attempt — focus on eliminating negative marks to boost your score."}
                  </p>
                </div>

                {/* Metrics Chips Grid */}
                <div className="mqa-metrics-chips">
                  <div className="mqa-chip">
                    <span className="mqa-chip-val">{sec.totalQuestions}</span>
                    <span className="mqa-chip-lbl">Total Qs</span>
                  </div>
                  <div className="mqa-chip">
                    <span className="mqa-chip-val" style={{ color: "#3B82F6" }}>{sec.attempted}</span>
                    <span className="mqa-chip-lbl">Attempted</span>
                  </div>
                  <div className="mqa-chip">
                    <span className="mqa-chip-val" style={{ color: "#16A34A" }}>{sec.correct}</span>
                    <span className="mqa-chip-lbl">Correct</span>
                  </div>
                  <div className="mqa-chip">
                    <span className="mqa-chip-val" style={{ color: "#DC2626" }}>{sec.incorrect}</span>
                    <span className="mqa-chip-lbl">Incorrect</span>
                  </div>
                  <div className="mqa-chip">
                    <span className="mqa-chip-val">{sec.unanswered}</span>
                    <span className="mqa-chip-lbl">Skipped</span>
                  </div>
                  <div className="mqa-chip">
                    <span className="mqa-chip-val">{formatSeconds(sec.timeTaken)}</span>
                    <span className="mqa-chip-lbl">Time Spent</span>
                  </div>
                  <div className="mqa-chip">
                    <span className="mqa-chip-val" style={{ color: "#8B5CF6" }}>{sec.avgTimePerQuestion}s</span>
                    <span className="mqa-chip-lbl">Avg / Q</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2.5 Time Utilization Analysis (Image 10: How you used your time) */}
      <div className="mqa-card">
        <div className="mqa-card-header">
          <h3 className="mqa-card-title">
            <Clock size={20} color="#8B5CF6" /> Time Utilization Analysis
          </h3>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Exam pacing & efficiency
          </span>
        </div>

        <div className="mqa-time-util-wrap">
          <div className="mqa-time-circle">
            <span className="mqa-time-circle-val">{formatSeconds(summary.totalExamTime)}</span>
            <span className="mqa-time-circle-lbl">Total Time</span>
          </div>
          <div className="mqa-time-details">
            <div className="mqa-time-item">
              <span className="mqa-time-label">Avg Pace Across Attempted</span>
              <span className="mqa-time-val">{summary.avgTimeOverall || 0}s / question</span>
            </div>
            <div className="mqa-time-item">
              <span className="mqa-time-label">Total Sections Completed</span>
              <span className="mqa-time-val">{sections.length} Sections</span>
            </div>
            <div className="mqa-time-item">
              <span className="mqa-time-label">Fastest Accurate Section</span>
              <span className="mqa-time-val" style={{ color: "#16A34A" }}>
                {summary.strongestSection ? `${summary.strongestSection.sectionTitle} (${formatSeconds(summary.strongestSection.timeTaken)})` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Personalized Improvement Recommendations */}
      <div className="mqa-card">
        <div className="mqa-card-header">
          <h3 className="mqa-card-title">
            <Zap size={20} color="#F59E0B" /> Personalized Action Plan
          </h3>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Data-backed coaching insights
          </span>
        </div>

        <div className="mqa-recom-list">
          {recommendations.map((rec, i) => {
            const isHigh = rec.priority === "high";
            const isMedium = rec.priority === "medium";

            const iconBg = isHigh
              ? "rgba(239, 68, 68, 0.12)"
              : isMedium
              ? "rgba(245, 158, 11, 0.12)"
              : "rgba(34, 197, 94, 0.12)";

            const iconColor = isHigh ? "#DC2626" : isMedium ? "#D97706" : "#16A34A";

            const badgeBg = isHigh
              ? "rgba(239, 68, 68, 0.15)"
              : isMedium
              ? "rgba(245, 158, 11, 0.15)"
              : "rgba(34, 197, 94, 0.15)";

            const badgeText = isHigh ? "High Priority" : isMedium ? "Medium Priority" : "Mastery";

            return (
              <div key={i} className="mqa-recom-item">
                <div className="mqa-recom-icon" style={{ background: iconBg, color: iconColor }}>
                  {rec.type === "concept_revision" && <BookOpen size={18} />}
                  {rec.type === "negative_marking" && <AlertTriangle size={18} />}
                  {rec.type === "time_management" && <Clock size={18} />}
                  {rec.type === "speed_practice" && <Zap size={18} />}
                  {rec.type === "advanced_practice" && <Award size={18} />}
                  {!["concept_revision", "negative_marking", "time_management", "speed_practice", "advanced_practice"].includes(rec.type) && (
                    <Target size={18} />
                  )}
                </div>
                <div className="mqa-recom-content">
                  <div className="mqa-recom-top">
                    <h5 className="mqa-recom-heading">{rec.title}</h5>
                    <span
                      className="mqa-badge-pill"
                      style={{ background: badgeBg, color: iconColor, fontSize: "10.5px" }}
                    >
                      {badgeText}
                    </span>
                  </div>
                  <p className="mqa-recom-desc">{rec.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Historical Progression (Multi-Attempt Comparison) */}
      {history.hasHistory && history.comparisonWithPrevious && (
        <div className="mqa-card">
          <div className="mqa-card-header">
            <h3 className="mqa-card-title">
              <History size={20} color="#8B5CF6" /> Attempt History & Progression
            </h3>
            <span className="mqa-badge-pill" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6" }}>
              Attempt #{history.totalAttempts} vs #{history.totalAttempts - 1}
            </span>
          </div>

          <div className="mqa-history-summary">
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "12px", color: "var(--text-secondary)" }}>
                Net Score Change
              </p>
              <span
                className={`mqa-delta-badge ${
                  history.comparisonWithPrevious.scoreDiff > 0
                    ? "mqa-delta-positive"
                    : history.comparisonWithPrevious.scoreDiff < 0
                    ? "mqa-delta-negative"
                    : "mqa-delta-neutral"
                }`}
              >
                {history.comparisonWithPrevious.scoreDiff > 0 && <TrendingUp size={14} />}
                {history.comparisonWithPrevious.scoreDiff < 0 && <TrendingDown size={14} />}
                {history.comparisonWithPrevious.scoreDiff > 0 ? `+${history.comparisonWithPrevious.scoreDiff}` : history.comparisonWithPrevious.scoreDiff} Marks
              </span>
            </div>

            <div>
              <p style={{ margin: "0 0 2px", fontSize: "12px", color: "var(--text-secondary)" }}>
                Accuracy Shift
              </p>
              <span
                className={`mqa-delta-badge ${
                  history.comparisonWithPrevious.percentageDiff > 0
                    ? "mqa-delta-positive"
                    : history.comparisonWithPrevious.percentageDiff < 0
                    ? "mqa-delta-negative"
                    : "mqa-delta-neutral"
                }`}
              >
                {history.comparisonWithPrevious.percentageDiff > 0 ? `+${history.comparisonWithPrevious.percentageDiff}%` : `${history.comparisonWithPrevious.percentageDiff}%`}
              </span>
            </div>

            <div>
              <p style={{ margin: "0 0 2px", fontSize: "12px", color: "var(--text-secondary)" }}>
                Total Attempts
              </p>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#8B5CF6" }}>
                {history.totalAttempts} Attempts Recorded
              </span>
            </div>
          </div>

          {/* Section Changes Table */}
          {history.comparisonWithPrevious.sectionChanges?.length > 0 && (
            <div className="mqa-table-wrap">
              <table className="mqa-table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Previous Score</th>
                    <th>Current Score</th>
                    <th>Accuracy Delta</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {history.comparisonWithPrevious.sectionChanges.map((sc, idx) => (
                    <tr key={idx}>
                      <td>{sc.sectionTitle}</td>
                      <td>{sc.previousScore}</td>
                      <td>{sc.currentScore}</td>
                      <td>
                        <span style={{ color: sc.accuracyDiff >= 0 ? "#16A34A" : "#DC2626" }}>
                          {sc.accuracyDiff >= 0 ? `+${sc.accuracyDiff}%` : `${sc.accuracyDiff}%`}
                        </span>
                      </td>
                      <td>
                        {sc.trend === "improving" ? (
                          <span style={{ color: "#16A34A", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <TrendingUp size={14} /> Improving
                          </span>
                        ) : sc.trend === "declining" ? (
                          <span style={{ color: "#DC2626", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <TrendingDown size={14} /> Declining
                          </span>
                        ) : (
                          <span style={{ color: "#64748B" }}>→ Consistent</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Sticky Bottom Action Bar */}
      <div style={{ display: "flex", gap: "12px", marginTop: "4px", width: "100%" }}>
        <button
          onClick={onViewSolutions}
          style={{
            flex: 1.2,
            padding: "14px 20px",
            borderRadius: "14px",
            background: "#8B5CF6",
            color: "#FFFFFF",
            fontSize: "14.5px",
            fontWeight: "700",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)",
            transition: "all 0.2s"
          }}
        >
          <BookOpen size={17} />
          Review Detailed Solutions
        </button>
        <button
          onClick={onBackToOverview}
          style={{
            flex: 0.8,
            padding: "14px 20px",
            borderRadius: "14px",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            fontSize: "14.5px",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Back to Overview
        </button>
      </div>
    </div>
  );
}

// Client-side fallback calculator if API is temporarily unreachable
function buildClientFallbackAnalytics(result) {
  const isMultiQuiz = Boolean(result.sectionResults && Array.isArray(result.sectionResults) && result.sectionResults.length > 0);
  const sections = (result.sectionResults || []).map((sec, idx) => {
    const totalQuestions = Number(sec.totalQuestions) || 0;
    const attempted = Number(sec.attempted) || 0;
    const correct = Number(sec.correct) || 0;
    const incorrect = Number(sec.incorrect) || 0;
    const unanswered = sec.unanswered !== undefined ? Number(sec.unanswered) : Math.max(0, totalQuestions - attempted);
    const score = Number(sec.score) || 0;
    const maxMarks = Number(sec.maxMarks) || totalQuestions;
    const accuracy = attempted > 0 ? Number(((correct / attempted) * 100).toFixed(1)) : 0;
    const timeTaken = Number(sec.timeTaken) || 0;
    const avgTimePerQuestion = attempted > 0 ? Number((timeTaken / attempted).toFixed(1)) : 0;

    let strength = "average";
    if (attempted === 0) strength = "unattempted";
    else if (accuracy >= 70 && score > 0) strength = "strong";
    else if (accuracy < 40 || incorrect > correct) strength = "weak";

    return {
      sectionId: sec.sectionId || `sec-${idx}`,
      sectionTitle: sec.sectionTitle || `Section ${idx + 1}`,
      totalQuestions,
      attempted,
      correct,
      incorrect,
      unanswered,
      score,
      maxMarks,
      accuracy,
      timeTaken,
      avgTimePerQuestion,
      strength
    };
  });

  const attemptedSections = sections.filter(s => s.attempted > 0);
  const sorted = [...attemptedSections].sort((a, b) => b.accuracy - a.accuracy);
  const strongestSection = sorted.find(s => s.accuracy > 0 && s.score > 0) || null;
  const weakestSection = sorted.slice().reverse().find(s => s.accuracy < 50 || s.strength === "weak") || (sorted.length > 1 ? sorted[sorted.length - 1] : null);

  return {
    success: true,
    resultId: result._id,
    isMultiQuiz,
    sections,
    summary: {
      strongestSection,
      weakestSection,
      strongCount: sections.filter(s => s.strength === "strong").length,
      averageCount: sections.filter(s => s.strength === "average").length,
      weakCount: sections.filter(s => s.strength === "weak").length
    },
    recommendations: [
      {
        type: "concept_revision",
        priority: "medium",
        title: "Focus on Section Weak Spots",
        description: "Review concepts in your lowest scoring sections to build consistent performance."
      }
    ],
    history: { hasHistory: false, totalAttempts: 1 }
  };
}
