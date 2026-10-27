"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Image as ImageIcon,
  FolderKanban,
  Sparkles,
  Users,
  UserCheck,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Trophy,
  Landmark,
  CheckCircle,
  BarChart3,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // If on login/signup page, don't enforce session check in this layout
    if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/signup") || pathname.startsWith("/admin/forgot-password")) {
      setLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/auth/me");
        if (!res.ok) {
          router.push(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  // Skip admin shell on auth screens
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/signup") ||
    pathname.startsWith("/admin/forgot-password")
  ) {
    return <div className="min-h-screen bg-[#06101c] text-white">{children}</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#081726] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#c29b4e] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-white/70">Authenticating GolfPulse Admin...</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Tournaments", href: "/admin/tournaments", icon: Trophy },
    { name: "Scoring & Results", href: "/admin/scoring", icon: CheckCircle },
    { name: "Clubs", href: "/admin/clubs", icon: Landmark },
    { name: "Registrations", href: "/admin/registrations", icon: UserCheck },
    { name: "Financial Reports", href: "/admin/reports/financial", icon: BarChart3 },
    { name: "Website Media", href: "/admin/media", icon: ImageIcon },
    { name: "Media Library", href: "/admin/media-library", icon: FolderKanban },
    { name: "Gallery Manager", href: "/admin/gallery", icon: Sparkles },
    ...(isSuperAdmin ? [{ name: "Admin Users", href: "/admin/users", icon: Users }] : []),
    ...(isSuperAdmin ? [{ name: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck }] : []),
    { name: "My Profile", href: "/admin/profile", icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/admin/dashboard" className="flex items-center">
            <img src="/logo.png" alt="GolfPulse Logo" className="h-7 w-auto object-contain" />
          </Link>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-600 hover:text-slate-900"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between shadow-sm transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          {/* Logo / Brand header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <Link href="/admin/dashboard" className="flex flex-col items-start gap-1">
              <img
                src="/logo.png"
                alt="GolfPulse Logo"
                className="h-9 w-auto object-contain"
              />
              <span className="text-[10px] font-bold tracking-widest text-[#9e7932] uppercase bg-[#faf5eb] px-2 py-0.5 rounded border border-[#dfbf77]/30">
                Admin Console
              </span>
            </Link>
          </div>

          {/* Nav links */}
          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-[#0e2138] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={active ? "text-[#dfbf77]" : "text-slate-400"} />
                    <span>{item.name}</span>
                  </div>
                  {active && <ChevronRight size={14} className="text-[#dfbf77]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.name || "Administrator"}</p>
              <p className="text-[11px] text-[#9e7932] truncate font-mono font-semibold">{user?.role}</p>
            </div>
            <Link
              href="/"
              target="_blank"
              title="View Live Public Website"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all"
            >
              <ExternalLink size={15} />
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 shadow-xs transition-all"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-[#f8fafc] p-6 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
