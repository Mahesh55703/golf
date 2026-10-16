import Link from "next/link";
import { ArrowUpRight, PlayCircle } from "lucide-react";

type CourseVideoProps = { compact?: boolean; eyebrow?: string; posterUrl?: string };

/** Reusable, visible course-film section. Video has controls and a photo poster fallback. */
export function CourseVideo({ compact = false, eyebrow = "COURSE FILM", posterUrl }: CourseVideoProps) {
  const finalPoster = posterUrl || "https://images.unsplash.com/photo-1597369237991-5c95d1b6e0c8?auto=format&fit=crop&w=1800&q=85";
  return (
    <section className={`course-video-section ${compact ? "course-video-compact" : ""}`}>
      <div className="container">
        <div className="course-video-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</div>
            <h2>Take in the <em>view.</em></h2>
            <p>Rolling fairways, quiet greens, and the places that make every round memorable.</p>
          </div>
          <span className="video-hint"><PlayCircle size={17} /> Press play for a closer look</span>
        </div>
        <div className="course-video-frame">
          <video
            controls
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={finalPoster}
            aria-label="Scenic golf course video"
          >
            <source src="/course-preview.mp4" type="video/mp4" />
            <source src="/golf-swing.mp4" type="video/mp4" />
            Your browser does not support embedded video. Use the course gallery to explore the scenery.
          </video>
          <div className="course-video-caption">
            <span>GOLFPULSE FILM SERIES</span>
            <Link href="/gallery">Explore the gallery <ArrowUpRight size={15} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
