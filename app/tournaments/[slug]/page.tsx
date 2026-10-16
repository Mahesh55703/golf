import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, CircleDollarSign, Flag, MapPin, ShieldCheck, Users } from "lucide-react";
import { tournaments, formatDateRange, formatFee, Tournament } from "@/lib/data";
import { CourseVideo } from "@/components/course-video";
import { getMediaUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let tournamentName = "";
  let hostClub = "";

  try {
    const dbT = await prisma.tournament.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: { hostClub: true },
    });
    if (dbT) {
      tournamentName = dbT.name;
      hostClub = dbT.hostClub?.name || "";
    }
  } catch {
    // ignore, fall back to mock
  }

  if (!tournamentName) {
    const mockT = tournaments.find((t) => t.id === slug);
    if (mockT) {
      tournamentName = mockT.name;
      hostClub = mockT.club;
    }
  }

  return {
    title: tournamentName ? tournamentName : "Tournament details",
    description: tournamentName
      ? `${tournamentName} at ${hostClub}. Event details, format, entry fee, and registration information.`
      : "Golf tournament details.",
  };
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let t: Tournament | null = null;
  let dbDescription: string | null = null;
  let defaultImage = "/images/tournaments/indore-open-2026.jpg";

  try {
    const dbT = await prisma.tournament.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        hostClub: true,
        registrations: { where: { status: "CONFIRMED" } },
      },
    });

    if (dbT) {
      const regCount = dbT.registrations.length;
      const spotsLeft = Math.max(0, dbT.fieldCapacity - regCount);

      const statusMap: Record<string, "Registration open" | "Coming soon"> = {
        REGISTRATION_OPEN: "Registration open",
        PUBLISHED: "Coming soon",
        DRAFT: "Coming soon",
        REGISTRATION_CLOSED: "Coming soon",
        IN_PROGRESS: "Coming soon",
        SCORING_REVIEW: "Coming soon",
        FINALIZED: "Coming soon",
        CANCELLED: "Coming soon",
      };

      const formatMap: Record<string, "Stroke Play" | "Stableford" | "Match Play" | "Scramble"> = {
        STROKE_PLAY: "Stroke Play",
        STABLEFORD: "Stableford",
        MATCH_PLAY: "Match Play",
        SCRAMBLE: "Scramble",
        BETTER_BALL: "Match Play",
      };

      const accessMap: Record<string, "Public" | "Members only"> = {
        PUBLIC: "Public",
        MEMBERS_ONLY: "Members only",
        INVITATIONAL: "Members only",
      };

      const hostClubName = dbT.hostClub?.name || "Premier Golf Club";
      const location = [dbT.hostClub?.city, dbT.hostClub?.state].filter(Boolean).join(", ") || dbT.hostClub?.country || "Metropolitan Area";
      const region = dbT.hostClub?.country === "India" ? "India" : "International";

      t = {
        id: dbT.slug,
        name: dbT.name,
        club: hostClubName,
        location,
        region,
        startDate: dbT.startDate.toISOString().split("T")[0],
        endDate: dbT.endDate.toISOString().split("T")[0],
        entryFee: Number(dbT.entryFee) || 0,
        currency: "USD",
        status: statusMap[dbT.status] || "Registration open",
        format: formatMap[dbT.format] || "Stroke Play",
        fieldSize: dbT.fieldCapacity,
        spotsLeft: spotsLeft,
        access: accessMap[dbT.access] || "Public",
        handicapRequired: dbT.handicapRequired,
        image: dbT.heroImageUrl || defaultImage,
        featured: dbT.featured,
      };
      dbDescription = dbT.description;
      defaultImage = dbT.heroImageUrl || defaultImage;
    }
  } catch (error) {
    console.warn("Failed to fetch tournament from DB, falling back to mock data:", error);
  }

  if (!t) {
    const mockT = tournaments.find((event) => event.id === slug);
    if (!mockT) notFound();
    t = mockT;
    defaultImage = mockT.image;
  }

  const heroImage = await getMediaUrl(`tournaments.${slug}.hero`, defaultImage);

  return (
    <main className="detail-page">
      <section
        className="detail-hero"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(8,32,18,.91),rgba(8,32,18,.55) 58%,rgba(8,32,18,.12)),url('${heroImage}')`,
        }}
      >
        <div className="container detail-hero-inner">
          <Link className="detail-back" href="/tournaments">
            <ArrowLeft size={15} /> All tournaments
          </Link>
          <span className="detail-kicker">
            {t.region.toUpperCase()} · {t.format.toUpperCase()}
          </span>
          <h1>
            {t.name.split(" ").slice(0, -1).join(" ")} <em>{t.name.split(" ").slice(-1)}</em>
          </h1>
          <p>
            {t.club} · {t.location}
          </p>
          <div className="detail-hero-meta">
            <span>
              <CalendarDays size={16} />
              {formatDateRange(t.startDate, t.endDate)}
            </span>
            <span>
              <MapPin size={16} />
              {t.location}
            </span>
            <span>
              <CircleDollarSign size={16} />
              {formatFee(t.entryFee)} entry
            </span>
          </div>
        </div>
      </section>

      <section className="section detail-main">
        <div className="container detail-layout">
          <div className="detail-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" /> THE EVENT
            </div>
            <h2>
              A round to <em>remember.</em>
            </h2>
            <p>
              {dbDescription ||
                "Join fellow golfers for a thoughtfully organized event on a beautiful course. Review the event information below and check eligibility before registering."}
            </p>
            <div className="detail-info-grid">
              <article>
                <Flag />
                <span>FORMAT</span>
                <strong>{t.format}</strong>
                <small>{t.handicapRequired ? "Handicap required" : "Open handicap policy"}</small>
              </article>
              <article>
                <Users />
                <span>FIELD SIZE</span>
                <strong>{t.fieldSize} players</strong>
                <small>{t.spotsLeft} places currently shown</small>
              </article>
              <article>
                <ShieldCheck />
                <span>ACCESS</span>
                <strong>{t.access}</strong>
                <small>{t.access === "Public" ? "Open registration" : "Club membership required"}</small>
              </article>
              <article>
                <CalendarDays />
                <span>STATUS</span>
                <strong>{t.status}</strong>
                <small>Official GolfPulse event</small>
              </article>
            </div>
            <h3>What to know</h3>
            <ul className="detail-checklist">
              <li>
                <CheckCircle2 /> Check the event schedule and arrive before your assigned tee time.
              </li>
              <li>
                <CheckCircle2 /> Confirm the tournament format and any handicap requirements with the organizer.
              </li>
              <li>
                <CheckCircle2 /> Entry fee is displayed in USD for this platform preview.
              </li>
            </ul>
          </div>

          <aside className="entry-card">
            <span className="entry-card-label">TOURNAMENT ENTRY</span>
            <div className="entry-card-price">
              {formatFee(t.entryFee)} <small>/ player</small>
            </div>
            <p>
              {t.status === "Registration open"
                ? "Registration is currently open for this event."
                : `Tournament status: ${t.status}.`}
            </p>
            <button className="button button-dark" disabled>
              {t.status === "Registration open" ? "Registration coming soon" : "Notify me when open"}{" "}
              <ArrowUpRight size={16} />
            </button>
            <small className="entry-card-note">
              Registration and payments will be connected after the frontend is approved.
            </small>
            <div className="entry-card-divider" />
            <span className="entry-card-label">HOST CLUB</span>
            <strong>{t.club}</strong>
            <span className="entry-card-location">
              <MapPin size={14} />
              {t.location}
            </span>
            <Link className="text-link" href="/clubs">
              Explore golf clubs <ArrowUpRight size={15} />
            </Link>
          </aside>
        </div>
      </section>
      <CourseVideo compact eyebrow="THE COURSE EXPERIENCE" />
    </main>
  );
}
