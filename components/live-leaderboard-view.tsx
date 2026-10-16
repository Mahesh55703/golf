"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  MapPin,
  CalendarDays,
  Radio,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Loader2,
  ShieldAlert,
} from "lucide-react";

interface LeaderboardEntry {
  golferId: string;
  golferName: string;
  divisionId?: string | null;
  divisionName?: string | null;
  thruHoles: number;
  totalGross: number;
  toParGross: number;
  totalNet: number | null;
  toParNet: number | null;
  totalStableford: number | null;
  status: string;
  rank: number;
  isTied: boolean;
  formattedRank: string;
}

interface LiveLeaderboardViewProps {
  initialTournamentSlug: string;
  availableTournaments: Array<{ slug: string; name: string }>;
}

export function LiveLeaderboardView({
  initialTournamentSlug,
  availableTournaments,
}: LiveLeaderboardViewProps) {
  const [selectedTournamentSlug, setSelectedTournamentSlug] = useState(initialTournamentSlug);
  const [selectedDivisionId, setSelectedDivisionId] = useState("all");
  const [scoreMode, setScoreMode] = useState<"gross" | "net" | "stableford">("gross");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tournamentSlug: selectedTournamentSlug,
        divisionId: selectedDivisionId,
      });
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedTournamentSlug, selectedDivisionId]);

  const tournament = data?.tournament;
  const currentRound = data?.currentRound;
  const leaderboard: LeaderboardEntry[] = data?.leaderboard || [];

  const formatToPar = (toPar: number) => {
    if (toPar === 0) return "E";
    if (toPar > 0) return `+${toPar}`;
    return `${toPar}`;
  };

  return (
    <div className="space-y-6">
      {/* Title & Tournament Switcher Row */}
      <div className="leaderboard-title-row flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> OFFICIAL TOURNAMENT RESULTS
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-[#0e2138] mt-1">
            {tournament?.name || "Tournament Leaderboard"}
          </h2>
          <p className="section-description flex items-center gap-2 text-xs md:text-sm text-slate-600 mt-1">
            <MapPin size={14} className="text-[#9e7932]" />
            {tournament?.hostClub || "Premier Golf Club"}
            <span>·</span>
            <CalendarDays size={14} className="text-[#9e7932]" />
            {currentRound ? `${currentRound.name} (Par ${currentRound.par})` : "Round 1"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tournament selector */}
          <select
            value={selectedTournamentSlug}
            onChange={(e) => setSelectedTournamentSlug(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:outline-none focus:border-[#c29b4e]"
          >
            {availableTournaments.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>

          <span
            className="sample-status inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: "#0e2138", color: "#dfbf77", border: "1px solid #c29b4e" }}
          >
            <Radio size={14} className="animate-pulse" /> LIVE SCORING
          </span>
        </div>
      </div>

      {/* Main Leaderboard Card */}
      <div className="leaderboard-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Top Toolbar */}
        <div className="leaderboard-card-top p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="leaderboard-label text-[10px] uppercase font-bold tracking-widest text-[#9e7932] block">
              {currentRound?.name?.toUpperCase() || "ROUND 1"} · {tournament?.format?.replace("_", " ") || "STROKE PLAY"}
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {selectedDivisionId === "all" ? "All Divisions Leaderboard" : "Division Standings"}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Division dropdown if multiple */}
            {tournament?.divisions?.length > 1 && (
              <select
                value={selectedDivisionId}
                onChange={(e) => setSelectedDivisionId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#c29b4e]"
              >
                <option value="all">All Divisions</option>
                {tournament.divisions.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {/* Mode Switcher */}
            <div className="leaderboard-switch flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setScoreMode("gross")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  scoreMode === "gross"
                    ? "bg-[#0e2138] text-[#dfbf77] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Gross
              </button>
              <button
                onClick={() => setScoreMode("net")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  scoreMode === "net"
                    ? "bg-[#0e2138] text-[#dfbf77] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Net
              </button>
              {tournament?.format === "STABLEFORD" && (
                <button
                  onClick={() => setScoreMode("stableford")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    scoreMode === "stableford"
                      ? "bg-[#0e2138] text-[#dfbf77] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Points
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="leaderboard-table-wrap overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 size={32} className="animate-spin text-[#dfbf77] mb-2" />
              <p className="text-xs font-semibold">Calculating real-time standings...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="p-4 rounded-full bg-slate-50 text-slate-400 mb-3">
                <Trophy size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-800">No scorecards recorded yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Scores will populate live as players tee off and official scorers submit hole cards.
              </p>
            </div>
          ) : (
            <table className="leaderboard-table w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">POS</th>
                  <th className="px-4 py-3.5">PLAYER</th>
                  <th className="px-4 py-3.5">DIVISION</th>
                  <th className="px-4 py-3.5">THRU</th>
                  <th className="px-4 py-3.5">TO PAR</th>
                  <th className="px-4 py-3.5">{scoreMode === "stableford" ? "POINTS" : scoreMode === "net" ? "NET" : "TOTAL"}</th>
                  <th className="px-5 py-3.5 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard.map((r) => (
                  <tr key={r.golferId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <span
                        className={`leader-position inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${
                          r.rank === 1
                            ? "bg-[#c29b4e] text-[#0e2138] font-black"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.rank === 1 ? <Trophy size={14} /> : r.formattedRank}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {r.golferName}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-medium">
                      {r.divisionName || "Open"}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      {r.thruHoles === 18 ? "F" : r.thruHoles === 0 ? "–" : r.thruHoles}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold">
                      <span
                        className={
                          scoreMode === "net"
                            ? (r.toParNet || 0) < 0
                              ? "text-rose-600"
                              : (r.toParNet || 0) === 0
                              ? "text-slate-900"
                              : "text-slate-500"
                            : r.toParGross < 0
                            ? "text-rose-600"
                            : r.toParGross === 0
                            ? "text-slate-900"
                            : "text-slate-500"
                        }
                      >
                        {scoreMode === "net"
                          ? r.toParNet !== null
                            ? formatToPar(r.toParNet)
                            : "–"
                          : r.thruHoles > 0
                          ? formatToPar(r.toParGross)
                          : "–"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 font-mono text-sm">
                      {scoreMode === "stableford"
                        ? r.totalStableford ?? "–"
                        : scoreMode === "net"
                        ? r.totalNet ?? "–"
                        : r.thruHoles > 0
                        ? r.totalGross
                        : "–"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {r.status === "VERIFIED" ? (
                          <>
                            <CheckCircle2 size={11} /> Verified
                          </>
                        ) : (
                          <>
                            <Clock size={11} /> Provisional
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footnote */}
        <div className="leaderboard-footnote p-4 bg-slate-50 border-t border-slate-100 text-slate-500 text-[11px] flex items-center justify-between">
          <span>
            Official GolfPulse Scoring Audit. Ties reflect USGA/WHS standard ranking.
          </span>
          <span className="text-slate-400 font-mono text-[10px]">
            Real-time feed active
          </span>
        </div>
      </div>
    </div>
  );
}
