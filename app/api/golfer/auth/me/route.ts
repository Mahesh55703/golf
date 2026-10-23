import { NextResponse } from "next/server";
import { getCurrentGolfer } from "@/lib/golfer-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const golfer = await getCurrentGolfer();

  if (!golfer) {
    return NextResponse.json({ authenticated: false, golfer: null }, { status: 401 });
  }

  // Get unread notifications count
  const unreadNotifications = await prisma.golferNotification.count({
    where: { golferId: golfer.id, isRead: false },
  });

  return NextResponse.json({
    authenticated: true,
    golfer,
    unreadNotifications,
  });
}
