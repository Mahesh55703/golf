import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { resolveDateRange, getPaymentTransactionsReport } from "@/lib/payments/financial-reports";
import { TransactionStatus } from "@prisma/client";

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
    const search = searchParams.get("search") || undefined;
    const statusParam = searchParams.get("status");
    const status = statusParam && Object.values(TransactionStatus).includes(statusParam as any)
      ? (statusParam as TransactionStatus)
      : undefined;
    const currency = searchParams.get("currency") || undefined;
    const tournamentId = searchParams.get("tournamentId") || undefined;
    const mode = (searchParams.get("mode") as "ALL" | "REAL_ONLY" | "SIMULATED_ONLY") || "ALL";
    const provider = searchParams.get("provider") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const dateRange = resolveDateRange(preset, customStart, customEnd);
    const result = await getPaymentTransactionsReport(dateRange, {
      search,
      status,
      currency,
      tournamentId,
      mode,
      provider,
      page,
      limit,
    });

    return NextResponse.json({
      dateRange,
      ...result,
    });
  } catch (err: any) {
    console.error("[Transactions Report API] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load payment transactions." }, { status: 500 });
  }
}
