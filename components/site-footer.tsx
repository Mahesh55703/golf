import Link from "next/link";
import Image from "next/image";
import { Instagram, Linkedin, Facebook, Twitter, Youtube, ArrowUpRight, Mail, Phone, MapPin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div className="footer-brand-block">
          <Link href="/" className="brand footer-brand-link" aria-label="GolfPulse Home">
            <Image
              src="/logo.png"
              alt="GolfPulse Logo"
              width={210}
              height={58}
              className="brand-logo-img footer-logo-img"
            />
          </Link>
          <p>
            GolfPulse is the premier tournament management & championship platform. Connecting tournaments, clubs, and golfers across competitive circuits with live scoring, schedules, and player portals.
          </p>
          <div className="social-links">
            <a href="#facebook" aria-label="Facebook"><Facebook size={15} /></a>
            <a href="#twitter" aria-label="Twitter"><Twitter size={15} /></a>
            <a href="#instagram" aria-label="Instagram"><Instagram size={15} /></a>
            <a href="#youtube" aria-label="YouTube"><Youtube size={15} /></a>
            <a href="#linkedin" aria-label="LinkedIn"><Linkedin size={15} /></a>
          </div>
        </div>

        <div className="footer-column">
          <h4>Championships</h4>
          <Link href="/tournaments">Winter Championship</Link>
          <Link href="/tournaments">Metropolitan Open</Link>
          <Link href="/tournaments">Senior Championship</Link>
          <Link href="/tournaments">Junior Series</Link>
          <Link href="/tournaments">Calendar & Schedule</Link>
        </div>

        <div className="footer-column">
          <h4>Clubs & Sections</h4>
          <Link href="/clubs">Host Clubs Directory</Link>
          <Link href="/leaderboards">Live Scoring & Results</Link>
          <Link href="/gallery">Course Gallery</Link>
          <Link href="/about">About GolfPulse</Link>
          <Link href="/faq">Member FAQ</Link>
        </div>

        <div className="footer-column">
          <h4>Contact Section</h4>
          <div className="footer-contact-item">
            <MapPin size={14} />
            <span>49 Knollwood Road, Suite 200<br />Elmsford, NY 10523</span>
          </div>
          <div className="footer-contact-item">
            <Phone size={14} />
            <span>1 800 764-1724</span>
          </div>
          <div className="footer-contact-item">
            <Mail size={14} />
            <span>info@golfpulse.com</span>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© 2026 GolfPulse. Platform by CIS. All rights reserved.</span>
        <div className="footer-bottom-links">
          <Link href="/faq">Privacy Policy</Link>
          <span>·</span>
          <Link href="/faq">Terms of Play</Link>
          <span>·</span>
          <Link href="/contact">Support</Link>
        </div>
        <span className="footer-location">
          GolfPulse Championship Portal <ArrowUpRight size={13} style={{ display: "inline" }} />
        </span>
      </div>
    </footer>
  );
}
