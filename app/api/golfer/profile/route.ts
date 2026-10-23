import { NextRequest, NextResponse } from "next/server";
import { getCurrentGolfer } from "@/lib/golfer-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ProfileUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  phone: z.string().trim().max(30).optional().nullable(),
  country: z.string().trim().max(60).default("India"),
  homeClub: z.string().trim().max(100).optional().nullable(),
  handicapIndex: z
    .number()
    .min(0, "Handicap cannot be negative")
    .max(54, "Maximum handicap allowed is 54.0")
    .optional()
    .nullable(),
});

export async function GET() {
  const golfer = await getCurrentGolfer();
  if (!golfer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.golferProfile.findUnique({
    where: { id: golfer.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      country: true,
      homeClub: true,
      handicapIndex: true,
      handicapStatus: true,
      handicapNetworkId: true,
      avatarUrl: true,
      isEmailVerified: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const golfer = await getCurrentGolfer();
  if (!golfer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { firstName, lastName, phone, country, homeClub, handicapIndex } = parsed.data;

    const updated = await prisma.golferProfile.update({
      where: { id: golfer.id },
      data: {
        firstName,
        lastName,
        phone: phone || null,
        country,
        homeClub: homeClub || null,
        handicapIndex: handicapIndex !== undefined && handicapIndex !== null ? handicapIndex : null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        country: true,
        homeClub: true,
        handicapIndex: true,
        handicapStatus: true,
        avatarUrl: true,
        isEmailVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile: updated,
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
