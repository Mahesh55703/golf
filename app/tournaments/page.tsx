import type { Metadata } from "next";
import { ArrowDownRight, CalendarDays, Globe2, MapPin } from "lucide-react";
import { TournamentBrowser } from "@/components/tournament-browser";
import { CourseVideo } from "@/components/course-video";
import { prisma } from "@/lib/prisma";
import { tournaments as mockTournaments, type Tournament } from "@/lib/data";
import { deriveTournamentLifecycle } from "@/lib/tournament-lifecycle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover tournaments",
  description: "Search golf tournaments by location, format, entry fee, and access type.",
};

function formatPrismaToUITournament(dbT: any): Tournament {
  const formatMap: Record<string, any> = {
    STROKE_PLAY: "Stroke Play",
    STABLEFORD: "Stableford",
    MATCH_PLAY: "Match Play",
    SCRAMBLE: "Scramble",
  };
  const accessMap: Record<string, any> = {
    PUBLIC: "Public",
    MEMBERS_ONLY: "Members only",
    INVITATIONAL: "Members only",
  };

  const lifecycle = deriveTournamentLifecycle({
    status: dbT.status,
    startDate: dbT.startDate,
    endDate: dbT.endDate,
    registrationOpenAt: dbT.registrationOpenAt,
    registrationCloseAt: dbT.registrationCloseAt,
    fieldCapacity: dbT.fieldCapacity,
    registrationsCount: dbT._count?.registrations ?? 0,
    timeZone: dbT.timeZone,
    publishedAt: dbT.publishedAt,
  });

  const location = [dbT.hostClub?.city, dbT.hostClub?.state].filter(Boolean).join(", ") || dbT.hostClub?.country || "Metropolitan District";
  const region = dbT.hostClub?.country === "India" ? "India" : "International";

  return {
    id: dbT.slug,
    name: dbT.name,
    club: dbT.hostClub?.name || "PGA Metropolitan Club",
    location,
    region,
    startDate: dbT.startDate.toISOString().split("T")[0],
    endDate: dbT.endDate.toISOString().split("T")[0],
    format: formatMap[dbT.format] || "Stroke Play",
    access: accessMap[dbT.access] || "Public",
    entryFee: Number(dbT.entryFee) || 0,
    currency: "USD",
    spotsLeft: lifecycle.spotsLeft,
    fieldSize: dbT.fieldCapacity,
    image: dbT.heroImageUrl || "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1200&q=85",
    featured: dbT.featured,
    status: lifecycle.displayStatus,
    rawStatus: dbT.status,
    badgeLabel: lifecycle.badgeLabel,
    badgeStyle: lifecycle.badgeStyle,
    detailStatusLabel: lifecycle.detailStatusLabel,
    detailStatusDescription: lifecycle.detailStatusDescription,
    ctaLabel: lifecycle.ctaLabel,
    canRegister: lifecycle.canRegister,
    handicapRequired: dbT.handicapRequired,
  };
}

export default async function TournamentsPage() {
  let initialTournaments: Tournament[] = mockTournaments;

  try {
    const dbTournaments = await prisma.tournament.findMany({
      where: {
        status: { not: "DRAFT" },
      },
      include: {
        hostClub: true,
        _count: {
          select: {
            registrations: {
              where: {
                status: { in: ["CONFIRMED", "PENDING"] },
              },
            },
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    if (dbTournaments.length > 0) {
      initialTournaments = dbTournaments.map(formatPrismaToUITournament);
    }
  } catch (err) {
    console.error("Failed to load tournaments from DB, using fallback mock data:", err);
  }

  return (
    <main className="tournaments-page">
      <section className="tournament-page-hero">
        <div className="tournament-hero-image" aria-hidden="true" />
        <div className="tournament-hero-shade" aria-hidden="true" />
        <div className="container tournament-page-hero-inner">
          <div>
            <div className="eyebrow eyebrow-light"><span className="eyebrow-line" /> METROPOLITAN SECTION CHAMPIONSHIP SCHEDULE</div>
            <h1>PGA Tournament <em>Calendar.</em></h1>
            <p>From prestigious winter championships to open qualifiers and junior tournaments, experience premier competition and sanctioned scoring.</p>
          </div>
          <div className="calendar-stats">
            <div>
              <CalendarDays size={18} />
              <strong>2026 Season</strong>
              <span>Sanctioned Schedule</span>
            </div>
            <div>
              <Globe2 size={18} />
              <strong>Regional + Global</strong>
              <span>Metropolitan Section</span>
            </div>
          </div>
        </div>
        <div className="container breadcrumb">
          <span>Home</span>
          <span>/</span>
          <strong>Tournaments & Championships</strong>
          <span className="breadcrumb-end">
            <MapPin size={14} /> Official PGA Section Calendar <ArrowDownRight size={14} />
          </span>
        </div>
      </section>

      <section className="section tournament-discovery">
        <div className="container">
          <div className="discovery-intro">
            <div>
              <h2>Sanctioned <em>Championships & Events.</em></h2>
              <p>Filter by location, format, handicap requirement, and division eligibility.</p>
            </div>
            <div className="discovery-note">
              <span className="live-dot" /> <span>Official PGA Section Event Registry</span>
            </div>
          </div>
          <TournamentBrowser initialTournaments={initialTournaments} />
        </div>
      </section>
      <CourseVideo compact eyebrow="SECTION CHAMPIONSHIP VENUES" />
    </main>
  );
}
