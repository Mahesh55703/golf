"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, Phone, Facebook, Twitter, Instagram, Youtube, Search } from "lucide-react";

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
            <Link href="/contact" className="nav-gold-link">
              Player Portal ↗
            </Link>
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
          <Link className="button button-gold" href="/tournaments" onClick={() => setOpen(false)}>
            JOIN PGA TOUR
          </Link>
        </nav>
      )}
    </header>
  );
}
