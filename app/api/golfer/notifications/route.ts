import { NextRequest, NextResponse } from "next/server";
import { getCurrentGolfer } from "@/lib/golfer-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchSchema = z.object({
  notificationId: z.string().optional(),
  markAllAsRead: z.boolean().optional(),
});

export async function GET() {
  const golfer = await getCurrentGolfer();
  if (!golfer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.golferNotification.findMany({
    where: { golferId: golfer.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}

export async function PATCH(req: NextRequest) {
  const golfer = await getCurrentGolfer();
  if (!golfer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }

    if (parsed.data.markAllAsRead) {
      await prisma.golferNotification.updateMany({
        where: { golferId: golfer.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (parsed.data.notificationId) {
      // Enforce ownership check
      const notif = await prisma.golferNotification.findUnique({
        where: { id: parsed.data.notificationId },
      });

      if (!notif || notif.golferId !== golfer.id) {
        return NextResponse.json({ error: "Notification not found." }, { status: 404 });
      }

      await prisma.golferNotification.update({
        where: { id: notif.id },
        data: { isRead: true, readAt: new Date() },
      });

      return NextResponse.json({ success: true, message: "Notification marked as read." });
    }

    return NextResponse.json({ error: "No action specified." }, { status: 400 });
  } catch (error: any) {
    console.error("Notification update error:", error);
    return NextResponse.json(
      { error: "Failed to update notification." },
      { status: 500 }
    );
  }
}
