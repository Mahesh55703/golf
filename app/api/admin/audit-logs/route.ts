import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasPermission(admin.role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [adminLogs, mediaLogs] = await Promise.all([
      prisma.adminAuditLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { adminUser: { select: { name: true, email: true } } },
      }),
      prisma.mediaAuditLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { adminUser: { select: { name: true, email: true } } },
      }),
    ]);

    return NextResponse.json({ adminLogs, mediaLogs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
