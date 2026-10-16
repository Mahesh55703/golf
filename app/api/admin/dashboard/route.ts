import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const [
      totalClubs,
      activeClubs,
      totalTournaments,
      publishedTournaments,
      regOpenTournaments,
      inProgressTournaments,
      upcomingTournaments,
      totalSlots,
      assignedSlots,
      totalAssets,
      recentTournaments,
      recentAudits,
    ] = await Promise.all([
      prisma.club.count(),
      prisma.club.count({ where: { isActive: true } }),
      prisma.tournament.count(),
      prisma.tournament.count({ where: { status: "PUBLISHED" } }),
      prisma.tournament.count({ where: { status: "REGISTRATION_OPEN" } }),
      prisma.tournament.count({ where: { status: "IN_PROGRESS" } }),
      prisma.tournament.count({ where: { startDate: { gte: now } } }),
      prisma.mediaSlot.count(),
      prisma.mediaSlot.count({ where: { activeAssetId: { not: null } } }),
      prisma.mediaAsset.count({ where: { isArchived: false } }),
      prisma.tournament.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { hostClub: { select: { name: true } } },
      }),
      prisma.mediaAuditLog.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { adminUser: { select: { name: true, email: true } } },
      }),
    ]);

    // Unique managed pages
    const pages = await prisma.mediaSlot.findMany({
      distinct: ["pageKey"],
      select: { pageKey: true },
    });

    return NextResponse.json({
      stats: {
        totalClubs,
        activeClubs,
        totalTournaments,
        publishedTournaments,
        regOpenTournaments,
        inProgressTournaments,
        upcomingTournaments,
        totalPages: pages.length,
        totalSlots,
        assignedSlots,
        missingSlots: Math.max(0, totalSlots - assignedSlots),
        totalAssets,
      },
      recentTournaments,
      recentAudits,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
