import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission, logMediaAudit } from "@/lib/auth";
import { saveMediaFile, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(admin.role, "CONTENT_MANAGER")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const altText = (formData.get("altText") as string) || "";
    const caption = (formData.get("caption") as string) || "";
    const targetSlotKey = (formData.get("targetSlotKey") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Only JPEG, PNG, and WebP are accepted." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save media to storage
    const uploadResult = await saveMediaFile(buffer, file.name, file.type);

    // Create database record
    const asset = await prisma.mediaAsset.create({
      data: {
        title: title || file.name,
        altText,
        caption,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        url: uploadResult.url,
        storageKey: uploadResult.storageKey,
        storageType: uploadResult.storageType,
        createdById: admin.id,
      },
    });

    await logMediaAudit("MEDIA_UPLOAD", `Uploaded asset "${asset.title}" (${asset.url})`, admin.id);

    // If a targetSlotKey was passed, automatically assign it
    if (targetSlotKey) {
      const slot = await prisma.mediaSlot.findUnique({ where: { slotKey: targetSlotKey } });
      if (slot) {
        await prisma.mediaSlot.update({
          where: { slotKey: targetSlotKey },
          data: {
            activeAssetId: asset.id,
            lastUpdatedById: admin.id,
          },
        });

        await prisma.mediaVersion.create({
          data: {
            slotId: slot.id,
            assetId: asset.id,
            action: "UPLOAD_AND_ASSIGN",
            changedById: admin.id,
            note: `Assigned directly during upload`,
          },
        });

        await logMediaAudit("MEDIA_ASSIGN", `Assigned asset ${asset.id} to slot ${targetSlotKey}`, admin.id);
      }
    }

    return NextResponse.json({ success: true, asset });
  } catch (err: any) {
    console.error("Upload failed:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
