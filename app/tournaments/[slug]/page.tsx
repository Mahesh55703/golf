import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, CircleDollarSign, Flag, MapPin, ShieldCheck, Users } from "lucide-react";
import { tournaments, formatDateRange, formatFee } from "@/lib/data";
import { CourseVideo } from "@/components/course-video";
import { getMediaUrl } from "@/lib/media";

export function generateStaticParams() { return tournaments.map((t) => ({ slug: t.id })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const tournament = tournaments.find((t) => t.id === slug);
  return { title: tournament ? tournament.name : "Tournament details", description: tournament ? `${tournament.name} at ${tournament.club}. Event details, format, entry fee, and registration information.` : "Golf tournament details." };
}
export default async function TournamentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const t = tournaments.find((event) => event.id === slug); if (!t) notFound();
  const heroImage = await getMediaUrl(`tournaments.${slug}.hero`, t.image);
  return <main className="detail-page">
    <section className="detail-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(8,32,18,.91),rgba(8,32,18,.55) 58%,rgba(8,32,18,.12)),url('${heroImage}')` }}><div className="container detail-hero-inner"><Link className="detail-back" href="/tournaments"><ArrowLeft size={15}/> All tournaments</Link><span className="detail-kicker">{t.region.toUpperCase()} · {t.format.toUpperCase()}</span><h1>{t.name.split(" ").slice(0,-1).join(" ")} <em>{t.name.split(" ").slice(-1)}</em></h1><p>{t.club} · {t.location}</p><div className="detail-hero-meta"><span><CalendarDays size={16}/>{formatDateRange(t.startDate,t.endDate)}</span><span><MapPin size={16}/>{t.location}</span><span><CircleDollarSign size={16}/>{formatFee(t.entryFee)} entry</span></div></div></section>
    <section className="section detail-main"><div className="container detail-layout"><div className="detail-copy"><div className="eyebrow"><span className="eyebrow-line"/> THE EVENT</div><h2>A round to <em>remember.</em></h2><p>Join fellow golfers for a thoughtfully organized event on a beautiful course. Review the event information below and check eligibility before registering.</p><div className="detail-info-grid"><article><Flag/><span>FORMAT</span><strong>{t.format}</strong><small>{t.handicapRequired ? "Handicap required" : "Open handicap policy"}</small></article><article><Users/><span>FIELD SIZE</span><strong>{t.fieldSize} players</strong><small>{t.spotsLeft} places currently shown</small></article><article><ShieldCheck/><span>ACCESS</span><strong>{t.access}</strong><small>{t.access === "Public" ? "Open registration" : "Club membership required"}</small></article><article><CalendarDays/><span>STATUS</span><strong>{t.status}</strong><small>Sample event for preview</small></article></div><h3>What to know</h3><ul className="detail-checklist"><li><CheckCircle2/> Check the event schedule and arrive before your assigned tee time.</li><li><CheckCircle2/> Confirm the tournament format and any handicap requirements with the organizer.</li><li><CheckCircle2/> Entry fee is displayed in USD for this platform preview.</li></ul></div><aside className="entry-card"><span className="entry-card-label">TOURNAMENT ENTRY</span><div className="entry-card-price">{formatFee(t.entryFee)} <small>/ player</small></div><p>{t.status === "Registration open" ? "Registration is shown as open in this sample preview." : "This sample event is marked as coming soon."}</p><button className="button button-dark" disabled>{t.status === "Registration open" ? "Registration coming soon" : "Notify me when open"} <ArrowUpRight size={16}/></button><small className="entry-card-note">Registration and payments will be connected after the frontend is approved.</small><div className="entry-card-divider"/><span className="entry-card-label">HOST CLUB</span><strong>{t.club}</strong><span className="entry-card-location"><MapPin size={14}/>{t.location}</span><Link className="text-link" href="/clubs">Explore golf clubs <ArrowUpRight size={15}/></Link></aside></div></section>
    <CourseVideo compact eyebrow="THE COURSE EXPERIENCE" />
  </main>;
}
