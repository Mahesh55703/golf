import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logMediaAudit } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pageKey = searchParams.get("pageKey");

    const where = pageKey && pageKey !== "all" ? { pageKey } : {};

    const slots = await prisma.mediaSlot.findMany({
      where,
      include: {
        activeAsset: true,
        lastUpdatedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { slotKey: "asc" },
    });

    return NextResponse.json({ slots });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(admin.role, "CONTENT_MANAGER")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { slotKey, assetId, resetToDefault } = await req.json();

    if (!slotKey) {
      return NextResponse.json({ error: "slotKey is required" }, { status: 400 });
    }

    const slot = await prisma.mediaSlot.findUnique({
      where: { slotKey },
    });

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    if (resetToDefault) {
      await prisma.mediaSlot.update({
        where: { slotKey },
        data: {
          activeAssetId: null,
          lastUpdatedById: admin.id,
        },
      });

      await logMediaAudit("MEDIA_RESET", `Reset slot ${slotKey} to default image`, admin.id);

      return NextResponse.json({ success: true, message: "Reset to default" });
    }

    if (!assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await prisma.mediaSlot.update({
      where: { slotKey },
      data: {
        activeAssetId: asset.id,
        lastUpdatedById: admin.id,
      },
    });

    await prisma.mediaVersion.create({
      data: {
        slotId: slot.id,
        assetId: asset.id,
        action: "REPLACE",
        changedById: admin.id,
        note: `Replaced with asset ${asset.title || asset.id}`,
      },
    });

    await logMediaAudit("MEDIA_ASSIGN", `Assigned asset ${asset.id} to slot ${slotKey}`, admin.id);

    return NextResponse.json({ success: true, slotKey, assetUrl: asset.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
