import Link from "next/link";
import { Flag } from "lucide-react";
export default function NotFound() { return <main className="not-found"><Flag size={34} style={{color:"#c29b4e"}}/><p className="eyebrow" style={{color:"#c29b4e"}}>OFF THE COURSE</p><h1>That page is out of bounds.</h1><p>The GolfPulse page you're looking for isn't here yet.</p><Link href="/" className="button button-gold">Back to GolfPulse home ↗</Link></main>; }
