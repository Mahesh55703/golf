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

  useEffect(() => {
    async function loadTournaments() {
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
    }
    loadTournaments();
  }, []);

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

                <div className="flex items-center gap-3">
                  <Link
                    href={`/tournaments/${item.tournament.slug}`}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all flex items-center gap-1.5"
                  >
                    <span>View Tournament</span>
                    <ExternalLink size={13} />
                  </Link>
                  <Link
                    href="/leaderboards"
                    className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs transition-all flex items-center gap-1.5"
                  >
                    <Trophy size={13} />
                    <span>Leaderboard</span>
                  </Link>
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
    </div>
  );
}
