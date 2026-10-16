import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarDays, MapPin, Flag } from "lucide-react";
import { tournaments } from "@/lib/data";
import { CourseVideo } from "@/components/course-video";
import { getMediaUrl } from "@/lib/media";
const clubs = [
 {slug:"prestige-golfshire-club",name:"Prestige Golfshire Club",location:"Indore, Madhya Pradesh",image:"https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=2000&q=90",description:"A welcoming setting for competitive rounds and community golf."},
 {slug:"emerald-greens-golf-resort",name:"Emerald Greens Golf Resort",location:"Pune, Maharashtra",image:"https://images.unsplash.com/photo-1592937238247-cd0090e02f65?auto=format&fit=crop&w=2000&q=90",description:"A scenic escape for social golf and format-friendly events."},
 {slug:"royal-valley-golf-club",name:"Royal Valley Golf Club",location:"Bengaluru, Karnataka",image:"https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?auto=format&fit=crop&w=2000&q=90",description:"Club competition, match play, and a year-round golf community."},
 {slug:"sentosa-golf-club",name:"Sentosa Golf Club",location:"Singapore",image:"https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=2000&q=90",description:"International golf inspiration for players who love to travel."},
 {slug:"north-shore-golf-links",name:"North Shore Golf Links",location:"St Andrews, Scotland",image:"https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=2000&q=90",description:"Classic links-style scenery and destination tournament possibilities."},
 {slug:"lakes-golf-country-club",name:"The Lakes Golf & Country Club",location:"Hyderabad, Telangana",image:"https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=2000&q=90",description:"A place for team formats, club days, and friendly competition."}
];
export function generateStaticParams(){return clubs.map(c=>({slug:c.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const club=clubs.find(c=>c.slug===slug);return {title:club?.name??"Golf club",description:club?.description??"Explore golf clubs on Fairway."};}
export default async function ClubDetailPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const club=clubs.find(c=>c.slug===slug);
  if(!club)notFound();
  const heroImage = await getMediaUrl(`clubs.${slug}.hero`, club.image);
  const events=tournaments.filter(t=>t.club===club.name);
  return <main><section className="inner-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(8,32,18,.91),rgba(8,32,18,.43)),url('${heroImage}')`}}><div className="container inner-hero-content"><Link href="/clubs" className="detail-back"><ArrowUpRight size={14}/> All golf clubs</Link><span className="eyebrow eyebrow-light"><span className="eyebrow-line"/> CLUB PROFILE</span><h1>{club.name}</h1><p><MapPin size={16} style={{display:"inline",verticalAlign:"middle"}}/> {club.location}</p></div></section><section className="section"><div className="container club-detail-layout"><div><div className="eyebrow"><span className="eyebrow-line"/> ABOUT THE CLUB</div><h2>A place to <em>play your game.</em></h2><p className="club-detail-description">{club.description} This is a sample profile for the Fairway frontend preview; official facilities, course ratings, tee sets, contact details, and membership policies will be supplied by verified club administrators.</p><div className="club-facts"><span><Flag/> Golf community</span><span><CalendarDays/> Tournament hosting</span><span><MapPin/> {club.location}</span></div></div><aside className="club-event-panel"><h3>Hosted tournaments</h3>{events.length?events.map(t=><Link className="club-event-row" key={t.id} href={`/tournaments/${t.id}`}><span><strong>{t.name}</strong><small>{t.startDate} · {t.format}</small></span><ArrowUpRight size={17}/></Link>):<p>There are no sample events currently linked to this club.</p>}<Link className="button button-dark" href="/tournaments">Browse all events <ArrowUpRight size={15}/></Link></aside></div></section><CourseVideo compact eyebrow="EXPLORE THE COURSE"/></main>}
