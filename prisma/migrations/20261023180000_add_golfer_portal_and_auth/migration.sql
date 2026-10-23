-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REGISTRATION_CONFIRMED', 'PAYMENT_RECEIVED', 'TOURNAMENT_UPCOMING', 'TEE_TIME_PUBLISHED', 'SCORECARD_VERIFIED', 'RESULTS_PUBLISHED', 'GENERAL');

-- AlterTable
ALTER TABLE "GolferProfile" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "GolferSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "GolferSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolferActivationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GolferActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolferPasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GolferPasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolferNotification" (
    "id" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GolferNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GolferSession_token_key" ON "GolferSession"("token");

-- CreateIndex
CREATE INDEX "GolferSession_golferId_idx" ON "GolferSession"("golferId");

-- CreateIndex
CREATE INDEX "GolferSession_token_idx" ON "GolferSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "GolferActivationToken_tokenHash_key" ON "GolferActivationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "GolferActivationToken_golferId_idx" ON "GolferActivationToken"("golferId");

-- CreateIndex
CREATE INDEX "GolferActivationToken_tokenHash_idx" ON "GolferActivationToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "GolferPasswordResetToken_tokenHash_key" ON "GolferPasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "GolferPasswordResetToken_golferId_idx" ON "GolferPasswordResetToken"("golferId");

-- CreateIndex
CREATE INDEX "GolferPasswordResetToken_tokenHash_idx" ON "GolferPasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "GolferNotification_golferId_idx" ON "GolferNotification"("golferId");

-- CreateIndex
CREATE INDEX "GolferNotification_isRead_idx" ON "GolferNotification"("isRead");

-- CreateIndex
CREATE INDEX "GolferNotification_createdAt_idx" ON "GolferNotification"("createdAt");

-- CreateIndex
CREATE INDEX "GolferProfile_isEmailVerified_idx" ON "GolferProfile"("isEmailVerified");

-- AddForeignKey
ALTER TABLE "GolferSession" ADD CONSTRAINT "GolferSession_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "GolferProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolferActivationToken" ADD CONSTRAINT "GolferActivationToken_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "GolferProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolferPasswordResetToken" ADD CONSTRAINT "GolferPasswordResetToken_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "GolferProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolferNotification" ADD CONSTRAINT "GolferNotification_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "GolferProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
