-- CreateEnum
CREATE TYPE "ScorecardStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'CORRECTION_REQUIRED');

-- CreateTable
CREATE TABLE "Scorecard" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "courseId" TEXT,
    "teeSetId" TEXT,
    "status" "ScorecardStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "totalGross" INTEGER NOT NULL DEFAULT 0,
    "totalNet" INTEGER,
    "totalStableford" INTEGER,
    "thruHoles" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verifiedAdminUserId" TEXT,
    "correctionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoleScore" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "par" INTEGER NOT NULL DEFAULT 4,
    "strokeIndex" INTEGER NOT NULL DEFAULT 1,
    "grossStrokes" INTEGER NOT NULL,
    "netStrokes" INTEGER,
    "stablefordPoints" INTEGER,
    "putts" INTEGER,
    "fairwayHit" BOOLEAN,
    "greenInRegulation" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoleScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorecardAuditLog" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "adminUserId" TEXT,
    "action" TEXT NOT NULL,
    "holeNumber" INTEGER,
    "previousValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScorecardAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionResult" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "divisionId" TEXT,
    "golferId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "isTied" BOOLEAN NOT NULL DEFAULT false,
    "totalGross" INTEGER NOT NULL DEFAULT 0,
    "totalNet" INTEGER,
    "totalStableford" INTEGER,
    "toPar" INTEGER NOT NULL DEFAULT 0,
    "roundsPlayed" INTEGER NOT NULL DEFAULT 1,
    "isOfficial" BOOLEAN NOT NULL DEFAULT true,
    "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scorecard_roundId_idx" ON "Scorecard"("roundId");

-- CreateIndex
CREATE INDEX "Scorecard_golferId_idx" ON "Scorecard"("golferId");

-- CreateIndex
CREATE INDEX "Scorecard_registrationId_idx" ON "Scorecard"("registrationId");

-- CreateIndex
CREATE INDEX "Scorecard_status_idx" ON "Scorecard"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Scorecard_roundId_golferId_key" ON "Scorecard"("roundId", "golferId");

-- CreateIndex
CREATE INDEX "HoleScore_scorecardId_idx" ON "HoleScore"("scorecardId");

-- CreateIndex
CREATE UNIQUE INDEX "HoleScore_scorecardId_holeNumber_key" ON "HoleScore"("scorecardId", "holeNumber");

-- CreateIndex
CREATE INDEX "ScorecardAuditLog_scorecardId_idx" ON "ScorecardAuditLog"("scorecardId");

-- CreateIndex
CREATE INDEX "ScorecardAuditLog_action_idx" ON "ScorecardAuditLog"("action");

-- CreateIndex
CREATE INDEX "CompetitionResult_tournamentId_idx" ON "CompetitionResult"("tournamentId");

-- CreateIndex
CREATE INDEX "CompetitionResult_divisionId_idx" ON "CompetitionResult"("divisionId");

-- CreateIndex
CREATE INDEX "CompetitionResult_rank_idx" ON "CompetitionResult"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionResult_tournamentId_divisionId_golferId_key" ON "CompetitionResult"("tournamentId", "divisionId", "golferId");

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "GolferProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "GolfCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_teeSetId_fkey" FOREIGN KEY ("teeSetId") REFERENCES "TeeSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_verifiedAdminUserId_fkey" FOREIGN KEY ("verifiedAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoleScore" ADD CONSTRAINT "HoleScore_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardAuditLog" ADD CONSTRAINT "ScorecardAuditLog_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardAuditLog" ADD CONSTRAINT "ScorecardAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionResult" ADD CONSTRAINT "CompetitionResult_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionResult" ADD CONSTRAINT "CompetitionResult_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionResult" ADD CONSTRAINT "CompetitionResult_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "GolferProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
