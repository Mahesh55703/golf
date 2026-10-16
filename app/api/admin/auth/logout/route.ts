import { NextResponse } from "next/server";
import { destroySession, getCurrentAdmin, logAdminAudit } from "@/lib/auth";

export async function POST() {
  try {
    const admin = await getCurrentAdmin();
    if (admin) {
      await logAdminAudit("LOGOUT", `Admin logged out`, admin.email, admin.id);
    }
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
  }
}
