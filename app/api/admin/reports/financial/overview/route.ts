import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { resolveDateRange, getFinancialOverview } from "@/lib/payments/financial-reports";

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
    const currency = searchParams.get("currency");

    const dateRange = resolveDateRange(preset, customStart, customEnd);
    const overview = await getFinancialOverview(dateRange, currency);

    return NextResponse.json(overview);
  } catch (err: any) {
    console.error("[Financial Overview API] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load financial overview." }, { status: 500 });
  }
}
