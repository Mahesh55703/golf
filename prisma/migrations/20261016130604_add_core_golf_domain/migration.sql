-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('STROKE_PLAY', 'STABLEFORD', 'MATCH_PLAY', 'SCRAMBLE', 'BETTER_BALL');

-- CreateEnum
CREATE TYPE "TournamentAccess" AS ENUM ('PUBLIC', 'MEMBERS_ONLY', 'INVITATIONAL');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'SCORING_REVIEW', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'WAITLISTED', 'WITHDRAWN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'WAIVED', 'FREE_ENTRY');

-- CreateEnum
CREATE TYPE "GenderCategory" AS ENUM ('MEN', 'WOMEN', 'ALL');

-- CreateEnum
CREATE TYPE "HandicapStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'SELF_DECLARED');

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "heroImageUrl" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolfCourse" (
    "id" TEXT NOT NULL,
    "clubId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "holesCount" INTEGER NOT NULL DEFAULT 18,
    "par" INTEGER NOT NULL DEFAULT 72,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GolfCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseHole" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "par" INTEGER NOT NULL DEFAULT 4,
    "strokeIndex" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseHole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeeSet" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT,
    "gender" "GenderCategory" NOT NULL DEFAULT 'ALL',
    "courseRating" DECIMAL(4,1) NOT NULL,
    "slopeRating" INTEGER NOT NULL,
    "totalYardage" INTEGER,
    "totalMeters" INTEGER,
    "par" INTEGER NOT NULL DEFAULT 72,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeeSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeeHoleDistance" (
    "id" TEXT NOT NULL,
    "teeSetId" TEXT NOT NULL,
    "holeId" TEXT NOT NULL,
    "yardage" INTEGER,
    "meters" INTEGER,

    CONSTRAINT "TeeHoleDistance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "hostClubId" TEXT,
    "defaultCourseId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "format" "TournamentFormat" NOT NULL DEFAULT 'STROKE_PLAY',
    "access" "TournamentAccess" NOT NULL DEFAULT 'PUBLIC',
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "entryFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fieldCapacity" INTEGER NOT NULL DEFAULT 120,
    "registrationOpenAt" TIMESTAMP(3),
    "registrationCloseAt" TIMESTAMP(3),
    "handicapRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxHandicapLimit" DECIMAL(4,1),
    "heroImageUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "rulesDocumentUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "teeSetId" TEXT,
    "minHandicap" DECIMAL(4,1),
    "maxHandicap" DECIMAL(4,1),
    "gender" "GenderCategory" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "courseId" TEXT,
    "teeSetId" TEXT,
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "roundDate" TIMESTAMP(3) NOT NULL,
    "isScoringLive" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolferProfile" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "homeClub" TEXT,
    "handicapIndex" DECIMAL(4,1),
    "handicapNetworkId" TEXT,
    "handicapStatus" "HandicapStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GolferProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,
    "divisionId" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "entryFeePaid" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "handicapSnapshot" DECIMAL(4,1),
    "notes" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "Club_slug_idx" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "Club_isActive_idx" ON "Club"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GolfCourse_slug_key" ON "GolfCourse"("slug");

-- CreateIndex
CREATE INDEX "GolfCourse_clubId_idx" ON "GolfCourse"("clubId");

-- CreateIndex
CREATE INDEX "GolfCourse_slug_idx" ON "GolfCourse"("slug");

-- CreateIndex
CREATE INDEX "CourseHole_courseId_idx" ON "CourseHole"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseHole_courseId_holeNumber_key" ON "CourseHole"("courseId", "holeNumber");

-- CreateIndex
CREATE INDEX "TeeSet_courseId_idx" ON "TeeSet"("courseId");

-- CreateIndex
CREATE INDEX "TeeHoleDistance_teeSetId_idx" ON "TeeHoleDistance"("teeSetId");

-- CreateIndex
CREATE INDEX "TeeHoleDistance_holeId_idx" ON "TeeHoleDistance"("holeId");

-- CreateIndex
CREATE UNIQUE INDEX "TeeHoleDistance_teeSetId_holeId_key" ON "TeeHoleDistance"("teeSetId", "holeId");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

-- CreateIndex
CREATE INDEX "Tournament_slug_idx" ON "Tournament"("slug");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_startDate_idx" ON "Tournament"("startDate");

-- CreateIndex
CREATE INDEX "Tournament_hostClubId_idx" ON "Tournament"("hostClubId");

-- CreateIndex
CREATE INDEX "Division_tournamentId_idx" ON "Division"("tournamentId");

-- CreateIndex
CREATE INDEX "Round_tournamentId_idx" ON "Round"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_tournamentId_roundNumber_key" ON "Round"("tournamentId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GolferProfile_email_key" ON "GolferProfile"("email");

-- CreateIndex
CREATE INDEX "GolferProfile_email_idx" ON "GolferProfile"("email");

-- CreateIndex
CREATE INDEX "GolferProfile_handicapIndex_idx" ON "GolferProfile"("handicapIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_referenceNumber_key" ON "Registration"("referenceNumber");

-- CreateIndex
CREATE INDEX "Registration_tournamentId_idx" ON "Registration"("tournamentId");

-- CreateIndex
CREATE INDEX "Registration_golferId_idx" ON "Registration"("golferId");

-- CreateIndex
CREATE INDEX "Registration_status_idx" ON "Registration"("status");

-- CreateIndex
CREATE INDEX "Registration_paymentStatus_idx" ON "Registration"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_tournamentId_golferId_status_key" ON "Registration"("tournamentId", "golferId", "status");

-- AddForeignKey
ALTER TABLE "GolfCourse" ADD CONSTRAINT "GolfCourse_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseHole" ADD CONSTRAINT "CourseHole_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "GolfCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeeSet" ADD CONSTRAINT "TeeSet_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "GolfCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeeHoleDistance" ADD CONSTRAINT "TeeHoleDistance_teeSetId_fkey" FOREIGN KEY ("teeSetId") REFERENCES "TeeSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeeHoleDistance" ADD CONSTRAINT "TeeHoleDistance_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "CourseHole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_hostClubId_fkey" FOREIGN KEY ("hostClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_defaultCourseId_fkey" FOREIGN KEY ("defaultCourseId") REFERENCES "GolfCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_teeSetId_fkey" FOREIGN KEY ("teeSetId") REFERENCES "TeeSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "GolfCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_teeSetId_fkey" FOREIGN KEY ("teeSetId") REFERENCES "TeeSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "GolferProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;
