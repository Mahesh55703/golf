"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  DollarSign,
  Download,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowDownRight,
  ShieldAlert,
  Eye,
  Info,
  Check,
  ChevronDown,
  FlaskConical,
} from "lucide-react";

// ==========================================
// Types
// ==========================================

interface DateFilterRange {
  preset: string;
  startDate: string;
  endDate: string;
  label: string;
}

interface CurrencySummary {
  currency: string;
  grossRegistrationValue: string;
  collectedPayments: string;
  completedRefunds: string;
  netCollected: string;
  pendingAmount: string;
  failedAmount: string;
  collectedCount: number;
  refundedCount: number;
  pendingCount: number;
  failedCount: number;
  simulatedTotalValue: string;
  simulatedCount: number;
  simulatedRefundTotal: string;
  simulatedRefundCount: number;
}

interface OverviewData {
  dateRange: DateFilterRange;
  currencies: Record<string, CurrencySummary>;
  primaryCurrency: string;
  registrationCounts: {
    total: number;
    paid: number;
    free: number;
    cancelled: number;
    awaitingPayment: number;
  };
  dailyTrend: Array<{
    date: string;
    currency: string;
    grossCollected: number;
    completedRefunds: number;
    netCollected: number;
    transactionsCount: number;
  }>;
}

interface TournamentItem {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  hostClubName: string | null;
  currency: string;
  entryFee: string;
  totalRegistrations: number;
  freeRegistrations: number;
  paidRegistrations: number;
  cancelledRegistrations: number;
  grossRegistrationValue: string;
  collectedPayments: string;
  completedRefunds: string;
  netCollected: string;
  pendingAmount: string;
  failedPaymentCount: number;
  simulatedPaymentCount: number;
  simulatedPaymentTotal: string;
}

interface TransactionItem {
  id: string;
  referenceNumber: string;
  registrationReference: string;
  registrationId: string;
  tournamentId: string;
  tournamentName: string;
  tournamentSlug: string;
  golferName: string;
  golferEmail: string;
  amount: string;
  currency: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  status: string;
  isSimulated: boolean;
  paidAt: string | null;
  refundedAt: string | null;
  refundAmount: string | null;
  refundReference: string | null;
  createdAt: string;
  metadata: any;
}

interface RefundItem {
  id: string;
  referenceNumber: string;
  registrationReference: string;
  tournamentName: string;
  golferName: string;
  golferEmail: string;
  originalAmount: string;
  refundAmount: string;
  currency: string;
  provider: string;
  refundReference: string;
  refundReason: string;
  refundedAt: string;
  refundStatus: string;
  isSimulated: boolean;
}

interface DiscrepancyItem {
  id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  code: string;
  title: string;
  description: string;
  referenceId: string;
  amount: string;
  currency: string;
  recommendedAction: string;
  createdAt: string;
}

interface ReconciliationData {
  reportType: string;
  generatedAt: string;
  totalIssuesCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  discrepancies: DiscrepancyItem[];
}

export default function FinancialReportsPage() {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "tournaments" | "transactions" | "refunds" | "reconciliation"
  >("overview");

  // Date filters
  const [preset, setPreset] = useState("last_30_days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    grossCollected: number;
    completedRefunds: number;
    netCollected: number;
    transactionsCount: number;
    currency: string;
  } | null>(null);

  // Tournament tab state
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [tSearch, setTSearch] = useState("");
  const [tPage, setTPage] = useState(1);
  const [tPagination, setTPagination] = useState({ total: 0, pages: 1 });
  const [drilldownTournament, setDrilldownTournament] = useState<TournamentItem | null>(null);

  // Transactions tab state
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txSearch, setTxSearch] = useState("");
  const [txStatus, setTxStatus] = useState("ALL");
  const [txMode, setTxMode] = useState<"ALL" | "REAL_ONLY" | "SIMULATED_ONLY">("ALL");
  const [txPage, setTxPage] = useState(1);
  const [txPagination, setTxPagination] = useState({ total: 0, pages: 1 });
  const [inspectTx, setInspectTx] = useState<TransactionItem | null>(null);

  // Refunds tab state
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);

  // Reconciliation tab state
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconFilter, setReconFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "INFO">("ALL");

  // Export dropdown
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Helper to build common query string
  const buildQueryParams = () => {
    const p = new URLSearchParams();
    p.set("preset", preset);
    if (preset === "custom" && customStart && customEnd) {
      p.set("startDate", customStart);
      p.set("endDate", customEnd);
    }
    if (selectedCurrency) {
      p.set("currency", selectedCurrency);
    }
    return p;
  };

  // Fetch Overview Data
  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = buildQueryParams();
      const res = await fetch(`/api/admin/reports/financial/overview?${q.toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP error ${res.status}`);
      }
      const data: OverviewData = await res.json();
      setOverview(data);
      if (data.primaryCurrency) {
        setSelectedCurrency(data.primaryCurrency);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load financial overview");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Tournaments Data
  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const q = buildQueryParams();
      if (tSearch) q.set("search", tSearch);
      q.set("page", tPage.toString());
      q.set("limit", "10");

      const res = await fetch(`/api/admin/reports/financial/tournaments?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to load tournaments revenue");
      const d = await res.json();
      setTournaments(d.items || []);
      setTPagination(d.pagination || { total: 0, pages: 1 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transactions Data
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const q = buildQueryParams();
      if (txSearch) q.set("search", txSearch);
      if (txStatus !== "ALL") q.set("status", txStatus);
      if (txMode !== "ALL") q.set("mode", txMode);
      q.set("page", txPage.toString());
      q.set("limit", "15");

      const res = await fetch(`/api/admin/reports/financial/transactions?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to load transactions");
      const d = await res.json();
      setTransactions(d.items || []);
      setTxPagination(d.pagination || { total: 0, pages: 1 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Refunds Data
  const fetchRefunds = async () => {
    setRefundsLoading(true);
    try {
      const q = buildQueryParams();
      const res = await fetch(`/api/admin/reports/financial/refunds?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to load refund report");
      const d = await res.json();
      setRefunds(d.refunds || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefundsLoading(false);
    }
  };

  // Fetch Reconciliation Data
  const fetchReconciliation = async () => {
    setReconLoading(true);
    try {
      const q = buildQueryParams();
      const res = await fetch(`/api/admin/reports/financial/reconciliation?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to load reconciliation");
      const d = await res.json();
      setReconciliation(d);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReconLoading(false);
    }
  };

  // Trigger data fetch on tab/preset changes
  useEffect(() => {
    if (activeTab === "overview") {
      fetchOverview();
    } else if (activeTab === "tournaments") {
      fetchTournaments();
    } else if (activeTab === "transactions") {
      fetchTransactions();
    } else if (activeTab === "refunds") {
      fetchRefunds();
    } else if (activeTab === "reconciliation") {
      fetchReconciliation();
    }
  }, [activeTab, preset, selectedCurrency]);

  // Handle preset change
  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    setTPage(1);
    setTxPage(1);
  };

  // CSV Export Trigger
  const handleExport = (type: "overview" | "tournaments" | "transactions") => {
    setExportMenuOpen(false);
    const q = buildQueryParams();
    q.set("type", type);
    if (type === "transactions") {
      if (txStatus !== "ALL") q.set("status", txStatus);
      if (txMode !== "ALL") q.set("mode", txMode);
    }
    window.open(`/api/admin/reports/financial/export?${q.toString()}`, "_blank");
  };

  // Selected currency summary card data
  const currentSummary = useMemo<CurrencySummary>(() => {
    if (!overview || !overview.currencies) {
      return {
        currency: selectedCurrency,
        grossRegistrationValue: "0.00",
        collectedPayments: "0.00",
        completedRefunds: "0.00",
        netCollected: "0.00",
        pendingAmount: "0.00",
        failedAmount: "0.00",
        collectedCount: 0,
        refundedCount: 0,
        pendingCount: 0,
        failedCount: 0,
        simulatedTotalValue: "0.00",
        simulatedCount: 0,
        simulatedRefundTotal: "0.00",
        simulatedRefundCount: 0,
      };
    }
    return (
      overview.currencies[selectedCurrency] || {
        currency: selectedCurrency,
        grossRegistrationValue: "0.00",
        collectedPayments: "0.00",
        completedRefunds: "0.00",
        netCollected: "0.00",
        pendingAmount: "0.00",
        failedAmount: "0.00",
        collectedCount: 0,
        refundedCount: 0,
        pendingCount: 0,
        failedCount: 0,
        simulatedTotalValue: "0.00",
        simulatedCount: 0,
        simulatedRefundTotal: "0.00",
        simulatedRefundCount: 0,
      }
    );
  }, [overview, selectedCurrency]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Reports</h1>
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Audit & Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative financial metrics, verified real collections, completed refunds, tournament revenue, and reconciliation.
          </p>
        </div>

        {/* Global Controls: Date Presets & CSV Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
            <Calendar size={14} className="text-slate-400 mr-2" />
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent border-none outline-hidden cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="current_month">Current Month</option>
              <option value="previous_month">Previous Month</option>
              <option value="current_year">Current Year</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Range...</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {preset === "custom" && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs text-slate-700 px-2 py-1 border border-slate-100 rounded-lg outline-hidden"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs text-slate-700 px-2 py-1 border border-slate-100 rounded-lg outline-hidden"
              />
              <button
                onClick={() => {
                  if (activeTab === "overview") fetchOverview();
                  else if (activeTab === "tournaments") fetchTournaments();
                  else if (activeTab === "transactions") fetchTransactions();
                  else if (activeTab === "refunds") fetchRefunds();
                  else if (activeTab === "reconciliation") fetchReconciliation();
                }}
                className="text-xs bg-[#0e2138] text-white px-2 py-1 rounded-lg font-medium hover:bg-slate-800"
              >
                Apply
              </button>
            </div>
          )}

          {/* Currency Switcher */}
          {overview && Object.keys(overview.currencies).length > 1 && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 mr-2">CURRENCY</span>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent border-none outline-hidden cursor-pointer"
              >
                {Object.keys(overview.currencies).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => {
              if (activeTab === "overview") fetchOverview();
              else if (activeTab === "tournaments") fetchTournaments();
              else if (activeTab === "transactions") fetchTransactions();
              else if (activeTab === "refunds") fetchRefunds();
              else if (activeTab === "reconciliation") fetchReconciliation();
            }}
            title="Refresh Data"
            className="p-2 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl shadow-xs transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#dfbf77]" : ""} />
          </button>

          {/* CSV Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-1.5 bg-[#0e2138] text-white hover:bg-[#1a385c] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Download size={13} className="text-[#dfbf77]" />
              <span>Export CSV</span>
              <ChevronDown size={13} className="text-white/70 ml-0.5" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 text-xs">
                <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Export Options
                </div>
                <button
                  onClick={() => handleExport("overview")}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Financial Overview</span>
                  <span className="text-[10px] text-slate-400 font-mono">.csv</span>
                </button>
                <button
                  onClick={() => handleExport("tournaments")}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Tournament Revenue</span>
                  <span className="text-[10px] text-slate-400 font-mono">.csv</span>
                </button>
                <button
                  onClick={() => handleExport("transactions")}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Payment Transactions</span>
                  <span className="text-[10px] text-slate-400 font-mono">.csv</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: "overview", label: "Financial Overview", icon: BarChart3 },
          { id: "tournaments", label: "Tournament Revenue", icon: Layers },
          { id: "transactions", label: "Payment Transactions", icon: CircleDollarSign },
          { id: "refunds", label: "Refund Tracking", icon: ArrowDownRight },
          { id: "reconciliation", label: "Reconciliation Discrepancies", icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                active
                  ? "border-[#c29b4e] text-[#0e2138] bg-[#faf6ef]/40"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon size={14} className={active ? "text-[#c29b4e]" : "text-slate-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:text-red-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Gross Registration Value */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Gross Registration Value</span>
                <span className="text-[11px] font-bold text-slate-400 font-mono">{selectedCurrency}</span>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {currentSummary.grossRegistrationValue}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                <Info size={11} />
                <span>Value of active eligible registrations</span>
              </p>
            </div>

            {/* Card 2: Successfully Collected Real Payments */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Verified Collections</span>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  {currentSummary.collectedCount} Verified
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                {currentSummary.collectedPayments} <span className="text-xs font-bold text-slate-500">{selectedCurrency}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                <CheckCircle2 size={11} className="text-emerald-600" />
                <span>Authoritative verified real payments only</span>
              </p>
            </div>

            {/* Card 3: Completed Refunds */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Completed Refunds</span>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  {currentSummary.refundedCount} Refunded
                </span>
              </div>
              <div className="text-2xl font-black text-blue-700 tracking-tight">
                {currentSummary.completedRefunds} <span className="text-xs font-bold text-slate-500">{selectedCurrency}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                <ArrowDownRight size={11} className="text-blue-600" />
                <span>Successfully processed reimbursements</span>
              </p>
            </div>

            {/* Card 4: Net Collected Amount (Hero Card) */}
            <div className="bg-gradient-to-br from-[#081726] to-[#0e2138] p-5 rounded-2xl text-white shadow-md relative overflow-hidden border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-white/70 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#dfbf77]">Net Collected</span>
                  {Number(currentSummary.netCollected) < 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      Net Outflow
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                      Real Revenue
                    </span>
                  )}
                </div>
                <div className="text-3xl font-black text-white tracking-tight">
                  {currentSummary.netCollected} <span className="text-xs font-bold text-[#dfbf77]">{selectedCurrency}</span>
                </div>
              </div>
              <p className="text-[11px] text-white/60 mt-3">
                Collections minus completed refunds (pre-gateway deductions)
              </p>
            </div>
          </div>

          {/* Secondary Metric Grid: Pending, Failed, Registration Counts & Simulated Sandbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 5: Pending Payments */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Payments</span>
                  <div className="p-1 rounded-full bg-amber-50 text-amber-600">
                    <Clock size={13} />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-700 tracking-tight">
                  {currentSummary.pendingAmount} <span className="text-xs font-bold text-slate-500">{selectedCurrency}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                {currentSummary.pendingCount} checkout session(s) awaiting outcome
              </p>
            </div>

            {/* Card 6: Failed Payments */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700">Failed Attempts</span>
                  <div className="p-1 rounded-full bg-red-50 text-red-600">
                    <AlertCircle size={13} />
                  </div>
                </div>
                <div className="text-2xl font-black text-red-700 tracking-tight">
                  {currentSummary.failedAmount} <span className="text-xs font-bold text-slate-500">{selectedCurrency}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                {currentSummary.failedCount} failed gateway attempt(s)
              </p>
            </div>

            {/* Card 7: Registration Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Registrations</span>
                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {overview?.registrationCounts.total || 0} Total
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] mt-2 font-medium">
                  <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-2 py-1 rounded-lg border border-emerald-100">
                    <span>Paid</span>
                    <span className="font-bold">{overview?.registrationCounts.paid || 0}</span>
                  </div>
                  <div className="flex items-center justify-between bg-indigo-50 text-indigo-800 px-2 py-1 rounded-lg border border-indigo-100">
                    <span>Free</span>
                    <span className="font-bold">{overview?.registrationCounts.free || 0}</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200">
                    <span>Cancelled</span>
                    <span className="font-bold">{overview?.registrationCounts.cancelled || 0}</span>
                  </div>
                  <div className="flex items-center justify-between bg-amber-50 text-amber-800 px-2 py-1 rounded-lg border border-amber-100">
                    <span>Awaiting</span>
                    <span className="font-bold">{overview?.registrationCounts.awaitingPayment || 0}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Participant breakdown for selected range
              </p>
            </div>

            {/* Card 8: Simulated Test Mode Isolation */}
            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-300 shadow-xs relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <FlaskConical size={14} className="text-amber-700" />
                    <span>Preview Simulation</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                    TEST MODE
                  </span>
                </div>
                <div className="text-2xl font-black text-amber-900 tracking-tight">
                  {currentSummary.simulatedTotalValue} <span className="text-xs font-bold text-amber-700">{selectedCurrency}</span>
                </div>
              </div>
              <p className="text-[11px] text-amber-800/80 mt-3 leading-relaxed">
                {currentSummary.simulatedCount} simulated test order(s) — strictly excluded from real revenue.
              </p>
            </div>
          </div>

          {/* Interactive Revenue Trend Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#c29b4e]" />
                  <span>Daily Revenue Trend (Verified Real Collections)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual time series of daily gross collections, refunds, and net collected in {selectedCurrency}.
                </p>
              </div>

              {/* Legend & Hover Details */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Gross Collections</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-slate-600">Refunds</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0e2138] border border-[#dfbf77]" />
                  <span className="text-slate-600">Net Marker</span>
                </div>
              </div>
            </div>

            {/* Hover details callout bar */}
            <div className="h-7 mb-2 flex items-center">
              {hoveredDay ? (
                <div className="flex flex-wrap items-center gap-3 bg-slate-900 text-white px-3 py-1 rounded-xl text-xs shadow-xs">
                  <span className="font-mono font-bold text-slate-300">{hoveredDay.date}</span>
                  <span className="text-emerald-400 font-semibold">Gross: {hoveredDay.grossCollected.toFixed(2)} {selectedCurrency}</span>
                  {hoveredDay.completedRefunds > 0 && (
                    <span className="text-blue-400 font-semibold">Refund: -{hoveredDay.completedRefunds.toFixed(2)} {selectedCurrency}</span>
                  )}
                  <span className="text-[#dfbf77] font-bold border-l border-slate-700 pl-3">
                    Net: {hoveredDay.netCollected.toFixed(2)} {selectedCurrency} ({hoveredDay.transactionsCount} tx)
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Hover over any active column to inspect daily breakdown
                </span>
              )}
            </div>

            {/* SVG Chart Rendering */}
            {overview?.dailyTrend && overview.dailyTrend.length > 0 ? (
              <div className="w-full select-none">
                {(() => {
                  const trend = overview.dailyTrend;
                  const maxVal = Math.max(
                    100,
                    ...trend.map((t) => Math.max(t.grossCollected, t.completedRefunds, Math.abs(t.netCollected)))
                  );
                  const n = trend.length;
                  const svgWidth = 800;
                  const chartLeft = 55;
                  const chartRight = 780;
                  const chartWidth = chartRight - chartLeft;
                  const chartBaseY = 145;
                  const chartPlotHeight = 115;
                  const step = chartWidth / n;
                  const barWidth = Math.min(14, Math.max(4, step * 0.4));

                  return (
                    <div className="w-full">
                      <svg
                        viewBox={`0 0 ${svgWidth} 175`}
                        className="w-full h-44 overflow-visible"
                      >
                        {/* Horizontal Grid lines */}
                        <line x1={chartLeft} y1={30} x2={chartRight} y2={30} stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1={chartLeft} y1={88} x2={chartRight} y2={88} stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1={chartLeft} y1={chartBaseY} x2={chartRight} y2={chartBaseY} stroke="#e2e8f0" strokeWidth="1.5" />

                        {/* Y-Axis tick labels */}
                        <text x={chartLeft - 8} y={34} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                          {maxVal.toFixed(0)}
                        </text>
                        <text x={chartLeft - 8} y={92} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                          {(maxVal / 2).toFixed(0)}
                        </text>
                        <text x={chartLeft - 8} y={chartBaseY + 3} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                          0
                        </text>

                        {/* Daily Columns */}
                        {trend.map((t, idx) => {
                          const cx = chartLeft + idx * step + step / 2;
                          const hasActivity = t.grossCollected > 0 || t.completedRefunds > 0;
                          const gh = t.grossCollected > 0 ? Math.max(3, (t.grossCollected / maxVal) * chartPlotHeight) : 0;
                          const rh = t.completedRefunds > 0 ? Math.max(3, (t.completedRefunds / maxVal) * chartPlotHeight) : 0;
                          const netY = chartBaseY - ((t.netCollected / maxVal) * chartPlotHeight);
                          const isHovered = hoveredDay?.date === t.date;

                          return (
                            <g key={t.date}>
                              {/* Hover Highlight Column */}
                              {isHovered && (
                                <rect
                                  x={chartLeft + idx * step}
                                  y={15}
                                  width={step}
                                  height={chartBaseY - 15}
                                  fill="#f8fafc"
                                  className="transition-opacity"
                                />
                              )}

                              {/* Gross Bar */}
                              {gh > 0 && (
                                <rect
                                  x={cx - barWidth - 1}
                                  y={chartBaseY - gh}
                                  width={barWidth}
                                  height={gh}
                                  rx={2}
                                  fill="#10b981"
                                  className={`transition-all ${isHovered ? "fill-emerald-400" : ""}`}
                                />
                              )}

                              {/* Refund Bar */}
                              {rh > 0 && (
                                <rect
                                  x={cx + 1}
                                  y={chartBaseY - rh}
                                  width={barWidth}
                                  height={rh}
                                  rx={2}
                                  fill="#3b82f6"
                                  className={`transition-all ${isHovered ? "fill-blue-400" : ""}`}
                                />
                              )}

                              {/* Net Marker on days with activity */}
                              {hasActivity && (
                                <circle
                                  cx={cx}
                                  cy={Math.max(25, Math.min(chartBaseY, netY))}
                                  r={isHovered ? 4.5 : 3}
                                  fill="#0e2138"
                                  stroke="#dfbf77"
                                  strokeWidth="1.5"
                                  className="transition-all"
                                />
                              )}

                              {/* X Axis Date Label */}
                              {(idx % Math.ceil(n / 8) === 0 || idx === n - 1) && (
                                <text
                                  x={cx}
                                  y={chartBaseY + 16}
                                  textAnchor="middle"
                                  className="text-[9px] fill-slate-400 font-mono"
                                >
                                  {t.date.slice(5)}
                                </text>
                              )}

                              {/* Interactive Invisible Overlay */}
                              <rect
                                x={chartLeft + idx * step}
                                y={0}
                                width={step}
                                height={175}
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredDay(t)}
                                onMouseLeave={() => setHoveredDay(null)}
                              />
                            </g>
                          );
                        })}
                      </svg>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                        <span>Period: {overview.dateRange.label}</span>
                        <span>Scale: 0 to {maxVal.toFixed(2)} {selectedCurrency}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No financial activity recorded in the selected period.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TOURNAMENTS */}
      {activeTab === "tournaments" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tournaments by name, slug or host club..."
                value={tSearch}
                onChange={(e) => {
                  setTSearch(e.target.value);
                  setTPage(1);
                }}
                onKeyDown={(e) => e.key === "Enter" && fetchTournaments()}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-[#dfbf77]"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing <span className="font-bold text-slate-900">{tournaments.length}</span> tournaments
            </div>
          </div>

          {/* Tournament Revenue Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Tournament</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Fee</th>
                    <th className="py-3 px-3">Registrations</th>
                    <th className="py-3 px-3 text-right">Gross Value</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Real Collected</th>
                    <th className="py-3 px-3 text-right text-blue-700">Refunds</th>
                    <th className="py-3 px-3 text-right text-[#9e7932] font-bold">Net Collected</th>
                    <th className="py-3 px-3 text-center">Simulated</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tournaments.length > 0 ? (
                    tournaments.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{t.name}</div>
                          <div className="text-[11px] text-slate-400">{t.hostClubName || "No host club assigned"}</div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                          {t.startDate.slice(0, 10)}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-medium">
                          {t.entryFee} {t.currency}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900">{t.totalRegistrations}</span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            ({t.paidRegistrations} paid / {t.freeRegistrations} free)
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono">
                          {t.grossRegistrationValue}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {t.collectedPayments}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-blue-700">
                          {t.completedRefunds}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 bg-amber-50/30">
                          {t.netCollected} {t.currency}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {t.simulatedPaymentCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              <FlaskConical size={10} />
                              {t.simulatedPaymentCount} ({t.simulatedPaymentTotal})
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setDrilldownTournament(t)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Drilldown Tournament Financials"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No tournaments found matching the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {tPagination.pages > 1 && (
              <div className="flex items-center justify-between p-3.5 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Page {tPage} of {tPagination.pages} ({tPagination.total} total)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={tPage <= 1}
                    onClick={() => {
                      setTPage(tPage - 1);
                      fetchTournaments();
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={tPage >= tPagination.pages}
                    onClick={() => {
                      setTPage(tPage + 1);
                      fetchTournaments();
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT TRANSACTIONS */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          {/* Transaction Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference, order, golfer, tournament..."
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(1);
                }}
                onKeyDown={(e) => e.key === "Enter" && fetchTransactions()}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Status Filter */}
              <select
                value={txStatus}
                onChange={(e) => {
                  setTxStatus(e.target.value);
                  setTxPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 outline-hidden font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="CREATED">Created (Pending)</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
                <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
              </select>

              {/* Mode Filter: Real vs Simulated */}
              <select
                value={txMode}
                onChange={(e) => {
                  setTxMode(e.target.value as any);
                  setTxPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 outline-hidden font-medium"
              >
                <option value="ALL">All Transactions</option>
                <option value="REAL_ONLY">Real Payments Only</option>
                <option value="SIMULATED_ONLY">Simulated (Test Mode)</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Payment Ref</th>
                    <th className="py-3 px-3">Golfer</th>
                    <th className="py-3 px-3">Tournament</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-4 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900">{tx.referenceNumber}</span>
                          <div className="text-[10px] text-slate-400 font-mono">Reg: {tx.registrationReference}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{tx.golferName}</div>
                          <div className="text-[10px] text-slate-400">{tx.golferEmail}</div>
                        </td>
                        <td className="py-3 px-3 max-w-[180px] truncate">
                          <span className="font-medium text-slate-700">{tx.tournamentName}</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {tx.amount} <span className="text-[10px] text-slate-400">{tx.currency}</span>
                        </td>
                        <td className="py-3 px-3">
                          {tx.status === "SUCCESS" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={10} /> Success
                            </span>
                          ) : tx.status === "REFUNDED" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                              <ArrowDownRight size={10} /> Refunded
                            </span>
                          ) : tx.status === "PARTIALLY_REFUNDED" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                              Partially Refunded
                            </span>
                          ) : tx.status === "FAILED" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                              <AlertCircle size={10} /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                              <Clock size={10} /> {tx.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {tx.isSimulated ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                              <FlaskConical size={10} /> SIMULATED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                              REAL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                          {tx.createdAt.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setInspectTx(tx)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Inspect Details"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No transactions found matching the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {txPagination.pages > 1 && (
              <div className="flex items-center justify-between p-3.5 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Page {txPage} of {txPagination.pages} ({txPagination.total} total)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={txPage <= 1}
                    onClick={() => {
                      setTxPage(txPage - 1);
                      fetchTransactions();
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={txPage >= txPagination.pages}
                    onClick={() => {
                      setTxPage(txPage + 1);
                      fetchTransactions();
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: REFUNDS */}
      {activeTab === "refunds" && (
        <div className="space-y-4">
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 flex items-start gap-3">
            <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-900">
              <span className="font-bold">Authoritative Refund Tracking:</span> Only completed and verified provider reimbursements are logged as completed refunds. Pending or failed refund attempts are not counted in net collection deductions.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Payment Ref</th>
                    <th className="py-3 px-3">Golfer</th>
                    <th className="py-3 px-3">Tournament</th>
                    <th className="py-3 px-3">Original Amt</th>
                    <th className="py-3 px-3 font-bold text-blue-700">Refund Amt</th>
                    <th className="py-3 px-3">Refund Ref ID</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-4">Refunded At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {refunds.length > 0 ? (
                    refunds.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {r.referenceNumber}
                          <div className="text-[10px] text-slate-400 font-mono">Reg: {r.registrationReference}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-800">{r.golferName}</div>
                          <div className="text-[10px] text-slate-400">{r.golferEmail}</div>
                        </td>
                        <td className="py-3.5 px-3 max-w-[180px] truncate">{r.tournamentName}</td>
                        <td className="py-3.5 px-3 font-mono text-slate-500">
                          {r.originalAmount} {r.currency}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-blue-700">
                          {r.refundAmount} {r.currency}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                          {r.refundReference}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                            {r.refundStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          {r.isSimulated ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                              SIMULATED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                              REAL
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                          {r.refundedAt.slice(0, 16).replace("T", " ")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No refunds found in the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INTERNAL RECONCILIATION */}
      {activeTab === "reconciliation" && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 text-[#dfbf77]">
                  <ShieldAlert size={16} />
                  <span>Internal Payment Reconciliation Engine</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Automated integrity check across registrations and payment records. Detects missing payments, unrefunded cancellations, stale checkout sessions, and simulation leaks without mutating records.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">
                  Audit: {reconciliation?.generatedAt?.slice(0, 16).replace("T", " ") || "Live"}
                </span>
              </div>
            </div>

            {/* Severity summary badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Issues</div>
                <div className="text-lg font-black text-white">{reconciliation?.totalIssuesCount || 0}</div>
              </div>
              <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                <div className="text-[10px] text-red-400 font-bold uppercase">Critical</div>
                <div className="text-lg font-black text-red-400">{reconciliation?.criticalCount || 0}</div>
              </div>
              <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <div className="text-[10px] text-amber-400 font-bold uppercase">Warning</div>
                <div className="text-lg font-black text-amber-400">{reconciliation?.warningCount || 0}</div>
              </div>
              <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                <div className="text-[10px] text-blue-400 font-bold uppercase">Info / Expired</div>
                <div className="text-lg font-black text-blue-400">{reconciliation?.infoCount || 0}</div>
              </div>
            </div>
          </div>

          {/* Filter Discrepancies */}
          <div className="flex items-center gap-2">
            {(["ALL", "CRITICAL", "WARNING", "INFO"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setReconFilter(lvl)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                  reconFilter === lvl
                    ? "bg-[#0e2138] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {lvl === "ALL" ? "All Discrepancies" : lvl}
              </button>
            ))}
          </div>

          {/* Discrepancy List */}
          <div className="space-y-3">
            {reconciliation && reconciliation.discrepancies.length > 0 ? (
              reconciliation.discrepancies
                .filter((d) => reconFilter === "ALL" || d.severity === reconFilter)
                .map((disc) => (
                  <div
                    key={disc.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      disc.severity === "CRITICAL"
                        ? "bg-red-50/40 border-red-200"
                        : disc.severity === "WARNING"
                        ? "bg-amber-50/40 border-amber-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            disc.severity === "CRITICAL"
                              ? "bg-red-600 text-white"
                              : disc.severity === "WARNING"
                              ? "bg-amber-500 text-white"
                              : "bg-blue-500 text-white"
                          }`}
                        >
                          {disc.severity}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800">{disc.code}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Ref: {disc.referenceId} ({disc.amount} {disc.currency})
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-2">{disc.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{disc.description}</p>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-start gap-2 text-xs">
                      <span className="font-bold text-slate-700 shrink-0">Action:</span>
                      <span className="text-slate-600">{disc.recommendedAction}</span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-80" />
                <div className="font-bold text-slate-700">Zero Discrepancies Detected</div>
                <p className="mt-1">All payment transactions and registration records reconcile authoritatively.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: DRILLDOWN TOURNAMENT FINANCIALS */}
      {drilldownTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">{drilldownTournament.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Slug: {drilldownTournament.slug}</p>
              </div>
              <button
                onClick={() => setDrilldownTournament(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Dates</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">
                  {drilldownTournament.startDate.slice(0, 10)} to {drilldownTournament.endDate.slice(0, 10)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Host Club</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
                  {drilldownTournament.hostClubName || "N/A"}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Entry Fee</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5 font-mono">
                  {drilldownTournament.entryFee} {drilldownTournament.currency}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-[10px] text-emerald-700 font-bold uppercase">Real Collections</div>
                <div className="text-sm font-bold text-emerald-800 mt-0.5 font-mono">
                  {drilldownTournament.collectedPayments} {drilldownTournament.currency}
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-[10px] text-blue-700 font-bold uppercase">Completed Refunds</div>
                <div className="text-sm font-bold text-blue-800 mt-0.5 font-mono">
                  {drilldownTournament.completedRefunds} {drilldownTournament.currency}
                </div>
              </div>
              <div className="p-3 bg-[#0e2138] rounded-xl text-white">
                <div className="text-[10px] text-[#dfbf77] font-bold uppercase">Net Collected</div>
                <div className="text-sm font-bold text-white mt-0.5 font-mono">
                  {drilldownTournament.netCollected} {drilldownTournament.currency}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
              <div className="flex justify-between py-1">
                <span>Total Registrations:</span>
                <span className="font-bold text-slate-800">{drilldownTournament.totalRegistrations}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Paid Registrations:</span>
                <span className="font-bold text-slate-800">{drilldownTournament.paidRegistrations}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Free / Waived Registrations:</span>
                <span className="font-bold text-slate-800">{drilldownTournament.freeRegistrations}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Cancelled Registrations:</span>
                <span className="font-bold text-slate-800">{drilldownTournament.cancelledRegistrations}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Gross Registration Value:</span>
                <span className="font-bold font-mono text-slate-800">{drilldownTournament.grossRegistrationValue} {drilldownTournament.currency}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Simulated Test Payments:</span>
                <span className="font-bold text-amber-700">{drilldownTournament.simulatedPaymentCount} ({drilldownTournament.simulatedPaymentTotal} {drilldownTournament.currency})</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setDrilldownTournament(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT TRANSACTION DETAILS */}
      {inspectTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {inspectTx.referenceNumber}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ID: {inspectTx.id}
                </p>
              </div>
              <button
                onClick={() => setInspectTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 my-4 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Registration Ref:</span>
                <span className="font-mono font-bold text-slate-800">{inspectTx.registrationReference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Tournament:</span>
                <span className="font-semibold text-slate-800">{inspectTx.tournamentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Golfer Name & Email:</span>
                <span className="font-medium text-slate-800">{inspectTx.golferName} ({inspectTx.golferEmail})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Amount & Currency:</span>
                <span className="font-mono font-bold text-slate-900">{inspectTx.amount} {inspectTx.currency}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Provider & Order ID:</span>
                <span className="font-mono text-slate-700">{inspectTx.provider} / {inspectTx.providerOrderId || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Gateway Payment ID:</span>
                <span className="font-mono text-slate-700">{inspectTx.providerPaymentId || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Transaction Status:</span>
                <span className="font-bold text-slate-800">{inspectTx.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Simulated / Test Mode:</span>
                <span className={inspectTx.isSimulated ? "font-bold text-amber-700" : "font-bold text-emerald-700"}>
                  {inspectTx.isSimulated ? "SIMULATED (TEST)" : "REAL (PRODUCTION)"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Created At:</span>
                <span className="font-mono text-slate-600">{inspectTx.createdAt}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Paid At:</span>
                <span className="font-mono text-slate-600">{inspectTx.paidAt || "N/A"}</span>
              </div>
              {inspectTx.refundAmount && (
                <div className="flex justify-between py-1 border-b border-slate-50 bg-blue-50/50 p-2 rounded-lg">
                  <span className="text-blue-800 font-bold">Refunded Amount:</span>
                  <span className="font-mono font-bold text-blue-900">
                    {inspectTx.refundAmount} {inspectTx.currency} (Ref: {inspectTx.refundReference || "N/A"})
                  </span>
                </div>
              )}
            </div>

            {inspectTx.metadata && (
              <div className="mt-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Metadata Snapshot</span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono mt-1 overflow-x-auto max-h-40">
                  {JSON.stringify(inspectTx.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setInspectTx(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
