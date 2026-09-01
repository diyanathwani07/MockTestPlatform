import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  TrendingUp,
  DollarSign,
  Users,
  RefreshCcw,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  Lock,
  TrendingDown,
  FileText
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/RevenueDashboard.css";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STANDARD_PLANS = [
  { name: "Free Plan", color: "#8B5CF6" },
  { name: "Basic Plan", color: "#3B82F6" },
  { name: "Standard Plan", color: "#10B981" },
  { name: "Premium Plan", color: "#F59E0B" },
  { name: "Enterprise Plan", color: "#F97316" },
  { name: "Other Plans", color: "#64748B" }
];

export default function RevenueDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchRevenueData = async (selectedPeriod) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/revenue/analytics?period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setData(res.data);
    } catch (error) {
      console.error("Failed to load revenue analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData(period);
  }, [period]);

  const handlePeriodChange = (val) => {
    setPeriod(val);
  };

  // Filtered subscriptions list
  const filteredSubscriptions = useMemo(() => {
    if (!data?.recentSubscriptions) return [];
    return data.recentSubscriptions.filter((sub) => {
      const matchesStatus =
        statusFilter === "all" ? true : sub.status === statusFilter;
      const studentName = sub.studentId?.fullName || "";
      const studentEmail = sub.studentId?.email || "";
      const planName = sub.planNameSnapshot || sub.planId?.name || "";
      const purchaseId = sub.purchaseId || "";
      const matchesSearch =
        studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchaseId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [data, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage) || 1;
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubscriptions.slice(start, start + itemsPerPage);
  }, [filteredSubscriptions, currentPage]);

  const kpis = data?.kpis || {
    totalRevenue: 0,
    activeRevenue: 0,
    paidSubscriptionsCount: 0,
    activeSubscriptionsCount: 0,
    expiredSubscriptionsCount: 0,
    distinctPayingStudentsCount: 0,
    newSubscriptions: 0,
    renewalSubscriptions: 0,
    arpu: 0,
    renewalRate: 0
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

  // Compute plan breakdown map for standard display
  const planDistributionList = useMemo(() => {
    const totalRev = kpis.totalRevenue || 0;
    const planMap = {};
    (data?.revenueByPlan || []).forEach((p) => {
      planMap[p.planName?.toLowerCase()] = p.totalRevenue;
    });

    let categorizedTotal = 0;
    const list = STANDARD_PLANS.map((plan) => {
      const matchKey = Object.keys(planMap).find((k) =>
        k.includes(plan.name.toLowerCase().replace(" plan", ""))
      );
      const amount = matchKey ? planMap[matchKey] : 0;
      categorizedTotal += amount;
      const pct = totalRev > 0 ? Math.round((amount / totalRev) * 100) : 0;
      return {
        ...plan,
        amount,
        pct
      };
    });

    return {
      plans: list,
      totalAmount: totalRev,
      totalPct: totalRev > 0 ? 100 : 0
    };
  }, [data, kpis]);

  const hasRevenueData = (data?.revenueOverTime?.length || 0) > 0;
  const hasPlanData = (data?.revenueByPlan?.length || 0) > 0;

  // Mock axes ticks for empty chart state to render a realistic financial frame
  const emptyChartData = [
    { period: "Jan", revenue: 0 },
    { period: "Feb", revenue: 0 },
    { period: "Mar", revenue: 0 },
    { period: "Apr", revenue: 0 },
    { period: "May", revenue: 0 },
    { period: "Jun", revenue: 0 },
    { period: "Jul", revenue: 0 },
    { period: "Aug", revenue: 0 },
    { period: "Sep", revenue: 0 },
    { period: "Oct", revenue: 0 },
    { period: "Nov", revenue: 0 },
    { period: "Dec", revenue: 0 }
  ];

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Revenue Analytics" />

        <div className="revenue-dashboard-container">
          
          {/* ================= 1. PAGE HEADER & INTRO ================= */}
          <div className="revenue-page-header">
            <div className="revenue-title-area">
              <div className="revenue-breadcrumb">
                <button
                  onClick={() => navigate("/admin/ai-plans")}
                  className="revenue-breadcrumb-link"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  AI Plans
                </button>
                <span>/</span>
                <span>Revenue Dashboard</span>
              </div>
              <h1 className="revenue-page-title">
                AI Subscription Revenue
              </h1>
              <p className="revenue-page-subtitle">
                Real-time financial performance, subscriber growth, and plan-wise analytics.
              </p>
            </div>

            {/* Header Right Controls: Monthly/Yearly segmented switch + Refresh button */}
            <div className="revenue-header-actions">
              <div className="revenue-timeframe-switch">
                <button
                  className={`revenue-timeframe-btn ${period === "monthly" ? "active" : ""}`}
                  onClick={() => handlePeriodChange("monthly")}
                >
                  Monthly
                </button>
                <button
                  className={`revenue-timeframe-btn ${period === "yearly" ? "active" : ""}`}
                  onClick={() => handlePeriodChange("yearly")}
                >
                  Yearly
                </button>
              </div>

              <button
                onClick={() => fetchRevenueData(period)}
                className="revenue-refresh-btn"
                title="Refresh Analytics Data"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* ================= 2. KPI SUMMARY (4 EQUAL-WIDTH CARDS) ================= */}
          <div className="rev-kpi-grid">
            
            {/* KPI 1: Total Gross Revenue */}
            <div className="rev-card rev-kpi-card">
              <div className="rev-kpi-top">
                <span className="rev-kpi-label">TOTAL GROSS REVENUE</span>
                <div className="rev-kpi-icon-box" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
                  ₹
                </div>
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-8 w-24 my-1" />
                ) : (
                  <div className="rev-kpi-value">
                    ₹{kpis.totalRevenue.toLocaleString("en-IN")}
                  </div>
                )}
              </div>
              <div className="rev-kpi-bottom">
                <span>Active Recurring:</span>
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                  ₹{kpis.activeRevenue.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="rev-kpi-accent-bar" style={{ background: "#f59e0b" }} />
            </div>

            {/* KPI 2: New vs Renewals */}
            <div className="rev-card rev-kpi-card">
              <div className="rev-kpi-top">
                <span className="rev-kpi-label">NEW VS. RENEWALS</span>
                <div className="rev-kpi-icon-box" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-8 w-24 my-1" />
                ) : (
                  <div className="rev-kpi-value">
                    {kpis.paidSubscriptionsCount} <span className="subtext">total</span>
                  </div>
                )}
              </div>
              <div className="rev-kpi-bottom" style={{ fontWeight: 600 }}>
                <span style={{ color: "#60a5fa" }}>{kpis.newSubscriptions} New</span>
                <span style={{ color: "#fb923c" }}>{kpis.renewalSubscriptions} Renewals</span>
              </div>
              <div className="rev-kpi-accent-bar" style={{ background: "#3b82f6" }} />
            </div>

            {/* KPI 3: ARPU */}
            <div className="rev-card rev-kpi-card">
              <div className="rev-kpi-top">
                <span className="rev-kpi-label">ARPU (AVG PER STUDENT)</span>
                <div className="rev-kpi-icon-box" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-8 w-24 my-1" />
                ) : (
                  <div className="rev-kpi-value">
                    ₹{kpis.arpu.toLocaleString("en-IN")}
                  </div>
                )}
              </div>
              <div className="rev-kpi-bottom">
                <span>Paying Students:</span>
                <span style={{ color: "#34d399", fontWeight: 700 }}>
                  {kpis.distinctPayingStudentsCount}
                </span>
              </div>
              <div className="rev-kpi-accent-bar" style={{ background: "#10b981" }} />
            </div>

            {/* KPI 4: Renewal Retention Rate */}
            <div className="rev-card rev-kpi-card">
              <div className="rev-kpi-top">
                <span className="rev-kpi-label">RENEWAL RETENTION RATE</span>
                <div className="rev-kpi-icon-box" style={{ background: "rgba(234, 179, 8, 0.15)", color: "#eab308" }}>
                  <RefreshCcw className="w-4 h-4" />
                </div>
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-8 w-24 my-1" />
                ) : (
                  <div className="rev-kpi-value">
                    {kpis.renewalRate}%
                  </div>
                )}
              </div>
              <div className="rev-kpi-bottom">
                <span>Active Subscriptions:</span>
                <span style={{ color: "#facc15", fontWeight: 700 }}>
                  {kpis.activeSubscriptionsCount}
                </span>
              </div>
              <div className="rev-kpi-accent-bar" style={{ background: "#eab308" }} />
            </div>

          </div>

          {/* ================= 3. MIDDLE ROW: TWO ANALYTICS PANELS SIDE BY SIDE ================= */}
          <div className="rev-charts-grid">
            
            {/* Left Panel: Revenue Trajectory */}
            <div className="rev-card rev-chart-card">
              <div className="rev-card-header">
                <div>
                  <h2 className="rev-card-title">Revenue Trajectory</h2>
                  <p className="rev-card-subtitle">Month-by-month financial trend</p>
                </div>
                <div className="rev-dropdown-pill">
                  <span>Monthly Trend</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </div>
              </div>

              <div className="rev-trajectory-wrapper">
                {loading ? (
                  <Skeleton className="h-full w-full rounded-lg" />
                ) : hasRevenueData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenueOverTime} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="period" stroke="rgba(255,255,255,0.4)" fontSize={10.5} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10.5} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1c1b2e",
                          borderColor: "#2e2c45",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "12px"
                        }}
                        formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  // Intentional styled empty state chart frame with axes & gridlines
                  <div className="relative h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={emptyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="period" stroke="rgba(255,255,255,0.4)" fontSize={10.5} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} stroke="rgba(255,255,255,0.4)" fontSize={10.5} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      </AreaChart>
                    </ResponsiveContainer>

                    {/* Center Empty State Badge */}
                    <div className="rev-chart-empty-center">
                      <div className="rev-empty-circle-badge">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <p className="rev-empty-chart-text">
                        No subscription revenue recorded yet for this timeframe.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Legend */}
              <div className="rev-chart-legend-row">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 2.5, backgroundColor: "#8B5CF6", borderRadius: 2, display: "inline-block" }} />
                  <span>Revenue (₹)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 0, borderTop: "2px dashed #94a3b8", display: "inline-block" }} />
                  <span>Previous Period (₹)</span>
                </div>
              </div>
            </div>

            {/* Right Panel: Plan-Wise Revenue Distribution */}
            <div className="rev-card rev-chart-card">
              <div className="rev-card-header">
                <div>
                  <h2 className="rev-card-title">Plan-Wise Revenue Distribution</h2>
                  <p className="rev-card-subtitle">Gross revenue generated per AI tier</p>
                </div>
                <div className="rev-dropdown-pill">
                  <span>Plan Breakdown</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </div>
              </div>

              <div className="rev-donut-layout">
                {/* Left: Donut Chart or Clean Ring Graphic */}
                <div className="rev-donut-center-container">
                  {hasPlanData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.revenueByPlan}
                          dataKey="totalRevenue"
                          nameKey="planName"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                        >
                          {data.revenueByPlan.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={STANDARD_PLANS[index % STANDARD_PLANS.length].color}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1c1b2e",
                            borderColor: "#2e2c45",
                            borderRadius: "8px",
                            color: "#ffffff",
                            fontSize: "12px"
                          }}
                          formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    // SVG Donut Ring Empty State
                    <div style={{ position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="12"
                          fill="transparent"
                        />
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 12 }}>
                        <div className="rev-empty-circle-badge" style={{ width: 34, height: 34, marginBottom: 4 }}>
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, lineHeight: 1.25, maxWidth: 100 }}>
                          No plan purchase distribution data available.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Categorized Plan List */}
                <div className="rev-plan-list">
                  {planDistributionList.plans.map((plan, idx) => (
                    <div key={idx} className="rev-plan-row">
                      <div className="rev-plan-left">
                        <span className="rev-plan-dot" style={{ backgroundColor: plan.color }} />
                        <span className="rev-plan-name">{plan.name}</span>
                      </div>
                      <span className="rev-plan-val">
                        ₹{plan.amount} ({plan.pct}%)
                      </span>
                    </div>
                  ))}

                  <div className="rev-plan-total-row">
                    <span>Total</span>
                    <span className="rev-plan-val" style={{ color: "#ffffff", fontWeight: 700 }}>
                      ₹{planDistributionList.totalAmount} ({planDistributionList.totalPct}%)
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ================= 4. AI SUBSCRIPTION PLAN PERFORMANCE (FULL WIDTH) ================= */}
          <div className="rev-card rev-performance-card">
            <div>
              <h2 className="rev-card-title">AI Subscription Plan Performance</h2>
              <p className="rev-card-subtitle">
                Detailed breakdown of sales volume, active subscribers, and average order values.
              </p>
            </div>

            <div className="rev-performance-content">
              {/* 4 Compact Metric Blocks */}
              <div className="rev-perf-stats-row">
                
                {/* Stat 1: Total Plans Sold */}
                <div className="rev-perf-stat-box">
                  <div className="rev-perf-icon-wrap" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="rev-perf-title">TOTAL PLANS SOLD</div>
                    <div className="rev-perf-number">{kpis.paidSubscriptionsCount}</div>
                  </div>
                </div>

                {/* Stat 2: Active Subscribers */}
                <div className="rev-perf-stat-box">
                  <div className="rev-perf-icon-wrap" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="rev-perf-title">ACTIVE SUBSCRIBERS</div>
                    <div className="rev-perf-number">{kpis.activeSubscriptionsCount}</div>
                  </div>
                </div>

                {/* Stat 3: Avg Order Value */}
                <div className="rev-perf-stat-box">
                  <div className="rev-perf-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="rev-perf-title">AVG ORDER VALUE</div>
                    <div className="rev-perf-number">₹{kpis.arpu}</div>
                  </div>
                </div>

                {/* Stat 4: Churn Rate */}
                <div className="rev-perf-stat-box">
                  <div className="rev-perf-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="rev-perf-title">CHURN RATE</div>
                    <div className="rev-perf-number">
                      {kpis.paidSubscriptionsCount > 0 ? Math.max(0, 100 - kpis.renewalRate) : 0}%
                    </div>
                  </div>
                </div>

              </div>

              {/* Right: Empty State Graphic */}
              <div className="rev-perf-empty-right">
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, opacity: 0.8 }}>
                  <div style={{ width: 6, height: 18, background: "rgba(168, 85, 247, 0.3)", border: "1px solid #c084fc", borderRadius: "2px 2px 0 0" }} />
                  <div style={{ width: 6, height: 28, background: "rgba(236, 72, 153, 0.3)", border: "1px solid #f472b6", borderRadius: "2px 2px 0 0" }} />
                  <div style={{ width: 6, height: 14, background: "rgba(59, 130, 246, 0.3)", border: "1px solid #60a5fa", borderRadius: "2px 2px 0 0" }} />
                  <div style={{ width: 6, height: 22, background: "rgba(99, 102, 241, 0.3)", border: "1px solid #818cf8", borderRadius: "2px 2px 0 0" }} />
                </div>
                <span>No active plan metrics recorded yet.</span>
              </div>

            </div>
          </div>

          {/* ================= 5. RECENT SUBSCRIPTIONS LEDGER (FULL WIDTH TABLE) ================= */}
          <div className="rev-card rev-ledger-card">
            <div className="rev-card-header" style={{ marginBottom: 12 }}>
              <div>
                <h2 className="rev-card-title">Recent Subscriptions Ledger</h2>
                <p className="rev-card-subtitle">
                  Source-of-truth transaction records from the Subscription collection.
                </p>
              </div>

              {/* Controls: Search + Status Dropdown */}
              <div className="rev-ledger-controls">
                <div className="rev-search-input-wrap">
                  <Search className="w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search student, plan, ref..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="rev-search-input"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rev-status-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 0" }}>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : paginatedSubscriptions.length === 0 ? (
              <div className="rev-table-empty">
                <div className="rev-empty-circle-badge">
                  <FileText className="w-5 h-5" />
                </div>
                <p style={{ fontSize: 12.5, color: "#94a3b8", fontWeight: 500, margin: 0 }}>
                  No subscription records found matching your filters.
                </p>
              </div>
            ) : (
              <div>
                <div className="rev-table-container">
                  <table className="rev-table">
                    <thead>
                      <tr>
                        <th>STUDENT</th>
                        <th>PLAN</th>
                        <th>AMOUNT</th>
                        <th>STATUS</th>
                        <th>TRANSACTION ID</th>
                        <th>DATE</th>
                        <th>NEXT RENEWAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSubscriptions.map((sub) => (
                        <tr key={sub._id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                              {sub.studentId?.fullName || "Student"}
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>
                              {sub.studentId?.email || "No Email"}
                            </div>
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            {sub.planNameSnapshot || sub.planId?.name || "AI Plan"}
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            ₹{sub.amount}
                          </td>
                          <td>
                            {getStatusBadge(sub.status)}
                          </td>
                          <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#94a3b8" }}>
                            {sub.purchaseId}
                          </td>
                          <td style={{ color: "#94a3b8" }}>
                            {new Date(sub.startDate).toLocaleDateString("en-GB")}
                          </td>
                          <td style={{ color: "#94a3b8" }}>
                            {new Date(sub.expiryDate).toLocaleDateString("en-GB")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="rev-table-pagination">
                  <div>
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredSubscriptions.length)} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredSubscriptions.length)} of{" "}
                    {filteredSubscriptions.length} records
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
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="rev-page-btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  );
}
