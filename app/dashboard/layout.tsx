import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentGolfer } from "@/lib/golfer-auth";
import {
  LayoutDashboard,
  Trophy,
  Activity,
  User,
  Bell,
  Calendar,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  FileText,
} from "lucide-react";

export default async function GolferDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const golfer = await getCurrentGolfer();

  if (!golfer) {
    redirect("/login");
  }

  const navLinks = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Tournaments", href: "/dashboard/tournaments", icon: Trophy },
    { label: "My Performance", href: "/dashboard/performance", icon: Activity },
    { label: "My Profile", href: "/dashboard/profile", icon: User },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#f6fbf4] text-slate-800 flex flex-col">
      {/* Golfer Subheader Bar - Refined Lighter Header */}
      <section className="bg-white border-b border-slate-200/80 pt-6 pb-2 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0b3b24] to-[#124d31] text-[#dfff55] font-black text-xl flex items-center justify-center shadow-md border border-emerald-900/10">
                {golfer.firstName?.[0] || "G"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {golfer.firstName} {golfer.lastName}
                  </h1>
                  {golfer.isEmailVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck size={12} className="text-emerald-600" /> Verified Golfer
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {golfer.email} {golfer.homeClub ? `• ${golfer.homeClub}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Handicap Index</span>
                <span className="text-sm font-black text-slate-800">
                  {golfer.handicapIndex !== null ? Number(golfer.handicapIndex).toFixed(1) : "Unassigned"}
                </span>
              </div>
              <Link
                href="/tournaments"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0b3b24] to-[#124d31] text-white text-xs font-bold hover:brightness-110 transition-all shadow-md shadow-emerald-950/10"
              >
                Enter Tournament +
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto pt-3 scrollbar-none">
            {navLinks.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0"
                >
                  <Icon size={14} className="text-emerald-700" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Main Dashboard Content */}
      <main className="flex-1 bg-[#f6fbf4] py-8">
        <div className="container mx-auto px-4">
          {children}
        </div>
      </main>
    </div>
  );
}
