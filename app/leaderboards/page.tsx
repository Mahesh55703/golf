import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Trophy } from "lucide-react";
import { CourseVideo } from "@/components/course-video";
import { getMediaUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { LiveLeaderboardView } from "@/components/live-leaderboard-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Leaderboards",
  description: "Follow real-time tournament standings, gross and net stroke play, and Stableford points.",
};

export default async function LeaderboardsPage() {
  const heroImage = await getMediaUrl(
    "leaderboards.hero.main",
    "https://images.unsplash.com/photo-1747321752143-aa29fe158a6f?auto=format&fit=crop&w=2200&q=90"
  );

  let tournamentsList: Array<{ slug: string; name: string; id: string; status: string; format: string; location: string }> = [];

  try {
    const dbTournaments = await prisma.tournament.findMany({
      orderBy: { startDate: "asc" },
      include: { hostClub: true },
    });

    tournamentsList = dbTournaments.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status.replace("_", " "),
      format: t.format.replace("_", " "),
      location: [t.hostClub?.city, t.hostClub?.state].filter(Boolean).join(", ") || "Metropolitan Area",
    }));
  } catch (err) {
    console.warn("Failed to query tournaments for leaderboard, using fallback:", err);
  }

  const defaultSlug = tournamentsList[0]?.slug || "indore-open-2026";

  return (
    <main>
      <section
        className="inner-hero"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(14,33,56,.94),rgba(14,33,56,.5)),url('${heroImage}')`,
        }}
      >
        <div className="container inner-hero-content">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-line" /> OFFICIAL LIVE SCORING
          </span>
          <h1>
            Championship <em>Leaderboards.</em>
          </h1>
          <p>
            Follow live hole-by-hole standings, gross & net stroke play, and playoff status across the Metropolitan Section.
          </p>
          <Link href="/tournaments" className="button button-gold">
            VIEW CHAMPIONSHIPS <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section leaderboard-main">
        <div className="container">
          <LiveLeaderboardView
            initialTournamentSlug={defaultSlug}
            availableTournaments={tournamentsList.map((t) => ({ slug: t.slug, name: t.name }))}
          />

          <div className="leaderboard-event-list mt-12">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tour Calendar & Championship Schedule</h3>
            <div className="space-y-3">
              {tournamentsList.slice(0, 5).map((t) => (
                <Link key={t.id} href={`/tournaments/${t.slug}`} className="leaderboard-event-row">
                  <span className="leaderboard-event-icon" style={{ background: "#0e2138", color: "#dfbf77" }}>
                    <Trophy size={18} />
                  </span>
                  <span>
                    <strong>{t.name}</strong>
                    <small>
                      {t.location} · {t.format}
                    </small>
                  </span>
                  <span className="leaderboard-event-fee" style={{ color: "#9e7932", fontWeight: 700 }}>
                    {t.status}
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CourseVideo compact eyebrow="THE SPIRIT OF COMPETITION" />
    </main>
  );
}
