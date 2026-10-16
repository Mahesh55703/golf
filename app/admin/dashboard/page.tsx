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
    totalPages: 8,
    totalSlots: 34,
    assignedSlots: 0,
    missingSlots: 34,
    totalAssets: 0,
    totalGallery: 6,
  };

  const statCards = [
    {
      label: "Managed Pages",
      value: stats.totalPages,
      desc: "Home, Tournaments, Clubs, Gallery, etc.",
      icon: FileText,
      color: "bg-white border-slate-200 text-blue-600",
      badgeBg: "bg-blue-50 text-blue-700",
    },
    {
      label: "Total Image Slots",
      value: stats.totalSlots,
      desc: "Configured public image insertion points",
      icon: ImageIcon,
      color: "bg-white border-slate-200 text-emerald-600",
      badgeBg: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Custom Assets Assigned",
      value: stats.assignedSlots,
      desc: "Live overrides active in production",
      icon: CheckCircle,
      color: "bg-white border-slate-200 text-[#9e7932]",
      badgeBg: "bg-[#faf5eb] text-[#9e7932]",
    },
    {
      label: "Default Fallbacks Active",
      value: stats.missingSlots,
      desc: "Slots using default tournament stock",
      icon: Clock,
      color: "bg-white border-slate-200 text-amber-600",
      badgeBg: "bg-amber-50 text-amber-700",
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
        <div className="flex items-center gap-3">
          <Link
            href="/admin/media"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c29b4e] to-[#dfbf77] text-[#0e2138] font-bold text-xs shadow-md shadow-[#c29b4e]/20 hover:brightness-105 active:scale-95 transition-all"
          >
            <ImageIcon size={15} /> Manage Website Media
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
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
            </div>
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

          {/* Recent Uploads */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">Recently Uploaded Media Assets</h3>
            {data?.recentUploads?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {data.recentUploads.map((asset: any) => (
                  <div
                    key={asset.id}
                    className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video shadow-xs"
                  >
                    <img
                      src={asset.url}
                      alt={asset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white truncate font-medium">{asset.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4">No custom media uploaded yet. Default image stock active.</p>
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
