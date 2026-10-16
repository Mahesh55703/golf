export type Tournament = {
  id: string;
  name: string;
  club: string;
  location: string;
  region: "India" | "International";
  startDate: string;
  endDate: string;
  format: "Stroke Play" | "Stableford" | "Match Play" | "Scramble";
  access: "Public" | "Members only";
  entryFee: number;
  currency: "USD";
  spotsLeft: number;
  fieldSize: number;
  image: string;
  featured?: boolean;
  status: "Registration open" | "Coming soon";
  handicapRequired: boolean;
};

export const tournaments: Tournament[] = [
  {
    id: "indore-open-2026", name: "PGA Metropolitan Winter Championship", club: "Prestige Golfshire Club", location: "Metropolitan District", region: "India",
    startDate: "2026-11-14", endDate: "2026-11-15", format: "Stroke Play", access: "Public", entryFee: 150, currency: "USD", spotsLeft: 28, fieldSize: 120,
    image: "https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1200&q=85", featured: true, status: "Registration open", handicapRequired: true,
  },
  {
    id: "monsoon-stableford", name: "Monsoon Stableford Challenge", club: "Emerald Greens Golf Resort", location: "Pune, Maharashtra", region: "India",
    startDate: "2026-11-22", endDate: "2026-11-22", format: "Stableford", access: "Public", entryFee: 25, currency: "USD", spotsLeft: 41, fieldSize: 96,
    image: "https://images.unsplash.com/photo-1592937238247-cd0090e02f65?auto=format&fit=crop&w=1000&q=85", status: "Registration open", handicapRequired: false,
  },
  {
    id: "club-championship", name: "The Club Championship", club: "Royal Valley Golf Club", location: "Bengaluru, Karnataka", region: "India",
    startDate: "2026-12-05", endDate: "2026-12-06", format: "Match Play", access: "Members only", entryFee: 20, currency: "USD", spotsLeft: 12, fieldSize: 64,
    image: "https://images.unsplash.com/photo-1611374243147-44a702c2d44c?auto=format&fit=crop&w=1000&q=85", status: "Registration open", handicapRequired: true,
  },
  {
    id: "singapore-amateur", name: "Singapore Amateur Invitational", club: "Sentosa Golf Club", location: "Singapore", region: "International",
    startDate: "2027-01-16", endDate: "2027-01-17", format: "Stroke Play", access: "Public", entryFee: 280, currency: "USD", spotsLeft: 36, fieldSize: 144,
    image: "https://images.unsplash.com/photo-1758190153295-710199944b73?auto=format&fit=crop&w=1000&q=85", status: "Coming soon", handicapRequired: true,
  },
  {
    id: "winter-scramble", name: "Winter Team Scramble", club: "The Lakes Golf & Country Club", location: "Hyderabad, Telangana", region: "India",
    startDate: "2026-12-19", endDate: "2026-12-19", format: "Scramble", access: "Public", entryFee: 65, currency: "USD", spotsLeft: 18, fieldSize: 80,
    image: "https://images.unsplash.com/photo-1582528979903-bee578216a69?auto=format&fit=crop&w=1000&q=85", status: "Registration open", handicapRequired: false,
  },
  {
    id: "scottish-links", name: "Highlands Links Classic", club: "North Shore Golf Links", location: "St Andrews, Scotland", region: "International",
    startDate: "2027-04-09", endDate: "2027-04-11", format: "Stroke Play", access: "Public", entryFee: 250, currency: "USD", spotsLeft: 52, fieldSize: 128,
    image: "https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?auto=format&fit=crop&w=1000&q=85", status: "Coming soon", handicapRequired: true,
  },
];

export function formatDateRange(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const sameDay = start === end;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (sameDay) return startDate.toLocaleDateString("en-IN", { ...opts, year: "numeric" });
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  if (sameMonth) return `${startDate.getDate()}–${endDate.toLocaleDateString("en-IN", { ...opts, year: "numeric" })}`;
  return `${startDate.toLocaleDateString("en-IN", opts)} – ${endDate.toLocaleDateString("en-IN", { ...opts, year: "numeric" })}`;
}

export function formatFee(amount: number, _currency: Tournament["currency"] = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}
