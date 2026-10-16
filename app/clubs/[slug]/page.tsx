import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarDays, MapPin, Flag } from "lucide-react";
import { CourseVideo } from "@/components/course-video";
import { getMediaUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FALLBACK_CLUBS: Record<string, any> = {
  "prestige-golfshire-club": { slug: "prestige-golfshire-club", name: "Prestige Golfshire Club", city: "Indore", state: "Madhya Pradesh", image: "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=2000&q=90", description: "A welcoming setting for competitive rounds and community golf." },
  "emerald-greens-golf-resort": { slug: "emerald-greens-golf-resort", name: "Emerald Greens Golf Resort", city: "Pune", state: "Maharashtra", image: "https://images.unsplash.com/photo-1592937238247-cd0090e02f65?auto=format&fit=crop&w=2000&q=90", description: "A scenic escape for social golf and format-friendly events." },
  "royal-valley-golf-club": { slug: "royal-valley-golf-club", name: "Royal Valley Golf Club", city: "Bengaluru", state: "Karnataka", image: "https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?auto=format&fit=crop&w=2000&q=90", description: "Club competition, match play, and a year-round golf community." },
  "sentosa-golf-club": { slug: "sentosa-golf-club", name: "Sentosa Golf Club", city: "Sentosa", state: "Singapore", image: "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=2000&q=90", description: "International golf inspiration for players who love to travel." },
  "north-shore-golf-links": { slug: "north-shore-golf-links", name: "North Shore Golf Links", city: "St Andrews", state: "Scotland", image: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=2000&q=90", description: "Classic links-style scenery and destination tournament possibilities." },
  "lakes-golf-country-club": { slug: "lakes-golf-country-club", name: "The Lakes Golf & Country Club", city: "Hyderabad", state: "Telangana", image: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=2000&q=90", description: "A place for team formats, club days, and friendly competition." },
};

export async function generateStaticParams() {
  try {
    const clubs = await prisma.club.findMany({ select: { slug: true } });
    if (clubs.length > 0) return clubs.map((c) => ({ slug: c.slug }));
  } catch {
    // fallback
  }
  return Object.keys(FALLBACK_CLUBS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let clubName = "Golf club";
  let description = "Explore golf clubs on GolfPulse.";

  try {
    const club = await prisma.club.findUnique({ where: { slug } });
    if (club) {
      clubName = club.name;
      description = club.description || description;
    } else if (FALLBACK_CLUBS[slug]) {
      clubName = FALLBACK_CLUBS[slug].name;
      description = FALLBACK_CLUBS[slug].description;
    }
  } catch {
    if (FALLBACK_CLUBS[slug]) {
      clubName = FALLBACK_CLUBS[slug].name;
      description = FALLBACK_CLUBS[slug].description;
    }
  }

  return { title: clubName, description };
}

export default async function ClubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let club: any = null;
  let events: any[] = [];

  try {
    club = await prisma.club.findUnique({
      where: { slug },
      include: {
        tournaments: {
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            format: true,
          },
          orderBy: { startDate: "asc" },
        },
      },
    });
    if (club) {
      events = club.tournaments || [];
    }
  } catch (err) {
    console.error("Database fetch failed in ClubDetailPage:", err);
  }

  if (!club && FALLBACK_CLUBS[slug]) {
    club = FALLBACK_CLUBS[slug];
  }

  if (!club) notFound();

  const fallbackImage = club.heroImageUrl || club.image || "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=2000&q=90";
  const heroImage = await getMediaUrl(`clubs.${slug}.hero`, fallbackImage);
  const locationStr = [club.city, club.state].filter(Boolean).join(", ");

  return (
    <main>
      <section
        className="inner-hero"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(8,32,18,.91),rgba(8,32,18,.43)),url('${heroImage}')`,
        }}
      >
        <div className="container inner-hero-content">
          <Link href="/clubs" className="detail-back">
            <ArrowUpRight size={14} /> All golf clubs
          </Link>
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-line" /> CLUB PROFILE
          </span>
          <h1>{club.name}</h1>
          <p>
            <MapPin size={16} style={{ display: "inline", verticalAlign: "middle" }} /> {locationStr}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container club-detail-layout">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> ABOUT THE CLUB
            </div>
            <h2>
              A place to <em>play your game.</em>
            </h2>
            <p className="club-detail-description">
              {club.description} This is an official venue profile on GolfPulse; facility inquiries, course ratings, tee sets, contact details, and tournament entries are managed by certified PGA organizers.
            </p>
            <div className="club-facts">
              <span><Flag /> Golf community</span>
              <span><CalendarDays /> Tournament hosting</span>
              <span><MapPin /> {locationStr}</span>
            </div>
          </div>

          <aside className="club-event-panel">
            <h3>Hosted tournaments</h3>
            {events.length > 0 ? (
              events.map((t: any) => {
                const dateStr = t.startDate ? new Date(t.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
                const formatLabel = typeof t.format === "string" ? t.format.replace(/_/g, " ") : "Stroke Play";
                return (
                  <Link className="club-event-row" key={t.id || t.slug} href={`/tournaments/${t.slug || t.id}`}>
                    <span>
                      <strong>{t.name}</strong>
                      <small>{dateStr} · {formatLabel}</small>
                    </span>
                    <ArrowUpRight size={17} />
                  </Link>
                );
              })
            ) : (
              <p>There are no sanctioned events currently scheduled for this venue.</p>
            )}
            <Link className="button button-dark" href="/tournaments">
              Browse all events <ArrowUpRight size={15} />
            </Link>
          </aside>
        </div>
      </section>

      <CourseVideo compact eyebrow="EXPLORE THE COURSE" />
    </main>
  );
}

