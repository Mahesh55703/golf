import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { z } from "zod";

const ClubCreateSchema = z.object({
  name: z.string().min(2, "Club name must be at least 2 characters").max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("India"),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid contact email").optional().or(z.literal("")),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  timeZone: z.string().default("Asia/Kolkata"),
  isActive: z.boolean().default(true),
  heroImageUrl: z.string().url("Invalid hero image URL").optional().or(z.literal("")),
  logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
});

const ClubUpdateSchema = ClubCreateSchema.partial();

// GET /api/admin/clubs - List clubs with pagination & search
export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const activeFilter = searchParams.get("isActive");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
        { country: { contains: search, mode: "insensitive" } },
      ];
    }

    if (activeFilter !== null && activeFilter !== undefined && activeFilter !== "") {
      where.isActive = activeFilter === "true";
    }

    const [total, clubs] = await Promise.all([
      prisma.club.count({ where }),
      prisma.club.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { courses: true, tournaments: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      clubs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/clubs error:", err);
    return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 });
  }
}

// POST /api/admin/clubs - Create a new club
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
    const parsed = ClubCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Check unique slug
    const existing = await prisma.club.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Club with slug '${parsed.data.slug}' already exists` },
        { status: 409 }
      );
    }

    const club = await prisma.club.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        country: parsed.data.country,
        postalCode: parsed.data.postalCode,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        website: parsed.data.website || null,
        timeZone: parsed.data.timeZone,
        isActive: parsed.data.isActive,
        heroImageUrl: parsed.data.heroImageUrl || null,
        logoUrl: parsed.data.logoUrl || null,
      },
    });

    return NextResponse.json({ club }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/admin/clubs error:", err);
    return NextResponse.json({ error: "Failed to create club" }, { status: 500 });
  }
}
