import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users,
  CheckCircle2,
  Sparkles,
  RefreshCcw,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  XCircle,
  CreditCard,
  User,
  Calendar,
  X,
  ExternalLink,
  Bot,
  Zap,
  DollarSign,
  Layers,
  ChevronDown
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";

import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/AiSubscribers.css";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const BAR_COLORS = ["#6E3FF3", "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"];

export default function AiSubscribers() {
  const navigate = useNavigate();

  // Overview & Metrics State
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);

  // Available Plans for Filter
  const [availablePlans, setAvailablePlans] = useState([]);

  // Subscribers List State
  const [listLoading, setListLoading] = useState(true);
  const [subscribers, setSubscribers] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Drill-Down Drawer State
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerData, setDrawerData] = useState(null);

  // 1. Fetch Overview KPIs & Popularity
  const fetchOverview = async () => {
    try {
      setOverviewLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/ai-plans/subscribers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOverviewData(res.data);
    } catch (error) {
      console.error("Failed to load subscribers overview:", error);
    } finally {
      setOverviewLoading(false);
    }
  };

  // 2. Fetch Available AI Plans
  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/ai-plans`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailablePlans(res.data || []);
    } catch (error) {
      console.error("Failed to load AI plans:", error);
    }
  };

  // 3. Fetch Subscribers List with Filters & Pagination
  const fetchSubscribersList = useCallback(async () => {
    try {
      setListLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        search: searchQuery,
        plan: selectedPlan,
        status: selectedStatus,
        page: currentPage,
        limit: 10
      });

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/ai-plans/subscribers/list?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSubscribers(res.data.subscribers || []);
      setPagination(res.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch (error) {
      console.error("Failed to load subscribers list:", error);
    } finally {
      setListLoading(false);
    }
  }, [searchQuery, selectedPlan, selectedStatus, currentPage]);

  // 4. Fetch Single Student History (for Drawer)
  const openStudentDrawer = async (studentId) => {
    try {
      setSelectedStudentId(studentId);
      setDrawerLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/ai-plans/subscribers/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDrawerData(res.data);
    } catch (error) {
      console.error("Failed to load student history:", error);
      setDrawerData(null);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeStudentDrawer = () => {
    setSelectedStudentId(null);
    setDrawerData(null);
  };

  useEffect(() => {
    fetchOverview();
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchSubscribersList();
  }, [fetchSubscribersList]);

  // Handle Search Input with debounce
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePlanFilterChange = (e) => {
    setSelectedPlan(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setSelectedStatus(e.target.value);
    setCurrentPage(1);
  };

  const refreshAll = () => {
    fetchOverview();
    fetchSubscribersList();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge variant="success" className="gap-1 font-semibold text-[11px]"><CheckCircle2 className="w-3 h-3" /> Active</Badge>;
      case "expired":
        return <Badge variant="secondary" className="gap-1 font-semibold text-[11px]"><Clock className="w-3 h-3" /> Expired</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1 font-semibold text-[11px]"><XCircle className="w-3 h-3" /> Cancelled</Badge>;
      case "refunded":
        return <Badge variant="outline" className="gap-1 font-semibold text-[11px]">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const kpis = overviewData?.kpis || {
    totalSubscribers: 0,
    activeSubscribers: 0,
    newThisMonth: 0,
    newLastMonth: 0,
    repeatPurchaseRate: 0,
    repeatSubscribersCount: 0,
    mostPopularPlan: "N/A"
  };

  const planPopularity = overviewData?.planPopularity || [];

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="AI Subscribers" />

        <div className="subscribers-dashboard-container">
          
          {/* ================= 1. PAGE HEADER & INTRO ================= */}
          <div className="subscribers-page-header">
            <div className="subscribers-title-area">
              <div className="subscribers-breadcrumb">
                <button
                  onClick={() => navigate("/admin/ai-plans")}
                  className="subscribers-breadcrumb-link"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  AI Plans
                </button>
                <span>/</span>
                <span>AI Subscribers</span>
              </div>
              <h1 className="subscribers-page-title">
                AI Plan Subscribers
              </h1>
              <p className="subscribers-page-subtitle">
                Manage subscribed students, track subscriber retention, and inspect purchase histories.
              </p>
            </div>

            {/* Header Right Action */}
            <div className="subscribers-header-actions">
              <button
                onClick={refreshAll}
                className="revenue-refresh-btn"
                title="Refresh Subscribers Data"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${overviewLoading || listLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* ================= 2. KPI SUMMARY (4 EQUAL-WIDTH CARDS) ================= */}
          <div className="sub-kpi-grid">
            
            {/* KPI 1: Total Subscribers */}
            <div className="sub-card sub-kpi-card">
              <div className="sub-kpi-top">
                <span className="sub-kpi-label">TOTAL SUBSCRIBERS</span>
                <div className="sub-kpi-icon-box" style={{ background: "rgba(110, 63, 243, 0.15)", color: "#8B5CF6" }}>
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-24 my-1" />
                ) : (
                  <div className="sub-kpi-value">
                    {kpis.totalSubscribers} <span className="subtext">all-time</span>
                  </div>
                )}
              </div>
              <div className="sub-kpi-bottom">
                <span>New This Month:</span>
                <span style={{ color: "#8B5CF6", fontWeight: 700 }}>
                  +{kpis.newThisMonth}
                </span>
              </div>
              <div className="sub-kpi-accent-bar" style={{ background: "#8B5CF6" }} />
            </div>

            {/* KPI 2: Currently Active */}
            <div className="sub-card sub-kpi-card">
              <div className="sub-kpi-top">
                <span className="sub-kpi-label">CURRENTLY ACTIVE</span>
                <div className="sub-kpi-icon-box" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-24 my-1" />
                ) : (
                  <div className="sub-kpi-value">
                    {kpis.activeSubscribers}
                  </div>
                )}
              </div>
              <div className="sub-kpi-bottom">
                <span>Repeat Buyers:</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>
                  {kpis.repeatSubscribersCount}
                </span>
              </div>
              <div className="sub-kpi-accent-bar" style={{ background: "#10B981" }} />
            </div>

            {/* KPI 3: New This Month */}
            <div className="sub-card sub-kpi-card">
              <div className="sub-kpi-top">
                <span className="sub-kpi-label">NEW THIS MONTH</span>
                <div className="sub-kpi-icon-box" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3B82F6" }}>
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-24 my-1" />
                ) : (
                  <div className="sub-kpi-value">
                    {kpis.newThisMonth}
                  </div>
                )}
              </div>
              <div className="sub-kpi-bottom">
                <span>Last Month:</span>
                <span style={{ color: "#60A5FA", fontWeight: 600 }}>
                  {kpis.newLastMonth} new
                </span>
              </div>
              <div className="sub-kpi-accent-bar" style={{ background: "#3B82F6" }} />
            </div>

            {/* KPI 4: Repeat Purchase Rate */}
            <div className="sub-card sub-kpi-card">
              <div className="sub-kpi-top">
                <span className="sub-kpi-label">REPEAT PURCHASE RATE</span>
                <div className="sub-kpi-icon-box" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B" }}>
                  <RefreshCcw className="w-4 h-4" />
                </div>
              </div>
              <div>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-24 my-1" />
                ) : (
                  <div className="sub-kpi-value">
                    {kpis.repeatPurchaseRate}%
                  </div>
                )}
              </div>
              <div className="sub-kpi-bottom">
                <span>Most Popular:</span>
                <span style={{ color: "#FBBF24", fontWeight: 700 }} className="truncate max-w-[120px]">
                  {kpis.mostPopularPlan}
                </span>
              </div>
              <div className="sub-kpi-accent-bar" style={{ background: "#F59E0B" }} />
            </div>

          </div>

          {/* ================= 3. PLAN POPULARITY BREAKDOWN ================= */}
          <div className="sub-card sub-popularity-card">
            <div className="sub-card-header">
              <div>
                <h2 className="sub-card-title">Subscriber Distribution by AI Plan</h2>
                <p className="sub-card-subtitle">
                  Volume of distinct students enrolled across each AI subscription tier.
                </p>
              </div>
            </div>

            <div style={{ height: 220, width: "100%" }}>
              {overviewLoading ? (
                <Skeleton className="h-full w-full rounded-lg" />
              ) : planPopularity.length === 0 ? (
                <div className="sub-empty-state">
                  <Layers className="w-8 h-8 opacity-40 text-gray-400" />
                  <p style={{ fontSize: 12.5, color: "#94a3b8", fontWeight: 500, margin: 0 }}>
                    No subscriber distribution data recorded yet.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planPopularity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis
                      dataKey="planName"
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1c1b2e",
                        borderColor: "#2e2c45",
                        borderRadius: "8px",
                        color: "#ffffff",
                        fontSize: "12px"
                      }}
                      formatter={(val) => [`${val} subscribers`, "Subscribers"]}
                    />
                    <Bar dataKey="subscriberCount" radius={[6, 6, 0, 0]}>
                      {planPopularity.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={BAR_COLORS[idx % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ================= 4. SUBSCRIBERS DIRECTORY & LEDGER ================= */}
          <div className="sub-card sub-table-card">
            <div className="sub-card-header" style={{ marginBottom: 14 }}>
              <div>
                <h2 className="sub-card-title">Subscribed Students Directory</h2>
                <p className="sub-card-subtitle">
                  Click any student row to view full purchase history, lifetime value, and usage stats.
                </p>
              </div>

              {/* Filter Controls Bar */}
              <div className="sub-filter-bar">
                {/* Search */}
                <div className="sub-search-wrap">
                  <Search className="w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search by student name, email, or phone..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="sub-search-input"
                  />
                </div>

                {/* Plan Filter */}
                <select
                  value={selectedPlan}
                  onChange={handlePlanFilterChange}
                  className="sub-filter-select"
                >
                  <option value="all">All Plans</option>
                  {availablePlans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Status Segment Filter */}
                <select
                  value={selectedStatus}
                  onChange={handleStatusFilterChange}
                  className="sub-filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="zero_usage">Zero Usage (Active with 0 tests)</option>
                  <option value="expired_previously_active">Expired (Previously Active)</option>
                </select>
              </div>
            </div>

            {listLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 0" }}>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : subscribers.length === 0 ? (
              <div className="sub-empty-state">
                <Users className="w-8 h-8 opacity-40 text-gray-400" />
                <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500, margin: 0 }}>
                  {searchQuery || selectedPlan !== "all" || selectedStatus !== "all"
                    ? "No students match these filters."
                    : "No subscribers recorded yet."}
                </p>
              </div>
            ) : (
              <div>
                <div className="sub-table-wrap">
                  <table className="sub-table">
                    <thead>
                      <tr>
                        <th>STUDENT</th>
                        <th>CURRENT PLAN</th>
                        <th>STATUS</th>
                        <th>LIFETIME SPEND</th>
                        <th>PURCHASES</th>
                        <th>LAST PURCHASE</th>
                        <th>EXPIRY DATE</th>
                        <th>AI TESTS</th>
                        <th style={{ textAlign: "right" }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((student) => (
                        <tr
                          key={student.studentId}
                          onClick={() => openStudentDrawer(student.studentId)}
                          title="Click to view full purchase history"
                        >
                          {/* Student Info */}
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  background: "linear-gradient(135deg, #6E3FF3, #2D1B69)",
                                  color: "#ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                  fontSize: 12,
                                  flexShrink: 0
                                }}
                              >
                                {student.fullName
                                  ? student.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                                  : "U"}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text-primary)" }}>
                                  {student.fullName}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                                  {student.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Current Plan */}
                          <td style={{ fontWeight: 500 }}>
                            {student.currentPlanName}
                          </td>

                          {/* Status Badge */}
                          <td>
                            {getStatusBadge(student.currentStatus)}
                          </td>

                          {/* Lifetime Spend */}
                          <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            ₹{student.lifetimeSpend?.toLocaleString("en-IN")}
                          </td>

                          {/* Purchases Count */}
                          <td>
                            <span style={{ fontWeight: 600 }}>{student.purchaseCount}</span>{" "}
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>orders</span>
                          </td>

                          {/* Last Purchase */}
                          <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                            {student.lastPurchaseDate
                              ? new Date(student.lastPurchaseDate).toLocaleDateString("en-GB")
                              : "—"}
                          </td>

                          {/* Expiry Date */}
                          <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                            {student.currentExpiryDate
                              ? new Date(student.currentExpiryDate).toLocaleDateString("en-GB")
                              : "—"}
                          </td>

                          {/* AI Tests Generated */}
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                background: student.aiTestsGenerated > 0 ? "rgba(110, 63, 243, 0.1)" : "rgba(255, 255, 255, 0.05)",
                                color: student.aiTestsGenerated > 0 ? "#A78BFA" : "var(--text-muted)",
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 11.5,
                                fontWeight: 600
                              }}
                            >
                              <Bot className="w-3 h-3" />
                              {student.aiTestsGenerated} generated
                            </span>
                          </td>

                          {/* Action */}
                          <td style={{ textAlign: "right" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openStudentDrawer(student.studentId);
                              }}
                              className="rev-dropdown-pill"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                            >
                              <span>History</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="sub-pagination-row">
                  <div>
                    Showing {Math.min((currentPage - 1) * pagination.limit + 1, pagination.total)} to{" "}
                    {Math.min(currentPage * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} subscribers
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      className="rev-page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span style={{ padding: "0 6px", fontWeight: 600, color: "#ffffff" }}>
                      Page {currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      className="rev-page-btn"
                      disabled={currentPage >= pagination.totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ================= 5. DRILL-DOWN DRAWER (SINGLE STUDENT PURCHASE HISTORY) ================= */}
      {selectedStudentId && (
        <div className="sub-drawer-overlay" onClick={closeStudentDrawer}>
          <div className="sub-drawer-panel" onClick={(e) => e.stopPropagation()}>
            
            {/* Drawer Sticky Header */}
            <div className="sub-drawer-header">
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  Subscriber Purchase History
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                  Detailed audit of all AI subscription plans and transactions.
                </p>
              </div>
              <button
                onClick={closeStudentDrawer}
                className="rev-page-btn"
                style={{ width: 32, height: 32, borderRadius: "50%" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="sub-drawer-body">
              {drawerLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-40 w-full rounded-lg" />
                </div>
              ) : !drawerData?.student ? (
                <div className="sub-empty-state">
                  <p>Student profile could not be loaded.</p>
                </div>
              ) : (
                <>
                  {/* Student Profile Hero */}
                  <div className="sub-student-profile-hero">
                    <div className="sub-student-avatar">
                      {drawerData.student.avatar ? (
                        <img
                          src={drawerData.student.avatar}
                          alt={drawerData.student.fullName}
                          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        drawerData.student.fullName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                          {drawerData.student.fullName}
                        </h4>
                        {drawerData.student.isPremium ? (
                          <Badge variant="success" className="gap-1 font-semibold text-[10.5px]">
                            <CheckCircle2 className="w-3 h-3" /> Premium Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-semibold text-[10.5px]">
                            Free / Expired
                          </Badge>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                        {drawerData.student.email} {drawerData.student.phone ? `• ${drawerData.student.phone}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        <Calendar className="w-3 h-3" /> Joined {new Date(drawerData.student.createdAt).toLocaleDateString("en-GB")}
                        <span>•</span>
                        <Zap className="w-3 h-3 text-amber-400" /> {drawerData.student.aiCredits || 0} Credits
                      </div>
                    </div>
                  </div>

                  {/* 3-Tile Summary Row */}
                  <div className="sub-stats-summary-grid">
                    <div className="sub-stat-tile">
                      <div className="sub-stat-tile-label">Lifetime Spend</div>
                      <div className="sub-stat-tile-val" style={{ color: "#34D399" }}>
                        ₹{drawerData.stats?.totalSpend?.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="sub-stat-tile">
                      <div className="sub-stat-tile-label">Total Purchases</div>
                      <div className="sub-stat-tile-val" style={{ color: "#818CF8" }}>
                        {drawerData.stats?.totalPurchases || 0}
                      </div>
                    </div>

                    <div className="sub-stat-tile">
                      <div className="sub-stat-tile-label">AI Tests Made</div>
                      <div className="sub-stat-tile-val" style={{ color: "#F472B6" }}>
                        {drawerData.stats?.aiTestsGenerated || 0}
                      </div>
                    </div>
                  </div>

                  {/* Purchase Ledger Table */}
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px 0", color: "var(--text-primary)" }}>
                      Subscription Records ({drawerData.subscriptions?.length || 0})
                    </h4>

                    {drawerData.subscriptions?.length === 0 ? (
                      <div className="sub-empty-state" style={{ padding: "24px 0" }}>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No subscriptions recorded for this student.</p>
                      </div>
                    ) : (
                      <div className="sub-table-wrap" style={{ marginTop: 0 }}>
                        <table className="sub-table" style={{ minWidth: 500 }}>
                          <thead>
                            <tr>
                              <th>PLAN</th>
                              <th>AMOUNT</th>
                              <th>GATEWAY</th>
                              <th>START DATE</th>
                              <th>EXPIRY</th>
                              <th>STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drawerData.subscriptions.map((sub) => (
                              <tr key={sub._id}>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: 12 }}>
                                    {sub.planNameSnapshot || sub.planId?.name || "AI Plan"}
                                  </div>
                                  <div style={{ fontSize: 10.5, color: "var(--text-muted)", fontFamily: "monospace" }}>
                                    {sub.purchaseId}
                                  </div>
                                </td>
                                <td style={{ fontWeight: 700 }}>
                                  ₹{sub.amount}
                                </td>
                                <td>
                                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                                    <CreditCard className="w-2.5 h-2.5 mr-1" />
                                    {sub.paymentGateway}
                                  </Badge>
                                </td>
                                <td style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                                  {new Date(sub.startDate).toLocaleDateString("en-GB")}
                                </td>
                                <td style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                                  {new Date(sub.expiryDate).toLocaleDateString("en-GB")}
                                </td>
                                <td>
                                  {getStatusBadge(sub.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
