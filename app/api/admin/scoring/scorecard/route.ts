import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { z } from "zod";
import { ScorecardStatus } from "@prisma/client";
import { evaluateScorecard } from "@/lib/scoring";

const SaveScorecardSchema = z.object({
  scorecardId: z.string().optional(),
  roundId: z.string().min(1, "Round ID is required"),
  golferId: z.string().min(1, "Golfer ID is required"),
  registrationId: z.string().min(1, "Registration ID is required"),
  courseId: z.string().optional().nullable(),
  teeSetId: z.string().optional().nullable(),
  holeScores: z.array(
    z.object({
      holeNumber: z.number().int().min(1).max(18),
      par: z.number().int().min(3).max(6).default(4),
      strokeIndex: z.number().int().min(1).max(18).default(1),
      grossStrokes: z.number().int().min(1).max(25),
      putts: z.number().int().min(0).max(10).optional().nullable(),
      fairwayHit: z.boolean().optional().nullable(),
      greenInRegulation: z.boolean().optional().nullable(),
    })
  ),
  isSubmitting: z.boolean().default(false),
});

// POST /api/admin/scoring/scorecard - Enter or update hole scores
export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(admin.role, "CONTENT_MANAGER")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions to enter scores" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = SaveScorecardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const {
      roundId,
      golferId,
      registrationId,
      courseId,
      teeSetId,
      holeScores,
      isSubmitting,
    } = parsed.data;

    // Concurrency-safe atomic transaction
    const scorecard = await prisma.$transaction(async (tx) => {
      // 1. Fetch round and registration
      const [round, registration] = await Promise.all([
        tx.round.findUnique({
          where: { id: roundId },
          include: {
            tournament: true,
            course: { include: { holes: true } },
          },
        }),
        tx.registration.findUnique({
          where: { id: registrationId },
          include: { golfer: true },
        }),
      ]);

      if (!round || !registration) {
        throw new Error("Round or Registration not found.");
      }

      // 2. Fetch existing scorecard if any
      let existing = await tx.scorecard.findUnique({
        where: {
          roundId_golferId: {
            roundId,
            golferId,
          },
        },
        include: { holeScores: true },
      });

      // A verified scorecard cannot be modified without un-verifying
      if (existing && existing.status === ScorecardStatus.VERIFIED && !hasPermission(admin.role, "PLATFORM_ADMIN")) {
        throw new Error("Scorecard is VERIFIED and locked. Platform Admin required to make corrections.");
      }

      // 3. Evaluate scorecard using scoring engine
      const effectiveCourseHoles = round.course?.holes || [];
      const holeInfoList = effectiveCourseHoles.length > 0
        ? effectiveCourseHoles.map((h) => ({
            holeNumber: h.holeNumber,
            par: h.par,
            strokeIndex: h.strokeIndex,
          }))
        : Array.from({ length: 18 }, (_, i) => ({
            holeNumber: i + 1,
            par: (i % 3 === 0) ? 3 : (i % 3 === 1) ? 4 : 5,
            strokeIndex: i + 1,
          }));

      const playingHandicap = registration.handicapSnapshot !== null
        ? Number(registration.handicapSnapshot)
        : registration.golfer.handicapIndex !== null
        ? Number(registration.golfer.handicapIndex)
        : null;

      const summary = evaluateScorecard(holeInfoList, holeScores, playingHandicap);

      let newStatus: ScorecardStatus = existing ? existing.status : ScorecardStatus.IN_PROGRESS;
      if (isSubmitting) {
        newStatus = ScorecardStatus.SUBMITTED;
      }

      // 4. Upsert Scorecard record
      const savedScorecard = await tx.scorecard.upsert({
        where: {
          roundId_golferId: {
            roundId,
            golferId,
          },
        },
        update: {
          courseId: courseId || round.courseId,
          teeSetId: teeSetId || round.teeSetId,
          status: newStatus,
          totalGross: summary.totalGross,
          totalNet: summary.totalNet,
          totalStableford: summary.totalStableford,
          thruHoles: summary.thruHoles,
          isCompleted: summary.isComplete,
          submittedAt: isSubmitting ? new Date() : existing?.submittedAt,
          submittedBy: isSubmitting ? admin.name : existing?.submittedBy,
        },
        create: {
          roundId,
          golferId,
          registrationId,
          courseId: courseId || round.courseId,
          teeSetId: teeSetId || round.teeSetId,
          status: newStatus,
          totalGross: summary.totalGross,
          totalNet: summary.totalNet,
          totalStableford: summary.totalStableford,
          thruHoles: summary.thruHoles,
          isCompleted: summary.isComplete,
          submittedAt: isSubmitting ? new Date() : null,
          submittedBy: isSubmitting ? admin.name : null,
        },
      });

      // 5. Upsert Hole Scores and record audit logs
      for (const hs of summary.holeBreakdown) {
        if (hs.grossStrokes > 0) {
          const prevScore = existing?.holeScores.find((h) => h.holeNumber === hs.holeNumber);

          await tx.holeScore.upsert({
            where: {
              scorecardId_holeNumber: {
                scorecardId: savedScorecard.id,
                holeNumber: hs.holeNumber,
              },
            },
            update: {
              par: hs.par,
              strokeIndex: hs.strokeIndex,
              grossStrokes: hs.grossStrokes,
              netStrokes: hs.netStrokes,
              stablefordPoints: hs.stablefordPoints,
            },
            create: {
              scorecardId: savedScorecard.id,
              holeNumber: hs.holeNumber,
              par: hs.par,
              strokeIndex: hs.strokeIndex,
              grossStrokes: hs.grossStrokes,
              netStrokes: hs.netStrokes,
              stablefordPoints: hs.stablefordPoints,
            },
          });

          // Log audit entry if score changed
          if (prevScore && prevScore.grossStrokes !== hs.grossStrokes) {
            await tx.scorecardAuditLog.create({
              data: {
                scorecardId: savedScorecard.id,
                adminUserId: admin.id,
                action: "SCORE_UPDATED",
                holeNumber: hs.holeNumber,
                previousValue: prevScore.grossStrokes.toString(),
                newValue: hs.grossStrokes.toString(),
                reason: "Scorecard revision during entry",
              },
            });
          }
        }
      }

      if (isSubmitting) {
        await tx.scorecardAuditLog.create({
          data: {
            scorecardId: savedScorecard.id,
            adminUserId: admin.id,
            action: "SUBMITTED",
            reason: `Scorecard submitted with total gross ${summary.totalGross} across ${summary.thruHoles} holes`,
          },
        });
      }

      return savedScorecard;
    });

    return NextResponse.json({
      success: true,
      message: isSubmitting ? "Scorecard submitted successfully for review." : "Hole scores saved.",
      scorecard,
    });
  } catch (err: any) {
    console.error("Score entry API error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// GET /api/admin/scoring/scorecard?roundId=...&golferId=...
export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get("roundId");
    const golferId = searchParams.get("golferId");

    if (!roundId || !golferId) {
      return NextResponse.json({ error: "roundId and golferId are required" }, { status: 400 });
    }

    const scorecard = await prisma.scorecard.findUnique({
      where: {
        roundId_golferId: {
          roundId,
          golferId,
        },
      },
      include: {
        holeScores: {
          orderBy: { holeNumber: "asc" },
        },
        auditLogs: {
          include: { adminUser: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ scorecard });
  } catch (err: any) {
    console.error("GET scorecard error:", err);
    return NextResponse.json({ error: "Failed to fetch scorecard" }, { status: 500 });
  }
}
