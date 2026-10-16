import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { TournamentStatus, RegistrationStatus, PaymentStatus } from "@prisma/client";

const RegisterSchema = z.object({
  tournamentSlug: z.string().min(1, "Tournament is required"),
  divisionId: z.string().optional().nullable(),
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  email: z.string().email("Please enter a valid email address").max(120),
  phone: z.string().optional().nullable(),
  country: z.string().default("India"),
  homeClub: z.string().optional().nullable(),
  handicapIndex: z
    .number()
    .min(0, "Handicap cannot be negative")
    .max(54, "Maximum handicap allowed is 54.0")
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
});

function generateReferenceNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `GP-${year}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      tournamentSlug,
      divisionId,
      firstName,
      lastName,
      email,
      phone,
      country,
      homeClub,
      handicapIndex,
      notes,
    } = parsed.data;

    // Concurrency-safe atomic transaction with adequate timeout for serverless Neon pooler
    const result = await prisma.$transaction(
      async (tx) => {
      // 1. Fetch tournament with divisions and active registrations
      const tournament = await tx.tournament.findFirst({
        where: {
          OR: [{ slug: tournamentSlug }, { id: tournamentSlug }],
        },
        include: {
          divisions: true,
          hostClub: { select: { name: true, city: true, state: true } },
          _count: {
            select: {
              registrations: {
                where: {
                  status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING] },
                },
              },
            },
          },
        },
      });

      if (!tournament) {
        throw new Error("TOURNAMENT_NOT_FOUND");
      }

      // 2. Validate tournament status
      if (tournament.status === TournamentStatus.CANCELLED) {
        throw new Error("TOURNAMENT_CANCELLED");
      }

      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        throw new Error("REGISTRATION_NOT_OPEN");
      }

      // 3. Validate registration deadline if set
      const now = new Date();
      if (tournament.registrationCloseAt && now > tournament.registrationCloseAt) {
        throw new Error("REGISTRATION_DEADLINE_PASSED");
      }

      if (tournament.registrationOpenAt && now < tournament.registrationOpenAt) {
        throw new Error("REGISTRATION_NOT_YET_OPEN");
      }

      // 4. Validate capacity
      const activeCount = tournament._count.registrations;
      if (activeCount >= tournament.fieldCapacity) {
        throw new Error("TOURNAMENT_CAPACITY_FULL");
      }

      // 5. Validate division if provided or required
      let validatedDivisionId: string | null = null;
      if (divisionId) {
        const division = tournament.divisions.find((d) => d.id === divisionId);
        if (!division) {
          throw new Error("INVALID_DIVISION");
        }

        // Validate division handicap rules if defined
        if (division.maxHandicap && handicapIndex !== null && handicapIndex !== undefined) {
          if (handicapIndex > Number(division.maxHandicap)) {
            throw new Error(`HANDICAP_EXCEEDS_DIVISION_MAX: Max is ${division.maxHandicap}`);
          }
        }
        if (division.minHandicap && handicapIndex !== null && handicapIndex !== undefined) {
          if (handicapIndex < Number(division.minHandicap)) {
            throw new Error(`HANDICAP_BELOW_DIVISION_MIN: Min is ${division.minHandicap}`);
          }
        }

        validatedDivisionId = division.id;
      } else if (tournament.divisions.length > 0) {
        // Default to the first division if not specified
        validatedDivisionId = tournament.divisions[0].id;
      }

      // 6. Validate tournament handicap requirement
      if (tournament.handicapRequired && (handicapIndex === null || handicapIndex === undefined)) {
        throw new Error("HANDICAP_INDEX_REQUIRED");
      }

      if (
        tournament.maxHandicapLimit !== null &&
        handicapIndex !== null &&
        handicapIndex !== undefined
      ) {
        if (handicapIndex > Number(tournament.maxHandicapLimit)) {
          throw new Error(
            `HANDICAP_EXCEEDS_LIMIT: Tournament limit is ${tournament.maxHandicapLimit}`
          );
        }
      }

      // 7. Find or create GolferProfile by email
      const normalizedEmail = email.trim().toLowerCase();
      let golfer = await tx.golferProfile.findUnique({
        where: { email: normalizedEmail },
      });

      if (!golfer) {
        golfer = await tx.golferProfile.create({
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            phone: phone ? phone.trim() : null,
            country: country.trim(),
            homeClub: homeClub ? homeClub.trim() : null,
            handicapIndex: handicapIndex !== null && handicapIndex !== undefined ? handicapIndex : null,
            handicapStatus: "SELF_DECLARED",
          },
        });
      } else {
        // Update profile if names or phone changed
        golfer = await tx.golferProfile.update({
          where: { id: golfer.id },
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone ? phone.trim() : golfer.phone,
            homeClub: homeClub ? homeClub.trim() : golfer.homeClub,
            handicapIndex:
              handicapIndex !== null && handicapIndex !== undefined
                ? handicapIndex
                : golfer.handicapIndex,
          },
        });
      }

      // 8. Prevent duplicate ACTIVE registration
      const existingActiveRegistration = await tx.registration.findFirst({
        where: {
          tournamentId: tournament.id,
          golferId: golfer.id,
          status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING] },
        },
      });

      if (existingActiveRegistration) {
        throw new Error("ALREADY_REGISTERED");
      }

      // 9. Generate unique reference number with retry
      let referenceNumber = generateReferenceNumber();
      let isUnique = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const existingRef = await tx.registration.findUnique({
          where: { referenceNumber },
        });
        if (!existingRef) {
          isUnique = true;
          break;
        }
        referenceNumber = generateReferenceNumber();
      }

      if (!isUnique) {
        referenceNumber = `GP-${Date.now().toString().slice(-6)}`;
      }

      // 10. Create Registration record
      const registration = await tx.registration.create({
        data: {
          referenceNumber,
          tournamentId: tournament.id,
          golferId: golfer.id,
          divisionId: validatedDivisionId,
          status: RegistrationStatus.CONFIRMED,
          paymentStatus: PaymentStatus.UNPAID, // Initial unpaid state until payment flow is connected
          entryFeePaid: tournament.entryFee,
          currency: tournament.currency || "USD",
          handicapSnapshot: handicapIndex !== null && handicapIndex !== undefined ? handicapIndex : null,
          notes: notes ? notes.trim() : null,
        },
        include: {
          tournament: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
              hostClub: { select: { name: true } },
            },
          },
          division: {
            select: {
              name: true,
            },
          },
          golfer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return registration;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    return NextResponse.json({
      success: true,
      message: "Registration successfully confirmed.",
      registration: {
        referenceNumber: result.referenceNumber,
        status: result.status,
        paymentStatus: result.paymentStatus,
        entryFee: Number(result.entryFeePaid),
        currency: result.currency,
        tournamentName: result.tournament.name,
        hostClub: result.tournament.hostClub?.name || "Host Club",
        divisionName: result.division?.name || "Open Championship",
        golferName: `${result.golfer.firstName} ${result.golfer.lastName}`,
        golferEmail: result.golfer.email,
        registeredAt: result.registeredAt,
      },
    });
  } catch (error: any) {
    console.error("Public registration error:", error);

    const message = error.message || "";

    if (message === "TOURNAMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Tournament event not found." }, { status: 404 });
    }
    if (message === "TOURNAMENT_CANCELLED") {
      return NextResponse.json(
        { error: "This tournament has been cancelled. Registrations are not accepted." },
        { status: 400 }
      );
    }
    if (message === "REGISTRATION_NOT_OPEN") {
      return NextResponse.json(
        { error: "Registration is not currently open for this tournament." },
        { status: 400 }
      );
    }
    if (message === "REGISTRATION_DEADLINE_PASSED") {
      return NextResponse.json(
        { error: "The registration deadline for this tournament has passed." },
        { status: 400 }
      );
    }
    if (message === "REGISTRATION_NOT_YET_OPEN") {
      return NextResponse.json(
        { error: "Registration for this tournament has not opened yet." },
        { status: 400 }
      );
    }
    if (message === "TOURNAMENT_CAPACITY_FULL") {
      return NextResponse.json(
        {
          error:
            "This tournament has reached maximum player capacity. Registration is currently full.",
        },
        { status: 400 }
      );
    }
    if (message === "ALREADY_REGISTERED") {
      return NextResponse.json(
        {
          error:
            "An active registration under this email address already exists for this tournament.",
        },
        { status: 409 }
      );
    }
    if (message === "HANDICAP_INDEX_REQUIRED") {
      return NextResponse.json(
        { error: "An official handicap index is required to register for this event." },
        { status: 400 }
      );
    }
    if (message.startsWith("HANDICAP_EXCEEDS_LIMIT")) {
      return NextResponse.json(
        { error: "Your entered handicap index exceeds the maximum allowed for this event." },
        { status: 400 }
      );
    }
    if (message.startsWith("HANDICAP_EXCEEDS_DIVISION_MAX")) {
      return NextResponse.json(
        { error: "Your handicap exceeds the maximum limit for the selected division." },
        { status: 400 }
      );
    }
    if (message === "INVALID_DIVISION") {
      return NextResponse.json(
        { error: "The selected competitive division is invalid for this tournament." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while processing your registration. Please try again.", details: error.message },
      { status: 500 }
    );
  }
}
