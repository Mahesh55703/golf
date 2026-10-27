import { NextRequest, NextResponse } from "next/server";
import { getCurrentGolfer } from "@/lib/golfer-auth";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus, PaymentStatus } from "@prisma/client";
import { initiateProviderRefund } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  try {
    const golfer = await getCurrentGolfer();
    if (!golfer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { registrationId, reason } = body;

    if (!registrationId) {
      return NextResponse.json({ error: "Registration ID is required" }, { status: 400 });
    }

    const registration = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        golferId: golfer.id,
      },
      include: {
        tournament: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!registration) {
      return NextResponse.json({ error: "Tournament registration not found" }, { status: 404 });
    }

    if (registration.status === RegistrationStatus.CANCELLED) {
      return NextResponse.json({ error: "This registration has already been cancelled" }, { status: 400 });
    }

    if (registration.tournament.status === "FINALIZED" || new Date(registration.tournament.endDate) < new Date()) {
      return NextResponse.json({ error: "Cannot withdraw from a completed tournament" }, { status: 400 });
    }

    const now = new Date();
    const isPaid = registration.paymentStatus === PaymentStatus.PAID;
    let refundInfo: any = null;

    if (isPaid) {
      try {
        refundInfo = await initiateProviderRefund({
          registrationId: registration.id,
          adminEmail: golfer.email,
          reason: reason && reason.trim().length >= 5 ? reason.trim() : "Golfer voluntary tournament withdrawal",
        });
      } catch (refundErr: any) {
        console.error("[Withdrawal] Refund processing error:", refundErr);
        return NextResponse.json(
          { error: `Unable to process automatic refund: ${refundErr.message || "Please contact tournament administration."}` },
          { status: 500 }
        );
      }
    }

    // Atomically cancel registration
    const updatedRegistration = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        status: RegistrationStatus.CANCELLED,
        cancelledAt: now,
        notes: [
          registration.notes || "",
          `[${now.toISOString()}] Golfer voluntary withdrawal: ${reason?.trim() || "No reason provided"}${isPaid ? ` (Refund ID: ${refundInfo?.refundId || "Processed"})` : ""}`,
        ].filter(Boolean).join(" | "),
      },
      include: {
        tournament: true,
        division: true,
      },
    });

    // Create in-app notification for golfer
    await prisma.golferNotification.create({
      data: {
        golferId: golfer.id,
        title: isPaid ? "Withdrawal & Refund Initiated" : "Tournament Withdrawal Confirmed",
        message: isPaid
          ? `You have withdrawn from ${registration.tournament.name}. A full refund of ${registration.entryFeePaid} ${registration.currency} has been initiated.`
          : `You have successfully withdrawn from ${registration.tournament.name}.`,
        type: "GENERAL",
        linkUrl: "/dashboard/tournaments",
      },
    });

    return NextResponse.json({
      success: true,
      message: isPaid
        ? `You have successfully withdrawn from ${registration.tournament.name}. A full refund of ${registration.entryFeePaid} ${registration.currency} has been initiated.`
        : `You have successfully withdrawn from ${registration.tournament.name}.`,
      registration: updatedRegistration,
      refund: refundInfo,
    });
  } catch (error: any) {
    console.error("[Withdrawal] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your withdrawal request." },
      { status: 500 }
    );
  }
}
