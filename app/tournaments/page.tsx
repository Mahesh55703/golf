import type { Metadata } from "next";
import { ArrowDownRight, CalendarDays, Globe2, MapPin } from "lucide-react";
import { TournamentBrowser } from "@/components/tournament-browser";
import { CourseVideo } from "@/components/course-video";
export const metadata: Metadata = { title: "Discover tournaments", description: "Search golf tournaments by location, format, entry fee, and access type." };
export default function TournamentsPage() {
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
          <TournamentBrowser />
        </div>
      </section>
      <CourseVideo compact eyebrow="SECTION CHAMPIONSHIP VENUES" />
    </main>
  );
}
