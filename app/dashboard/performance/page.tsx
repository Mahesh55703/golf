"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Trophy,
  Award,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react";

interface PerformanceData {
  metrics: {
    tournamentsPlayed: number;
    completedRounds: number;
    totalRoundsWithScores: number;
    bestScore: number | null;
    scoringAverage: number | null;
    top10Finishes: number;
    top3Finishes: number;
    wins: number;
  };
  scoringBreakdown: {
    calculatedFrom: number;
    hasValidHistory: boolean;
    scoreHistory: Array<{
      date: string;
      score: number;
      tournamentName: string;
      roundNumber: number;
    }>;
  };
  officialResults: Array<{
    id: string;
    tournamentName: string;
    tournamentSlug: string;
    tournamentDate: string;
    division: string;
    rank: number;
    isTied: boolean;
    totalGross: number;
    totalNet: number | null;
    toPar: number;
    roundsPlayed: number;
    finalizedAt: string;
  }>;
  scorecardsSummary: Array<{
    id: string;
    tournamentName: string;
    tournamentSlug: string;
    roundNumber: number;
    totalGross: number;
    totalNet: number | null;
    thruHoles: number;
    isCompleted: boolean;
    status: string;
    submittedAt: string | null;
    verifiedAt: string | null;
  }>;
}

export default function GolferPerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPerformance() {
      try {
        const res = await fetch("/api/golfer/performance");
        if (!res.ok) throw new Error("Failed to load performance metrics");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Failed to load performance.");
      } finally {
        setLoading(false);
      }
    }
    loadPerformance();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-white/50 space-y-3">
        <Loader2 className="animate-spin text-[#dfbf77]" size={32} />
        <p className="text-xs">Analyzing tournament performance records...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 max-w-lg mx-auto text-center space-y-3">
        <AlertCircle size={28} className="mx-auto text-rose-400" />
        <h3 className="font-bold">Performance Data Unavailable</h3>
        <p className="text-xs text-rose-200/70">{error}</p>
      </div>
    );
  }

  const { metrics, scoringBreakdown, officialResults, scorecardsSummary } = data;

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Competitive Performance & Scoring</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Calculated strictly from authoritative official scorecards and competition results
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Tournaments Played
          </span>
          <div className="text-2xl font-black text-slate-900">{metrics.tournamentsPlayed}</div>
          <p className="text-[10px] text-slate-400 mt-1">Authoritative event starts</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Completed 18H Rounds
          </span>
          <div className="text-2xl font-black text-slate-900">{metrics.completedRounds}</div>
          <p className="text-[10px] text-slate-400 mt-1">Full 18-hole scorecards</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Best Gross Score
          </span>
          <div className="text-2xl font-black text-emerald-800">
            {metrics.bestScore !== null ? metrics.bestScore : "—"}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Single 18-hole low round</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Scoring Average
          </span>
          <div className="text-2xl font-black text-emerald-600">
            {metrics.scoringAverage !== null ? metrics.scoringAverage : "—"}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {metrics.completedRounds > 0
              ? `Across ${metrics.completedRounds} completed rounds`
              : "Awaiting completed rounds"}
          </p>
        </div>
      </div>

      {/* Secondary Finishes Metric Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm text-center">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Tournament Victories</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{metrics.wins}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Top 3 Podiums</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{metrics.top3Finishes}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top 10 Finishes</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{metrics.top10Finishes}</div>
        </div>
      </div>

      {/* Calculation Integrity Notice */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
        <Info size={18} className="shrink-0 mt-0.5 text-emerald-700" />
        <div className="space-y-1">
          <p className="font-bold">Official Scoring Data Integrity</p>
          <p className="text-emerald-800 text-[11px] leading-relaxed">
            Statistical indicators are derived solely from verified, completed 18-hole scorecards.
            Unplayed registrations and incomplete holes are never treated as zero strokes or mixed into scoring averages.
            GolfPulse does not compute official WHS golf handicaps; handicap indexes shown are self-declared or club-verified snapshots.
          </p>
        </div>
      </div>

      {/* Official Results History */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Award size={18} className="text-emerald-700" />
          <span>Official Competition Results</span>
        </h3>

        {officialResults.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">No Official Tournament Finishes Recorded</p>
            <p>Once tournament operators finalize an event, your finishing rank and total gross/net to par will appear here.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Tournament</th>
                    <th className="py-3 px-4">Division</th>
                    <th className="py-3 px-4">Finish</th>
                    <th className="py-3 px-4">Gross</th>
                    <th className="py-3 px-4">To Par</th>
                    <th className="py-3 px-4">Finalized</th>
                    <th className="py-3 px-4 text-right">Leaderboard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {officialResults.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <Link href={`/tournaments/${res.tournamentSlug}`} className="hover:text-emerald-800">
                          {res.tournamentName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{res.division}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {res.isTied ? "T" : ""}{res.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{res.totalGross}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {res.toPar >= 0 ? `+${res.toPar}` : res.toPar}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(res.finalizedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href="/leaderboards"
                          className="inline-flex items-center gap-1 text-emerald-800 hover:underline font-bold"
                        >
                          <span>Board</span>
                          <ExternalLink size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Individual Round Scorecards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Activity size={18} className="text-emerald-700" />
          <span>Round Scorecards Archive</span>
        </h3>

        {scorecardsSummary.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">No Scorecards Available</p>
            <p>Scorecards entered by tournament scorers or administrators will display here with hole completion details.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scorecardsSummary.map((sc) => (
              <div
                key={sc.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                    Round {sc.roundNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      sc.status === "VERIFIED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {sc.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm truncate">{sc.tournamentName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Holes Completed: <span className="text-slate-800 font-semibold">{sc.thruHoles} / 18</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Gross:</span>
                  <span className="font-mono font-bold text-lg text-slate-900">{sc.totalGross}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
