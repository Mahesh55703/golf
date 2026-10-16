const {
  calculateStrokesReceived,
  calculateStablefordPoints,
  evaluateScorecard,
  calculateLeaderboardRankings,
} = require("../lib/scoring");

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

console.log("=========================================");
console.log("   GOLFPULSE SCORING ENGINE UNIT TESTS");
console.log("=========================================");

// 1. Strokes Received calculation (USGA / WHS handicap distribution)
// Handicap 10: receives 1 stroke on stroke indexes 1..10, 0 strokes on 11..18
assert(calculateStrokesReceived(10, 1) === 1, "HDCP 10 gets 1 stroke on SI 1");
assert(calculateStrokesReceived(10, 10) === 1, "HDCP 10 gets 1 stroke on SI 10");
assert(calculateStrokesReceived(10, 11) === 0, "HDCP 10 gets 0 strokes on SI 11");

// Handicap 20: receives 2 strokes on SI 1 and 2, 1 stroke on SI 3..18
assert(calculateStrokesReceived(20, 1) === 2, "HDCP 20 gets 2 strokes on SI 1");
assert(calculateStrokesReceived(20, 2) === 2, "HDCP 20 gets 2 strokes on SI 2");
assert(calculateStrokesReceived(20, 3) === 1, "HDCP 20 gets 1 stroke on SI 3");

// Plus handicap +2: gives back 1 stroke on SI 18 and SI 17
assert(calculateStrokesReceived(-2, 18) === -1, "Plus 2 HDCP gives 1 stroke on SI 18");
assert(calculateStrokesReceived(-2, 17) === -1, "Plus 2 HDCP gives 1 stroke on SI 17");
assert(calculateStrokesReceived(-2, 16) === 0, "Plus 2 HDCP gives 0 strokes on SI 16");
console.log("1. Strokes received allocation tests: PASSED ✅");

// 2. Stableford point calculations on Par 4
assert(calculateStablefordPoints(2, 4) === 4, "Eagle on Par 4 = 4 points");
assert(calculateStablefordPoints(3, 4) === 3, "Birdie on Par 4 = 3 points");
assert(calculateStablefordPoints(4, 4) === 2, "Par on Par 4 = 2 points");
assert(calculateStablefordPoints(5, 4) === 1, "Bogey on Par 4 = 1 point");
assert(calculateStablefordPoints(6, 4) === 0, "Double Bogey on Par 4 = 0 points");
assert(calculateStablefordPoints(7, 4) === 0, "Triple Bogey on Par 4 = 0 points");
console.log("2. Stableford points calculation tests: PASSED ✅");

// 3. Full 18-hole scorecard evaluation
const holes = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: (i % 3 === 0) ? 3 : (i % 3 === 1) ? 4 : 5, // 6 par 3s, 6 par 4s, 6 par 5s = par 72
  strokeIndex: i + 1,
}));

// Golfer plays 18 holes shooting par on each
const parScores = holes.map((h) => ({
  holeNumber: h.holeNumber,
  grossStrokes: h.par,
}));

const evalScratch = evaluateScorecard(holes, parScores, 0);
assert(evalScratch.totalGross === 72, "Total gross for par round is 72");
assert(evalScratch.toParGross === 0, "To par gross is 0 (E)");
assert(evalScratch.totalNet === 72, "Total net for 0 handicap is 72");
assert(evalScratch.totalStableford === 36, "Total Stableford points for even par is 36 (2 pts * 18)");
assert(evalScratch.isComplete === true, "18 holes completed is marked complete");

// Golfer with 18 handicap shooting 90 (1 over par on every hole)
const bogeyScores = holes.map((h) => ({
  holeNumber: h.holeNumber,
  grossStrokes: h.par + 1,
}));

const evalHandicap18 = evaluateScorecard(holes, bogeyScores, 18);
assert(evalHandicap18.totalGross === 90, "Total gross is 90");
assert(evalHandicap18.totalNet === 72, "Total net with 18 HDCP is 72 (even par net)");
assert(evalHandicap18.totalStableford === 36, "36 points for net par round");
console.log("3. Full 18-hole scorecard evaluation tests: PASSED ✅");

// 4. Incomplete round test (front 9 completed)
const front9Scores = parScores.slice(0, 9);
const evalFront9 = evaluateScorecard(holes, front9Scores, 0);
assert(evalFront9.thruHoles === 9, "Thru holes is 9");
assert(evalFront9.isComplete === false, "Round is marked incomplete");
assert(evalFront9.totalGross > 0, "Gross score calculated for completed holes");
console.log("4. Incomplete round evaluation tests: PASSED ✅");

// 5. Leaderboard ranking and tie handling tests
const competitors = [
  { golferId: "g1", golferName: "Alice", thruHoles: 18, totalGross: 70, toParGross: -2, totalNet: 68, toParNet: -4, totalStableford: 40, status: "VERIFIED" },
  { golferId: "g2", golferName: "Bob", thruHoles: 18, totalGross: 72, toParGross: 0, totalNet: 70, toParNet: -2, totalStableford: 36, status: "VERIFIED" },
  { golferId: "g3", golferName: "Charlie", thruHoles: 18, totalGross: 72, toParGross: 0, totalNet: 72, toParNet: 0, totalStableford: 36, status: "VERIFIED" },
  { golferId: "g4", golferName: "Diana", thruHoles: 18, totalGross: 75, toParGross: 3, totalNet: 71, toParNet: -1, totalStableford: 33, status: "VERIFIED" },
];

const grossRankings = calculateLeaderboardRankings(competitors, "STROKE_PLAY");
assert(grossRankings[0].golferName === "Alice" && grossRankings[0].rank === 1, "Alice ranks 1st (-2)");
assert(grossRankings[1].rank === 2 && grossRankings[1].isTied === true, "Bob is tied for 2nd");
assert(grossRankings[2].rank === 2 && grossRankings[2].isTied === true, "Charlie is tied for 2nd");
assert(grossRankings[3].rank === 4 && grossRankings[3].isTied === false, "Diana ranks 4th after 2-way tie for 2nd");
console.log("5. Leaderboard tie-breaking tests: PASSED ✅");

console.log("=========================================\n");
