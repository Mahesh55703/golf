import Link from "next/link";
import { CalendarDays, MapPin, ArrowUpRight, Users, LockKeyhole, Trophy } from "lucide-react";
import { formatDateRange, formatFee, type Tournament } from "@/lib/data";

export function TournamentCard({ tournament, compact = false }: { tournament: Tournament; compact?: boolean }) {
  const badgeClass = tournament.badgeStyle || (tournament.status === "Registration open" ? "status-open" : "status-soon");
  const badgeText = tournament.badgeLabel || tournament.status;

  return (
    <article className={`tournament-card ${compact ? "tournament-card-compact" : ""}`}>
      <Link href={`/tournaments/${tournament.id}`} className="card-image-link" aria-label={`View ${tournament.name}`}>
        <div className="card-image" style={{ backgroundImage: `url("${tournament.image}")` }}>
          <span className={`status-pill ${badgeClass}`}>
            {badgeText}
          </span>
          {tournament.featured && <span className="featured-pill"><Trophy size={11} /> FEATURED CHAMPIONSHIP</span>}
        </div>
      </Link>
      <div className="card-content">
        <div className="card-kicker">
          <span>{tournament.format}</span>
          <span className="kicker-dot">·</span>
          <span>{tournament.region}</span>
        </div>
        <h3>
          <Link href={`/tournaments/${tournament.id}`}>{tournament.name}</Link>
        </h3>
        <p className="card-club">{tournament.club}</p>
        <div className="card-meta">
          <span><CalendarDays size={14} />{formatDateRange(tournament.startDate, tournament.endDate)}</span>
          <span><MapPin size={14} />{tournament.location}</span>
        </div>
        <div className="card-bottom">
          <div className="entry-price">
            <small>Entry Fee</small>
            <strong>{formatFee(tournament.entryFee, tournament.currency)}</strong>
          </div>
          <div className="card-spots card-spots-pulse">
            <span className="pulse-red-dot" /> {tournament.spotsLeft} spots left
          </div>
          <Link href={`/tournaments/${tournament.id}`} className="round-arrow" aria-label={`Details for ${tournament.name}`}>
            <ArrowUpRight size={16} />
          </Link>
        </div>
        {tournament.access === "Members only" && (
          <div className="member-note"><LockKeyhole size={12} /> PGA Section Members Only</div>
        )}
      </div>
    </article>
  );
}
