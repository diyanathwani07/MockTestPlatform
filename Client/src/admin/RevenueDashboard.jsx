import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  TrendingUp,
  DollarSign,
  Users,
  RefreshCcw,
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
  FileText,
  Sparkles,
  Layers,
  BookOpen,
  Receipt,
  Download,
  AlertTriangle,
  Info,
  ShieldCheck,
  Eye,
  ExternalLink,
  X,
  HelpCircle,
  Zap,
  BarChart3,
  Bot,
  LayoutGrid,
  List
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import AdminAiPlans from "./AiPlans";
import AiSubscribers from "./AiSubscribers";
import "../css/admin/AdminLayout.css";
import "../css/admin/RevenueDashboard.css";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Date presets for financial reporting
const DATE_PRESETS = [
  { key: "30d", label: "Last 30 Days" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 Days" },
  { key: "this_month", label: "This Month" },
  { key: "this_year", label: "This Year" },
  { key: "custom", label: "Custom Range" }
];

const STANDARD_PLANS = [
  { name: "Free Plan", color: "#8B5CF6" },
  { name: "Basic Plan", color: "#3B82F6" },
  { name: "Standard Plan", color: "#10B981" },
  { name: "Premium Plan", color: "#F59E0B" },
  { name: "Enterprise Plan", color: "#F97316" },
  { name: "Other Plans", color: "#64748B" }
];

const formatCurrency = (val) => {
  const num = Number(val);
  return isNaN(num) ? "0" : num.toLocaleString("en-IN");
};

export default function RevenueDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // Parse active tab and subtab from URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get("tab") || "overview";
  const initialSubTab = queryParams.get("subtab") || "ai-overview";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [aiSubTab, setAiSubTab] = useState(initialSubTab);

  // Synchronize URL query params
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    const newParams = new URLSearchParams(location.search);
    newParams.set("tab", tabKey);
    if (tabKey === "ai-plans") {
      newParams.set("subtab", aiSubTab);
    } else {
      newParams.delete("subtab");
    }
    navigate({ search: newParams.toString() }, { replace: true });
  };

  const handleAiSubTabChange = (subKey) => {
    setAiSubTab(subKey);
    const newParams = new URLSearchParams(location.search);
    newParams.set("tab", "ai-plans");
    newParams.set("subtab", subKey);
    navigate({ search: newParams.toString() }, { replace: true });
  };

  // Date Filtering State
  const [datePreset, setDatePreset] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [period, setPeriod] = useState("monthly"); // monthly vs yearly vs daily

  // Main Analytics Data
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Transactions Tab State
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsData, setTransactionsData] = useState([]);
  const [txSearch, setTxSearch] = useState("");
  const [txGateway, setTxGateway] = useState("all");
  const [txCategory, setTxCategory] = useState("all");
  const [txProvenance, setTxProvenance] = useState("all");
  const [txStatus, setTxStatus] = useState("all");
  const [txPage, setTxPage] = useState(1);
  const [txPagination, setTxPagination] = useState({ total: 0, totalPages: 1, limit: 15 });
  const [txViewMode, setTxViewMode] = useState("auto"); // "auto" | "cards" | "table"

  // Customers Tab State
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersData, setCustomersData] = useState([]);
  const [custSearch, setCustSearch] = useState("");
  const [custStatus, setCustStatus] = useState("all");
  const [custPage, setCustPage] = useState(1);
  const [custPagination, setCustPagination] = useState({ total: 0, totalPages: 1, limit: 15 });
  const [custViewMode, setCustViewMode] = useState("auto"); // "auto" | "cards" | "table"
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Exams & Practice Tab State
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogData, setCatalogData] = useState(null);
  const [catalogTab, setCatalogTab] = useState("quizzes");
  const [catalogSearch, setCatalogSearch] = useState("");

  // AI Usage Analytics State
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageData, setUsageData] = useState(null);

  // Reports Tab State
  const [selectedReportType, setSelectedReportType] = useState("revenue_summary");

  const token = localStorage.getItem("token");
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Fetch Main Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${import.meta.env.VITE_API_URL}/api/admin/revenue/analytics?period=${period}&datePreset=${datePreset}`;
      if (datePreset === "custom" && customFrom) url += `&from=${customFrom}`;
      if (datePreset === "custom" && customTo) url += `&to=${customTo}`;

      const res = await axios.get(url, { headers: authHeaders });
      setAnalyticsData(res.data);
    } catch (err) {
      console.error("Failed to load revenue analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [period, datePreset, customFrom, customTo, authHeaders]);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      let url = `${import.meta.env.VITE_API_URL}/api/admin/revenue/transactions?page=${txPage}&limit=15&search=${encodeURIComponent(txSearch)}&status=${txStatus}&gateway=${txGateway}&category=${txCategory}&provenance=${txProvenance}`;
      if (datePreset === "custom" && customFrom) url += `&from=${customFrom}`;
      if (datePreset === "custom" && customTo) url += `&to=${customTo}`;

      const res = await axios.get(url, { headers: authHeaders });
      setTransactionsData(res.data.transactions || []);
      setTxPagination(res.data.pagination || { total: 0, totalPages: 1, limit: 15 });
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setTransactionsLoading(false);
    }
  }, [txPage, txSearch, txStatus, txGateway, txCategory, txProvenance, datePreset, customFrom, customTo, authHeaders]);

  // Fetch Customers
  const fetchCustomers = useCallback(async () => {
    try {
      setCustomersLoading(true);
      const url = `${import.meta.env.VITE_API_URL}/api/admin/revenue/customers?page=${custPage}&limit=15&search=${encodeURIComponent(custSearch)}&status=${custStatus}`;
      const res = await axios.get(url, { headers: authHeaders });
      setCustomersData(res.data.customers || []);
      setCustPagination(res.data.pagination || { total: 0, totalPages: 1, limit: 15 });
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setCustomersLoading(false);
    }
  }, [custPage, custSearch, custStatus, authHeaders]);

  // Fetch Exams & Practice Catalog
  const fetchCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/revenue/exams-practice`, {
        headers: authHeaders
      });
      setCatalogData(res.data);
    } catch (err) {
      console.error("Failed to load catalog financials:", err);
    } finally {
      setCatalogLoading(false);
    }
  }, [authHeaders]);

  // Fetch AI Usage Analytics
  const fetchAiUsage = useCallback(async () => {
    try {
      setUsageLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/revenue/ai-usage`, {
        headers: authHeaders
      });
      setUsageData(res.data);
    } catch (err) {
      console.error("Failed to load AI usage analytics:", err);
    } finally {
      setUsageLoading(false);
    }
  }, [authHeaders]);

  // Initial and reactive data loads
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (activeTab === "transactions") fetchTransactions();
    if (activeTab === "customers") fetchCustomers();
    if (activeTab === "exams-practice") fetchCatalog();
    if (activeTab === "ai-plans" && aiSubTab === "usage-analytics") fetchAiUsage();
  }, [activeTab, aiSubTab, fetchTransactions, fetchCustomers, fetchCatalog, fetchAiUsage]);

  // KPIs shorthand
  const kpis = {
    totalRevenue: 0,
    verifiedRevenue: 0,
    simulatedRevenue: 0,
    adminGrantsAmount: 0,
    todayRevenue: 0,
    thisMonthRevenue: 0,
    activeRevenue: 0,
    paidSubscriptionsCount: 0,
    activeSubscriptionsCount: 0,
    distinctPayingStudentsCount: 0,
    arpu: 0,
    renewalRate: 0,
    renewalSubscriptions: 0,
    ...(analyticsData?.kpis || {})
  };

  // CSV Export utility
  const downloadCsv = (filename, rows) => {
    if (!rows || !rows.length) return alert("No data available to export.");
    const separator = ",";
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      "\n" +
      rows
        .map((row) =>
          keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? "" : row[k];
              cell = cell instanceof Date ? cell.toLocaleString() : String(cell).replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
              return cell;
            })
            .join(separator)
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export handlers
  const handleExportTransactions = () => {
    if (!transactionsData.length) return alert("No transaction records to export.");
    const rows = transactionsData.map((t) => ({
      Transaction_ID: t.purchaseId || t._id,
      Gateway_Txn_ID: t.gatewayTxnId || "N/A",
      Student_Name: t.studentId?.fullName || "N/A",
      Student_Email: t.studentId?.email || "N/A",
      Plan_Product: t.planNameSnapshot || t.planId?.name || "AI Plan",
      Amount_INR: t.amount,
      Payment_Gateway: t.paymentGateway,
      Provenance: t.paymentGateway === "admin_grant" ? "Admin Grant" : "Sandbox Simulation",
      Status: t.status,
      Start_Date: t.startDate ? new Date(t.startDate).toLocaleDateString() : "N/A",
      Expiry_Date: t.expiryDate ? new Date(t.expiryDate).toLocaleDateString() : "N/A"
    }));
    downloadCsv("PrepMark_Transactions", rows);
  };

  const handleExportCustomers = () => {
    if (!customersData.length) return alert("No customer records to export.");
    const rows = customersData.map((c) => ({
      Student_ID: c._id,
      Full_Name: c.fullName,
      Email: c.email,
      Phone: c.phone,
      Status: c.isPremium ? "Premium Subscriber" : "Free Student",
      Active_Plan: c.activePlan?.name || "None",
      Entitled_Exams: c.purchasedExamsCount,
      Entitled_Practice: c.purchasedPracticeCount,
      Total_Subscriptions: c.totalSubscriptionsCount,
      Recorded_Spend_INR: c.totalSpent,
      Joined_Date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "N/A"
    }));
    downloadCsv("PrepMark_Customers_Financial", rows);
  };

  // Status Badge Helper
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

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Revenue Management" parentText="Dashboard" parentLink="/admin/dashboard" />

        <div className="revenue-dashboard-container">
          
          {/* ================= 1. DASHBOARD HEADER & FILTER BAR ================= */}
          <div className="revenue-page-header">
            <div className="revenue-title-area">
              <div className="revenue-title-row">
                <h1 className="revenue-page-title">Revenue Management</h1>
                <Badge variant="outline" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6", borderColor: "rgba(139, 92, 246, 0.3)", fontSize: "11px", fontWeight: "700" }}>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> RBAC Enforced
                </Badge>
              </div>
              <p className="revenue-page-subtitle">
                Centralized financial operations, subscriber intelligence, catalog monetization, and audit logs.
              </p>
            </div>

            {/* Header Right Actions: Date Preset Selector & Refresh Button */}
            <div className="revenue-header-actions">
              <div className="revenue-date-picker-wrap">
                <Calendar className="w-3.5 h-3.5 text-violet-400" />
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value)}
                  className="revenue-preset-select"
                >
                  {DATE_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {datePreset === "custom" && (
                <div className="revenue-custom-dates-bar">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="revenue-date-input"
                  />
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="revenue-date-input"
                  />
                  <button
                    onClick={fetchAnalytics}
                    className="revenue-apply-btn"
                  >
                    Apply
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  fetchAnalytics();
                  if (activeTab === "transactions") fetchTransactions();
                  if (activeTab === "customers") fetchCustomers();
                  if (activeTab === "exams-practice") fetchCatalog();
                  if (activeTab === "ai-plans" && aiSubTab === "usage-analytics") fetchAiUsage();
                }}
                className="revenue-refresh-btn"
                title="Refresh All Revenue Data"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* ================= 2. PRIMARY NAVIGATION TABS (6 SECTIONS) ================= */}
          <div className="revenue-nav-tabs-bar">
            {[
              { key: "overview", label: "Overview", icon: TrendingUp },
              { key: "ai-plans", label: "AI Plans", icon: Sparkles },
              { key: "exams-practice", label: "Exams & Practice", icon: BookOpen },
              { key: "transactions", label: "Transactions", icon: Receipt },
              { key: "customers", label: "Customers", icon: Users },
              { key: "reports", label: "Reports", icon: FileText }
            ].map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={`revenue-nav-tab ${isActive ? "active" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* ================= 3. TAB 1: OVERVIEW ================= */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* Financial Integrity & Provenance Alert Banner */}
              <div className="revenue-provenance-banner">
                <div className="revenue-provenance-left">
                  <div className="revenue-provenance-icon">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="revenue-provenance-title">
                      Financial Provenance & Verification Notice
                    </h4>
                    <p className="revenue-provenance-desc">
                      PrepMark is operating in Sandbox Simulation mode. Verified customer revenue reflects ₹0 until production bank gateway activation.
                    </p>
                  </div>
                </div>

                <div className="revenue-provenance-chips">
                  <span className="revenue-provenance-chip verified">
                    Verified Bank: ₹{formatCurrency(kpis.verifiedRevenue)}
                  </span>
                  <span className="revenue-provenance-chip simulated">
                    Simulated Sandbox: ₹{formatCurrency(kpis.simulatedRevenue)}
                  </span>
                  <span className="revenue-provenance-chip admin-grants">
                    Admin Grants: ₹{formatCurrency(kpis.adminGrantsAmount)}
                  </span>
                </div>
              </div>

              {/* 6 Headline KPI Cards */}
              <div className="revenue-kpi-grid">
                {/* 1. Total Verified Revenue */}
                <div className="revenue-kpi-card">
                  <div className="revenue-kpi-top">
                    <span className="revenue-kpi-label">TOTAL VERIFIED REVENUE</span>
                    <div className="revenue-kpi-icon-box" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="revenue-kpi-value">
                    ₹{formatCurrency(kpis.verifiedRevenue)}
                  </div>
                  <div className="revenue-kpi-subtitle">
                    Simulated Sandbox: <strong style={{ color: "#8B5CF6" }}>₹{formatCurrency(kpis.simulatedRevenue)}</strong>
                  </div>
                  <div className="revenue-kpi-accent-bar" style={{ background: "#10B981" }} />
                </div>

                {/* 2. Revenue Today */}
                <div className="revenue-kpi-card">
                  <div className="revenue-kpi-top">
                    <span className="revenue-kpi-label">REVENUE TODAY</span>
                    <div className="revenue-kpi-icon-box" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6" }}>
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="revenue-kpi-value">
                    ₹{formatCurrency(kpis.todayRevenue)}
                  </div>
                  <div className="revenue-kpi-subtitle">
                    Since 12:00 AM today
                  </div>
                  <div className="revenue-kpi-accent-bar" style={{ background: "#8B5CF6" }} />
                </div>

                {/* 3. Revenue This Month */}
                <div className="revenue-kpi-card">
                  <div className="revenue-kpi-top">
                    <span className="revenue-kpi-label">REVENUE THIS MONTH</span>
                    <div className="revenue-kpi-icon-box" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" }}>
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="revenue-kpi-value">
                    ₹{formatCurrency(kpis.thisMonthRevenue)}
                  </div>
                  <div className="revenue-kpi-subtitle">
                    Active calendar month
                  </div>
                  <div className="revenue-kpi-accent-bar" style={{ background: "#3B82F6" }} />
                </div>

                {/* 4. Successful Transactions */}
                <div className="revenue-kpi-card">
                  <div className="revenue-kpi-top">
                    <span className="revenue-kpi-label">SUCCESSFUL ORDERS</span>
                    <div className="revenue-kpi-icon-box" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="revenue-kpi-value">
                    {kpis.paidSubscriptionsCount}
                  </div>
                  <div className="revenue-kpi-subtitle">
                    All-time recorded purchases
                  </div>
                  <div className="revenue-kpi-accent-bar" style={{ background: "#10B981" }} />
                </div>

                {/* 5. Active Paid Subscriptions */}
                <div className="revenue-kpi-card">
                  <div className="revenue-kpi-top">
                    <span className="revenue-kpi-label">ACTIVE SUBSCRIPTIONS</span>
                    <div className="revenue-kpi-icon-box" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" }}>
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="revenue-kpi-value">
                    {kpis.activeSubscriptionsCount}
                  </div>
                  <div className="revenue-kpi-subtitle">
                    Active recurring ARR: <strong style={{ color: "#F59E0B" }}>₹{formatCurrency(kpis.activeRevenue)}</strong>
                  </div>
                  <div className="revenue-kpi-accent-bar" style={{ background: "#F59E0B" }} />
                </div>

                {/* 6. Paying Students */}
                <div className="revenue-kpi-card">
                  <div className="revenue-kpi-top">
                    <span className="revenue-kpi-label">PAYING STUDENTS</span>
                    <div className="revenue-kpi-icon-box" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6" }}>
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="revenue-kpi-value">
                    {kpis.distinctPayingStudentsCount}
                  </div>
                  <div className="revenue-kpi-subtitle">
                    ARPU: <strong style={{ color: "#8B5CF6" }}>₹{kpis.arpu}</strong>
                  </div>
                  <div className="revenue-kpi-accent-bar" style={{ background: "#8B5CF6" }} />
                </div>
              </div>

              {/* 2-Column Charts Row 1 */}
              <div className="revenue-analytics-row-1">
                {/* Left: Revenue Trend Over Time */}
                <div className="revenue-chart-card">
                  <div className="revenue-chart-header">
                    <div>
                      <h3 className="revenue-chart-title">Revenue Trajectory Over Time</h3>
                      <p className="revenue-chart-subtitle">Aggregate revenue trends by selected time interval</p>
                    </div>
                    <div className="revenue-timeframe-switch">
                      <button
                        className={`revenue-timeframe-btn ${period === "monthly" ? "active" : ""}`}
                        onClick={() => setPeriod("monthly")}
                      >
                        Monthly
                      </button>
                      <button
                        className={`revenue-timeframe-btn ${period === "yearly" ? "active" : ""}`}
                        onClick={() => setPeriod("yearly")}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>

                  <div style={{ height: "230px", width: "100%" }}>
                    {loading ? (
                      <Skeleton className="w-full h-full rounded-xl" />
                    ) : (analyticsData?.revenueOverTime?.length || 0) > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.revenueOverTime}>
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.6} />
                          <XAxis dataKey="period" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                          <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip
                            contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px" }}
                            formatter={(val) => [`₹${val}`, "Revenue"]}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" dot={{ r: 4, fill: "#8B5CF6" }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                        <Receipt className="w-8 h-8 mb-2" style={{ opacity: 0.4 }} />
                        <span>No historical transaction records found for this period.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Monetization Category Distribution */}
                <div className="revenue-chart-card">
                  <div className="revenue-chart-header">
                    <div>
                      <h3 className="revenue-chart-title">Monetization Categories</h3>
                      <p className="revenue-chart-subtitle">Revenue contribution & transaction provenance</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {(analyticsData?.categoryBreakdown || []).map((cat) => (
                      <div key={cat.category} className="revenue-cat-item">
                        <div>
                          <div style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text-primary)" }}>
                            {cat.category}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                            {cat.hasHistoricalLedger
                              ? `${cat.transactionsCount} transaction${cat.transactionsCount === 1 ? '' : 's'} recorded`
                              : "Live ledger ready • No legacy payments"}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "13.5px", fontWeight: "800", color: cat.hasHistoricalLedger ? "#8B5CF6" : "var(--text-secondary)" }}>
                            {cat.hasHistoricalLedger ? `₹${formatCurrency(cat.revenue)}` : "Data unavailable"}
                          </div>
                          <span style={{
                            fontSize: "10px",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontWeight: "600",
                            background: cat.hasHistoricalLedger ? "rgba(16, 185, 129, 0.12)" : "rgba(139, 92, 246, 0.12)",
                            color: cat.hasHistoricalLedger ? "#10B981" : "#8B5CF6"
                          }}>
                            {cat.hasHistoricalLedger ? "Ledger Active" : "Ledger Ready"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Plan Distribution & Recent Transactions */}
              <div className="revenue-analytics-row-2">
                {/* Plan Distribution Breakdown */}
                <div className="revenue-chart-card">
                  <div className="revenue-chart-header">
                    <div>
                      <h3 className="revenue-chart-title">Plan-Wise Distribution</h3>
                      <p className="revenue-chart-subtitle">Revenue volume by AI subscription tier</p>
                    </div>
                  </div>

                  <div className="revenue-plan-list">
                    {(() => {
                      const planMap = new Map();
                      (analyticsData?.revenueByPlan || []).forEach((plan) => {
                        const planRev = plan.revenue ?? plan.totalRevenue ?? 0;
                        const purchases = plan.subscribersCount ?? plan.totalPurchases ?? 0;
                        const active = plan.activeSubscribers ?? 0;
                        const cleanName = (plan.planName || "AI Plan").replace(/\s*\d{10,}$/, "").trim() || "AI Plan";
                        
                        if (!planMap.has(cleanName)) {
                          planMap.set(cleanName, {
                            planName: cleanName,
                            revenue: 0,
                            purchases: 0,
                            activeSubscribers: 0
                          });
                        }
                        const p = planMap.get(cleanName);
                        p.revenue += planRev;
                        p.purchases += purchases;
                        p.activeSubscribers += active;
                      });

                      const totalRev = kpis.totalRevenue || 1;
                      const list = Array.from(planMap.values()).sort((a, b) => b.revenue - a.revenue);

                      if (list.length === 0) {
                        return (
                          <p style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center", margin: "20px 0" }}>
                            No plan purchase data recorded yet.
                          </p>
                        );
                      }

                      return list.map((plan) => {
                        const pct = Math.round((plan.revenue / totalRev) * 100);
                        return (
                          <div key={plan.planName} className="revenue-plan-item">
                            <div className="revenue-plan-row-top">
                              <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>{plan.planName}</span>
                              <span style={{ fontWeight: "800", color: "#8B5CF6" }}>₹{formatCurrency(plan.revenue)} ({pct}%)</span>
                            </div>
                            <div className="revenue-plan-track">
                              <div className="revenue-plan-fill" style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <div className="revenue-plan-meta">
                              <span>{plan.purchases} purchase{plan.purchases === 1 ? '' : 's'}</span>
                              <span>{plan.activeSubscribers} active now</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Recent Transactions List with Jump Button */}
                <div className="revenue-chart-card">
                  <div className="revenue-chart-header" style={{ marginBottom: "16px" }}>
                    <div>
                      <h3 className="revenue-chart-title">Recent Transactions</h3>
                      <p className="revenue-chart-subtitle">Latest recorded subscription purchases</p>
                    </div>
                    <button
                      onClick={() => handleTabChange("transactions")}
                      style={{
                        background: "rgba(139, 92, 246, 0.12)",
                        color: "#8B5CF6",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        padding: "4px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      View All →
                    </button>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-secondary)" }}>
                          <th style={{ padding: "8px 6px" }}>Purchase ID</th>
                          <th style={{ padding: "8px 6px" }}>Student</th>
                          <th style={{ padding: "8px 6px" }}>Plan</th>
                          <th style={{ padding: "8px 6px" }}>Amount</th>
                          <th style={{ padding: "8px 6px" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData?.recentSubscriptions || []).slice(0, 7).map((sub) => (
                          <tr key={sub._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "10px 6px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                              {sub.purchaseId || sub._id.slice(-6)}
                            </td>
                            <td style={{ padding: "10px 6px", fontWeight: "600", color: "var(--text-primary)" }}>
                              {sub.studentId?.fullName || "Student"}
                            </td>
                            <td style={{ padding: "10px 6px" }}>
                              {sub.planNameSnapshot || sub.planId?.name || "AI Plan"}
                            </td>
                            <td style={{ padding: "10px 6px", fontWeight: "800", color: "#8B5CF6" }}>
                              ₹{sub.amount}
                            </td>
                            <td style={{ padding: "10px 6px" }}>
                              {getStatusBadge(sub.status)}
                            </td>
                          </tr>
                        ))}

                        {(!analyticsData?.recentSubscriptions || analyticsData.recentSubscriptions.length === 0) && (
                          <tr>
                            <td colSpan={5} style={{ padding: "20px 0", textAlign: "center", color: "var(--text-secondary)" }}>
                              No recent transactions recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ================= 4. TAB 2: AI PLANS SUB-DASHBOARD ================= */}
          {activeTab === "ai-plans" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Internal AI Plans Sub-navigation */}
              <div className="revenue-nav-tabs-bar revenue-subnav-bar">
                {[
                  { key: "ai-overview", label: "AI Plan Overview", icon: Sparkles },
                  { key: "manage-plans", label: "Manage AI Plans", icon: Layers },
                  { key: "subscribers", label: "AI Subscribers", icon: Users },
                  { key: "usage-analytics", label: "AI Usage Analytics", icon: Bot }
                ].map(({ key, label, icon: Icon }) => {
                  const isCurrent = aiSubTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleAiSubTabChange(key)}
                      className={`revenue-nav-tab ${isCurrent ? "active" : ""}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-tab 1: AI Plan Overview */}
              {aiSubTab === "ai-overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div className="revenue-kpi-grid">
                    <div className="revenue-kpi-card">
                      <div className="revenue-kpi-top">
                        <span className="revenue-kpi-label">TOTAL PLAN SUBSCRIBERS</span>
                        <div className="revenue-kpi-icon-box" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6" }}>
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="revenue-kpi-value">
                        {kpis.paidSubscriptionsCount}
                      </div>
                      <div className="revenue-kpi-subtitle">All-time subscriber enrollments</div>
                      <div className="revenue-kpi-accent-bar" style={{ background: "#8B5CF6" }} />
                    </div>

                    <div className="revenue-kpi-card">
                      <div className="revenue-kpi-top">
                        <span className="revenue-kpi-label">ACTIVE SUBSCRIBERS</span>
                        <div className="revenue-kpi-icon-box" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="revenue-kpi-value">
                        {kpis.activeSubscriptionsCount}
                      </div>
                      <div className="revenue-kpi-subtitle">Holding valid quota right now</div>
                      <div className="revenue-kpi-accent-bar" style={{ background: "#10B981" }} />
                    </div>

                    <div className="revenue-kpi-card">
                      <div className="revenue-kpi-top">
                        <span className="revenue-kpi-label">ACTIVE RECURRING VALUE</span>
                        <div className="revenue-kpi-icon-box" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" }}>
                          <Zap className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="revenue-kpi-value">
                        ₹{formatCurrency(kpis.activeRevenue)}
                      </div>
                      <div className="revenue-kpi-subtitle">Current active contract value</div>
                      <div className="revenue-kpi-accent-bar" style={{ background: "#F59E0B" }} />
                    </div>

                    <div className="revenue-kpi-card">
                      <div className="revenue-kpi-top">
                        <span className="revenue-kpi-label">RENEWAL CONVERSION RATE</span>
                        <div className="revenue-kpi-icon-box" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" }}>
                          <RefreshCcw className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="revenue-kpi-value">
                        {kpis.renewalRate}%
                      </div>
                      <div className="revenue-kpi-subtitle">{kpis.renewalSubscriptions} repeat renewals</div>
                      <div className="revenue-kpi-accent-bar" style={{ background: "#3B82F6" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => handleAiSubTabChange("manage-plans")}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "10px",
                        background: "#8B5CF6",
                        color: "#FFFFFF",
                        border: "none",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <Layers className="w-4 h-4" />
                      Manage Pricing Plans & Quotas →
                    </button>

                    <button
                      onClick={() => handleAiSubTabChange("subscribers")}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "10px",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-color)",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <Users className="w-4 h-4" />
                      View All Subscribers →
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Manage AI Plans (Embedded AiPlans.jsx) */}
              {aiSubTab === "manage-plans" && (
                <AdminAiPlans isEmbedded={true} onNavigateSubtab={handleAiSubTabChange} />
              )}

              {/* Sub-tab 3: AI Subscribers (Embedded AiSubscribers.jsx) */}
              {aiSubTab === "subscribers" && (
                <AiSubscribers isEmbedded={true} onNavigateSubtab={handleAiSubTabChange} />
              )}

              {/* Sub-tab 4: AI Usage Analytics */}
              {aiSubTab === "usage-analytics" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div className="revenue-kpi-grid">
                    <div className="revenue-kpi-card">
                      <div className="revenue-kpi-top">
                        <span className="revenue-kpi-label">TOTAL TESTS ALLOCATED</span>
                        <div className="revenue-kpi-icon-box" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6" }}>
                          <Bot className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="revenue-kpi-value">
                        {usageData?.metrics?.totalAllocatedTests || 0}
                      </div>
                      <div className="revenue-kpi-subtitle">Cumulative test quota issued</div>
                      <div className="revenue-kpi-accent-bar" style={{ background: "#8B5CF6" }} />
                    </div>

                    <div className="revenue-kpi-card">
                      <div className="revenue-kpi-top">
                        <span className="revenue-kpi-label">TESTS ACTUALLY USED</span>
                        <div className="revenue-kpi-icon-box" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" }}>
                          <Zap className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="revenue-kpi-value">
                        {usageData?.metrics?.totalUsedTests || 0}
                      </div>
                      <div className="revenue-kpi-subtitle">Generated by active & past users</div>
                      <div className="revenue-kpi-accent-bar" style={{ background: "#3B82F6" }} />
                    </div>

                    <div className="revenue-kpi-card">
                      <div className="revenue-kpi-top">
                        <span className="revenue-kpi-label">OVERALL UTILIZATION RATE</span>
                        <div className="revenue-kpi-icon-box" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                          <TrendingUp className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="revenue-kpi-value">
                        {usageData?.metrics?.overallUtilization || 0}%
                      </div>
                      <div className="revenue-kpi-subtitle">Test quota burn rate</div>
                      <div className="revenue-kpi-accent-bar" style={{ background: "#10B981" }} />
                    </div>

                    <div className="revenue-kpi-card">
                      <div className="revenue-kpi-top">
                        <span className="revenue-kpi-label">HIGH USAGE SUBSCRIBERS</span>
                        <div className="revenue-kpi-icon-box" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" }}>
                          <Clock className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="revenue-kpi-value">
                        {usageData?.metrics?.highUsageSubscriptions || 0}
                      </div>
                      <div className="revenue-kpi-subtitle">Consumed &gt; 80% test quota</div>
                      <div className="revenue-kpi-accent-bar" style={{ background: "#F59E0B" }} />
                    </div>
                  </div>

                  {/* Usage by Plan Table */}
                  <div className="revenue-chart-card" style={{ padding: "20px 24px" }}>
                    <h3 className="revenue-chart-title" style={{ marginBottom: "16px" }}>
                      Test Quota Consumption by Plan
                    </h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-secondary)" }}>
                          <th style={{ padding: "10px" }}>Plan Name</th>
                          <th style={{ padding: "10px" }}>Total Subscribers</th>
                          <th style={{ padding: "10px" }}>Allocated Quota</th>
                          <th style={{ padding: "10px" }}>Used Quota</th>
                          <th style={{ padding: "10px" }}>Utilization %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(usageData?.usageByPlan || []).map((p) => (
                          <tr key={p.planId || p.planName} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "12px 10px", fontWeight: "700", color: "var(--text-primary)" }}>{p.planName}</td>
                            <td style={{ padding: "12px 10px" }}>{p.subscribersCount}</td>
                            <td style={{ padding: "12px 10px" }}>{p.allocatedTests} tests</td>
                            <td style={{ padding: "12px 10px", fontWeight: "700", color: "#8B5CF6" }}>{p.usedTests} tests</td>
                            <td style={{ padding: "12px 10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ width: "80px", height: "6px", background: "var(--bg-page)", borderRadius: "3px", overflow: "hidden" }}>
                                  <div style={{ width: `${Math.min(100, p.utilizationRate)}%`, height: "100%", background: "#8B5CF6", borderRadius: "3px" }} />
                                </div>
                                <span style={{ fontWeight: "700" }}>{p.utilizationRate}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= 5. TAB 3: EXAMS & PRACTICE ================= */}
          {activeTab === "exams-practice" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Provenance Notice */}
              <div style={{
                background: "rgba(139, 92, 246, 0.08)",
                border: "1px solid rgba(139, 92, 246, 0.25)",
                borderRadius: "12px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <ShieldCheck className="w-5 h-5 text-violet-500 flex-shrink-0" />
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Unified Financial Ledger Active: </strong>
                  Exam, Practice, Series, and Flashcard purchases are unified into the central transaction ledger. In accordance with financial audit integrity, verified collected revenue reflects confirmed monetary bank payments, while preserving legacy student entitlements without fabricating unrecorded past payments.
                </div>
              </div>

              {/* 4 Summary Cards */}
              <div className="revenue-kpi-grid">
                <div className="revenue-kpi-card">
                  <div className="revenue-kpi-top">
                    <span className="revenue-kpi-label">PAID MOCK EXAMS</span>
                    <div className="revenue-kpi-icon-box" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6" }}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="revenue-kpi-value">
                    {catalogData?.summary?.paidQuizzesCount || 0}
                  </div>
                  <div className="revenue-kpi-subtitle">{catalogData?.summary?.entitledQuizUsers || 0} entitled students</div>
                  <div className="revenue-kpi-accent-bar" style={{ background: "#8B5CF6" }} />
                </div>

                <div className="revenue-kpi-card">
                  <div className="revenue-kpi-top">
                    <span className="revenue-kpi-label">PAID PRACTICE TESTS</span>
                    <div className="revenue-kpi-icon-box" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" }}>
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="revenue-kpi-value">
                    {catalogData?.summary?.paidPracticeCount || 0}
                  </div>
                  <div className="revenue-kpi-subtitle">{catalogData?.summary?.entitledPracticeUsers || 0} entitled students</div>
                  <div className="revenue-kpi-accent-bar" style={{ background: "#3B82F6" }} />
                </div>

                <div className="revenue-kpi-card">
                  <div className="revenue-kpi-top">
                    <span className="revenue-kpi-label">PAID EXAM SERIES</span>
                    <div className="revenue-kpi-icon-box" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="revenue-kpi-value">
                    {catalogData?.summary?.paidSeriesCount || 0}
                  </div>
                  <div className="revenue-kpi-subtitle">Bundled series catalog</div>
                  <div className="revenue-kpi-accent-bar" style={{ background: "#10B981" }} />
                </div>

                <div className="revenue-kpi-card">
                  <div className="revenue-kpi-top">
                    <span className="revenue-kpi-label">PAID FLASHCARD SETS</span>
                    <div className="revenue-kpi-icon-box" style={{ background: "rgba(236, 72, 153, 0.12)", color: "#EC4899" }}>
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="revenue-kpi-value">
                    {catalogData?.summary?.paidFlashcardSetsCount || 0}
                  </div>
                  <div className="revenue-kpi-subtitle">Flashcard deck catalog</div>
                  <div className="revenue-kpi-accent-bar" style={{ background: "#EC4899" }} />
                </div>
              </div>

              {/* Catalog Browser */}
              <div className="revenue-chart-card" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "6px", background: "var(--bg-page)", padding: "4px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                    {["quizzes", "practice", "series", "flashcards"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setCatalogTab(tab)}
                        className={`revenue-catalog-tab ${catalogTab === tab ? "active" : ""}`}
                        style={{ textTransform: "capitalize" }}
                      >
                        {tab === "quizzes" ? "Mock Exams" : tab === "practice" ? "Practice" : tab === "series" ? "Exam Series" : "Flashcards"}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Search product catalog..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    style={{
                      background: "var(--bg-page)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      outline: "none"
                    }}
                  />
                </div>

                {/* Catalog Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-secondary)" }}>
                      <th style={{ padding: "10px" }}>Title</th>
                      <th style={{ padding: "10px" }}>Subject</th>
                      <th style={{ padding: "10px" }}>Catalog Price</th>
                      <th style={{ padding: "10px" }}>Verified Revenue</th>
                      <th style={{ padding: "10px" }}>Ledger Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(catalogData?.catalog?.[catalogTab] || [])
                      .filter((item) => (item.title || "").toLowerCase().includes(catalogSearch.toLowerCase()))
                      .map((item) => {
                        const statusBadge = {
                          ledger_active: {
                            bg: "rgba(16, 185, 129, 0.12)",
                            color: "#10B981",
                            label: "Ledger Active"
                          },
                          legacy_access: {
                            bg: "rgba(245, 158, 11, 0.12)",
                            color: "#F59E0B",
                            label: "Legacy Access"
                          },
                          ledger_ready: {
                            bg: "rgba(139, 92, 246, 0.12)",
                            color: "#8B5CF6",
                            label: "Ledger Ready"
                          }
                        }[item.ledgerStatus] || {
                          bg: "rgba(139, 92, 246, 0.12)",
                          color: "#8B5CF6",
                          label: item.ledgerStatusLabel || "Ledger Ready"
                        };

                        return (
                          <tr key={item._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "12px 10px", fontWeight: "700", color: "var(--text-primary)" }}>
                              <div>{item.title}</div>
                              {item.plansCount > 0 && (
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "500" }}>
                                  {item.plansCount} pricing tier{item.plansCount === 1 ? "" : "s"}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "12px 10px", color: "var(--text-secondary)" }}>{item.subject || "General"}</td>
                            <td style={{ padding: "12px 10px", fontWeight: "800", color: "#8B5CF6" }}>
                              {item.hasPlans ? `From ₹${formatCurrency(item.startingPrice || item.price)}` : `₹${formatCurrency(item.price || 0)}`}
                            </td>
                            <td style={{ padding: "12px 10px", fontWeight: "700", color: item.verifiedRevenue > 0 ? "#10B981" : "var(--text-secondary)" }}>
                              ₹{formatCurrency(item.verifiedRevenue || 0)}
                            </td>
                            <td style={{ padding: "12px 10px" }}>
                              <span style={{
                                fontSize: "10.5px",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                background: statusBadge.bg,
                                color: statusBadge.color,
                                fontWeight: "600"
                              }}>
                                {statusBadge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                    {(!catalogData?.catalog?.[catalogTab] || catalogData.catalog[catalogTab].length === 0) && (
                      <tr>
                        <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
                          No paid items found in this catalog category.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 6. TAB 4: TRANSACTIONS ================= */}
          {activeTab === "transactions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Filter & Search Bar */}
              <div className="revenue-filter-bar">
                <div className="revenue-search-box">
                  <Search className="w-4 h-4 text-violet-400" />
                  <input
                    type="text"
                    placeholder="Search by student, email, purchase ID, or txn ID..."
                    value={txSearch}
                    onChange={(e) => {
                      setTxSearch(e.target.value);
                      setTxPage(1);
                    }}
                    className="revenue-search-input"
                  />
                </div>

                <div className="revenue-filter-controls">
                  <select
                    value={txCategory}
                    onChange={(e) => {
                      setTxCategory(e.target.value);
                      setTxPage(1);
                    }}
                    className="revenue-select-input"
                  >
                    <option value="all">All Categories</option>
                    <option value="ai_plan">AI Plans</option>
                    <option value="exam">Mock Exams</option>
                    <option value="practice">Practice Tests</option>
                    <option value="exam_series">Exam Series</option>
                    <option value="flashcard">Flashcards</option>
                  </select>

                  <select
                    value={txProvenance}
                    onChange={(e) => {
                      setTxProvenance(e.target.value);
                      setTxPage(1);
                    }}
                    className="revenue-select-input"
                  >
                    <option value="all">All Provenance</option>
                    <option value="verified_payment">Verified Bank</option>
                    <option value="dev_simulation">Dev Simulation</option>
                    <option value="admin_grant">Admin Grant</option>
                    <option value="free_access">Free Access</option>
                  </select>

                  <select
                    value={txGateway}
                    onChange={(e) => {
                      setTxGateway(e.target.value);
                      setTxPage(1);
                    }}
                    className="revenue-select-input"
                  >
                    <option value="all">All Gateways</option>
                    <option value="phonepe">PhonePe (Sandbox)</option>
                    <option value="admin_grant">Admin Grant</option>
                    <option value="razorpay">Razorpay</option>
                  </select>

                  <select
                    value={txStatus}
                    onChange={(e) => {
                      setTxStatus(e.target.value);
                      setTxPage(1);
                    }}
                    className="revenue-select-input"
                  >
                    <option value="all">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>

                  {/* Mobile View Toggle */}
                  <div className="revenue-view-toggle">
                    <button
                      type="button"
                      className={`revenue-view-toggle-btn ${txViewMode === "cards" ? "active" : ""}`}
                      onClick={() => setTxViewMode("cards")}
                      title="Card View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className={`revenue-view-toggle-btn ${txViewMode === "table" ? "active" : ""}`}
                      onClick={() => setTxViewMode("table")}
                      title="Table View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={handleExportTransactions}
                    className="revenue-export-btn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Transactions Mobile Cards (Active on mobile screens or when txViewMode is cards) */}
              <div className="revenue-mobile-card-list" style={{ display: txViewMode === "table" ? "none" : undefined }}>
                {transactionsLoading ? (
                  <div className="revenue-chart-card" style={{ padding: "30px", textAlign: "center" }}>
                    <RefreshCcw className="w-5 h-5 animate-spin mx-auto text-violet-500 mb-2" />
                    <span style={{ color: "var(--text-secondary)" }}>Loading transactions...</span>
                  </div>
                ) : transactionsData.map((t) => (
                  <div key={t._id} className="revenue-mobile-card">
                    <div className="revenue-mobile-card-top">
                      <div>
                        <div style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "14px" }}>
                          {t.studentId?.fullName || "Student"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          {t.studentId?.email || "—"}
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(t.status)}
                      </div>
                    </div>

                    <div className="revenue-mobile-card-main">
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" }}>
                          {t.itemTitleSnapshot || t.planNameSnapshot || t.planId?.name || "Product"}
                        </div>
                        <div className="revenue-mobile-card-chips" style={{ marginTop: "4px" }}>
                          {t.productCategory && (
                            <span style={{
                              fontSize: "9.5px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "rgba(139, 92, 246, 0.12)",
                              color: "#8B5CF6",
                              textTransform: "uppercase"
                            }}>
                              {t.productCategory.replace("_", " ")}
                            </span>
                          )}
                          <span style={{
                            fontSize: "9.5px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "600",
                            background: t.paymentGateway === "admin_grant" ? "rgba(245, 158, 11, 0.12)" : "rgba(139, 92, 246, 0.12)",
                            color: t.paymentGateway === "admin_grant" ? "#F59E0B" : "#8B5CF6"
                          }}>
                            {t.paymentGateway === "admin_grant" ? "Admin Grant" : t.paymentGateway === "phonepe" ? "PhonePe Sandbox" : t.paymentGateway}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "18px", fontWeight: "800", color: "#8B5CF6" }}>
                          ₹{t.amount}
                        </div>
                      </div>
                    </div>

                    <div className="revenue-mobile-card-footer">
                      <span style={{ fontFamily: "monospace", fontSize: "10.5px" }}>
                        Txn: {t.transactionId || t.orderId || t.purchaseId || t._id.slice(-8)}
                      </span>
                      <span>
                        {(t.startDate || t.createdAt) ? new Date(t.startDate || t.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>
                ))}

                {!transactionsLoading && transactionsData.length === 0 && (
                  <div className="revenue-chart-card" style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                    No matching transactions found.
                  </div>
                )}
              </div>

              {/* Transactions Table */}
              <div className={`revenue-chart-card ${txViewMode === "cards" ? "hide-on-mobile" : ""}`} style={{ padding: "0", overflow: "hidden" }}>
                <div className="revenue-table-wrapper">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-page)", textAlign: "left", color: "var(--text-secondary)" }}>
                        <th style={{ padding: "12px 16px" }}>Purchase / Txn ID</th>
                        <th style={{ padding: "12px 16px" }}>Student</th>
                        <th style={{ padding: "12px 16px" }}>Product / Plan</th>
                        <th style={{ padding: "12px 16px" }}>Amount</th>
                        <th style={{ padding: "12px 16px" }}>Gateway</th>
                        <th style={{ padding: "12px 16px" }}>Status</th>
                        <th style={{ padding: "12px 16px" }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionsLoading ? (
                        <tr>
                          <td colSpan={7} style={{ padding: "30px", textAlign: "center" }}>
                            <RefreshCcw className="w-5 h-5 animate-spin mx-auto text-violet-500 mb-2" />
                            <span style={{ color: "var(--text-secondary)" }}>Loading transactions...</span>
                          </td>
                        </tr>
                      ) : transactionsData.map((t) => (
                        <tr key={t._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "11.5px" }}>
                            <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{t.transactionId || t.orderId || t.purchaseId || t._id.slice(-8)}</div>
                            <div style={{ fontSize: "10.5px", color: "var(--text-secondary)" }}>{t.gatewayTxnId || "—"}</div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{t.studentId?.fullName || "Student"}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{t.studentId?.email || "—"}</div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                              {t.itemTitleSnapshot || t.planNameSnapshot || t.planId?.name || "Product"}
                            </div>
                            <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                              {t.productCategory && (
                                <span style={{
                                  fontSize: "9.5px",
                                  fontWeight: "700",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  background: "rgba(139, 92, 246, 0.12)",
                                  color: "#8B5CF6",
                                  textTransform: "uppercase"
                                }}>
                                  {t.productCategory.replace("_", " ")}
                                </span>
                              )}
                              {t.provenance && (
                                <span style={{
                                  fontSize: "9.5px",
                                  fontWeight: "700",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  background: t.provenance === "verified_payment"
                                    ? "rgba(16, 185, 129, 0.12)"
                                    : t.provenance === "admin_grant"
                                    ? "rgba(59, 130, 246, 0.12)"
                                    : "rgba(245, 158, 11, 0.12)",
                                  color: t.provenance === "verified_payment"
                                    ? "#10B981"
                                    : t.provenance === "admin_grant"
                                    ? "#3B82F6"
                                    : "#F59E0B"
                                }}>
                                  {t.provenance.replace("_", " ")}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: "800", color: "#8B5CF6" }}>
                            ₹{t.amount}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontSize: "11px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontWeight: "600",
                              background: t.paymentGateway === "admin_grant" ? "rgba(245, 158, 11, 0.12)" : "rgba(139, 92, 246, 0.12)",
                              color: t.paymentGateway === "admin_grant" ? "#F59E0B" : "#8B5CF6"
                            }}>
                              {t.paymentGateway === "admin_grant" ? "Admin Grant" : t.paymentGateway === "phonepe" ? "PhonePe Sandbox" : t.paymentGateway}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {getStatusBadge(t.status)}
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "11.5px" }}>
                            {(t.startDate || t.createdAt) ? new Date(t.startDate || t.createdAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}

                      {!transactionsLoading && transactionsData.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                            No matching transactions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--bg-page)",
                  borderTop: "1px solid var(--border-color)"
                }}>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Page {txPage} of {txPagination.totalPages || 1} ({txPagination.total} total transactions)
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      disabled={txPage <= 1}
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        cursor: txPage <= 1 ? "not-allowed" : "pointer",
                        opacity: txPage <= 1 ? 0.5 : 1
                      }}
                    >
                      Previous
                    </button>
                    <button
                      disabled={txPage >= txPagination.totalPages}
                      onClick={() => setTxPage((p) => p + 1)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        cursor: txPage >= txPagination.totalPages ? "not-allowed" : "pointer",
                        opacity: txPage >= txPagination.totalPages ? 0.5 : 1
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 7. TAB 5: CUSTOMERS ================= */}
          {activeTab === "customers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Filter & Search Bar */}
              <div className="revenue-filter-bar">
                <div className="revenue-search-box">
                  <Search className="w-4 h-4 text-violet-400" />
                  <input
                    type="text"
                    placeholder="Search customers by name, email, or phone..."
                    value={custSearch}
                    onChange={(e) => {
                      setCustSearch(e.target.value);
                      setCustPage(1);
                    }}
                    className="revenue-search-input"
                  />
                </div>

                <div className="revenue-filter-controls">
                  <select
                    value={custStatus}
                    onChange={(e) => {
                      setCustStatus(e.target.value);
                      setCustPage(1);
                    }}
                    className="revenue-select-input"
                  >
                    <option value="all">All Students</option>
                    <option value="active_subscriber">Active Subscribers</option>
                    <option value="has_purchases">Has Any Purchases</option>
                    <option value="free_user">Free Students</option>
                  </select>

                  {/* View Mode Switcher */}
                  <div className="revenue-view-toggle">
                    <button
                      type="button"
                      className={`revenue-view-toggle-btn ${custViewMode === "cards" ? "active" : ""}`}
                      onClick={() => setCustViewMode("cards")}
                      title="Card View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className={`revenue-view-toggle-btn ${custViewMode === "table" ? "active" : ""}`}
                      onClick={() => setCustViewMode("table")}
                      title="Table View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={handleExportCustomers}
                    className="revenue-export-btn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Customers Mobile Cards (Active on mobile screens or when custViewMode is cards) */}
              <div className="revenue-mobile-card-list" style={{ display: custViewMode === "table" ? "none" : undefined }}>
                {customersLoading ? (
                  <div className="revenue-chart-card" style={{ padding: "30px", textAlign: "center" }}>
                    <RefreshCcw className="w-5 h-5 animate-spin mx-auto text-violet-500 mb-2" />
                    <span style={{ color: "var(--text-secondary)" }}>Loading customer records...</span>
                  </div>
                ) : customersData.map((c) => (
                  <div key={c._id} className="revenue-mobile-card">
                    <div className="revenue-mobile-card-top">
                      <div>
                        <div style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "14px" }}>
                          {c.fullName}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          {c.email}
                        </div>
                      </div>
                      <div>
                        {c.isPremium ? (
                          <Badge variant="success" className="gap-1 text-[11px]"><CheckCircle2 className="w-3 h-3" /> Premium</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px]">Free Student</Badge>
                        )}
                      </div>
                    </div>

                    <div className="revenue-mobile-card-main">
                      <div>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Active Plan: </span>
                        <strong style={{ fontSize: "12px", color: c.activePlan ? "#8B5CF6" : "var(--text-primary)" }}>
                          {c.activePlan?.name || "None"}
                        </strong>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {c.purchasedExamsCount} exams • {c.purchasedPracticeCount} practice
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Recorded Spend</div>
                        <div style={{ fontSize: "18px", fontWeight: "800", color: "#8B5CF6" }}>
                          ₹{c.totalSpent}
                        </div>
                      </div>
                    </div>

                    <div className="revenue-mobile-card-footer">
                      <span>Joined {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "N/A"}</span>
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        style={{
                          background: "rgba(139, 92, 246, 0.12)",
                          color: "#8B5CF6",
                          border: "1px solid rgba(139, 92, 246, 0.25)",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Eye className="w-3 h-3" /> Details
                      </button>
                    </div>
                  </div>
                ))}

                {!customersLoading && customersData.length === 0 && (
                  <div className="revenue-chart-card" style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                    No customers found.
                  </div>
                )}
              </div>

              {/* Customers Table */}
              <div className={`revenue-chart-card ${custViewMode === "cards" ? "hide-on-mobile" : ""}`} style={{ padding: "0", overflow: "hidden" }}>
                <div className="revenue-table-wrapper">
                  <table className="revenue-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Active Plan</th>
                        <th>Entitled Exams</th>
                        <th>Entitled Practice</th>
                        <th>Recorded Spend</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customersLoading ? (
                        <tr>
                          <td colSpan={7} style={{ padding: "30px", textAlign: "center" }}>
                            <RefreshCcw className="w-5 h-5 animate-spin mx-auto text-violet-500 mb-2" />
                            <span style={{ color: "var(--text-secondary)" }}>Loading customer records...</span>
                          </td>
                        </tr>
                      ) : customersData.map((c) => (
                        <tr key={c._id}>
                          <td>
                            <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{c.fullName}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{c.email}</div>
                          </td>
                          <td>
                            {c.activePlan ? (
                              <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6", fontWeight: "700" }}>
                                {c.activePlan.name}
                              </span>
                            ) : (
                              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>No Active Plan</span>
                            )}
                          </td>
                          <td style={{ fontWeight: "600" }}>
                            {c.purchasedExamsCount} exams
                          </td>
                          <td style={{ fontWeight: "600" }}>
                            {c.purchasedPracticeCount} practice
                          </td>
                          <td style={{ fontWeight: "800", color: "#8B5CF6" }}>
                            ₹{c.totalSpent}
                          </td>
                          <td>
                            {c.isPremium ? (
                              <Badge variant="success" className="gap-1 text-[11px]"><CheckCircle2 className="w-3 h-3" /> Premium</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[11px]">Free Student</Badge>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => setSelectedCustomer(c)}
                              style={{
                                background: "rgba(139, 92, 246, 0.12)",
                                color: "#8B5CF6",
                                border: "1px solid rgba(139, 92, 246, 0.25)",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <Eye className="w-3 h-3" /> Details
                            </button>
                          </td>
                        </tr>
                      ))}

                      {!customersLoading && customersData.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                            No customers found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--bg-page)",
                  borderTop: "1px solid var(--border-color)",
                  flexWrap: "wrap",
                  gap: "8px"
                }}>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Page {custPage} of {custPagination.totalPages || 1} ({custPagination.total} total students)
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      disabled={custPage <= 1}
                      onClick={() => setCustPage((p) => Math.max(1, p - 1))}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        cursor: custPage <= 1 ? "not-allowed" : "pointer",
                        opacity: custPage <= 1 ? 0.5 : 1
                      }}
                    >
                      Previous
                    </button>
                    <button
                      disabled={custPage >= custPagination.totalPages}
                      onClick={() => setCustPage((p) => p + 1)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        cursor: custPage >= custPagination.totalPages ? "not-allowed" : "pointer",
                        opacity: custPage >= custPagination.totalPages ? 0.5 : 1
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer Detail Drawer Modal */}
              {selectedCustomer && (
                <div
                  className="revenue-drawer-backdrop"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedCustomer(null);
                  }}
                >
                  <div className="revenue-drawer-panel">
                    <div className="revenue-drawer-handle" />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h3 style={{ margin: "0 0 2px", fontSize: "17px", fontWeight: "800", color: "var(--text-primary)" }}>
                          Customer Financial Profile
                        </h3>
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                          Entitlements, subscriptions, and spend footprint
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Student Identity Card */}
                    <div style={{ background: "var(--bg-page)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                      <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>{selectedCustomer.fullName}</h4>
                      <p style={{ margin: "0 0 2px", fontSize: "12px", color: "var(--text-secondary)" }}>{selectedCustomer.email}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>Phone: {selectedCustomer.phone}</p>
                    </div>

                    {/* Financial Summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div style={{ background: "var(--bg-page)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>RECORDED SPEND</span>
                        <div style={{ fontSize: "18px", fontWeight: "800", color: "#8B5CF6", marginTop: "2px" }}>
                          ₹{selectedCustomer.totalSpent}
                        </div>
                      </div>
                      <div style={{ background: "var(--bg-page)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>VERIFIED GATEWAY</span>
                        <div style={{ fontSize: "18px", fontWeight: "800", color: "#10B981", marginTop: "2px" }}>
                          ₹0
                        </div>
                      </div>
                    </div>

                    {/* Entitlement Breakdown */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <h4 style={{ margin: "4px 0", fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>Active Entitlements</h4>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "var(--bg-page)", borderRadius: "8px", fontSize: "12.5px" }}>
                        <span>Current AI Plan</span>
                        <strong style={{ color: "#8B5CF6" }}>{selectedCustomer.activePlan?.name || "None"}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "var(--bg-page)", borderRadius: "8px", fontSize: "12.5px" }}>
                        <span>Entitled Mock Exams</span>
                        <strong>{selectedCustomer.purchasedExamsCount} exams</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "var(--bg-page)", borderRadius: "8px", fontSize: "12.5px" }}>
                        <span>Entitled Practice Modules</span>
                        <strong>{selectedCustomer.purchasedPracticeCount} modules</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "var(--bg-page)", borderRadius: "8px", fontSize: "12.5px" }}>
                        <span>Total Subscriptions Held</span>
                        <strong>{selectedCustomer.totalSubscriptionsCount}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCustomer(null)}
                      style={{
                        marginTop: "auto",
                        padding: "10px",
                        borderRadius: "10px",
                        background: "var(--bg-page)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-color)",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer"
                      }}
                    >
                      Close Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= 8. TAB 6: REPORTS ================= */}
          {activeTab === "reports" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="revenue-chart-card">
                <h3 className="revenue-chart-title" style={{ marginBottom: "6px" }}>Financial Reports Hub</h3>
                <p className="revenue-chart-subtitle">
                  Generate audit-ready reports across revenue trajectories, subscription cohorts, catalog entitlements, and itemized transaction ledgers.
                </p>

                <div className="revenue-reports-grid" style={{ marginTop: "20px" }}>
                  {/* Report Card 1 */}
                  <div className="revenue-report-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <TrendingUp className="w-4 h-4 text-violet-500" />
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Revenue Summary Report</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", flex: 1 }}>
                      High-level revenue metrics, verified vs simulated amounts, ARPU, and renewal rates.
                    </p>
                    <button
                      onClick={() => {
                        const rows = [
                          { Metric: "Total Recorded Volume", Value: `INR ${kpis.totalRevenue}` },
                          { Metric: "Verified Bank Gateway Revenue", Value: "INR 0 (Sandbox Active)" },
                          { Metric: "Simulated PhonePe Revenue", Value: `INR ${kpis.simulatedRevenue}` },
                          { Metric: "Admin Granted Entitlements", Value: `INR ${kpis.adminGrantsAmount}` },
                          { Metric: "Revenue Today", Value: `INR ${kpis.todayRevenue}` },
                          { Metric: "Revenue This Month", Value: `INR ${kpis.thisMonthRevenue}` },
                          { Metric: "Active Subscription ARR", Value: `INR ${kpis.activeRevenue}` },
                          { Metric: "Total Recorded Orders", Value: kpis.paidSubscriptionsCount },
                          { Metric: "Distinct Paying Students", Value: kpis.distinctPayingStudentsCount },
                          { Metric: "ARPU", Value: `INR ${kpis.arpu}` },
                          { Metric: "Renewal Rate", Value: `${kpis.renewalRate}%` }
                        ];
                        downloadCsv("PrepMark_Revenue_Summary", rows);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "#8B5CF6",
                        color: "#FFFFFF",
                        border: "none",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      <Download className="w-3.5 h-3.5" /> Download Summary CSV
                    </button>
                  </div>

                  {/* Report Card 2 */}
                  <div className="revenue-report-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Receipt className="w-4 h-4 text-emerald-500" />
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Itemized Transactions Report</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", flex: 1 }}>
                      Complete transaction ledger with timestamps, student contacts, payment gateways, and statuses.
                    </p>
                    <button
                      onClick={handleExportTransactions}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "#10B981",
                        color: "#FFFFFF",
                        border: "none",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      <Download className="w-3.5 h-3.5" /> Download Transactions CSV
                    </button>
                  </div>

                  {/* Report Card 3 */}
                  <div className="revenue-report-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Users className="w-4 h-4 text-blue-500" />
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Customer Financials Report</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", flex: 1 }}>
                      Student directory with active subscriptions, total historical spend, and entitled products.
                    </p>
                    <button
                      onClick={handleExportCustomers}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "#3B82F6",
                        color: "#FFFFFF",
                        border: "none",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      <Download className="w-3.5 h-3.5" /> Download Customers CSV
                    </button>
                  </div>

                  {/* Report Card 4 */}
                  <div className="revenue-report-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <BookOpen className="w-4 h-4 text-amber-500" />
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>Catalog Entitlements Report</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", flex: 1 }}>
                      Catalog breakdown of paid exams, practice modules, series, and active student entitlements.
                    </p>
                    <button
                      onClick={() => {
                        const rows = [
                          { Category: "Mock Exams", Catalog_Items: catalogData?.summary?.paidQuizzesCount || 0, Entitled_Students: catalogData?.summary?.entitledQuizUsers || 0, Ledger_Status: "Unified Ledger Active" },
                          { Category: "Practice Tests", Catalog_Items: catalogData?.summary?.paidPracticeCount || 0, Entitled_Students: catalogData?.summary?.entitledPracticeUsers || 0, Ledger_Status: "Unified Ledger Active" },
                          { Category: "Exam Series", Catalog_Items: catalogData?.summary?.paidSeriesCount || 0, Entitled_Students: "N/A", Ledger_Status: "Unified Ledger Active" },
                          { Category: "Flashcards", Catalog_Items: catalogData?.summary?.paidFlashcardSetsCount || 0, Entitled_Students: "N/A", Ledger_Status: "Unified Ledger Active" }
                        ];
                        downloadCsv("PrepMark_Catalog_Entitlements", rows);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "#F59E0B",
                        color: "#FFFFFF",
                        border: "none",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      <Download className="w-3.5 h-3.5" /> Download Catalog CSV
                    </button>
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
