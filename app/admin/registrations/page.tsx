"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  DollarSign,
  Trophy,
  Calendar,
  CheckCircle2,
  Clock,
  X,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  CreditCard,
  RotateCcw,
  Ban,
  ShieldCheck,
} from "lucide-react";

interface PaymentItem {
  id: string;
  referenceNumber: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  refundedAt: string | null;
  refundReference: string | null;
  createdAt: string;
}

interface RegistrationRecord {
  id: string;
  referenceNumber: string;
  status: string;
  paymentStatus: string;
  entryFeePaid: number;
  currency: string;
  handicapSnapshot: number | null;
  registeredAt: string;
  notes: string | null;
  golfer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    country: string;
    homeClub: string | null;
    handicapIndex: number | null;
  };
  tournament: {
    id: string;
    name: string;
    slug: string;
    startDate: string;
    endDate: string;
    hostClub: { name: string } | null;
  };
  division: {
    id: string;
    name: string;
  } | null;
  payments?: PaymentItem[];
}

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [selectedRecord, setSelectedRecord] = useState<RegistrationRecord | null>(null);

  // Reconciliation state
  const [reconciling, setReconciling] = useState(false);
  const [reconcileAction, setReconcileAction] = useState<string | null>(null);
  const [reconcileReason, setReconcileReason] = useState("");
  const [reconcileRef, setReconcileRef] = useState("");
  const [reconcileAmount, setReconcileAmount] = useState<string>("");
  const [reconcileMessage, setReconcileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
      params.set("page", page.toString());
      params.set("limit", "10");

      const res = await fetch(`/api/admin/registrations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
        setPagination(data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      console.error("Failed to load registrations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [page, statusFilter, paymentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRegistrations();
  };

  const executeReconcile = async () => {
    if (!selectedRecord || !reconcileAction) return;
    if (reconcileReason.trim().length < 5) {
      setReconcileMessage({ type: "error", text: "Please enter an audit reason of at least 5 characters." });
      return;
    }

    setReconciling(true);
    setReconcileMessage(null);

    const payload: any = {
      registrationId: selectedRecord.id,
      action: reconcileAction,
      reason: reconcileReason.trim(),
      externalReference: reconcileRef.trim() || undefined,
    };

    if (reconcileAction === "MARK_REFUNDED" && reconcileAmount.trim()) {
      const parsed = parseFloat(reconcileAmount.trim());
      if (!isNaN(parsed) && parsed > 0) {
        payload.amount = parsed;
      }
    }

    try {
      const res = await fetch("/api/admin/registrations/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setReconcileMessage({ type: "error", text: json.details || json.error || "Action failed." });
        return;
      }

      setReconcileMessage({ type: "success", text: json.message || "Operation completed successfully." });
      setReconcileAction(null);
      setReconcileReason("");
      setReconcileRef("");
      setReconcileAmount("");
      fetchRegistrations();
      setSelectedRecord(null);
    } catch (err: any) {
      setReconcileMessage({ type: "error", text: err.message || "Network error." });
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-[#9e7932] font-extrabold flex items-center gap-1.5">
            <Users size={14} /> Golfer Participation & Revenue
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[#0e2138] mt-1 tracking-tight">
            Tournament Registrations
          </h1>
          <p className="text-xs md:text-sm text-slate-600 font-medium mt-1">
            Track golfer entries, reference numbers, multi-currency fees, provider order IDs, and payment statuses.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-96">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference, golfer, email, tournament..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-bold uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#c29b4e]"
            >
              <option value="all">All Registrations</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending (Awaiting Payment)</option>
              <option value="WAITLISTED">Waitlisted</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-bold uppercase">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#c29b4e]"
            >
              <option value="all">All Payments</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="FREE_ENTRY">Free Entry</option>
              <option value="REFUNDED">Refunded</option>
              <option value="WAIVED">Waived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin text-[#dfbf77] mb-2" />
            <p className="text-xs font-medium">Loading golfer registrations...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="p-4 rounded-full bg-slate-50 text-slate-400 mb-3">
              <Users size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No registrations found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              No participant entries match the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-4 py-3.5">Golfer Details</th>
                  <th className="px-4 py-3.5">Tournament & Division</th>
                  <th className="px-4 py-3.5">Handicap</th>
                  <th className="px-4 py-3.5">Fee & Payment</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelectedRecord(reg)}
                        className="font-mono font-bold text-slate-900 hover:text-[#9e7932] text-xs text-left"
                      >
                        {reg.referenceNumber}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">
                          {reg.golfer.firstName} {reg.golfer.lastName}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {reg.golfer.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/tournaments`}
                          className="font-bold text-slate-900 hover:underline block truncate"
                        >
                          {reg.tournament.name}
                        </Link>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {reg.division?.name || "Open Championship"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-700">
                        {reg.handicapSnapshot !== null ? reg.handicapSnapshot : "Open"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">
                          {Number(reg.entryFeePaid).toFixed(2)} {reg.currency}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            reg.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : reg.paymentStatus === "FREE_ENTRY"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : reg.paymentStatus === "REFUNDED"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {reg.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          reg.status === "CONFIRMED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : reg.status === "CANCELLED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(reg)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {registrations.length} of {pagination.total} registrations
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 font-bold text-slate-700">
                {page} / {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Registration Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#faf5eb] text-[#9e7932]">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Registration {selectedRecord.referenceNumber}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Recorded {new Date(selectedRecord.registeredAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedRecord(null);
                  setReconcileAction(null);
                  setReconcileMessage(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {reconcileMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  reconcileMessage.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border border-rose-200 text-rose-800"
                }`}
              >
                <AlertCircle size={16} className="shrink-0" />
                {reconcileMessage.text}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e7932] block">
                  Golfer Profile
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Name</span>
                    <strong className="text-slate-900">
                      {selectedRecord.golfer.firstName} {selectedRecord.golfer.lastName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Email</span>
                    <strong className="text-slate-900">{selectedRecord.golfer.email}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Phone</span>
                    <span className="text-slate-800">{selectedRecord.golfer.phone || "None"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Home Club</span>
                    <span className="text-slate-800">{selectedRecord.golfer.homeClub || "None"}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e7932] block">
                  Tournament Entry & Fee
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tournament</span>
                    <strong className="text-slate-900">{selectedRecord.tournament.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Division</span>
                    <strong className="text-slate-900">
                      {selectedRecord.division?.name || "Open Championship"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Fee & Status</span>
                    <strong className="text-slate-900">
                      {Number(selectedRecord.entryFeePaid).toFixed(2)} {selectedRecord.currency} ({selectedRecord.paymentStatus})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Declared Handicap</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedRecord.handicapSnapshot !== null ? selectedRecord.handicapSnapshot : "Open"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e7932] block flex items-center justify-between">
                  <span>Audited Payment Records</span>
                  <span className="font-mono text-slate-400">{selectedRecord.payments?.length || 0} found</span>
                </span>
                {selectedRecord.payments && selectedRecord.payments.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedRecord.payments.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{p.referenceNumber}</span>
                            {(p.providerOrderId?.startsWith("order_sim_") || p.providerPaymentId?.startsWith("pay_sim_")) && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                                Simulated / Test
                              </span>
                            )}
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            p.status === "SUCCESS"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : p.status === "REFUNDED"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="text-slate-500 flex flex-wrap gap-x-3">
                          <span>Gateway: {p.provider}</span>
                          {p.providerOrderId && <span>Order: {p.providerOrderId}</span>}
                          {p.providerPaymentId && <span>Payment: {p.providerPaymentId}</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.paidAt ? `Paid ${new Date(p.paidAt).toLocaleString()}` : `Created ${new Date(p.createdAt).toLocaleString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">No digital payment attempts recorded yet.</p>
                )}
              </div>

              {/* Administrative Reconciliation Controls (Requires Platform Admin) */}
              <div className="p-3.5 bg-[#faf5eb] rounded-xl border border-[#dfbf77]/40 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e7932] block">
                  Admin Reconciliation & Lifecycle Control
                </span>

                {!reconcileAction ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecord.paymentStatus !== "PAID" && (
                      <button
                        onClick={() => setReconcileAction("MARK_PAID")}
                        className="px-3 py-1.5 bg-[#0e2138] hover:bg-[#1a365d] text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <ShieldCheck size={13} className="text-[#dfbf77]" /> Mark as Paid (Manual)
                      </button>
                    )}
                    {selectedRecord.paymentStatus === "PAID" && (
                      <button
                        onClick={() => setReconcileAction("MARK_REFUNDED")}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <RotateCcw size={13} /> Reconcile Refund
                      </button>
                    )}
                    {selectedRecord.status !== "CANCELLED" && (
                      <button
                        onClick={() => setReconcileAction("CANCEL_REGISTRATION")}
                        className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <Ban size={13} /> Cancel Registration
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block">
                      Confirm {reconcileAction.replace("_", " ")}
                    </span>
                    {reconcileAction === "MARK_REFUNDED" && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-slate-400">
                            Refund Amount ({selectedRecord.currency}) - Leave blank for full remaining balance:
                          </label>
                          <span className="text-[10px] font-mono text-purple-700 font-bold">
                            Max: {Number(selectedRecord.entryFeePaid).toFixed(2)} {selectedRecord.currency}
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={Number(selectedRecord.entryFeePaid)}
                          placeholder={`Full refund: ${Number(selectedRecord.entryFeePaid).toFixed(2)} ${selectedRecord.currency}`}
                          value={reconcileAmount}
                          onChange={(e) => setReconcileAmount(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#c29b4e]"
                        />
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="Audit reason (required, min 5 chars)..."
                      value={reconcileReason}
                      onChange={(e) => setReconcileReason(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#c29b4e]"
                    />
                    <input
                      type="text"
                      placeholder="External reference / check # / bank receipt ID (optional)..."
                      value={reconcileRef}
                      onChange={(e) => setReconcileRef(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#c29b4e]"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        disabled={reconciling}
                        onClick={executeReconcile}
                        className="px-3 py-1.5 bg-[#0e2138] hover:bg-[#1a365d] text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1"
                      >
                        {reconciling && <Loader2 size={12} className="animate-spin" />}
                        Confirm Action
                      </button>
                      <button
                        type="button"
                        onClick={() => setReconcileAction(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedRecord(null);
                  setReconcileAction(null);
                  setReconcileMessage(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
