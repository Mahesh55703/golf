import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { resolveDateRange, getTournamentRevenueReport } from "@/lib/payments/financial-reports";

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
    const currency = searchParams.get("currency") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const sortBy = searchParams.get("sortBy") || "startDate";
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

    const dateRange = resolveDateRange(preset, customStart, customEnd);
    const report = await getTournamentRevenueReport(dateRange, {
      currency,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      dateRange,
      ...report,
    });
  } catch (err: any) {
    console.error("[Tournament Revenue API] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load tournament revenue report." }, { status: 500 });
  }
}
