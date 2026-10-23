"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, CheckCircle2, Mail, MapPin, MessageCircle, Send, AlertCircle, Loader2 } from "lucide-react";
import { CourseVideo } from "@/components/course-video";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: (formData.get("name") as string)?.trim() || "",
      email: (formData.get("email") as string)?.trim() || "",
      topic: (formData.get("topic") as string)?.trim() || "",
      message: (formData.get("message") as string)?.trim() || "",
      honeypot: (formData.get("hp_address") as string)?.trim() || "",
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit inquiry. Please try again.");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="contact-page">
      <section className="contact-hero">
        <div className="contact-hero-image" />
        <div className="contact-hero-shade" />
        <div className="container contact-hero-content">
          <div className="eyebrow eyebrow-light">
            <span className="eyebrow-line" /> OFFICIAL SECTION HEADQUARTERS
          </div>
          <h1>
            Connect with the
            <br />
            <em>PGA Section Office.</em>
          </h1>
          <p>
            Tournament administration, player registrations, handicaps, member transfers, and pro-am inquiries.
          </p>
        </div>
      </section>

      <section className="section contact-main">
        <div className="container contact-layout">
          <div className="contact-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" /> GET IN TOUCH
            </div>
            <h2>
              PGA Metropolitan
              <br />
              <em>Section Officials.</em>
            </h2>
            <p>
              Our tournament committee and member services team are available to assist players, professionals, and host venues.
            </p>

            <div className="contact-method">
              <span style={{ background: "#0e2138", color: "#dfbf77" }}>
                <Mail size={20} />
              </span>
              <div>
                <strong>Tournament & Rules Inquiries</strong>
                <p>tournaments@golfpulse.com · Official responses within 24 hours.</p>
              </div>
            </div>

            <div className="contact-method">
              <span style={{ background: "#0e2138", color: "#dfbf77" }}>
                <MessageCircle size={20} />
              </span>
              <div>
                <strong>Instant Golf Assistant</strong>
                <p>Ask our GolfPulse AI assistant on any page for immediate answers.</p>
              </div>
            </div>

            <div className="contact-method">
              <span style={{ background: "#0e2138", color: "#dfbf77" }}>
                <MapPin size={20} />
              </span>
              <div>
                <strong>Section Headquarters</strong>
                <p>49 Knollwood Road, Suite 200 · Elmsford, NY 10523 · 1 800 764-1724</p>
              </div>
            </div>
          </div>

          <div className="contact-form-card">
            <div className="contact-form-heading">
              <span>PGA SECTION PORTAL</span>
              <h3>How may we assist?</h3>
              <p>Submit your inquiry to the respective section committee.</p>
            </div>

            {sent ? (
              <div className="form-success">
                <CheckCircle2 size={38} style={{ color: "#c29b4e" }} />
                <h3>Inquiry Transmitted</h3>
                <p>Your message has been captured. The Tournament Committee will be in touch shortly.</p>
                <button
                  className="button button-gold"
                  onClick={() => {
                    setSent(false);
                    setError(null);
                  }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="contact-form">
                {error && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#991b1b",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Honeypot field for bot spam deterrence */}
                <input
                  type="text"
                  name="hp_address"
                  style={{ display: "none", position: "absolute", left: "-9999px" }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div className="form-two-col">
                  <label>
                    Golfer / Pro Name
                    <input required name="name" placeholder="Full name" disabled={loading} />
                  </label>
                  <label>
                    Email Address
                    <input required type="email" name="email" placeholder="you@example.com" disabled={loading} />
                  </label>
                </div>

                <label>
                  Topic / Department
                  <select name="topic" defaultValue="" required disabled={loading}>
                    <option value="" disabled>
                      Select inquiry division
                    </option>
                    <option value="Winter Championship Registration">Winter Championship Registration</option>
                    <option value="Handicap & Scoring Audit">Handicap & Scoring Audit</option>
                    <option value="Host Club Sanctioning">Host Club Sanctioning</option>
                    <option value="Junior Golf Foundation">Junior Golf Foundation</option>
                    <option value="General PGA Inquiries">General PGA Inquiries</option>
                  </select>
                </label>

                <label>
                  Message Details
                  <textarea
                    required
                    name="message"
                    rows={5}
                    placeholder="Describe your tournament or membership inquiry..."
                    disabled={loading}
                  />
                </label>

                <button className="button button-gold" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                  {loading ? (
                    <>
                      TRANSMITTING... <Loader2 size={16} className="animate-spin" />
                    </>
                  ) : (
                    <>
                      TRANSMIT INQUIRY <Send size={16} />
                    </>
                  )}
                </button>
                <p className="form-note">Official communications are reviewed by the Section Secretariat.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="contact-bottom" style={{ background: "#0e2138" }}>
        <div className="container contact-bottom-inner">
          <div>
            <span className="eyebrow eyebrow-light">
              <span className="eyebrow-line" /> 2026 WINTER CHAMPIONSHIPS
            </span>
            <h2>
              Ready to compete on the <em>Section Tour?</em>
            </h2>
          </div>
          <a className="button button-gold" href="/tournaments">
            VIEW CALENDAR <ArrowUpRight size={16} />
          </a>
        </div>
      </section>

      <CourseVideo compact eyebrow="METROPOLITAN SECTION HEADQUARTERS" />
    </main>
  );
}
