import { NextResponse } from "next/server";
import { getCurrentGolfer } from "@/lib/golfer-auth";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus, ScorecardStatus } from "@prisma/client";

export async function GET() {
  const golfer = await getCurrentGolfer();
  if (!golfer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch registrations for this golfer
  const registrations = await prisma.registration.findMany({
    where: { golferId: golfer.id },
    include: {
      tournament: {
        include: {
          hostClub: { select: { name: true, city: true, state: true } },
          rounds: { orderBy: { roundNumber: "asc" } },
        },
      },
      division: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { registeredAt: "desc" },
  });

  // 2. Classify tournaments based on actual status and date
  const now = new Date();
  const upcoming: typeof registrations = [];
  const inProgress: typeof registrations = [];
  const past: typeof registrations = [];

  for (const reg of registrations) {
    const t = reg.tournament;
    if (reg.status === RegistrationStatus.CANCELLED) {
      continue;
    }

    if (t.status === "IN_PROGRESS") {
      inProgress.push(reg);
    } else if (t.status === "FINALIZED" || new Date(t.endDate) < now) {
      past.push(reg);
    } else {
      upcoming.push(reg);
    }
  }

  // 3. Authoritative Participation & Scorecard metrics
  const scorecards = await prisma.scorecard.findMany({
    where: {
      golferId: golfer.id,
      status: { in: [ScorecardStatus.SUBMITTED, ScorecardStatus.VERIFIED] },
      thruHoles: { gt: 0 },
    },
    include: {
      round: {
        include: {
          tournament: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Unique tournaments where golfer genuinely participated
  const participatedTournamentIds = new Set<string>();
  scorecards.forEach((sc) => {
    if (sc.round?.tournament?.id) {
      participatedTournamentIds.add(sc.round.tournament.id);
    }
  });

  // Official Competition Results
  const competitionResults = await prisma.competitionResult.findMany({
    where: { golferId: golfer.id },
    include: {
      tournament: { select: { id: true, name: true, slug: true, startDate: true } },
      division: { select: { name: true } },
    },
    orderBy: { finalizedAt: "desc" },
  });

  competitionResults.forEach((cr) => {
    if (cr.tournament?.id) {
      participatedTournamentIds.add(cr.tournament.id);
    }
  });

  // 4. Calculate actual performance statistics (only if completed 18-hole scorecards exist)
  const completedScorecards = scorecards.filter((sc) => sc.isCompleted && sc.thruHoles === 18 && sc.totalGross > 0);
  let bestScore: number | null = null;
  let scoringAverage: number | null = null;

  if (completedScorecards.length > 0) {
    const scores = completedScorecards.map((sc) => sc.totalGross);
    bestScore = Math.min(...scores);
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    scoringAverage = Math.round((sum / scores.length) * 10) / 10;
  }

  // Best finish rank
  let bestFinish: { rank: number; tournamentName: string; isTied: boolean } | null = null;
  if (competitionResults.length > 0) {
    const sorted = [...competitionResults].sort((a, b) => a.rank - b.rank);
    const top = sorted[0];
    bestFinish = {
      rank: top.rank,
      tournamentName: top.tournament.name,
      isTied: top.isTied,
    };
  }

  // Unread notifications
  const unreadNotificationsCount = await prisma.golferNotification.count({
    where: { golferId: golfer.id, isRead: false },
  });

  // Recent 3 notifications
  const recentNotifications = await prisma.golferNotification.findMany({
    where: { golferId: golfer.id },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return NextResponse.json({
    golfer,
    stats: {
      upcomingCount: upcoming.length,
      inProgressCount: inProgress.length,
      tournamentsParticipatedCount: participatedTournamentIds.size,
      completedRoundsCount: completedScorecards.length,
      bestScore,
      scoringAverage,
      bestFinish,
      unreadNotificationsCount,
    },
    upcoming: upcoming.slice(0, 3).map((reg) => ({
      id: reg.id,
      referenceNumber: reg.referenceNumber,
      status: reg.status,
      paymentStatus: reg.paymentStatus,
      tournament: {
        id: reg.tournament.id,
        name: reg.tournament.name,
        slug: reg.tournament.slug,
        startDate: reg.tournament.startDate,
        endDate: reg.tournament.endDate,
        hostClub: reg.tournament.hostClub?.name || "Official Venue",
        location: [reg.tournament.hostClub?.city, reg.tournament.hostClub?.state].filter(Boolean).join(", "),
      },
      division: reg.division?.name || "Open Championship",
    })),
    recentResults: competitionResults.slice(0, 3).map((res) => ({
      id: res.id,
      tournamentName: res.tournament.name,
      tournamentSlug: res.tournament.slug,
      division: res.division?.name || "Championship",
      rank: res.rank,
      isTied: res.isTied,
      totalGross: res.totalGross,
      toPar: res.toPar,
      finalizedAt: res.finalizedAt,
    })),
    recentNotifications,
  });
}
