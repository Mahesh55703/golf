/**
 * GolfPulse Scoring Engine
 * Deterministic, unit-tested golf scoring calculation algorithms:
 * - Gross stroke play
 * - Net stroke play with WHS handicap stroke distribution
 * - Stableford points
 * - Division standings and tie-breaking
 */

export interface HoleInfo {
  holeNumber: number;
  par: number;
  strokeIndex: number; // 1 to 18
}

export interface HoleScoreInput {
  holeNumber: number;
  grossStrokes: number; // Shots taken
}

export interface CalculatedHoleScore {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  grossStrokes: number;
  strokesReceived: number;
  netStrokes: number | null;
  stablefordPoints: number | null;
  scoreDifferenceToPar: number; // e.g. -1 for birdie, 0 for par, +1 for bogey
}

export interface ScorecardSummary {
  totalGross: number;
  totalNet: number | null;
  totalStableford: number | null;
  toParGross: number;
  toParNet: number | null;
  thruHoles: number;
  isComplete: boolean;
  holeBreakdown: CalculatedHoleScore[];
}

/**
 * Calculates strokes received on a specific hole based on playing handicap and hole stroke index.
 * Follows standard USGA/WHS stroke allocation:
 * - A handicap of 10 receives 1 stroke on stroke indexes 1-10.
 * - A handicap of 20 receives 1 stroke on all 18 holes, plus an additional 2nd stroke on stroke indexes 1-2.
 * - Plus handicaps (+3) give strokes back on stroke index 18, 17, 16.
 */
export function calculateStrokesReceived(playingHandicap: number | null | undefined, strokeIndex: number): number {
  if (playingHandicap === null || playingHandicap === undefined || isNaN(playingHandicap)) {
    return 0;
  }

  const roundedHDCP = Math.round(playingHandicap);

  if (roundedHDCP >= 0) {
    const baseStrokes = Math.floor(roundedHDCP / 18);
    const remainder = roundedHDCP % 18;
    return baseStrokes + (strokeIndex <= remainder ? 1 : 0);
  } else {
    // Plus handicap (e.g. +2)
    const plusStrokes = Math.abs(roundedHDCP);
    const subtractStrokeThreshold = 18 - plusStrokes + 1;
    return strokeIndex >= subtractStrokeThreshold ? -1 : 0;
  }
}

/**
 * Calculates Stableford points for a single hole:
 * - Double Bogey or worse (Net Par + 2): 0 pts
 * - Bogey (Net Par + 1): 1 pt
 * - Par (Net Par): 2 pts
 * - Birdie (Net Par - 1): 3 pts
 * - Eagle (Net Par - 2): 4 pts
 * - Albatross (Net Par - 3): 5 pts
 */
export function calculateStablefordPoints(netStrokes: number | null, par: number): number | null {
  if (netStrokes === null || netStrokes <= 0) {
    return null;
  }
  const diff = netStrokes - par;
  const points = 2 - diff;
  return Math.max(0, points);
}

/**
 * Evaluates an entire scorecard of 18 holes.
 */
export function evaluateScorecard(
  holes: HoleInfo[],
  scores: HoleScoreInput[],
  playingHandicap?: number | null
): ScorecardSummary {
  let totalGross = 0;
  let totalNet: number | null = null;
  let totalStableford: number | null = null;
  let toParGross = 0;
  let toParNet: number | null = null;
  let thruHoles = 0;

  const scoreMap = new Map<number, number>();
  for (const s of scores) {
    if (s.grossStrokes > 0) {
      scoreMap.set(s.holeNumber, s.grossStrokes);
    }
  }

  const hasHandicap = playingHandicap !== null && playingHandicap !== undefined && !isNaN(playingHandicap);
  if (hasHandicap) {
    totalNet = 0;
    totalStableford = 0;
    toParNet = 0;
  }

  const holeBreakdown: CalculatedHoleScore[] = [];

  for (const h of holes) {
    const gross = scoreMap.get(h.holeNumber);

    if (gross !== undefined && gross > 0) {
      thruHoles++;
      totalGross += gross;
      toParGross += gross - h.par;

      let strokesReceived = 0;
      let net: number | null = null;
      let points: number | null = null;

      if (hasHandicap) {
        strokesReceived = calculateStrokesReceived(playingHandicap, h.strokeIndex);
        net = Math.max(1, gross - strokesReceived);
        totalNet = (totalNet || 0) + net;
        toParNet = (toParNet || 0) + (net - h.par);
        points = calculateStablefordPoints(net, h.par);
        totalStableford = (totalStableford || 0) + (points || 0);
      }

      holeBreakdown.push({
        holeNumber: h.holeNumber,
        par: h.par,
        strokeIndex: h.strokeIndex,
        grossStrokes: gross,
        strokesReceived,
        netStrokes: net,
        stablefordPoints: points,
        scoreDifferenceToPar: gross - h.par,
      });
    } else {
      // Incomplete hole
      holeBreakdown.push({
        holeNumber: h.holeNumber,
        par: h.par,
        strokeIndex: h.strokeIndex,
        grossStrokes: 0,
        strokesReceived: hasHandicap ? calculateStrokesReceived(playingHandicap, h.strokeIndex) : 0,
        netStrokes: null,
        stablefordPoints: null,
        scoreDifferenceToPar: 0,
      });
    }
  }

  return {
    totalGross,
    totalNet,
    totalStableford,
    toParGross,
    toParNet,
    thruHoles,
    isComplete: thruHoles === holes.length && holes.length > 0,
    holeBreakdown,
  };
}

/**
 * Calculates competitive leaderboard rankings with tie-breaking rules:
 * - Shared ties receive the same rank (e.g. T1, T1, 3).
 */
export interface CompetitorEntry {
  golferId: string;
  golferName: string;
  divisionId?: string | null;
  divisionName?: string | null;
  thruHoles: number;
  totalGross: number;
  toParGross: number;
  totalNet: number | null;
  toParNet: number | null;
  totalStableford: number | null;
  status: string; // Scorecard status
}

export interface RankedLeaderboardEntry extends CompetitorEntry {
  rank: number;
  isTied: boolean;
  formattedRank: string; // e.g. "1", "T2"
}

export function calculateLeaderboardRankings(
  entries: CompetitorEntry[],
  format: "STROKE_PLAY" | "STABLEFORD" | "NET_STROKE_PLAY" = "STROKE_PLAY"
): RankedLeaderboardEntry[] {
  // Sort according to format
  const sorted = [...entries].sort((a, b) => {
    // Players with more completed holes rank higher if tied on to-par
    if (format === "STABLEFORD") {
      // Highest points wins
      const ptsA = a.totalStableford ?? -999;
      const ptsB = b.totalStableford ?? -999;
      if (ptsB !== ptsA) return ptsB - ptsA;
      return b.thruHoles - a.thruHoles;
    } else if (format === "NET_STROKE_PLAY") {
      const netA = a.toParNet ?? 999;
      const netB = b.toParNet ?? 999;
      if (netA !== netB) return netA - netB;
      return b.thruHoles - a.thruHoles;
    } else {
      // Gross Stroke Play: lowest score to par wins
      if (a.toParGross !== b.toParGross) return a.toParGross - b.toParGross;
      return b.thruHoles - a.thruHoles;
    }
  });

  const ranked: RankedLeaderboardEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const prev = sorted[i - 1];

    let isTied = false;
    if (i > 0) {
      const isSameScore =
        format === "STABLEFORD"
          ? item.totalStableford === prev.totalStableford
          : format === "NET_STROKE_PLAY"
          ? item.toParNet === prev.toParNet
          : item.toParGross === prev.toParGross;

      if (isSameScore && item.thruHoles === prev.thruHoles) {
        isTied = true;
      }
    }

    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      const isSameScore =
        format === "STABLEFORD"
          ? item.totalStableford === next.totalStableford
          : format === "NET_STROKE_PLAY"
          ? item.toParNet === next.toParNet
          : item.toParGross === next.toParGross;

      if (isSameScore && item.thruHoles === next.thruHoles) {
        isTied = true;
      }
    }

    if (i === 0 || !isTied || (prev && (format === "STABLEFORD" ? item.totalStableford !== prev.totalStableford : item.toParGross !== prev.toParGross))) {
      currentRank = i + 1;
    }

    ranked.push({
      ...item,
      rank: currentRank,
      isTied,
      formattedRank: isTied ? `T${currentRank}` : `${currentRank}`,
    });
  }

  return ranked;
}
