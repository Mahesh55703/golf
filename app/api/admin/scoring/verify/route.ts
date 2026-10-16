import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { z } from "zod";
import { ScorecardStatus } from "@prisma/client";

const VerifyScorecardSchema = z.object({
  scorecardId: z.string().min(1, "Scorecard ID is required"),
  action: z.enum(["VERIFY", "REQUEST_CORRECTION", "UNLOCK"]),
  notes: z.string().max(500).optional().nullable(),
});

// POST /api/admin/scoring/verify - Verify or return scorecard for correction
export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(admin.role, "PLATFORM_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Platform Admin required to verify scorecards" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = VerifyScorecardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const { scorecardId, action, notes } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const scorecard = await tx.scorecard.findUnique({
        where: { id: scorecardId },
        include: {
          golfer: true,
          round: { include: { tournament: true } },
          holeScores: true,
        },
      });

      if (!scorecard) {
        throw new Error("Scorecard not found.");
      }

      let newStatus: ScorecardStatus = scorecard.status;

      if (action === "VERIFY") {
        newStatus = ScorecardStatus.VERIFIED;
        await tx.scorecard.update({
          where: { id: scorecardId },
          data: {
            status: newStatus,
            verifiedAt: new Date(),
            verifiedBy: admin.name,
            verifiedAdminUserId: admin.id,
            correctionNotes: null,
          },
        });

        await tx.scorecardAuditLog.create({
          data: {
            scorecardId,
            adminUserId: admin.id,
            action: "VERIFIED",
            reason: notes || `Official scorecard verified by ${admin.name}`,
          },
        });
      } else if (action === "REQUEST_CORRECTION") {
        newStatus = ScorecardStatus.CORRECTION_REQUIRED;
        await tx.scorecard.update({
          where: { id: scorecardId },
          data: {
            status: newStatus,
            verifiedAt: null,
            verifiedBy: null,
            correctionNotes: notes || "Correction requested by committee",
          },
        });

        await tx.scorecardAuditLog.create({
          data: {
            scorecardId,
            adminUserId: admin.id,
            action: "CORRECTION_REQUESTED",
            reason: notes || "Returned to scorer for review",
          },
        });
      } else if (action === "UNLOCK") {
        newStatus = ScorecardStatus.UNDER_REVIEW;
        await tx.scorecard.update({
          where: { id: scorecardId },
          data: {
            status: newStatus,
            verifiedAt: null,
            verifiedBy: null,
          },
        });

        await tx.scorecardAuditLog.create({
          data: {
            scorecardId,
            adminUserId: admin.id,
            action: "UNLOCKED",
            reason: notes || `Scorecard unlocked for edits by ${admin.name}`,
          },
        });
      }

      return { scorecardId, status: newStatus };
    });

    return NextResponse.json({
      success: true,
      message: `Scorecard status successfully updated to ${result.status}.`,
      result,
    });
  } catch (err: any) {
    console.error("Scorecard verify error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
