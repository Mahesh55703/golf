import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { resolveDateRange, getInternalReconciliationReport } from "@/lib/payments/financial-reports";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const preset = searchParams.get("preset");
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    const dateRange = resolveDateRange(preset, customStart, customEnd);
    const report = await getInternalReconciliationReport(dateRange);

    return NextResponse.json({
      dateRange,
      ...report,
    });
  } catch (err: any) {
    console.error("[Internal Reconciliation API] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate reconciliation report." }, { status: 500 });
  }
}
