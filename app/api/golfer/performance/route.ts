import { NextResponse } from "next/server";
import { getCurrentGolfer } from "@/lib/golfer-auth";
import { prisma } from "@/lib/prisma";
import { ScorecardStatus } from "@prisma/client";

export async function GET() {
  const golfer = await getCurrentGolfer();
  if (!golfer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Authoritative scorecards for this golfer
  const scorecards = await prisma.scorecard.findMany({
    where: {
      golferId: golfer.id,
      thruHoles: { gt: 0 },
    },
    include: {
      round: {
        include: {
          tournament: { select: { id: true, name: true, slug: true, startDate: true, format: true } },
        },
      },
      holeScores: {
        orderBy: { holeNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Authoritative official competition results
  const competitionResults = await prisma.competitionResult.findMany({
    where: { golferId: golfer.id },
    include: {
      tournament: { select: { id: true, name: true, slug: true, startDate: true, format: true } },
      division: { select: { name: true } },
    },
    orderBy: { finalizedAt: "desc" },
  });

  // Tournaments genuinely participated in (authoritative: having valid scorecard or competition result)
  const participatedTournamentMap = new Map<string, { id: string; name: string; slug: string; date: Date }>();

  scorecards.forEach((sc) => {
    const t = sc.round.tournament;
    if (t && !participatedTournamentMap.has(t.id)) {
      participatedTournamentMap.set(t.id, {
        id: t.id,
        name: t.name,
        slug: t.slug,
        date: t.startDate,
      });
    }
  });

  competitionResults.forEach((cr) => {
    const t = cr.tournament;
    if (t && !participatedTournamentMap.has(t.id)) {
      participatedTournamentMap.set(t.id, {
        id: t.id,
        name: t.name,
        slug: t.slug,
        date: t.startDate,
      });
    }
  });

  // Filter 18-hole completed scorecards for stroke play analytics
  const completedRounds = scorecards.filter((sc) => sc.isCompleted && sc.thruHoles === 18 && sc.totalGross > 0);

  let bestScore: number | null = null;
  let scoringAverage: number | null = null;
  let scoreHistory: { date: Date; score: number; tournamentName: string; roundNumber: number }[] = [];

  if (completedRounds.length > 0) {
    const scores = completedRounds.map((sc) => sc.totalGross);
    bestScore = Math.min(...scores);
    const sum = scores.reduce((a, b) => a + b, 0);
    scoringAverage = Math.round((sum / scores.length) * 10) / 10;

    scoreHistory = completedRounds.map((sc) => ({
      date: sc.round.roundDate,
      score: sc.totalGross,
      tournamentName: sc.round.tournament.name,
      roundNumber: sc.round.roundNumber,
    })).reverse(); // chronological
  }

  // Finishes breakdown
  const top10Finishes = competitionResults.filter((r) => r.rank <= 10).length;
  const top3Finishes = competitionResults.filter((r) => r.rank <= 3).length;
  const wins = competitionResults.filter((r) => r.rank === 1).length;

  return NextResponse.json({
    metrics: {
      tournamentsPlayed: participatedTournamentMap.size,
      completedRounds: completedRounds.length,
      totalRoundsWithScores: scorecards.length,
      bestScore,
      scoringAverage,
      top10Finishes,
      top3Finishes,
      wins,
    },
    scoringBreakdown: {
      calculatedFrom: completedRounds.length,
      hasValidHistory: completedRounds.length > 0,
      scoreHistory,
    },
    officialResults: competitionResults.map((res) => ({
      id: res.id,
      tournamentName: res.tournament.name,
      tournamentSlug: res.tournament.slug,
      tournamentDate: res.tournament.startDate,
      division: res.division?.name || "Open",
      rank: res.rank,
      isTied: res.isTied,
      totalGross: res.totalGross,
      totalNet: res.totalNet,
      toPar: res.toPar,
      roundsPlayed: res.roundsPlayed,
      finalizedAt: res.finalizedAt,
    })),
    scorecardsSummary: scorecards.map((sc) => ({
      id: sc.id,
      tournamentName: sc.round.tournament.name,
      tournamentSlug: sc.round.tournament.slug,
      roundNumber: sc.round.roundNumber,
      totalGross: sc.totalGross,
      totalNet: sc.totalNet,
      thruHoles: sc.thruHoles,
      isCompleted: sc.isCompleted,
      status: sc.status,
      submittedAt: sc.submittedAt,
      verifiedAt: sc.verifiedAt,
    })),
  });
}
