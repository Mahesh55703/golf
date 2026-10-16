import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { TournamentFormat, TournamentAccess, TournamentStatus } from "@prisma/client";
import { z } from "zod";

const TournamentCreateSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(160),
  slug: z.string().min(3).max(160).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  hostClubId: z.string().optional().nullable(),
  defaultCourseId: z.string().optional().nullable(),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid start date ISO string"),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid end date ISO string"),
  timeZone: z.string().default("Asia/Kolkata"),
  format: z.nativeEnum(TournamentFormat).default(TournamentFormat.STROKE_PLAY),
  access: z.nativeEnum(TournamentAccess).default(TournamentAccess.PUBLIC),
  status: z.nativeEnum(TournamentStatus).default(TournamentStatus.DRAFT),
  entryFee: z.number().min(0, "Entry fee cannot be negative").default(0),
  currency: z.string().default("USD"),
  fieldCapacity: z.number().int().min(1).default(120),
  registrationOpenAt: z.string().optional().nullable(),
  registrationCloseAt: z.string().optional().nullable(),
  handicapRequired: z.boolean().default(false),
  maxHandicapLimit: z.number().min(0).max(54).optional().nullable(),
  heroImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  featured: z.boolean().default(false),
  rulesDocumentUrl: z.string().url().optional().nullable().or(z.literal("")),
});

// GET /api/admin/tournaments - List tournaments with filters, pagination, and search
export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as TournamentStatus | null;
    const format = searchParams.get("format") as TournamentFormat | null;
    const clubId = searchParams.get("clubId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { hostClub: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status && Object.values(TournamentStatus).includes(status)) {
      where.status = status;
    }

    if (format && Object.values(TournamentFormat).includes(format)) {
      where.format = format;
    }

    if (clubId) {
      where.hostClubId = clubId;
    }

    const [total, tournaments] = await Promise.all([
      prisma.tournament.count({ where }),
      prisma.tournament.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: "asc" },
        include: {
          hostClub: {
            select: { id: true, name: true, slug: true, city: true, country: true },
          },
          defaultCourse: {
            select: { id: true, name: true, holesCount: true, par: true },
          },
          _count: {
            select: { registrations: true, rounds: true, divisions: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      tournaments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/tournaments error:", err);
    return NextResponse.json({ error: "Failed to fetch tournaments" }, { status: 500 });
  }
}

// POST /api/admin/tournaments - Create a new tournament
export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(admin.role, "PLATFORM_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = TournamentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const start = new Date(parsed.data.startDate);
    const end = new Date(parsed.data.endDate);
    if (end < start) {
      return NextResponse.json(
        { error: "End date cannot be earlier than start date" },
        { status: 400 }
      );
    }

    // Check unique slug
    const existing = await prisma.tournament.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Tournament with slug '${parsed.data.slug}' already exists` },
        { status: 409 }
      );
    }

    // Validate club existence if supplied
    if (parsed.data.hostClubId) {
      const club = await prisma.club.findUnique({
        where: { id: parsed.data.hostClubId },
      });
      if (!club) {
        return NextResponse.json({ error: "Host club not found" }, { status: 404 });
      }
    }

    // Validate course existence if supplied
    if (parsed.data.defaultCourseId) {
      const course = await prisma.golfCourse.findUnique({
        where: { id: parsed.data.defaultCourseId },
      });
      if (!course) {
        return NextResponse.json({ error: "Default course not found" }, { status: 404 });
      }
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        hostClubId: parsed.data.hostClubId || null,
        defaultCourseId: parsed.data.defaultCourseId || null,
        startDate: start,
        endDate: end,
        timeZone: parsed.data.timeZone,
        format: parsed.data.format,
        access: parsed.data.access,
        status: parsed.data.status,
        entryFee: parsed.data.entryFee,
        currency: parsed.data.currency,
        fieldCapacity: parsed.data.fieldCapacity,
        registrationOpenAt: parsed.data.registrationOpenAt ? new Date(parsed.data.registrationOpenAt) : null,
        registrationCloseAt: parsed.data.registrationCloseAt ? new Date(parsed.data.registrationCloseAt) : null,
        handicapRequired: parsed.data.handicapRequired,
        maxHandicapLimit: parsed.data.maxHandicapLimit ?? null,
        heroImageUrl: parsed.data.heroImageUrl || null,
        featured: parsed.data.featured,
        rulesDocumentUrl: parsed.data.rulesDocumentUrl || null,
        publishedAt: parsed.data.status !== TournamentStatus.DRAFT ? new Date() : null,
      },
    });

    return NextResponse.json({ tournament }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/admin/tournaments error:", err);
    return NextResponse.json({ error: "Failed to create tournament" }, { status: 500 });
  }
}
