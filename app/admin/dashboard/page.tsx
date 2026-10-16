"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  Loader2,
  Sparkles,
  Trophy,
  Landmark,
  Plus,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-white/50">
        <Loader2 size={32} className="animate-spin text-[#dfbf77]" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalClubs: 6,
    activeClubs: 6,
    totalTournaments: 6,
    publishedTournaments: 2,
    regOpenTournaments: 4,
    inProgressTournaments: 0,
    upcomingTournaments: 6,
    totalPages: 8,
    totalSlots: 34,
    assignedSlots: 0,
    missingSlots: 34,
    totalAssets: 0,
  };

  const statCards = [
    {
      label: "Total Tournaments",
      value: stats.totalTournaments,
      desc: `${stats.regOpenTournaments} registration open · ${stats.publishedTournaments} upcoming`,
      icon: Trophy,
      color: "bg-white border-slate-200 text-[#9e7932]",
      badgeBg: "bg-[#faf5eb] text-[#9e7932]",
      href: "/admin/tournaments",
    },
    {
      label: "Golf Clubs",
      value: stats.totalClubs,
      desc: `${stats.activeClubs} active partner clubs`,
      icon: Landmark,
      color: "bg-white border-slate-200 text-blue-600",
      badgeBg: "bg-blue-50 text-blue-700",
      href: "/admin/clubs",
    },
    {
      label: "Website Media Slots",
      value: stats.totalSlots,
      desc: `${stats.assignedSlots} customized · ${stats.missingSlots} default stock`,
      icon: ImageIcon,
      color: "bg-white border-slate-200 text-emerald-600",
      badgeBg: "bg-emerald-50 text-emerald-700",
      href: "/admin/media",
    },
    {
      label: "Live Tournament Play",
      value: stats.inProgressTournaments,
      desc: "Events currently on course in play",
      icon: TrendingUp,
      color: "bg-white border-slate-200 text-purple-600",
      badgeBg: "bg-purple-50 text-purple-700",
      href: "/admin/tournaments",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-[#9e7932] font-extrabold">
            Administrative Overview
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[#0e2138] mt-1 tracking-tight">
            GolfPulse Control Center
          </h1>
          <p className="text-xs md:text-sm text-slate-600 font-medium mt-1">
            Real-time telemetry, website media slot assignments, and security activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/tournaments"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0e2138] text-white font-bold text-xs hover:bg-[#1a365d] active:scale-95 transition-all shadow-sm"
          >
            <Trophy size={14} className="text-[#dfbf77]" /> Tournaments
          </Link>
          <Link
            href="/admin/clubs"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
          >
            <Landmark size={14} className="text-[#9e7932]" /> Golf Clubs
          </Link>
          <Link
            href="/admin/media"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c29b4e] to-[#dfbf77] text-[#0e2138] font-bold text-xs shadow-md shadow-[#c29b4e]/20 hover:brightness-105 active:scale-95 transition-all"
          >
            <ImageIcon size={14} /> Website Media
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href || "#"}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-[#dfbf77]/60 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider group-hover:text-slate-900 transition-colors">
                  {c.label}
                </span>
                <span className={`p-2 rounded-xl ${c.badgeBg}`}>
                  <Icon size={18} />
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-[#0e2138] tracking-tight">{c.value}</span>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{c.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Quick Launch & Media Slots */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#faf5eb] text-[#9e7932] border border-[#dfbf77]/30">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Media Manager Quick Actions</h3>
                  <p className="text-xs text-slate-500">Navigate directly to page image slots</p>
                </div>
              </div>
              <Link
                href="/admin/media"
                className="text-xs text-[#9e7932] hover:underline flex items-center gap-1 font-bold"
              >
                View all slots <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: "Homepage", key: "home", count: 14, desc: "Hero, Quick cards, News banners, Video poster" },
                { name: "Tournaments", key: "tournaments", count: 7, desc: "Directory hero & tournament card imagery" },
                { name: "Golf Clubs", key: "clubs", count: 7, desc: "Directory hero & club profile headers" },
                { name: "Gallery & Editorial", key: "gallery", count: 6, desc: "Championship archive & hero banners" },
              ].map((p) => (
                <Link
                  key={p.key}
                  href={`/admin/media?page=${p.key}`}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 group-hover:text-[#9e7932] transition-colors text-sm">
                      {p.name}
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                      {p.count} slots
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{p.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Tournaments from Database */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Recent Tournaments</h3>
              <Link href="/admin/tournaments" className="text-xs text-[#9e7932] font-bold hover:underline flex items-center gap-1">
                View all <ArrowUpRight size={14} />
              </Link>
            </div>
            {data?.recentTournaments?.length ? (
              <div className="divide-y divide-slate-100">
                {data.recentTournaments.map((t: any) => (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {t.hostClub?.name || "Host Club"} · {new Date(t.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        t.status === "REGISTRATION_OPEN"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : t.status === "PUBLISHED"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {t.status.replace("_", " ")}
                      </span>
                      <Link
                        href={`/admin/tournaments`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4">No tournaments in database.</p>
            )}
          </div>
        </div>

        {/* Right: Security & Media Audit Logs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert size={16} className="text-[#9e7932]" /> Recent Activity Audit
              </h3>
            </div>

            <div className="space-y-3">
              {data?.recentAudits?.length ? (
                data.recentAudits.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#9e7932]">{log.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-800 text-[11px] truncate">{log.details || "Action performed"}</p>
                    <span className="text-[10px] text-slate-500 font-medium">By {log.adminUser?.name || "System"}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No recent activity recorded.</p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/admin/media"
              className="text-xs text-[#9e7932] hover:underline font-bold"
            >
              Replace or crop an image now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
