import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateLeaderboardRankings, CompetitorEntry } from "@/lib/scoring";

// GET /api/leaderboard?tournamentSlug=...&roundNumber=1&divisionId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tournamentSlug = searchParams.get("tournamentSlug");
    const divisionId = searchParams.get("divisionId");
    const roundNumber = parseInt(searchParams.get("roundNumber") || "1", 10);

    if (!tournamentSlug) {
      return NextResponse.json({ error: "tournamentSlug is required" }, { status: 400 });
    }

    // 1. Fetch tournament with rounds and course holes
    const tournament = await prisma.tournament.findFirst({
      where: {
        OR: [{ slug: tournamentSlug }, { id: tournamentSlug }],
      },
      include: {
        hostClub: true,
        divisions: true,
        rounds: {
          orderBy: { roundNumber: "asc" },
          include: {
            course: {
              include: { holes: true },
            },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const targetRound = tournament.rounds.find((r) => r.roundNumber === roundNumber) || tournament.rounds[0];

    // 2. Query scorecards for target round
    const scorecards = targetRound
      ? await prisma.scorecard.findMany({
          where: {
            roundId: targetRound.id,
            ...(divisionId && divisionId !== "all"
              ? { registration: { divisionId } }
              : {}),
          },
          include: {
            golfer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                country: true,
                homeClub: true,
              },
            },
            registration: {
              select: {
                division: { select: { id: true, name: true } },
              },
            },
            holeScores: {
              orderBy: { holeNumber: "asc" },
            },
          },
        })
      : [];

    const parTotal = targetRound?.course?.par || 72;

    // 3. Format entries for scoring engine calculation
    const competitorEntries: CompetitorEntry[] = scorecards.map((sc) => {
      // Calculate toParGross
      let toParGross = 0;
      let toParNet: number | null = null;

      // Sum par of played holes
      const completedHoles = sc.holeScores.filter((h) => h.grossStrokes > 0);
      const playedPar = completedHoles.reduce((acc, h) => acc + h.par, 0);

      if (sc.thruHoles > 0) {
        toParGross = sc.totalGross - playedPar;
        if (sc.totalNet !== null) {
          toParNet = sc.totalNet - playedPar;
        }
      }

      return {
        golferId: sc.golferId,
        golferName: `${sc.golfer.firstName} ${sc.golfer.lastName}`,
        divisionId: sc.registration.division?.id || null,
        divisionName: sc.registration.division?.name || "Open Championship",
        thruHoles: sc.thruHoles,
        totalGross: sc.totalGross,
        toParGross,
        totalNet: sc.totalNet,
        toParNet,
        totalStableford: sc.totalStableford,
        status: sc.status,
      };
    });

    // 4. Determine format: STABLEFORD, STROKE_PLAY
    let calculationFormat: "STROKE_PLAY" | "STABLEFORD" | "NET_STROKE_PLAY" = "STROKE_PLAY";
    if (tournament.format === "STABLEFORD") {
      calculationFormat = "STABLEFORD";
    }

    const rankedStandings = calculateLeaderboardRankings(competitorEntries, calculationFormat);

    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        slug: tournament.slug,
        format: tournament.format,
        status: tournament.status,
        hostClub: tournament.hostClub?.name || "Host Club",
        divisions: tournament.divisions,
        rounds: tournament.rounds.map((r) => ({
          id: r.id,
          roundNumber: r.roundNumber,
          name: r.name,
          date: r.roundDate,
          isCompleted: r.isCompleted,
        })),
      },
      currentRound: targetRound
        ? {
            id: targetRound.id,
            roundNumber: targetRound.roundNumber,
            name: targetRound.name,
            courseName: targetRound.course?.name || "Championship Course",
            par: targetRound.course?.par || 72,
          }
        : null,
      leaderboard: rankedStandings,
    });
  } catch (err: any) {
    console.error("Leaderboard API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
