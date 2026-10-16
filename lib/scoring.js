/**
 * GolfPulse Scoring Engine
 * Deterministic, unit-tested golf scoring calculation algorithms:
 * - Gross stroke play
 * - Net stroke play with WHS handicap stroke distribution
 * - Stableford points
 * - Division standings and tie-breaking
 */

function calculateStrokesReceived(playingHandicap, strokeIndex) {
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

function calculateStablefordPoints(netStrokes, par) {
  if (netStrokes === null || netStrokes <= 0) {
    return null;
  }
  const diff = netStrokes - par;
  const points = 2 - diff;
  return Math.max(0, points);
}

function evaluateScorecard(holes, scores, playingHandicap) {
  let totalGross = 0;
  let totalNet = null;
  let totalStableford = null;
  let toParGross = 0;
  let toParNet = null;
  let thruHoles = 0;

  const scoreMap = new Map();
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

  const holeBreakdown = [];

  for (const h of holes) {
    const gross = scoreMap.get(h.holeNumber);

    if (gross !== undefined && gross > 0) {
      thruHoles++;
      totalGross += gross;
      toParGross += gross - h.par;

      let strokesReceived = 0;
      let net = null;
      let points = null;

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

function calculateLeaderboardRankings(entries, format = "STROKE_PLAY") {
  const sorted = [...entries].sort((a, b) => {
    if (format === "STABLEFORD") {
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
      if (a.toParGross !== b.toParGross) return a.toParGross - b.toParGross;
      return b.thruHoles - a.thruHoles;
    }
  });

  const ranked = [];
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateStrokesReceived,
    calculateStablefordPoints,
    evaluateScorecard,
    calculateLeaderboardRankings,
  };
}
