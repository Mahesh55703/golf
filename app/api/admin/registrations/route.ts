import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { RegistrationStatus, PaymentStatus } from "@prisma/client";

// GET /api/admin/registrations - List registrations with search, filter, and pagination
export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const tournamentId = searchParams.get("tournamentId");
    const status = searchParams.get("status") as RegistrationStatus | null;
    const paymentStatus = searchParams.get("paymentStatus") as PaymentStatus | null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));

    const where: any = {};

    if (tournamentId) {
      where.tournamentId = tournamentId;
    }

    if (status && Object.values(RegistrationStatus).includes(status)) {
      where.status = status;
    }

    if (paymentStatus && Object.values(PaymentStatus).includes(paymentStatus)) {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: "insensitive" } },
        { golfer: { firstName: { contains: search, mode: "insensitive" } } },
        { golfer: { lastName: { contains: search, mode: "insensitive" } } },
        { golfer: { email: { contains: search, mode: "insensitive" } } },
        { tournament: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, registrations] = await Promise.all([
      prisma.registration.count({ where }),
      prisma.registration.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { registeredAt: "desc" },
        include: {
          golfer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              country: true,
              homeClub: true,
              handicapIndex: true,
              handicapStatus: true,
            },
          },
          tournament: {
            select: {
              id: true,
              name: true,
              slug: true,
              startDate: true,
              endDate: true,
              hostClub: { select: { name: true } },
            },
          },
          division: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      registrations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
