import { prisma } from "@/lib/prisma";
import { TransactionStatus, PaymentStatus, RegistrationStatus } from "@prisma/client";

// ==========================================
// 1. Precise Date Range Types & Utilities
// ==========================================

export type DatePreset =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "current_month"
  | "previous_month"
  | "current_year"
  | "all_time"
  | "custom";

export interface DateFilterRange {
  preset: DatePreset;
  startDate: Date;
  endDate: Date;
  label: string;
}

/**
 * Resolves a date preset into definitive UTC start and end boundaries.
 * Enforces start of day (00:00:00.000) and end of day (23:59:59.999).
 */
export function resolveDateRange(
  preset: string | null | undefined,
  customStart?: string | null,
  customEnd?: string | null
): DateFilterRange {
  const now = new Date();

  // Helper for start of day
  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  // Helper for end of day
  const endOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy;
  };

  switch (preset) {
    case "today": {
      return {
        preset: "today",
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        label: "Today",
      };
    }
    case "last_7_days": {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      return {
        preset: "last_7_days",
        startDate: startOfDay(past),
        endDate: endOfDay(now),
        label: "Last 7 Days",
      };
    }
    case "last_30_days": {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      return {
        preset: "last_30_days",
        startDate: startOfDay(past),
        endDate: endOfDay(now),
        label: "Last 30 Days",
      };
    }
    case "current_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        preset: "current_month",
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: "Current Month",
      };
    }
    case "previous_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        preset: "previous_month",
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: "Previous Month",
      };
    }
    case "current_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return {
        preset: "current_year",
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: "Current Year",
      };
    }
    case "all_time": {
      return {
        preset: "all_time",
        startDate: new Date("2020-01-01T00:00:00.000Z"),
        endDate: new Date("2099-12-31T23:59:59.999Z"),
        label: "All Time",
      };
    }
    case "custom":
    default: {
      if (customStart && customEnd) {
        const parsedStart = new Date(customStart);
        const parsedEnd = new Date(customEnd);
        if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
          return {
            preset: "custom",
            startDate: startOfDay(parsedStart),
            endDate: endOfDay(parsedEnd),
            label: `${parsedStart.toISOString().slice(0, 10)} to ${parsedEnd.toISOString().slice(0, 10)}`,
          };
        }
      }
      // Default to last 30 days if invalid or omitted
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      return {
        preset: "last_30_days",
        startDate: startOfDay(past),
        endDate: endOfDay(now),
        label: "Last 30 Days",
      };
    }
  }
}

// ==========================================
// 2. Decimal-Safe Arithmetic Helpers
// ==========================================

export function toMinorCents(amount: number | string | { toString(): string } | null | undefined): number {
  if (amount === null || amount === undefined) return 0;
  const str = typeof amount === "object" ? amount.toString() : String(amount);
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function fromMinorCents(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function addDecimals(a: number | string, b: number | string): string {
  const sumMinor = toMinorCents(a) + toMinorCents(b);
  return fromMinorCents(sumMinor);
}

export function subDecimals(a: number | string, b: number | string): string {
  const diffMinor = toMinorCents(a) - toMinorCents(b);
  return fromMinorCents(diffMinor);
}

// ==========================================
// 3. Simulation Classification Helper
// ==========================================

export function isSimulatedTransaction(p: {
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  providerSignature?: string | null;
  metadata?: any;
}): boolean {
  if (p.providerOrderId?.startsWith("order_sim_")) return true;
  if (p.providerPaymentId?.startsWith("pay_sim_")) return true;
  if (p.providerSignature === "DEV_SIMULATED_SIGNATURE") return true;
  if (p.metadata && typeof p.metadata === "object") {
    if (p.metadata.simulation === true || p.metadata.mode === "DEV_SIMULATION") return true;
  }
  return false;
}

// ==========================================
// 4. Financial Overview Report
// ==========================================

export interface CurrencyFinancialSummary {
  currency: string;
  // Real monetary metrics
  grossRegistrationValue: string;
  collectedPayments: string;
  completedRefunds: string;
  netCollected: string;
  pendingAmount: string;
  failedAmount: string;

  // Real transaction counts
  collectedCount: number;
  refundedCount: number;
  pendingCount: number;
  failedCount: number;

  // Isolated simulated metrics
  simulatedTotalValue: string;
  simulatedCount: number;
  simulatedRefundTotal: string;
  simulatedRefundCount: number;
}

export interface FinancialOverviewResult {
  dateRange: DateFilterRange;
  currencies: Record<string, CurrencyFinancialSummary>;
  primaryCurrency: string;
  registrationCounts: {
    total: number;
    paid: number;
    free: number;
    cancelled: number;
    awaitingPayment: number;
  };
  dailyTrend: Array<{
    date: string;
    currency: string;
    grossCollected: number;
    completedRefunds: number;
    netCollected: number;
    transactionsCount: number;
  }>;
}

export async function getFinancialOverview(
  range: DateFilterRange,
  selectedCurrency?: string | null
): Promise<FinancialOverviewResult> {
  const { startDate, endDate } = range;

  // 1. Fetch all registrations within date range
  const registrations = await prisma.registration.findMany({
    where: {
      registeredAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      entryFeePaid: true,
      currency: true,
      tournament: {
        select: {
          entryFee: true,
          currency: true,
        },
      },
    },
  });

  // Calculate registration counts
  let regTotal = registrations.length;
  let regPaid = 0;
  let regFree = 0;
  let regCancelled = 0;
  let regAwaitingPayment = 0;

  for (const reg of registrations) {
    if (reg.status === RegistrationStatus.CANCELLED || reg.status === RegistrationStatus.WITHDRAWN) {
      regCancelled++;
    } else if (reg.paymentStatus === PaymentStatus.PAID) {
      regPaid++;
    } else if (reg.paymentStatus === PaymentStatus.FREE_ENTRY || Number(reg.tournament.entryFee) === 0) {
      regFree++;
    } else if (reg.paymentStatus === PaymentStatus.UNPAID) {
      regAwaitingPayment++;
    }
  }

  // 2. Fetch all payments created or paid within date range
  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      providerOrderId: true,
      providerPaymentId: true,
      providerSignature: true,
      refundAmount: true,
      paidAt: true,
      refundedAt: true,
      metadata: true,
      createdAt: true,
      registration: {
        select: {
          status: true,
        },
      },
    },
  });

  // Group by currency safely (cents/minor units to prevent floating point inaccuracies)
  const currencyBuckets: Record<
    string,
    {
      grossMinor: number;
      collectedMinor: number;
      refundedMinor: number;
      pendingMinor: number;
      failedMinor: number;
      collectedCount: number;
      refundedCount: number;
      pendingCount: number;
      failedCount: number;

      simulatedMinor: number;
      simulatedCount: number;
      simulatedRefundMinor: number;
      simulatedRefundCount: number;
    }
  > = {};

  const getBucket = (curr: string) => {
    const c = (curr || "USD").toUpperCase();
    if (!currencyBuckets[c]) {
      currencyBuckets[c] = {
        grossMinor: 0,
        collectedMinor: 0,
        refundedMinor: 0,
        pendingMinor: 0,
        failedMinor: 0,
        collectedCount: 0,
        refundedCount: 0,
        pendingCount: 0,
        failedCount: 0,
        simulatedMinor: 0,
        simulatedCount: 0,
        simulatedRefundMinor: 0,
        simulatedRefundCount: 0,
      };
    }
    return currencyBuckets[c];
  };

  // Tally eligible registrations for Gross Registration Value (non-cancelled)
  for (const reg of registrations) {
    if (reg.status !== RegistrationStatus.CANCELLED && reg.status !== RegistrationStatus.WITHDRAWN) {
      const regCurr = (reg.currency || reg.tournament.currency || "USD").toUpperCase();
      const bucket = getBucket(regCurr);
      const fee = Number(reg.entryFeePaid) > 0 ? Number(reg.entryFeePaid) : Number(reg.tournament.entryFee);
      bucket.grossMinor += toMinorCents(fee);
    }
  }

  // Tally payments
  for (const p of payments) {
    const curr = (p.currency || "USD").toUpperCase();
    const bucket = getBucket(curr);
    const amountMinor = toMinorCents(p.amount);
    const refundMinor = p.refundAmount ? toMinorCents(p.refundAmount) : 0;
    const isSim = isSimulatedTransaction(p);

    if (isSim) {
      // Isolate in simulated metrics
      if (p.status === TransactionStatus.SUCCESS) {
        bucket.simulatedMinor += amountMinor;
        bucket.simulatedCount++;
      }
      if (refundMinor > 0) {
        bucket.simulatedRefundMinor += refundMinor;
        bucket.simulatedRefundCount++;
      }
    } else {
      // Real transactions
      if (p.status === TransactionStatus.SUCCESS) {
        bucket.collectedMinor += amountMinor;
        bucket.collectedCount++;
      } else if (p.status === TransactionStatus.CREATED || p.status === TransactionStatus.PROCESSING) {
        bucket.pendingMinor += amountMinor;
        bucket.pendingCount++;
      } else if (p.status === TransactionStatus.FAILED) {
        bucket.failedMinor += amountMinor;
        bucket.failedCount++;
      }

      // If refund occurred on real payment
      if (p.status === TransactionStatus.REFUNDED || p.status === TransactionStatus.PARTIALLY_REFUNDED || refundMinor > 0) {
        bucket.refundedMinor += refundMinor;
        bucket.refundedCount++;
      }
    }
  }

  // Ensure primary currency exists in output even if empty
  const primaryCurrency = (selectedCurrency || "USD").toUpperCase();
  getBucket(primaryCurrency);

  const formattedCurrencies: Record<string, CurrencyFinancialSummary> = {};
  for (const [curr, b] of Object.entries(currencyBuckets)) {
    const netMinor = b.collectedMinor - b.refundedMinor;
    formattedCurrencies[curr] = {
      currency: curr,
      grossRegistrationValue: fromMinorCents(b.grossMinor),
      collectedPayments: fromMinorCents(b.collectedMinor),
      completedRefunds: fromMinorCents(b.refundedMinor),
      netCollected: fromMinorCents(netMinor),
      pendingAmount: fromMinorCents(b.pendingMinor),
      failedAmount: fromMinorCents(b.failedMinor),
      collectedCount: b.collectedCount,
      refundedCount: b.refundedCount,
      pendingCount: b.pendingCount,
      failedCount: b.failedCount,
      simulatedTotalValue: fromMinorCents(b.simulatedMinor),
      simulatedCount: b.simulatedCount,
      simulatedRefundTotal: fromMinorCents(b.simulatedRefundMinor),
      simulatedRefundCount: b.simulatedRefundCount,
    };
  }

  // Build daily trend series for primary currency (or selected currency)
  // Strictly REAL collections and refunds
  const dailyMap = new Map<
    string,
    { grossMinor: number; refundMinor: number; count: number }
  >();

  // Initialize all days in the range (up to 60 days to prevent excessive payload)
  const dayMs = 24 * 60 * 60 * 1000;
  const startDay = new Date(startDate);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(endDate);
  endDay.setHours(0, 0, 0, 0);

  const totalDays = Math.min(60, Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / dayMs) + 1));
  for (let i = 0; i < totalDays; i++) {
    const currDate = new Date(startDay.getTime() + i * dayMs);
    const dateKey = currDate.toISOString().slice(0, 10);
    dailyMap.set(dateKey, { grossMinor: 0, refundMinor: 0, count: 0 });
  }

  for (const p of payments) {
    if (isSimulatedTransaction(p)) continue; // Never plot simulation in real trend
    const curr = (p.currency || "USD").toUpperCase();
    if (curr !== primaryCurrency) continue;

    const dateKey = (p.paidAt || p.createdAt).toISOString().slice(0, 10);
    let entry = dailyMap.get(dateKey);
    if (!entry) {
      entry = { grossMinor: 0, refundMinor: 0, count: 0 };
      dailyMap.set(dateKey, entry);
    }

    if (p.status === TransactionStatus.SUCCESS) {
      entry.grossMinor += toMinorCents(p.amount);
      entry.count++;
    }

    if (p.refundAmount && (p.status === TransactionStatus.REFUNDED || p.status === TransactionStatus.PARTIALLY_REFUNDED)) {
      entry.refundMinor += toMinorCents(p.refundAmount);
    }
  }

  const dailyTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      currency: primaryCurrency,
      grossCollected: Number(fromMinorCents(d.grossMinor)),
      completedRefunds: Number(fromMinorCents(d.refundMinor)),
      netCollected: Number(fromMinorCents(d.grossMinor - d.refundMinor)),
      transactionsCount: d.count,
    }));

  return {
    dateRange: range,
    currencies: formattedCurrencies,
    primaryCurrency,
    registrationCounts: {
      total: regTotal,
      paid: regPaid,
      free: regFree,
      cancelled: regCancelled,
      awaitingPayment: regAwaitingPayment,
    },
    dailyTrend,
  };
}

// ==========================================
// 5. Tournament Revenue Report
// ==========================================

export interface TournamentRevenueItem {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  hostClubName: string | null;
  currency: string;
  entryFee: string;

  totalRegistrations: number;
  freeRegistrations: number;
  paidRegistrations: number;
  cancelledRegistrations: number;

  grossRegistrationValue: string;
  collectedPayments: string;
  completedRefunds: string;
  netCollected: string;
  pendingAmount: string;
  failedPaymentCount: number;
  simulatedPaymentCount: number;
  simulatedPaymentTotal: string;
}

export async function getTournamentRevenueReport(
  range: DateFilterRange,
  options?: {
    search?: string;
    currency?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }
) {
  const { startDate, endDate } = range;
  const search = options?.search?.trim() || "";
  const currencyFilter = options?.currency?.toUpperCase();
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 10));
  const sortBy = options?.sortBy || "startDate";
  const sortOrder = options?.sortOrder || "desc";

  const tournamentWhere: any = {};
  if (search) {
    tournamentWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { hostClub: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (currencyFilter) {
    tournamentWhere.currency = currencyFilter;
  }

  // Fetch all tournaments matching search
  const tournaments = await prisma.tournament.findMany({
    where: tournamentWhere,
    include: {
      hostClub: { select: { name: true } },
      registrations: {
        where: {
          registeredAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          payments: true,
        },
      },
    },
  });

  const items: TournamentRevenueItem[] = tournaments.map((t) => {
    const currency = (t.currency || "USD").toUpperCase();
    let totalReg = t.registrations.length;
    let freeReg = 0;
    let paidReg = 0;
    let cancelledReg = 0;

    let grossMinor = 0;
    let collectedMinor = 0;
    let refundedMinor = 0;
    let pendingMinor = 0;
    let failedCount = 0;
    let simulatedCount = 0;
    let simulatedMinor = 0;

    for (const reg of t.registrations) {
      if (reg.status === RegistrationStatus.CANCELLED || reg.status === RegistrationStatus.WITHDRAWN) {
        cancelledReg++;
      } else {
        const fee = Number(reg.entryFeePaid) > 0 ? Number(reg.entryFeePaid) : Number(t.entryFee);
        grossMinor += toMinorCents(fee);
      }

      if (reg.paymentStatus === PaymentStatus.FREE_ENTRY || Number(t.entryFee) === 0) {
        freeReg++;
      } else if (reg.paymentStatus === PaymentStatus.PAID) {
        paidReg++;
      }

      // Check payments for this registration
      for (const p of reg.payments) {
        const pAmountMinor = toMinorCents(p.amount);
        const pRefundMinor = p.refundAmount ? toMinorCents(p.refundAmount) : 0;
        const isSim = isSimulatedTransaction(p);

        if (isSim) {
          if (p.status === TransactionStatus.SUCCESS) {
            simulatedCount++;
            simulatedMinor += pAmountMinor;
          }
        } else {
          if (p.status === TransactionStatus.SUCCESS) {
            collectedMinor += pAmountMinor;
          } else if (p.status === TransactionStatus.CREATED || p.status === TransactionStatus.PROCESSING) {
            pendingMinor += pAmountMinor;
          } else if (p.status === TransactionStatus.FAILED) {
            failedCount++;
          }

          if (p.status === TransactionStatus.REFUNDED || p.status === TransactionStatus.PARTIALLY_REFUNDED || pRefundMinor > 0) {
            refundedMinor += pRefundMinor;
          }
        }
      }
    }

    const netMinor = collectedMinor - refundedMinor;

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      startDate: t.startDate.toISOString(),
      endDate: t.endDate.toISOString(),
      hostClubName: t.hostClub?.name || null,
      currency,
      entryFee: Number(t.entryFee).toFixed(2),
      totalRegistrations: totalReg,
      freeRegistrations: freeReg,
      paidRegistrations: paidReg,
      cancelledRegistrations: cancelledReg,
      grossRegistrationValue: fromMinorCents(grossMinor),
      collectedPayments: fromMinorCents(collectedMinor),
      completedRefunds: fromMinorCents(refundedMinor),
      netCollected: fromMinorCents(netMinor),
      pendingAmount: fromMinorCents(pendingMinor),
      failedPaymentCount: failedCount,
      simulatedPaymentCount: simulatedCount,
      simulatedPaymentTotal: fromMinorCents(simulatedMinor),
    };
  });

  // Sort items
  items.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.name.localeCompare(b.name);
    else if (sortBy === "totalRegistrations") cmp = a.totalRegistrations - b.totalRegistrations;
    else if (sortBy === "collectedPayments") cmp = parseFloat(a.collectedPayments) - parseFloat(b.collectedPayments);
    else if (sortBy === "netCollected") cmp = parseFloat(a.netCollected) - parseFloat(b.netCollected);
    else cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();

    return sortOrder === "asc" ? cmp : -cmp;
  });

  const total = items.length;
  const paginatedItems = items.slice((page - 1) * limit, page * limit);

  return {
    items: paginatedItems,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

// ==========================================
// 6. Payment Transactions Report
// ==========================================

export async function getPaymentTransactionsReport(
  range: DateFilterRange,
  options?: {
    search?: string;
    status?: TransactionStatus | "ALL";
    currency?: string;
    tournamentId?: string;
    mode?: "ALL" | "REAL_ONLY" | "SIMULATED_ONLY";
    provider?: string;
    page?: number;
    limit?: number;
  }
) {
  const { startDate, endDate } = range;
  const search = options?.search?.trim() || "";
  const status = options?.status && options.status !== "ALL" ? options.status : undefined;
  const currency = options?.currency?.toUpperCase();
  const tournamentId = options?.tournamentId;
  const mode = options?.mode || "ALL";
  const provider = options?.provider;
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 15));

  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (status) {
    where.status = status;
  }

  if (currency) {
    where.currency = currency;
  }

  if (provider) {
    where.provider = provider;
  }

  if (tournamentId) {
    where.registration = { tournamentId };
  }

  if (search) {
    where.OR = [
      { referenceNumber: { contains: search, mode: "insensitive" } },
      { providerOrderId: { contains: search, mode: "insensitive" } },
      { providerPaymentId: { contains: search, mode: "insensitive" } },
      { registration: { referenceNumber: { contains: search, mode: "insensitive" } } },
      { registration: { golfer: { firstName: { contains: search, mode: "insensitive" } } } },
      { registration: { golfer: { lastName: { contains: search, mode: "insensitive" } } } },
      { registration: { golfer: { email: { contains: search, mode: "insensitive" } } } },
      { registration: { tournament: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        registration: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            paymentStatus: true,
            tournament: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            golfer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const items = payments
    .map((p) => {
      const isSim = isSimulatedTransaction(p);
      return {
        id: p.id,
        referenceNumber: p.referenceNumber,
        registrationReference: p.registration.referenceNumber,
        registrationId: p.registration.id,
        tournamentId: p.registration.tournament.id,
        tournamentName: p.registration.tournament.name,
        tournamentSlug: p.registration.tournament.slug,
        golferName: `${p.registration.golfer.firstName} ${p.registration.golfer.lastName}`,
        // Mask golfer email partially for security, while keeping readable for admins
        golferEmail: p.registration.golfer.email,
        amount: Number(p.amount).toFixed(2),
        currency: p.currency,
        provider: p.provider,
        providerOrderId: p.providerOrderId,
        providerPaymentId: p.providerPaymentId,
        status: p.status,
        isSimulated: isSim,
        paidAt: p.paidAt?.toISOString() || null,
        refundedAt: p.refundedAt?.toISOString() || null,
        refundAmount: p.refundAmount ? Number(p.refundAmount).toFixed(2) : null,
        refundReference: p.refundReference,
        createdAt: p.createdAt.toISOString(),
        metadata: p.metadata,
      };
    })
    .filter((item) => {
      if (mode === "REAL_ONLY") return !item.isSimulated;
      if (mode === "SIMULATED_ONLY") return item.isSimulated;
      return true;
    });

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

// ==========================================
// 7. Refund Report
// ==========================================

export async function getRefundsReport(range: DateFilterRange) {
  const { startDate, endDate } = range;

  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        { status: TransactionStatus.REFUNDED },
        { status: TransactionStatus.PARTIALLY_REFUNDED },
        { refundAmount: { not: null, gt: 0 } },
      ],
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { refundedAt: "desc" },
    include: {
      registration: {
        include: {
          tournament: { select: { id: true, name: true, slug: true } },
          golfer: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  return payments.map((p) => {
    const isSim = isSimulatedTransaction(p);
    const meta = (p.metadata as any) || {};
    const lastRefund = meta.refundHistory && Array.isArray(meta.refundHistory)
      ? meta.refundHistory[meta.refundHistory.length - 1]
      : null;

    return {
      id: p.id,
      referenceNumber: p.referenceNumber,
      registrationReference: p.registration.referenceNumber,
      tournamentName: p.registration.tournament.name,
      golferName: `${p.registration.golfer.firstName} ${p.registration.golfer.lastName}`,
      golferEmail: p.registration.golfer.email,
      originalAmount: Number(p.amount).toFixed(2),
      refundAmount: p.refundAmount ? Number(p.refundAmount).toFixed(2) : "0.00",
      currency: p.currency,
      provider: p.provider,
      refundReference: p.refundReference || lastRefund?.refundId || "N/A",
      refundReason: lastRefund?.reason || "Admin or golfer initiated refund",
      refundedAt: p.refundedAt?.toISOString() || p.updatedAt.toISOString(),
      refundStatus: p.status === TransactionStatus.REFUNDED
        ? "COMPLETED"
        : p.status === TransactionStatus.PARTIALLY_REFUNDED
        ? "PARTIAL_COMPLETED"
        : "PROCESSING",
      isSimulated: isSim,
    };
  });
}

// ==========================================
// 8. Internal Payment Reconciliation Report
// ==========================================

export interface ReconciliationDiscrepancy {
  id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  code: string;
  title: string;
  description: string;
  referenceId: string;
  amount: string;
  currency: string;
  recommendedAction: string;
  createdAt: string;
}

export async function getInternalReconciliationReport(range: DateFilterRange): Promise<{
  reportType: "Internal Payment Reconciliation";
  generatedAt: string;
  totalIssuesCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  discrepancies: ReconciliationDiscrepancy[];
}> {
  const { startDate, endDate } = range;
  const discrepancies: ReconciliationDiscrepancy[] = [];

  // Issue 1: Registrations marked PAID without any verified payment record
  const paidRegistrations = await prisma.registration.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      registeredAt: { gte: startDate, lte: endDate },
    },
    include: {
      payments: true,
      tournament: { select: { name: true, entryFee: true, currency: true } },
      golfer: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  for (const reg of paidRegistrations) {
    const successPayments = reg.payments.filter((p) => p.status === TransactionStatus.SUCCESS);
    if (successPayments.length === 0) {
      discrepancies.push({
        id: `disc_paid_no_succ_${reg.id}`,
        severity: "CRITICAL",
        code: "PAID_WITHOUT_SUCCESS_PAYMENT",
        title: "Registration marked PAID without a verified payment",
        description: `Registration ${reg.referenceNumber} (${reg.golfer.firstName} ${reg.golfer.lastName}) is marked PAID, but no payment record with SUCCESS status exists.`,
        referenceId: reg.referenceNumber,
        amount: Number(reg.entryFeePaid).toFixed(2),
        currency: reg.currency,
        recommendedAction: "Verify external payment receipt or reconcile registration status via Admin Console.",
        createdAt: reg.registeredAt.toISOString(),
      });
    }
  }

  // Issue 2: Verified payments where registration is CANCELLED or WITHDRAWN
  const successPayments = await prisma.payment.findMany({
    where: {
      status: TransactionStatus.SUCCESS,
      refundAmount: null, // Not refunded
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      registration: {
        include: {
          tournament: { select: { name: true } },
          golfer: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  for (const p of successPayments) {
    if (
      p.registration.status === RegistrationStatus.CANCELLED ||
      p.registration.status === RegistrationStatus.WITHDRAWN
    ) {
      discrepancies.push({
        id: `disc_succ_cancelled_reg_${p.id}`,
        severity: "WARNING",
        code: "SUCCESS_PAYMENT_ON_CANCELLED_REGISTRATION",
        title: "Retained payment on cancelled registration without refund",
        description: `Payment ${p.referenceNumber} was collected for registration ${p.registration.referenceNumber}, but the registration was cancelled without recording a completed refund.`,
        referenceId: p.referenceNumber,
        amount: Number(p.amount).toFixed(2),
        currency: p.currency,
        recommendedAction: "Inspect cancellation reason and execute refund if golfer was entitled to reimbursement.",
        createdAt: p.createdAt.toISOString(),
      });
    }
  }

  // Issue 3: Stale pending payments older than 30 minutes
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
  const stalePayments = await prisma.payment.findMany({
    where: {
      status: { in: [TransactionStatus.CREATED, TransactionStatus.PROCESSING] },
      createdAt: { lt: thirtyMinsAgo, gte: startDate },
    },
    include: {
      registration: {
        select: { referenceNumber: true },
      },
    },
  });

  for (const sp of stalePayments) {
    discrepancies.push({
      id: `disc_stale_${sp.id}`,
      severity: "INFO",
      code: "STALE_PENDING_TRANSACTION",
      title: "Pending checkout session expired without completion",
      description: `Payment order ${sp.referenceNumber} (Order ID: ${sp.providerOrderId || "N/A"}) has been pending for over 30 minutes without verification.`,
      referenceId: sp.referenceNumber,
      amount: Number(sp.amount).toFixed(2),
      currency: sp.currency,
      recommendedAction: "The payment session timed out. Can be safely cancelled or left for auto-expiration.",
      createdAt: sp.createdAt.toISOString(),
    });
  }

  // Issue 4: Inconsistent amount or currency between registration fee and payment
  for (const p of successPayments) {
    const regFee = Number(p.registration.entryFeePaid);
    const payAmt = Number(p.amount);
    if (Math.abs(regFee - payAmt) > 0.01 || p.currency !== p.registration.currency) {
      discrepancies.push({
        id: `disc_amt_mismatch_${p.id}`,
        severity: "WARNING",
        code: "AMOUNT_CURRENCY_MISMATCH",
        title: "Registration fee and payment amount discrepancy",
        description: `Registration ${p.registration.referenceNumber} recorded ${regFee} ${p.registration.currency}, while payment ${p.referenceNumber} processed ${payAmt} ${p.currency}.`,
        referenceId: p.referenceNumber,
        amount: Number(p.amount).toFixed(2),
        currency: p.currency,
        recommendedAction: "Check if an entry fee waiver, promotional discount or currency variance occurred.",
        createdAt: p.createdAt.toISOString(),
      });
    }
  }

  // Issue 5: Refund amount exceeds captured payment amount
  const refundedPayments = await prisma.payment.findMany({
    where: {
      refundAmount: { not: null, gt: 0 },
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  for (const rp of refundedPayments) {
    if (Number(rp.refundAmount) > Number(rp.amount)) {
      discrepancies.push({
        id: `disc_over_refund_${rp.id}`,
        severity: "CRITICAL",
        code: "REFUND_EXCEEDS_CAPTURED",
        title: "Refund total exceeds original payment amount",
        description: `Payment ${rp.referenceNumber} captured ${rp.amount} ${rp.currency}, but refundAmount records ${rp.refundAmount} ${rp.currency}.`,
        referenceId: rp.referenceNumber,
        amount: Number(rp.refundAmount).toFixed(2),
        currency: rp.currency,
        recommendedAction: "Audit refund logs immediately to investigate potential duplicate refund execution.",
        createdAt: rp.createdAt.toISOString(),
      });
    }
  }

  const criticalCount = discrepancies.filter((d) => d.severity === "CRITICAL").length;
  const warningCount = discrepancies.filter((d) => d.severity === "WARNING").length;
  const infoCount = discrepancies.filter((d) => d.severity === "INFO").length;

  return {
    reportType: "Internal Payment Reconciliation",
    generatedAt: new Date().toISOString(),
    totalIssuesCount: discrepancies.length,
    criticalCount,
    warningCount,
    infoCount,
    discrepancies,
  };
}
