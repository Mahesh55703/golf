import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin, ArrowRight, Flag } from "lucide-react";
import { CourseVideo } from "@/components/course-video";
import { getMediaUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Golf clubs",
  description: "Discover golf clubs and courses hosting GolfPulse PGA tournaments.",
};

const FALLBACK_CLUBS = [
  { slug: "prestige-golfshire-club", name: "Prestige Golfshire Club", city: "Indore", state: "Madhya Pradesh", country: "India", heroImageUrl: "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=1200&q=85", description: "A welcoming setting for competitive rounds and community golf." },
  { slug: "emerald-greens-golf-resort", name: "Emerald Greens Golf Resort", city: "Pune", state: "Maharashtra", country: "India", heroImageUrl: "https://images.unsplash.com/photo-1592937238247-cd0090e02f65?auto=format&fit=crop&w=1200&q=85", description: "A scenic escape for social golf and format-friendly events." },
  { slug: "royal-valley-golf-club", name: "Royal Valley Golf Club", city: "Bengaluru", state: "Karnataka", country: "India", heroImageUrl: "https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?auto=format&fit=crop&w=1200&q=85", description: "Club competition, match play, and a year-round golf community." },
  { slug: "sentosa-golf-club", name: "Sentosa Golf Club", city: "Sentosa", state: "Singapore", country: "Singapore", heroImageUrl: "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=1200&q=85", description: "International golf inspiration for players who love to travel." },
  { slug: "north-shore-golf-links", name: "North Shore Golf Links", city: "St Andrews", state: "Fife", country: "Scotland", heroImageUrl: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1200&q=85", description: "Classic links-style scenery and destination tournament possibilities." },
  { slug: "lakes-golf-country-club", name: "The Lakes Golf & Country Club", city: "Hyderabad", state: "Telangana", country: "India", heroImageUrl: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=1200&q=85", description: "A place for team formats, club days, and friendly competition." },
];

export default async function ClubsPage() {
  const heroImage = await getMediaUrl(
    "clubs.hero.main",
    "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=2200&q=90"
  );

  let clubsData: any[] = [];
  try {
    clubsData = await prisma.club.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { tournaments: true },
        },
      },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error("Database fetch failed in ClubsPage, using fallbacks:", err);
  }

  const clubsToRender = clubsData.length > 0 ? clubsData : FALLBACK_CLUBS;

  return (
    <main>
      <section
        className="inner-hero"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(14,33,56,.94),rgba(14,33,56,.45)),url('${heroImage}')`,
        }}
      >
        <div className="container inner-hero-content">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-line" /> CHAMPIONSHIP HOST VENUES
          </span>
          <h1>
            PGA Host <em>Clubs & Courses.</em>
          </h1>
          <p>
            Discover premier country clubs and championship courses hosting PGA Metropolitan Section qualifiers and tournaments.
          </p>
          <Link href="/tournaments" className="button button-gold">
            VIEW TOURNAMENT HOSTS <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" /> METROPOLITAN SECTION VENUES
              </div>
              <h2>
                Championship courses <em>and clubhouses.</em>
              </h2>
              <p className="section-description">
                Tournaments are held at pristine private, resort, and public championship facilities.
              </p>
            </div>
          </div>

          <div className="club-grid">
            {clubsToRender.map((club: any, i: number) => {
              const locationStr = [club.city, club.state].filter(Boolean).join(", ");
              const region = club.country === "India" ? "India" : "International";
              const tag = club.country === "India" ? "TOURNAMENT HOST" : "DESTINATION GOLF";
              const count = club._count?.tournaments ?? 1;
              const imgUrl = club.heroImageUrl || "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=1200&q=85";

              return (
                <article className="club-card" key={club.slug} style={{ animationDelay: `${i * 80}ms` }}>
                  <Link
                    href={`/clubs/${club.slug}`}
                    className="club-card-image"
                    style={{ backgroundImage: `url('${imgUrl}')` }}
                    aria-label={`View ${club.name}`}
                  >
                    <span>{tag}</span>
                    <i><ArrowUpRight size={17} /></i>
                  </Link>

                  <div className="club-card-content">
                    <div className="club-region">
                      <Flag size={14} /> {region}
                    </div>
                    <h3>
                      <Link href={`/clubs/${club.slug}`}>{club.name}</Link>
                    </h3>
                    <p className="club-location">
                      <MapPin size={14} /> {locationStr}
                    </p>
                    <p>{club.description}</p>
                    <div className="club-card-bottom">
                      <span>{count} sanctioned event{count !== 1 ? "s" : ""}</span>
                      <Link href={`/clubs/${club.slug}`}>
                        Course profile <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <CourseVideo eyebrow="SECTION CHAMPIONSHIP VENUES" />

      <section className="gallery-cta">
        <div className="container gallery-cta-inner">
          <div>
            <span className="eyebrow eyebrow-light">
              <span className="eyebrow-line" /> HOST AN EVENT
            </span>
            <h2>
              Bring championship golf to <em>your club.</em>
            </h2>
            <p>Inquire with our tournament committee about hosting sanctioned sectional events.</p>
          </div>
          <Link href="/contact" className="button button-gold">
            HOST INQUIRY <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

