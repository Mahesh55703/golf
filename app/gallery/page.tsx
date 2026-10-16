import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Camera, Images } from "lucide-react";
import { CourseVideo } from "@/components/course-video";
import { prisma } from "@/lib/prisma";
import { getMediaUrl } from "@/lib/media";
export const metadata: Metadata = { title: "Golf course gallery", description: "Explore beautiful golf courses, tournament moments, and the landscapes that make every round memorable." };
const fallbackPhotos = [
  { title: "Morning on the fairway", type: "COURSE LANDSCAPES", image: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1400&q=90", className: "gallery-item gallery-item-large" },
  { title: "Sunset over the championship greens", type: "AERIAL PERSPECTIVE", image: "https://images.unsplash.com/photo-1709525617119-1eaf632a2a91?auto=format&fit=crop&w=1000&q=85", className: "gallery-item" },
  { title: "The perfect roll on the green", type: "EQUIPMENT & FOCUS", image: "https://images.unsplash.com/photo-1597369237991-5c95d1b6e0c8?auto=format&fit=crop&w=1000&q=85", className: "gallery-item" },
  { title: "Pond reflection on the fairway", type: "DESTINATION GOLF", image: "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=1200&q=85", className: "gallery-item gallery-item-wide" },
  { title: "Addressing the championship putt", type: "THE GAME", image: "https://images.unsplash.com/photo-1747321752143-aa29fe158a6f?auto=format&fit=crop&w=1000&q=85", className: "gallery-item" },
  { title: "Lakeside morning round", type: "THE LANDSCAPE", image: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=1000&q=85", className: "gallery-item" },
];

export default async function GalleryPage() {
  let photos = fallbackPhotos;
  try {
    const dbItems = await prisma.galleryItem.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      include: { asset: true },
    });
    if (dbItems && dbItems.length > 0) {
      photos = dbItems.map((item) => ({
        title: item.title,
        type: item.category,
        image: item.asset ? item.asset.url : (item.fallbackUrl || ""),
        className: item.className || "gallery-item",
      }));
    }
  } catch {
    // Keep fallbackPhotos
  }

  const heroImage = await getMediaUrl("gallery.hero.main", "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=2200&q=90");

  return <main className="gallery-page"><section className="gallery-hero"><div className="gallery-hero-image" style={{backgroundImage:`url('${heroImage}')`}}/><div className="gallery-hero-shade"/><div className="container gallery-hero-content"><div className="eyebrow eyebrow-light"><span className="eyebrow-line"/> SECTION PHOTOGRAPHY & MEDIA</div><h1>PGA Championship<br/><em>Photo Gallery.</em></h1><p>Relive championship moments, historic trophy ceremonies, pristine fairways, and tournament highlights from the Metropolitan Section.</p><div className="hero-actions"><a href="#gallery-grid" className="button button-gold">EXPLORE ARCHIVE <ArrowUpRight size={16}/></a><span className="gallery-count"><Images size={16}/> Official Section Photography</span></div></div></section><section id="gallery-grid" className="section gallery-main"><div className="container"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> CHAMPIONSHIP MOMENTS</div><h2>Preserving the <em>heritage of golf.</em></h2><p className="section-description">A curated look at Section tournaments, dramatic final rounds, and elite courses.</p></div></div><div className="gallery-grid">{photos.map((photo, i)=><article className={photo.className} key={photo.title} style={{animationDelay:`${i*90}ms`}}><div className="gallery-photo" style={{backgroundImage:`url("${photo.image}")`}}/><div className="gallery-photo-overlay"/><div className="gallery-photo-copy"><span>{photo.type}</span><h3>{photo.title}</h3></div><span className="gallery-photo-number">0{i+1}</span></article>)}</div></div></section><section className="gallery-cta"><div className="container gallery-cta-inner"><div><span className="eyebrow eyebrow-light"><span className="eyebrow-line"/> 2026 WINTER CHAMPIONSHIPS</span><h2>Be part of the next <em>photo finish.</em></h2><p>Register for sanctioned tournaments across our premier regional venues.</p></div><Link href="/tournaments" className="button button-gold">VIEW CHAMPIONSHIPS <ArrowUpRight size={16}/></Link></div></section><CourseVideo compact eyebrow="METROPOLITAN SECTION IN MOTION" /></main>;
}
