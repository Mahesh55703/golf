import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Flag, Globe2, ShieldCheck, Users, Trophy } from "lucide-react";
import { CourseVideo } from "@/components/course-video";
import { getMediaUrl } from "@/lib/media";
export const metadata: Metadata = { title: "About GolfPulse", description: "Learn about GolfPulse's vision for connected golf tournaments, host clubs, and golfer communities." };
export default async function AboutPage() {
  const heroImage = await getMediaUrl(
    "about.hero.main",
    "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=2200&q=90"
  );
  const videoPoster = await getMediaUrl(
    "global.video.poster",
    "https://images.unsplash.com/photo-1597369237991-5c95d1b6e0c8?auto=format&fit=crop&w=1800&q=85"
  );

  return (
    <main>
      <section className="inner-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(14,33,56,.94),rgba(14,33,56,.52)),url('${heroImage}')` }}>
        <div className="container inner-hero-content">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-line" /> OUR HERITAGE & MISSION</span>
          <h1>PGA Metropolitan<br /><em>Section Tradition.</em></h1>
          <p>Advancing the game of golf, supporting championship competitions, and cultivating elite and grassroots golf talent since 1916.</p>
          <Link href="/tournaments" className="button button-gold">
            EXPLORE CHAMPIONSHIPS <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section about-intro">
        <div className="container about-intro-grid">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> ABOUT THE SECTION</div>
            <h2>Fostering the game's <em>highest standards.</em></h2>
          </div>
          <div>
            <p>
              The PGA Metropolitan Section represents premier golf professionals, club administrators, and competitive golfers throughout the region. We oversee championship tournaments, drive junior player development, and uphold the rules and traditions that make golf exceptional.
            </p>
            <p>
              From the highly anticipated Winter Championships to local qualifying stages and club pro-ams, our tournaments provide transparent scoring, championship-caliber course setups, and memorable competition.
            </p>
          </div>
        </div>
      </section>

      <section className="section about-values">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> CORE PILLARS</div>
              <h2>Built on <em>Excellence & Tradition.</em></h2>
            </div>
          </div>
          <div className="value-grid">
            <article>
              <span><Trophy /></span>
              <h3>Championship Golf</h3>
              <p>Rigorous tournament operations, verified WHS handicap integration, and competitive opportunities for players of all divisions.</p>
            </article>
            <article>
              <span><Users /></span>
              <h3>Professional Community</h3>
              <p>Supporting PGA professionals, member clubs, and apprentices with education, clinics, and career progression.</p>
            </article>
            <article>
              <span><ShieldCheck /></span>
              <h3>Integrity & Scoring</h3>
              <p>Trusted live scoring, strict adherence to USGA/R&A rules, and transparent handicap verification across every tee sheet.</p>
            </article>
            <article>
              <span><Flag /></span>
              <h3>Junior Golf Foundation</h3>
              <p>Providing scholarships, junior tours, and mentorship to nurture the future champions of regional golf.</p>
            </article>
            <article>
              <span><Globe2 /></span>
              <h3>Partner Venues</h3>
              <p>Collaborating with top-tier golf resorts and private country clubs to deliver pristine tournament conditions.</p>
            </article>
          </div>
        </div>
      </section>

      <CourseVideo eyebrow="THE METROPOLITAN GOLF EXPERIENCE" />

      <section className="gallery-cta">
        <div className="container gallery-cta-inner">
          <div>
            <span className="eyebrow eyebrow-light"><span className="eyebrow-line" /> JOIN THE SECTION</span>
            <h2>Compete in the <em>Winter Championship.</em></h2>
            <p>Review the schedule, verify your handicap, and secure your place on the tee sheet.</p>
          </div>
          <div className="hero-actions">
            <Link href="/tournaments" className="button button-gold">
              VIEW SCHEDULE <ArrowUpRight size={16} />
            </Link>
            <Link href="/contact" className="hero-text-link">
              CONTACT OFFICIALS <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
