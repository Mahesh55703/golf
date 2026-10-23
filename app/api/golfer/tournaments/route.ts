import { NextRequest, NextResponse } from "next/server";
import { getCurrentGolfer } from "@/lib/golfer-auth";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const golfer = await getCurrentGolfer();
  if (!golfer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("tab") || "upcoming"; // upcoming | in_progress | past

  const registrations = await prisma.registration.findMany({
    where: { golferId: golfer.id },
    include: {
      tournament: {
        include: {
          hostClub: { select: { name: true, city: true, state: true } },
          rounds: {
            orderBy: { roundNumber: "asc" },
            include: {
              scorecards: {
                where: { golferId: golfer.id },
              },
            },
          },
        },
      },
      division: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { registeredAt: "desc" },
  });

  const now = new Date();

  const formatted = registrations.map((reg) => {
    const t = reg.tournament;
    const isCancelled = reg.status === RegistrationStatus.CANCELLED || t.status === "CANCELLED";
    const isInProgress = !isCancelled && t.status === "IN_PROGRESS";
    const isPast = !isCancelled && !isInProgress && (t.status === "FINALIZED" || new Date(t.endDate) < now);
    const isUpcoming = !isCancelled && !isInProgress && !isPast;

    let category: "upcoming" | "in_progress" | "past" | "cancelled" = "upcoming";
    if (isCancelled) category = "cancelled";
    else if (isInProgress) category = "in_progress";
    else if (isPast) category = "past";

    // Extract scorecards if present
    const roundScores = t.rounds.map((r) => {
      const sc = r.scorecards[0];
      return {
        roundNumber: r.roundNumber,
        roundName: r.name,
        roundDate: r.roundDate,
        isCompleted: r.isCompleted,
        isScoringLive: r.isScoringLive,
        scorecard: sc ? {
          id: sc.id,
          totalGross: sc.totalGross,
          totalNet: sc.totalNet,
          thruHoles: sc.thruHoles,
          isCompleted: sc.isCompleted,
          status: sc.status,
        } : null,
      };
    });

    return {
      id: reg.id,
      referenceNumber: reg.referenceNumber,
      status: reg.status,
      paymentStatus: reg.paymentStatus,
      entryFeePaid: Number(reg.entryFeePaid),
      currency: reg.currency,
      registeredAt: reg.registeredAt,
      cancelledAt: reg.cancelledAt,
      handicapSnapshot: reg.handicapSnapshot ? Number(reg.handicapSnapshot) : null,
      category,
      division: reg.division ? {
        id: reg.division.id,
        name: reg.division.name,
      } : { id: "open", name: "Open Championship" },
      tournament: {
        id: t.id,
        name: t.name,
        slug: t.slug,
        startDate: t.startDate,
        endDate: t.endDate,
        format: t.format,
        status: t.status,
        hostClub: t.hostClub?.name || "Official Venue",
        location: [t.hostClub?.city, t.hostClub?.state].filter(Boolean).join(", "),
      },
      rounds: roundScores,
      latestPayment: reg.payments[0] ? {
        referenceNumber: reg.payments[0].referenceNumber,
        amount: Number(reg.payments[0].amount),
        currency: reg.payments[0].currency,
        status: reg.payments[0].status,
        paidAt: reg.payments[0].paidAt,
      } : null,
    };
  });

  return NextResponse.json({
    tournaments: formatted,
    counts: {
      upcoming: formatted.filter((f) => f.category === "upcoming").length,
      in_progress: formatted.filter((f) => f.category === "in_progress").length,
      past: formatted.filter((f) => f.category === "past").length,
      cancelled: formatted.filter((f) => f.category === "cancelled").length,
    },
  });
}
