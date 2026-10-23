"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, Phone, Facebook, Twitter, Instagram, Youtube, Search, User, Bell, LogOut, ChevronDown } from "lucide-react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "Golf Clubs", href: "/clubs" },
  { label: "Leaderboards", href: "/leaderboards" },
  { label: "Gallery", href: "/gallery" },
  { label: "About Us", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [golfer, setGolfer] = useState<{ id: string; firstName: string; lastName: string; email: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/golfer/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.golfer) {
            setGolfer(data.golfer);
            setUnreadCount(data.unreadNotifications || 0);
          }
        }
      } catch {
        // Unauthenticated visitor
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/golfer/auth/logout", { method: "POST" });
      setGolfer(null);
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };
  return (
    <header className="site-header">
      {/* Top Header Bar */}
      <div className="header-top-bar">
        <div className="container header-top-inner">
          <Link href="/" className="brand" aria-label="GolfPulse home">
            <Image
              src="/logo.png"
              alt="GolfPulse Logo"
              width={200}
              height={55}
              priority
              className="brand-logo-img"
            />
          </Link>

          <div className="header-top-center">
            <div className="header-socials">
              <a href="#facebook" aria-label="Facebook"><Facebook size={13} /></a>
              <a href="#twitter" aria-label="Twitter"><Twitter size={13} /></a>
              <a href="#instagram" aria-label="Instagram"><Instagram size={13} /></a>
              <a href="#youtube" aria-label="YouTube"><Youtube size={13} /></a>
            </div>
            <div className="header-divider-v" />
            <a href="tel:18007641724" className="header-phone">
              <Phone size={13} />
              <span>1 800 764-1724</span>
            </a>
          </div>

          <div className="header-top-right">
            <Link href="/tournaments" className="button button-gold button-small">
              JOIN PGA TOUR
            </Link>
            <button className="mobile-menu-toggle" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Navy Navigation Bar */}
      <div className="header-nav-bar">
        <div className="container header-nav-inner">
          <nav className="desktop-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-nav-actions">
            <Link href="/tournaments" className="nav-search-btn" aria-label="Search events">
              <Search size={15} />
            </Link>

            {golfer ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/10"
                >
                  <div className="w-5 h-5 rounded-full bg-[#c29b4e] text-[#0e2138] flex items-center justify-center font-bold text-[10px]">
                    {golfer.firstName?.[0] || "G"}
                  </div>
                  <span>{golfer.firstName}</span>
                  {unreadCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                  <ChevronDown size={13} className="text-white/60" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#0e2138] border border-white/10 shadow-2xl py-2 z-50 text-xs">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="font-bold text-white truncate">{golfer.firstName} {golfer.lastName}</p>
                      <p className="text-[10px] text-white/50 truncate">{golfer.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white hover:bg-white/5"
                    >
                      <User size={14} /> My Dashboard
                    </Link>
                    <Link
                      href="/dashboard/tournaments"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white hover:bg-white/5"
                    >
                      My Tournaments
                    </Link>
                    <Link
                      href="/dashboard/performance"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white hover:bg-white/5"
                    >
                      My Performance
                    </Link>
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white hover:bg-white/5"
                    >
                      Profile Settings
                    </Link>
                    <Link
                      href="/dashboard/notifications"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2 text-white/80 hover:text-white hover:bg-white/5"
                    >
                      <span className="flex items-center gap-2"><Bell size={14} /> Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-rose-500/10"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="nav-gold-link">
                  Player Portal ↗
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <a href="tel:18007641724" className="mobile-nav-phone"><Phone size={13} /> 1 800 764-1724</a>
          {golfer ? (
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <Link className="button button-gold" href="/dashboard" onClick={() => setOpen(false)}>
                GO TO DASHBOARD
              </Link>
              <button
                onClick={handleLogout}
                className="text-left text-xs text-rose-400 py-1"
              >
                Sign Out ({golfer.firstName})
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <Link className="button button-gold" href="/login" onClick={() => setOpen(false)}>
                PLAYER SIGN IN
              </Link>
              <Link className="text-xs text-slate-300 py-1 text-center" href="/activate" onClick={() => setOpen(false)}>
                Activate Account
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
