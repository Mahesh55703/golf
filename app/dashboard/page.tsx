"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  Bell,
  Loader2,
  AlertCircle,
  MapPin,
  ExternalLink,
} from "lucide-react";

interface OverviewData {
  golfer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  stats: {
    upcomingCount: number;
    inProgressCount: number;
    tournamentsParticipatedCount: number;
    completedRoundsCount: number;
    bestScore: number | null;
    scoringAverage: number | null;
    bestFinish: { rank: number; tournamentName: string; isTied: boolean } | null;
    unreadNotificationsCount: number;
  };
  upcoming: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    paymentStatus: string;
    tournament: {
      id: string;
      name: string;
      slug: string;
      startDate: string;
      endDate: string;
      hostClub: string;
      location: string;
    };
    division: string;
  }>;
  recentResults: Array<{
    id: string;
    tournamentName: string;
    tournamentSlug: string;
    division: string;
    rank: number;
    isTied: boolean;
    totalGross: number;
    toPar: number;
    finalizedAt: string;
  }>;
  recentNotifications: Array<{
    id: string;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
  }>;
}

export default function DashboardOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOverview() {
      try {
        const res = await fetch("/api/golfer/dashboard/overview");
        if (!res.ok) {
          throw new Error("Failed to load overview");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-white/50 space-y-3">
        <Loader2 className="animate-spin text-[#dfbf77]" size={32} />
        <p className="text-xs">Loading player dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 max-w-lg mx-auto text-center space-y-3">
        <AlertCircle size={28} className="mx-auto text-rose-400" />
        <h3 className="font-bold">Unable to load dashboard</h3>
        <p className="text-xs text-rose-200/70">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-200 font-bold text-xs hover:bg-rose-500/30 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const { stats, upcoming, recentResults, recentNotifications } = data;

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Upcoming Events</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.upcomingCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.inProgressCount > 0 ? `${stats.inProgressCount} currently underway` : "Registered & scheduled"}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tournaments Played</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Trophy size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.tournamentsParticipatedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.completedRoundsCount} verified 18-hole rounds
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Best Score (18H)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.bestScore !== null ? stats.bestScore : "—"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.scoringAverage !== null ? `Average: ${stats.scoringAverage} strokes` : "Awaiting completed rounds"}
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Best Finish</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Award size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.bestFinish ? `${stats.bestFinish.isTied ? "T" : ""}${stats.bestFinish.rank}` : "—"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {stats.bestFinish ? stats.bestFinish.tournamentName : "No official results yet"}
          </p>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upcoming Registered Tournaments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-700" />
              <span>Registered Tournaments</span>
            </h2>
            <Link
              href="/dashboard/tournaments"
              className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
            >
              <span>View All ({stats.upcomingCount})</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center space-y-3 shadow-sm">
              <Calendar size={32} className="mx-auto text-slate-300" />
              <h3 className="font-bold text-sm text-slate-800">No Upcoming Tournaments</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You haven&apos;t registered for any upcoming events yet. Explore upcoming tournaments to secure your spot.
              </p>
              <Link
                href="/tournaments"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0b3b24] to-[#124d31] text-white font-bold text-xs hover:brightness-110 transition-all shadow-md mt-2"
              >
                <span>Browse Tournaments</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((reg) => (
                <div
                  key={reg.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">
                        {reg.referenceNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          reg.paymentStatus === "PAID" || reg.paymentStatus === "FREE_ENTRY"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {reg.paymentStatus}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 hover:text-emerald-800 transition-colors">
                      <Link href={`/tournaments/${reg.tournament.slug}`}>
                        {reg.tournament.name}
                      </Link>
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin size={12} className="text-emerald-700" />
                      <span>{reg.tournament.hostClub}</span>
                      {reg.tournament.location && <span>• {reg.tournament.location}</span>}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Division: <span className="text-slate-700 font-semibold">{reg.division}</span> • Date:{" "}
                      {new Date(reg.tournament.startDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <Link
                    href={`/tournaments/${reg.tournament.slug}`}
                    className="shrink-0 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Event Details</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Results & Notifications */}
        <div className="space-y-6">
          {/* Recent Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Trophy size={18} className="text-emerald-700" />
                <span>Recent Results</span>
              </h2>
              <Link
                href="/dashboard/performance"
                className="text-xs font-bold text-emerald-800 hover:underline"
              >
                Performance →
              </Link>
            </div>

            {recentResults.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 text-center text-xs text-slate-500 space-y-1 shadow-sm">
                <p className="font-semibold text-slate-700">No Official Results Yet</p>
                <p>Results will appear automatically once official competition scores are finalized.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentResults.map((res) => (
                  <div
                    key={res.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 truncate max-w-[180px]">
                        {res.tournamentName}
                      </h4>
                      <p className="text-[10px] text-slate-400">{res.division}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-800 text-sm">
                        {res.isTied ? "T" : ""}
                        {res.rank}
                      </span>
                      <p className="text-[10px] text-slate-500">
                        {res.totalGross} ({res.toPar >= 0 ? `+${res.toPar}` : res.toPar})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell size={18} className="text-emerald-700" />
                <span>Notifications</span>
              </h2>
              <Link
                href="/dashboard/notifications"
                className="text-xs font-bold text-emerald-800 hover:underline"
              >
                All Notifications →
              </Link>
            </div>

            {recentNotifications.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 text-center text-xs text-slate-500 shadow-sm">
                You have no notifications.
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-1 transition-all ${
                      notif.isRead
                        ? "bg-white border-slate-200 text-slate-600 shadow-sm"
                        : "bg-emerald-50/70 border-emerald-200 text-slate-800 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-[11px]">{notif.title}</span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
