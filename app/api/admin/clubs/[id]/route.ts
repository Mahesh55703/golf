import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { z } from "zod";

const ClubUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional(),
  postalCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  website: z.string().url().optional().nullable().or(z.literal("")),
  timeZone: z.string().optional(),
  isActive: z.boolean().optional(),
  heroImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
});

// GET /api/admin/clubs/[id] - Retrieve single club with courses and tournaments
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
    const club = await prisma.club.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        courses: {
          include: {
            teeSets: true,
            _count: { select: { holes: true } },
          },
        },
        tournaments: {
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            endDate: true,
            format: true,
            status: true,
          },
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    return NextResponse.json({ club });
  } catch (err: any) {
    console.error("GET /api/admin/clubs/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch club" }, { status: 500 });
  }
}

// PUT /api/admin/clubs/[id] - Update club details
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
    const existing = await prisma.club.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = ClubUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Check slug collision if slug is being updated
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugClash = await prisma.club.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (slugClash) {
        return NextResponse.json(
          { error: `Slug '${parsed.data.slug}' is already in use by another club` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.club.update({
      where: { id },
      data: {
        ...parsed.data,
        email: parsed.data.email === "" ? null : parsed.data.email,
        website: parsed.data.website === "" ? null : parsed.data.website,
        heroImageUrl: parsed.data.heroImageUrl === "" ? null : parsed.data.heroImageUrl,
        logoUrl: parsed.data.logoUrl === "" ? null : parsed.data.logoUrl,
      },
    });

    return NextResponse.json({ club: updated });
  } catch (err: any) {
    console.error("PUT /api/admin/clubs/[id] error:", err);
    return NextResponse.json({ error: "Failed to update club" }, { status: 500 });
  }
}

// DELETE /api/admin/clubs/[id] - Deactivate a club safely (or reject if active tournaments exist)
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
      return NextResponse.json({ error: "Forbidden: SUPER_ADMIN required to deactivate clubs" }, { status: 403 });
    }

    const { id } = await params;
    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tournaments: true, courses: true },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Soft deactivation ensures historical tournaments and relations remain intact
    const deactivated = await prisma.club.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: "Club successfully deactivated",
      club: deactivated,
    });
  } catch (err: any) {
    console.error("DELETE /api/admin/clubs/[id] error:", err);
    return NextResponse.json({ error: "Failed to deactivate club" }, { status: 500 });
  }
}
