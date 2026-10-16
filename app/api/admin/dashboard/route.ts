import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalSlots,
      assignedSlots,
      totalAssets,
      totalGallery,
      recentUploads,
      recentAudits,
    ] = await Promise.all([
      prisma.mediaSlot.count(),
      prisma.mediaSlot.count({ where: { activeAssetId: { not: null } } }),
      prisma.mediaAsset.count({ where: { isArchived: false } }),
      prisma.galleryItem.count(),
      prisma.mediaAsset.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, url: true, createdAt: true, mimeType: true },
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
        totalPages: pages.length,
        totalSlots,
        assignedSlots,
        missingSlots: totalSlots - assignedSlots,
        totalAssets,
        totalGallery,
      },
      recentUploads,
      recentAudits,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
