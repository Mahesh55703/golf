import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { TournamentFormat, TournamentAccess, TournamentStatus } from "@prisma/client";
import { z } from "zod";

const VALID_LIFECYCLE_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  [TournamentStatus.DRAFT]: [TournamentStatus.PUBLISHED, TournamentStatus.REGISTRATION_OPEN, TournamentStatus.CANCELLED],
  [TournamentStatus.PUBLISHED]: [TournamentStatus.REGISTRATION_OPEN, TournamentStatus.DRAFT, TournamentStatus.CANCELLED],
  [TournamentStatus.REGISTRATION_OPEN]: [TournamentStatus.REGISTRATION_CLOSED, TournamentStatus.IN_PROGRESS, TournamentStatus.CANCELLED],
  [TournamentStatus.REGISTRATION_CLOSED]: [TournamentStatus.REGISTRATION_OPEN, TournamentStatus.IN_PROGRESS, TournamentStatus.CANCELLED],
  [TournamentStatus.IN_PROGRESS]: [TournamentStatus.SCORING_REVIEW, TournamentStatus.FINALIZED, TournamentStatus.CANCELLED],
  [TournamentStatus.SCORING_REVIEW]: [TournamentStatus.FINALIZED, TournamentStatus.IN_PROGRESS, TournamentStatus.CANCELLED],
  [TournamentStatus.FINALIZED]: [], // Terminal state
  [TournamentStatus.CANCELLED]: [], // Terminal state
};

const TournamentUpdateSchema = z.object({
  name: z.string().min(3).max(160).optional(),
  slug: z.string().min(3).max(160).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional().nullable(),
  hostClubId: z.string().optional().nullable(),
  defaultCourseId: z.string().optional().nullable(),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d))).optional(),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d))).optional(),
  timeZone: z.string().optional(),
  format: z.nativeEnum(TournamentFormat).optional(),
  access: z.nativeEnum(TournamentAccess).optional(),
  status: z.nativeEnum(TournamentStatus).optional(),
  entryFee: z.number().min(0).optional(),
  currency: z.string().optional(),
  fieldCapacity: z.number().int().min(1).optional(),
  registrationOpenAt: z.string().optional().nullable(),
  registrationCloseAt: z.string().optional().nullable(),
  handicapRequired: z.boolean().optional(),
  maxHandicapLimit: z.number().min(0).max(54).optional().nullable(),
  heroImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  featured: z.boolean().optional(),
  rulesDocumentUrl: z.string().url().optional().nullable().or(z.literal("")),
});

// GET /api/admin/tournaments/[id] - Fetch single tournament with full details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tournament = await prisma.tournament.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        hostClub: true,
        defaultCourse: {
          include: { teeSets: true },
        },
        divisions: true,
        rounds: {
          orderBy: { roundNumber: "asc" },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    return NextResponse.json({ tournament });
  } catch (err: any) {
    console.error("GET /api/admin/tournaments/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch tournament" }, { status: 500 });
  }
}

// PUT /api/admin/tournaments/[id] - Update tournament & enforce lifecycle transitions
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(admin.role, "PLATFORM_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = TournamentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Check slug clash if updated
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const clash = await prisma.tournament.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (clash) {
        return NextResponse.json(
          { error: `Slug '${parsed.data.slug}' is already in use` },
          { status: 409 }
        );
      }
    }

    // Lifecycle validation
    if (parsed.data.status && parsed.data.status !== existing.status) {
      const allowed = VALID_LIFECYCLE_TRANSITIONS[existing.status];
      if (!allowed.includes(parsed.data.status)) {
        return NextResponse.json(
          {
            error: `Invalid lifecycle transition from ${existing.status} to ${parsed.data.status}. Allowed: [${allowed.join(", ")}]`,
          },
          { status: 400 }
        );
      }
    }

    // Date range validation
    const newStart = parsed.data.startDate ? new Date(parsed.data.startDate) : existing.startDate;
    const newEnd = parsed.data.endDate ? new Date(parsed.data.endDate) : existing.endDate;
    if (newEnd < newStart) {
      return NextResponse.json(
        { error: "End date cannot be earlier than start date" },
        { status: 400 }
      );
    }

    const updateData: any = { ...parsed.data };
    if (parsed.data.startDate) updateData.startDate = newStart;
    if (parsed.data.endDate) updateData.endDate = newEnd;
    if (parsed.data.registrationOpenAt) updateData.registrationOpenAt = new Date(parsed.data.registrationOpenAt);
    if (parsed.data.registrationCloseAt) updateData.registrationCloseAt = new Date(parsed.data.registrationCloseAt);
    if (parsed.data.heroImageUrl === "") updateData.heroImageUrl = null;
    if (parsed.data.rulesDocumentUrl === "") updateData.rulesDocumentUrl = null;

    if (parsed.data.status === TournamentStatus.PUBLISHED && !existing.publishedAt) {
      updateData.publishedAt = new Date();
    }
    if (parsed.data.status === TournamentStatus.FINALIZED && !existing.finalizedAt) {
      updateData.finalizedAt = new Date();
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ tournament: updated });
  } catch (err: any) {
    console.error("PUT /api/admin/tournaments/[id] error:", err);
    return NextResponse.json({ error: "Failed to update tournament" }, { status: 500 });
  }
}

// DELETE /api/admin/tournaments/[id] - Safe cancellation / soft-delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(admin.role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: SUPER_ADMIN required to delete or cancel tournaments" }, { status: 403 });
    }

    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    // If tournament already has registrations or was published, transition to CANCELLED instead of hard deleting
    if (tournament._count.registrations > 0 || tournament.status !== TournamentStatus.DRAFT) {
      const cancelled = await prisma.tournament.update({
        where: { id },
        data: { status: TournamentStatus.CANCELLED },
      });
      return NextResponse.json({
        message: "Tournament has existing history or registrations. Successfully transitioned to CANCELLED.",
        tournament: cancelled,
      });
    }

    // Only un-published draft tournaments with 0 registrations can be cleanly removed
    await prisma.tournament.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Draft tournament successfully removed",
    });
  } catch (err: any) {
    console.error("DELETE /api/admin/tournaments/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete tournament" }, { status: 500 });
  }
}
