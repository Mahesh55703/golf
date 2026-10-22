import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const referenceNumber = searchParams.get("referenceNumber");
    const registrationId = searchParams.get("registrationId");

    if (!referenceNumber && !registrationId) {
      return NextResponse.json(
        { error: "referenceNumber or registrationId is required" },
        { status: 400 }
      );
    }

    const registration = await prisma.registration.findFirst({
      where: {
        OR: [
          referenceNumber ? { referenceNumber } : {},
          registrationId ? { id: registrationId } : {},
        ],
      },
      include: {
        tournament: {
          select: {
            name: true,
            entryFee: true,
            currency: true,
            hostClub: { select: { name: true } },
          },
        },
        division: { select: { name: true } },
        golfer: { select: { firstName: true, lastName: true, email: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    return NextResponse.json({
      registration: {
        id: registration.id,
        referenceNumber: registration.referenceNumber,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        entryFeePaid: Number(registration.entryFeePaid),
        currency: registration.currency,
        registeredAt: registration.registeredAt,
        tournamentName: registration.tournament.name,
        hostClub: registration.tournament.hostClub?.name || "Host Club",
        divisionName: registration.division?.name || "Open Championship",
        golferName: `${registration.golfer.firstName} ${registration.golfer.lastName}`,
        golferEmail: registration.golfer.email,
        payments: registration.payments.map((p) => ({
          referenceNumber: p.referenceNumber,
          provider: p.provider,
          status: p.status,
          amount: Number(p.amount),
          currency: p.currency,
          paidAt: p.paidAt,
          refundedAt: p.refundedAt,
          providerOrderId: p.providerOrderId,
          providerPaymentId: p.providerPaymentId,
        })),
      },
    });
  } catch (error: any) {
    console.error("Payment status error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve payment status", details: error.message },
      { status: 500 }
    );
  }
}
