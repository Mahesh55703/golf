"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Trophy, CalendarDays, Award, Users, ChevronRight, Newspaper, Mail, Play, CheckCircle } from "lucide-react";
import { tournaments } from "@/lib/data";
import { TournamentCard } from "@/components/tournament-card";

import { useMedia } from "@/components/media-provider";

export default function HomePage() {
  const { getMedia } = useMedia();
  const featured = tournaments.find((t) => t.featured) ?? tournaments[0];
  const upcoming = tournaments.filter((t) => t.id !== featured.id).slice(0, 3);

  const heroBg = getMedia(
    "home.hero.main",
    "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=2200&q=90"
  );

  return (
    <main className="pga-homepage">
      {/* 1. Hero Section matching "PGA WINTER CHAMPIONSHIPS ARE HERE!" */}
      <section className="pga-hero">
        <div
          className="pga-hero-bg"
          style={{ backgroundImage: `url('${heroBg}')` }}
        />
        <div className="pga-hero-overlay" />
        <div className="container pga-hero-inner">
          <div className="pga-hero-content">
            <span className="pga-kicker">METROPOLITAN SECTION CHAMPIONSHIP</span>
            <h1>
              PGA WINTER<br />
              CHAMPIONSHIPS<br />
              <em>ARE HERE!</em>
            </h1>
            <p className="pga-hero-desc">
              Join the prestigious regional winter championship circuit. Elite course setups, verified scoring, and the quest for regional glory across premier golf courses.
            </p>
            <div className="pga-hero-actions">
              <Link href="/tournaments" className="button button-gold">
                EXPLORE CHAMPIONSHIPS <ArrowUpRight size={16} />
              </Link>
              <Link href="/clubs" className="button button-gold-outline">
                VIEW HOST COURSES
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Quick Action Nav Strips below Hero */}
        <div className="pga-quick-cards-wrap">
          <div className="container">
            <div className="pga-quick-cards">
              <Link href="/tournaments" className="pga-quick-card">
                <div
                  className="quick-card-img"
                  style={{
                    backgroundImage: `url('${getMedia(
                      "home.quick.1",
                      "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=600&q=80"
                    )}')`,
                  }}
                />
                <span>CHAMPIONSHIPS</span>
              </Link>
              <Link href="/leaderboards" className="pga-quick-card">
                <div
                  className="quick-card-img"
                  style={{
                    backgroundImage: `url('${getMedia(
                      "home.quick.2",
                      "https://images.unsplash.com/photo-1747321752143-aa29fe158a6f?auto=format&fit=crop&w=600&q=80"
                    )}')`,
                  }}
                />
                <span>LIVE SCORING</span>
              </Link>
              <Link href="/clubs" className="pga-quick-card">
                <div
                  className="quick-card-img"
                  style={{
                    backgroundImage: `url('${getMedia(
                      "home.quick.3",
                      "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=600&q=80"
                    )}')`,
                  }}
                />
                <span>HOST COURSES</span>
              </Link>
              <Link href="/gallery" className="pga-quick-card">
                <div
                  className="quick-card-img"
                  style={{
                    backgroundImage: `url('${getMedia(
                      "home.quick.4",
                      "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=600&q=80"
                    )}')`,
                  }}
                />
                <span>PHOTO GALLERY</span>
              </Link>
              <Link href="/about" className="pga-quick-card">
                <div
                  className="quick-card-img"
                  style={{
                    backgroundImage: `url('${getMedia(
                      "home.quick.5",
                      "https://images.unsplash.com/photo-1697448525888-8d682a1215a4?auto=format&fit=crop&w=600&q=80"
                    )}')`,
                  }}
                />
                <span>JUNIOR GOLF</span>
              </Link>
              <Link href="/contact" className="pga-quick-card">
                <div
                  className="quick-card-img"
                  style={{
                    backgroundImage: `url('${getMedia(
                      "home.quick.6",
                      "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=600&q=80"
                    )}')`,
                  }}
                />
                <span>MEMBER PORTAL</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Welcome to PGA Metropolitan Section */}
      <section className="section pga-welcome-section">
        <div className="container pga-welcome-grid">
          <div className="welcome-text">
            <span className="section-eyebrow">THE METROPOLITAN TRADITION</span>
            <h2>
              WELCOME TO<br />
              <strong>PGA METROPOLITAN</strong><br />
              <em>SECTION</em>
            </h2>
            <div className="gold-accent-line" />
            <p>
              The GolfPulse PGA Metropolitan Section is dedicated to promoting the passion, integrity, and rich heritage of the game of golf. Through world-class competitive tournaments, junior development programs, and club support, we empower golfers and professionals across the region.
            </p>
            <p className="welcome-subtext">
              Whether you are preparing for our renowned Winter Championship or competing in club-level events, we provide premier conditions, real-time leaderboards, and an unforgettable standard of competition.
            </p>
            <div className="welcome-actions">
              <Link href="/about" className="button button-gold">
                READ MORE <ArrowRight size={15} />
              </Link>
              <Link href="/tournaments" className="button button-navy-outline">
                EXPLORE SCHEDULE
              </Link>
            </div>
          </div>

          <div className="welcome-crest-display">
            <div className="crest-badge-container">
              <div className="crest-large-circle">
                <div className="crest-inner-ring">
                  <Trophy size={64} className="crest-gold-trophy" />
                  <span className="crest-title">PGA</span>
                  <span className="crest-sub">1916</span>
                  <span className="crest-arc-text">PROFESSIONAL GOLFERS ASSOCIATION</span>
                </div>
              </div>
              <div className="golf-ball-feature">
                <div className="ball-shadow" />
                <div className="golf-ball" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Official Sponsors Strip */}
      <section className="pga-sponsors-section">
        <div className="container">
          <div className="section-center-head">
            <span className="section-eyebrow">PROUD SUPPORTERS</span>
            <h2>OUR <em>SPONSORS</em></h2>
          </div>
          <div className="sponsors-grid">
            <div className="sponsor-item">
              <span className="sponsor-logo rolex-font">ROLEX</span>
            </div>
            <div className="sponsor-item">
              <span className="sponsor-badge green-badge">TITLEIST</span>
            </div>
            <div className="sponsor-item">
              <div className="sponsor-seal">
                <Trophy size={18} />
                <span>PGA TOUR</span>
              </div>
            </div>
            <div className="sponsor-item">
              <span className="sponsor-logo callaway-font">TaylorMade</span>
            </div>
            <div className="sponsor-item">
              <span className="sponsor-logo callaway-font">BMW GOLF</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Tournaments Showcase with Side Calendar */}
      <section className="section pga-tournaments-section">
        <div className="container">
          <div className="section-heading-split">
            <div>
              <span className="section-eyebrow">CHAMPIONSHIP SCHEDULE</span>
              <h2>FEATURED <em>TOURNAMENTS</em></h2>
              <p>Register now for sanctioned regional events, qualifiers, and premier stroke-play tournaments.</p>
            </div>
            <Link href="/tournaments" className="gold-text-link">
              View full tournament calendar <ArrowRight size={16} />
            </Link>
          </div>

          <div className="featured-layout">
            <div className="featured-main">
              <TournamentCard tournament={featured} />
            </div>
            <div className="featured-side pga-calendar-card">
              <div className="featured-side-header">
                <span className="live-dot" /> <span>UPCOMING TEE TIMES</span>
                <Link href="/tournaments">Full Schedule ↗</Link>
              </div>
              {upcoming.map((t) => (
                <article className="mini-event" key={t.id}>
                  <div className="mini-date">
                    <strong>{new Date(`${t.startDate}T12:00:00`).getDate()}</strong>
                    <span>{new Date(`${t.startDate}T12:00:00`).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</span>
                  </div>
                  <div className="mini-event-info">
                    <span>{t.format} <i>·</i> {t.region}</span>
                    <h3><Link href={`/tournaments/${t.id}`}>{t.name}</Link></h3>
                    <p>{t.location}</p>
                  </div>
                  <Link href={`/tournaments/${t.id}`} className="mini-arrow" aria-label={`View ${t.name}`}>
                    <ChevronRight size={18} />
                  </Link>
                </article>
              ))}
              <Link href="/tournaments" className="all-events-link">
                Explore All Sanctioned Events <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Latest News Section with 3 Editorial Cards */}
      <section className="section pga-news-section">
        <div className="container">
          <div className="section-center-head">
            <span className="section-eyebrow">HEADLINES & PRESS</span>
            <h2>LATEST <em>NEWS</em></h2>
            <div className="gold-accent-line mx-auto" />
          </div>

          <div className="news-cards-grid">
            <article className="pga-news-card">
              <div
                className="news-img"
                style={{
                  backgroundImage: `url('${getMedia(
                    "home.news.1",
                    "https://images.unsplash.com/photo-1611374243147-44a702c2d44c?auto=format&fit=crop&w=800&q=80"
                  )}')`,
                }}
              >
                <span className="news-badge">CHAMPIONSHIP</span>
              </div>
              <div className="news-body">
                <span className="news-date">OCTOBER 14, 2026</span>
                <h3>Metropolitan Section Announces 2026 Winter Championships Schedule</h3>
                <p>
                  Regional qualifiers will feature record prize pursuits, expanded fields across open and senior divisions, and PGA scoring technology.
                </p>
                <Link href="/about" className="news-read-more">
                  READ STORY ↗
                </Link>
              </div>
            </article>

            <article className="pga-news-card">
              <div
                className="news-img"
                style={{
                  backgroundImage: `url('${getMedia(
                    "home.news.2",
                    "https://images.unsplash.com/photo-1747321752143-aa29fe158a6f?auto=format&fit=crop&w=800&q=80"
                  )}')`,
                }}
              >
                <span className="news-badge">PLAYER PROFILE</span>
              </div>
              <div className="news-body">
                <span className="news-date">OCTOBER 08, 2026</span>
                <h3>Defending Champions Prepare for Dramatic Showdown at Golfshire</h3>
                <p>
                  Top regional golfers share their training philosophies and mental approach ahead of this weekend's inaugural stroke-play challenge.
                </p>
                <Link href="/leaderboards" className="news-read-more">
                  READ STORY ↗
                </Link>
              </div>
            </article>

            <article className="pga-news-card">
              <div
                className="news-img"
                style={{
                  backgroundImage: `url('${getMedia(
                    "home.news.3",
                    "https://images.unsplash.com/photo-1697448525888-8d682a1215a4?auto=format&fit=crop&w=800&q=80"
                  )}')`,
                }}
              >
                <span className="news-badge">COMMUNITY</span>
              </div>
              <div className="news-body">
                <span className="news-date">OCTOBER 02, 2026</span>
                <h3>Junior Golf Initiative Awards Annual Scholarships Across Section</h3>
                <p>
                  Supporting the next generation with complimentary coaching clinics, equipment sponsorships, and championship tournament access.
                </p>
                <Link href="/about" className="news-read-more">
                  READ STORY ↗
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 6. Live Feed Section in Deep Navy with Trophy Presentation Photos */}
      <section className="section pga-live-feed-section">
        <div className="container">
          <div className="section-center-head light-text">
            <span className="section-eyebrow text-gold">CHAMPIONSHIP GALLERY</span>
            <h2>LIVE <em>FEED</em></h2>
            <div className="live-feed-nav">
              <span className="active">RECENT TOURNAMENTS</span>
              <span>TROPHY CEREMONIES</span>
              <span>PLAYER HIGHLIGHTS</span>
            </div>
          </div>

          <div className="live-feed-grid">
            <div
              className="feed-card feed-card-large"
              style={{
                backgroundImage: `url('${getMedia(
                  "home.feed.1",
                  "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=900&q=80"
                )}')`,
              }}
            >
              <div className="feed-overlay" />
              <div className="feed-caption">
                <span className="feed-badge">VICTORY ROUND</span>
                <h4>Champions hoisting the Metropolitan Winter Cup</h4>
              </div>
            </div>

            <div
              className="feed-card"
              style={{
                backgroundImage: `url('${getMedia(
                  "home.feed.2",
                  "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=900&q=80"
                )}')`,
              }}
            >
              <div className="feed-overlay" />
              <div className="feed-caption">
                <span className="feed-badge">AWARD CEREMONY</span>
                <h4>Section Trophy Unveiled</h4>
              </div>
            </div>

            <div className="feed-card feed-gold-quote">
              <Trophy size={36} className="text-gold mb-3" />
              <blockquote>
                "The PGA Metropolitan Section represents the highest standard of competitive golf and camaraderie."
              </blockquote>
              <cite>— Championship Committee</cite>
              <Link href="/gallery" className="button button-gold button-small mt-4">
                EXPLORE GALLERY
              </Link>
            </div>

            <div
              className="feed-card"
              style={{
                backgroundImage: `url('${getMedia(
                  "home.feed.3",
                  "https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?auto=format&fit=crop&w=900&q=80"
                )}')`,
              }}
            >
              <div className="feed-overlay" />
              <div className="feed-caption">
                <span className="feed-badge">TEE SHOT FOCUS</span>
                <h4>Final round playoff at North Shore</h4>
              </div>
            </div>

            <div
              className="feed-card"
              style={{
                backgroundImage: `url('${getMedia(
                  "home.feed.4",
                  "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=900&q=80"
                )}')`,
              }}
            >
              <div className="feed-overlay" />
              <div className="feed-caption">
                <span className="feed-badge">JUNIOR CLINIC</span>
                <h4>Section Youth Academy Pro-Am</h4>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Official Partners Circular Logos */}
      <section className="section pga-partners-section">
        <div className="container">
          <div className="section-center-head">
            <span className="section-eyebrow">COMMUNITY & INDUSTRY</span>
            <h2>OUR <em>PARTNERS</em></h2>
          </div>

          <div className="partner-circle-grid">
            <div className="partner-circle">
              <span className="partner-name">TITLEIST</span>
            </div>
            <div className="partner-circle">
              <span className="partner-name">ADIDAS</span>
            </div>
            <div className="partner-circle">
              <span className="partner-name">FOOTJOY</span>
            </div>
            <div className="partner-circle">
              <span className="partner-name">CALLAWAY</span>
            </div>
            <div className="partner-circle">
              <span className="partner-name">PING</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Latest Updates Gold Newsletter Banner */}
      <section className="pga-newsletter-section">
        <div className="container pga-newsletter-inner">
          <div className="newsletter-text">
            <span className="newsletter-eyebrow">SUBSCRIBE TO</span>
            <h2>LATEST UPDATES</h2>
            <p>Receive official tournament notifications, priority tee-time announcements, and scoring reports.</p>
          </div>
          <form className="pga-newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="ENTER YOUR EMAIL..." aria-label="Email address" required />
            <button type="submit" className="button button-navy">
              SUBSCRIBE
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
