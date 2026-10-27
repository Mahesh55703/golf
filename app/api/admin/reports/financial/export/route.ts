import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import {
  resolveDateRange,
  getFinancialOverview,
  getTournamentRevenueReport,
  getPaymentTransactionsReport,
} from "@/lib/payments/financial-reports";
import { generateCsv } from "@/lib/payments/csv-export";
import { TransactionStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "overview";
    const preset = searchParams.get("preset");
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");
    const currency = searchParams.get("currency") || undefined;
    const search = searchParams.get("search") || undefined;
    const statusParam = searchParams.get("status");
    const status = statusParam && Object.values(TransactionStatus).includes(statusParam as any)
      ? (statusParam as TransactionStatus)
      : undefined;
    const mode = (searchParams.get("mode") as "ALL" | "REAL_ONLY" | "SIMULATED_ONLY") || "ALL";

    const dateRange = resolveDateRange(preset, customStart, customEnd);
    const dateStr = `${dateRange.startDate.toISOString().slice(0, 10)}_to_${dateRange.endDate.toISOString().slice(0, 10)}`;

    let csvContent = "";
    let filename = `golfpulse_financial_${type}_${dateStr}.csv`;

    if (type === "overview") {
      const overview = await getFinancialOverview(dateRange, currency);
      const rows = Object.values(overview.currencies).map((c) => ({
        currency: c.currency,
        grossRegistrationValue: c.grossRegistrationValue,
        collectedPayments: c.collectedPayments,
        completedRefunds: c.completedRefunds,
        netCollected: c.netCollected,
        pendingAmount: c.pendingAmount,
        failedAmount: c.failedAmount,
        collectedCount: c.collectedCount,
        refundedCount: c.refundedCount,
        pendingCount: c.pendingCount,
        failedCount: c.failedCount,
        simulatedTotalValue: c.simulatedTotalValue,
        simulatedCount: c.simulatedCount,
        period: dateRange.label,
      }));

      const columns = [
        { key: "period", label: "Reporting Period" },
        { key: "currency", label: "Currency" },
        { key: "grossRegistrationValue", label: "Gross Registration Value" },
        { key: "collectedPayments", label: "Real Collected Payments" },
        { key: "completedRefunds", label: "Completed Refunds" },
        { key: "netCollected", label: "Net Collected Amount" },
        { key: "pendingAmount", label: "Pending Amount" },
        { key: "failedAmount", label: "Failed Amount" },
        { key: "collectedCount", label: "Collected Count" },
        { key: "refundedCount", label: "Refunded Count" },
        { key: "pendingCount", label: "Pending Count" },
        { key: "failedCount", label: "Failed Count" },
        { key: "simulatedTotalValue", label: "Simulated Test Collections" },
        { key: "simulatedCount", label: "Simulated Test Count" },
      ];

      csvContent = generateCsv(columns, rows);
    } else if (type === "tournaments") {
      const tournaments = await getTournamentRevenueReport(dateRange, {
        currency,
        search,
        page: 1,
        limit: 500, // Export up to 500 records
      });

      const rows = tournaments.items.map((t) => ({
        tournamentName: t.name,
        startDate: t.startDate.slice(0, 10),
        endDate: t.endDate.slice(0, 10),
        hostClub: t.hostClubName || "N/A",
        currency: t.currency,
        entryFee: t.entryFee,
        totalRegistrations: t.totalRegistrations,
        paidRegistrations: t.paidRegistrations,
        freeRegistrations: t.freeRegistrations,
        cancelledRegistrations: t.cancelledRegistrations,
        grossValue: t.grossRegistrationValue,
        collectedReal: t.collectedPayments,
        completedRefunds: t.completedRefunds,
        netCollected: t.netCollected,
        pendingAmount: t.pendingAmount,
        failedCount: t.failedPaymentCount,
        simulatedCount: t.simulatedPaymentCount,
        simulatedTotal: t.simulatedPaymentTotal,
      }));

      const columns = [
        { key: "tournamentName", label: "Tournament Name" },
        { key: "startDate", label: "Start Date" },
        { key: "endDate", label: "End Date" },
        { key: "hostClub", label: "Host Club" },
        { key: "currency", label: "Currency" },
        { key: "entryFee", label: "Entry Fee" },
        { key: "totalRegistrations", label: "Total Registrations" },
        { key: "paidRegistrations", label: "Paid Registrations" },
        { key: "freeRegistrations", label: "Free Registrations" },
        { key: "cancelledRegistrations", label: "Cancelled Registrations" },
        { key: "grossValue", label: "Gross Registration Value" },
        { key: "collectedReal", label: "Real Collected Payments" },
        { key: "completedRefunds", label: "Completed Refunds" },
        { key: "netCollected", label: "Net Collected" },
        { key: "pendingAmount", label: "Pending Amount" },
        { key: "failedCount", label: "Failed Payment Count" },
        { key: "simulatedCount", label: "Simulated Payment Count" },
        { key: "simulatedTotal", label: "Simulated Payment Total" },
      ];

      csvContent = generateCsv(columns, rows);
    } else if (type === "transactions") {
      const transactions = await getPaymentTransactionsReport(dateRange, {
        search,
        status,
        currency,
        mode,
        page: 1,
        limit: 1000, // Export up to 1000 records safely
      });

      const rows = transactions.items.map((tx) => ({
        referenceNumber: tx.referenceNumber,
        registrationReference: tx.registrationReference,
        tournamentName: tx.tournamentName,
        golferName: tx.golferName,
        golferEmail: tx.golferEmail,
        amount: tx.amount,
        currency: tx.currency,
        provider: tx.provider,
        providerPaymentId: tx.providerPaymentId || "N/A",
        status: tx.status,
        isSimulated: tx.isSimulated ? "SIMULATED (TEST)" : "REAL",
        paidAt: tx.paidAt ? tx.paidAt.replace("T", " ").slice(0, 19) : "N/A",
        refundAmount: tx.refundAmount || "0.00",
        refundReference: tx.refundReference || "N/A",
        createdAt: tx.createdAt.replace("T", " ").slice(0, 19),
      }));

      const columns = [
        { key: "referenceNumber", label: "Payment Reference" },
        { key: "registrationReference", label: "Registration Reference" },
        { key: "tournamentName", label: "Tournament" },
        { key: "golferName", label: "Golfer Name" },
        { key: "golferEmail", label: "Golfer Email" },
        { key: "amount", label: "Amount" },
        { key: "currency", label: "Currency" },
        { key: "provider", label: "Provider" },
        { key: "providerPaymentId", label: "Gateway Payment ID" },
        { key: "status", label: "Transaction Status" },
        { key: "isSimulated", label: "Real / Simulated" },
        { key: "paidAt", label: "Paid Timestamp" },
        { key: "refundAmount", label: "Refund Amount" },
        { key: "refundReference", label: "Refund Reference" },
        { key: "createdAt", label: "Created Timestamp" },
      ];

      csvContent = generateCsv(columns, rows);
    } else {
      return NextResponse.json({ error: "Invalid export type. Supported: overview, tournaments, transactions." }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[Financial Export API] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to export financial report." }, { status: 500 });
  }
}
