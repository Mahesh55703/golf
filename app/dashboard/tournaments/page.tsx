"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Loader2,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  UserMinus,
  X,
  RotateCcw,
  DollarSign,
} from "lucide-react";

interface TournamentItem {
  id: string;
  referenceNumber: string;
  status: string;
  paymentStatus: string;
  entryFeePaid: number;
  currency: string;
  registeredAt: string;
  cancelledAt: string | null;
  handicapSnapshot: number | null;
  category: "upcoming" | "in_progress" | "past" | "cancelled";
  division: { id: string; name: string };
  tournament: {
    id: string;
    name: string;
    slug: string;
    startDate: string;
    endDate: string;
    format: string;
    status: string;
    hostClub: string;
    location: string;
  };
  rounds: Array<{
    roundNumber: number;
    roundName: string;
    roundDate: string;
    isCompleted: boolean;
    isScoringLive: boolean;
    scorecard: {
      id: string;
      totalGross: number;
      totalNet: number | null;
      thruHoles: number;
      isCompleted: boolean;
      status: string;
    } | null;
  }>;
  latestPayment: {
    referenceNumber: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: string | null;
  } | null;
}

export default function MyTournamentsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "in_progress" | "past" | "cancelled">("upcoming");
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [counts, setCounts] = useState({ upcoming: 0, in_progress: 0, past: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Withdrawal & Refund Modal State
  const [withdrawingItem, setWithdrawingItem] = useState<TournamentItem | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  const fetchTournaments = async () => {
    try {
      const res = await fetch("/api/golfer/tournaments");
      if (!res.ok) throw new Error("Failed to load tournaments");
      const json = await res.json();
      setTournaments(json.tournaments || []);
      setCounts(json.counts || { upcoming: 0, in_progress: 0, past: 0, cancelled: 0 });
    } catch (err: any) {
      setError(err.message || "Failed to load tournament registrations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleConfirmWithdraw = async () => {
    if (!withdrawingItem) return;
    setIsWithdrawing(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);

    try {
      const res = await fetch("/api/golfer/tournaments/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: withdrawingItem.id,
          reason: withdrawReason.trim() || "Voluntary withdrawal by player",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setWithdrawError(data.error || "Failed to process tournament withdrawal.");
        return;
      }

      setWithdrawSuccess(data.message || "Withdrawal completed successfully.");
      await fetchTournaments();

      setTimeout(() => {
        setWithdrawingItem(null);
        setWithdrawReason("");
        setWithdrawSuccess(null);
      }, 1800);
    } catch {
      setWithdrawError("Network error while processing withdrawal. Please try again.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-white/50 space-y-3">
        <Loader2 className="animate-spin text-[#dfbf77]" size={32} />
        <p className="text-xs">Loading tournaments...</p>
      </div>
    );
  }

  const filtered = tournaments.filter((t) => t.category === activeTab);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">My Tournament History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your event registrations, starting times, scorecards & results
          </p>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200/80 text-xs shadow-sm">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === "upcoming"
                ? "bg-[#0b3b24] text-white shadow"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Upcoming ({counts.upcoming})
          </button>
          <button
            onClick={() => setActiveTab("in_progress")}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === "in_progress"
                ? "bg-[#0b3b24] text-white shadow"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            In Progress ({counts.in_progress})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === "past"
                ? "bg-[#0b3b24] text-white shadow"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Past ({counts.past})
          </button>
          {counts.cancelled > 0 && (
            <button
              onClick={() => setActiveTab("cancelled")}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                activeTab === "cancelled"
                  ? "bg-rose-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Cancelled ({counts.cancelled})
            </button>
          )}
        </div>
      </div>

      {/* Tournaments List */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3 shadow-sm">
          <Calendar size={36} className="mx-auto text-slate-300" />
          <h3 className="font-bold text-base text-slate-900">
            {activeTab === "upcoming"
              ? "No Upcoming Tournaments"
              : activeTab === "in_progress"
              ? "No Tournaments Currently In Progress"
              : activeTab === "past"
              ? "No Completed Tournaments Yet"
              : "No Cancelled Tournaments"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === "upcoming"
              ? "You haven't participated in any tournaments yet. Explore upcoming tournaments to get started."
              : activeTab === "in_progress"
              ? "None of your registered tournaments are currently underway."
              : "Completed tournaments and official scores will appear here after events finish."}
          </p>
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0b3b24] to-[#124d31] text-white font-bold text-xs hover:brightness-110 transition-all shadow-md mt-2"
          >
            <span>Explore Tournaments</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-sm transition-all space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {item.referenceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        item.status === "CONFIRMED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {item.status}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        item.paymentStatus === "PAID" || item.paymentStatus === "FREE_ENTRY"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.paymentStatus === "REFUNDED"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      PAYMENT: {item.paymentStatus}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 hover:text-emerald-800 transition-colors">
                    <Link href={`/tournaments/${item.tournament.slug}`}>
                      {item.tournament.name}
                    </Link>
                  </h3>

                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <MapPin size={13} className="text-emerald-700" />
                    <span>{item.tournament.hostClub}</span>
                    {item.tournament.location && <span>({item.tournament.location})</span>}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href={`/tournaments/${item.tournament.slug}`}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all flex items-center gap-1.5"
                  >
                    <span>View Tournament</span>
                    <ExternalLink size={13} />
                  </Link>
                  <Link
                    href="/leaderboards"
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs transition-all flex items-center gap-1.5"
                  >
                    <Trophy size={13} />
                    <span>Leaderboard</span>
                  </Link>

                  {item.category === "upcoming" && item.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => {
                        setWithdrawingItem(item);
                        setWithdrawReason("");
                        setWithdrawError(null);
                        setWithdrawSuccess(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserMinus size={13} />
                      <span>Withdraw {item.paymentStatus === "PAID" && item.entryFeePaid > 0 ? "& Refund" : ""}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Event Metadata Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tournament Dates</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(item.tournament.startDate).toLocaleDateString()} -{" "}
                    {new Date(item.tournament.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Division</span>
                  <span className="font-semibold text-emerald-800">{item.division.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Format</span>
                  <span className="font-semibold text-slate-800">{item.tournament.format.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Entry Fee</span>
                  <span className="font-semibold text-slate-800">
                    {item.entryFeePaid > 0
                      ? `${item.entryFeePaid.toFixed(2)} ${item.currency}`
                      : "Free Registration"}
                  </span>
                </div>
              </div>

              {/* Rounds & Scorecards if in progress or past */}
              {item.rounds && item.rounds.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Rounds & Scorecard Snapshot
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {item.rounds.map((round) => (
                      <div
                        key={round.roundNumber}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{round.roundName}</span>
                          <span className="block text-[10px] text-slate-400">
                            {new Date(round.roundDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right">
                          {round.scorecard ? (
                            <div>
                              <span className="font-mono font-bold text-sm text-emerald-800">
                                {round.scorecard.totalGross}
                              </span>
                              <span className="block text-[10px] text-emerald-600 font-semibold">
                                {round.scorecard.thruHoles} Holes ({round.scorecard.status})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">No score entered</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tournament Withdrawal & Refund Modal */}
      {withdrawingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <UserMinus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-tight">Tournament Withdrawal</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Ref: {withdrawingItem.referenceNumber}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isWithdrawing) {
                    setWithdrawingItem(null);
                    setWithdrawError(null);
                    setWithdrawSuccess(null);
                  }
                }}
                disabled={isWithdrawing}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Event Summary */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
              <span className="font-bold text-slate-900 block text-sm">{withdrawingItem.tournament.name}</span>
              <p className="text-slate-500 text-[11px]">{withdrawingItem.tournament.hostClub}</p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-[11px]">
                <span className="text-slate-500">Dates:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(withdrawingItem.tournament.startDate).toLocaleDateString()} - {new Date(withdrawingItem.tournament.endDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Division:</span>
                <span className="font-semibold text-emerald-800">{withdrawingItem.division.name}</span>
              </div>
            </div>

            {/* Refund Policy Information */}
            {withdrawingItem.paymentStatus === "PAID" && withdrawingItem.entryFeePaid > 0 ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <RotateCcw size={15} className="text-emerald-600" />
                  <span>Full Refund Eligible: {withdrawingItem.entryFeePaid.toFixed(2)} {withdrawingItem.currency}</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Upon confirming withdrawal, a full refund of <strong>{withdrawingItem.entryFeePaid.toFixed(2)} {withdrawingItem.currency}</strong> will be initiated directly to your original payment method.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                <p className="text-[11px]">
                  This registration was complimentary or unpaid. Confirming withdrawal will cancel your entry slot and notify tournament organizers.
                </p>
              </div>
            )}

            {/* Reason input */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">Reason for Withdrawal (Optional)</label>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="e.g. Schedule conflict, injury, travel delay..."
                rows={2}
                disabled={isWithdrawing}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
              />
            </div>

            {/* Error & Success Feedback */}
            {withdrawError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            {withdrawSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>{withdrawSuccess}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawingItem(null)}
                disabled={isWithdrawing}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Keep Entry
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdraw}
                disabled={isWithdrawing}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Processing Withdrawal...</span>
                  </>
                ) : (
                  <>
                    <UserMinus size={13} />
                    <span>Confirm Withdrawal {withdrawingItem.paymentStatus === "PAID" && withdrawingItem.entryFeePaid > 0 ? "& Refund" : ""}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
