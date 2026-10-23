import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deriveTournamentLifecycle } from "@/lib/tournament-lifecycle";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const dbT = await prisma.tournament.findFirst({
        where: {
          OR: [{ slug }, { id: slug }],
          status: { not: "DRAFT" },
        },
        include: {
          hostClub: true,
          divisions: true,
          _count: {
            select: {
              registrations: {
                where: {
                  status: { in: ["CONFIRMED", "PENDING"] },
                },
              },
            },
          },
        },
      });

      if (!dbT) {
        return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
      }

      const lifecycle = deriveTournamentLifecycle({
        status: dbT.status,
        startDate: dbT.startDate,
        endDate: dbT.endDate,
        registrationOpenAt: dbT.registrationOpenAt,
        registrationCloseAt: dbT.registrationCloseAt,
        fieldCapacity: dbT.fieldCapacity,
        registrationsCount: dbT._count?.registrations ?? 0,
        timeZone: dbT.timeZone,
        publishedAt: dbT.publishedAt,
      });

      return NextResponse.json({
        tournament: {
          id: dbT.id,
          name: dbT.name,
          slug: dbT.slug,
          description: dbT.description,
          startDate: dbT.startDate,
          endDate: dbT.endDate,
          timeZone: dbT.timeZone,
          format: dbT.format,
          access: dbT.access,
          status: dbT.status,
          entryFee: Number(dbT.entryFee),
          currency: dbT.currency,
          fieldCapacity: dbT.fieldCapacity,
          registrationOpenAt: dbT.registrationOpenAt,
          registrationCloseAt: dbT.registrationCloseAt,
          handicapRequired: dbT.handicapRequired,
          maxHandicapLimit: dbT.maxHandicapLimit ? Number(dbT.maxHandicapLimit) : null,
          heroImageUrl: dbT.heroImageUrl,
          featured: dbT.featured,
          hostClub: dbT.hostClub,
          divisions: dbT.divisions,
          lifecycle,
        },
      });
    }

    const dbTournaments = await prisma.tournament.findMany({
      where: {
        status: { not: "DRAFT" },
      },
      include: {
        hostClub: true,
        _count: {
          select: {
            registrations: {
              where: {
                status: { in: ["CONFIRMED", "PENDING"] },
              },
            },
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    const tournaments = dbTournaments.map((dbT) => {
      const lifecycle = deriveTournamentLifecycle({
        status: dbT.status,
        startDate: dbT.startDate,
        endDate: dbT.endDate,
        registrationOpenAt: dbT.registrationOpenAt,
        registrationCloseAt: dbT.registrationCloseAt,
        fieldCapacity: dbT.fieldCapacity,
        registrationsCount: dbT._count?.registrations ?? 0,
        timeZone: dbT.timeZone,
        publishedAt: dbT.publishedAt,
      });

      return {
        id: dbT.id,
        name: dbT.name,
        slug: dbT.slug,
        startDate: dbT.startDate,
        endDate: dbT.endDate,
        format: dbT.format,
        access: dbT.access,
        status: dbT.status,
        entryFee: Number(dbT.entryFee),
        currency: dbT.currency,
        fieldCapacity: dbT.fieldCapacity,
        registrationOpenAt: dbT.registrationOpenAt,
        registrationCloseAt: dbT.registrationCloseAt,
        handicapRequired: dbT.handicapRequired,
        heroImageUrl: dbT.heroImageUrl,
        featured: dbT.featured,
        hostClub: dbT.hostClub,
        lifecycle,
      };
    });

    return NextResponse.json({ tournaments });
  } catch (err: any) {
    console.error("GET /api/tournaments error:", err);
    return NextResponse.json({ error: "Failed to fetch tournaments" }, { status: 500 });
  }
}
