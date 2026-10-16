import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GolfAssistant } from "@/components/golf-assistant";

export const metadata: Metadata = {
  title: { default: "GolfPulse — Tournaments, Clubs, Golfers & Beyond", template: "%s | GolfPulse" },
  description: "GolfPulse: The premier platform for golf tournaments, host clubs, real-time leaderboards, and championships. Platform by CIS. All rights reserved.",
  applicationName: "GolfPulse",
};

import { MediaProvider } from "@/components/media-provider";
import { PublicShell } from "@/components/public-shell";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MediaProvider>
          <PublicShell>{children}</PublicShell>
        </MediaProvider>
      </body>
    </html>
  );
}
