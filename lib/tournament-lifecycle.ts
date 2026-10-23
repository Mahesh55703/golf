import { TournamentStatus } from "@prisma/client";

export type TournamentDisplayStatus =
  | "Registration open"
  | "Coming soon"
  | "Opens soon"
  | "Registration closed"
  | "In progress"
  | "Scoring review"
  | "Completed"
  | "Cancelled"
  | "Full";

export type TournamentBadgeStyle =
  | "status-open"
  | "status-soon"
  | "status-closed"
  | "status-inprogress"
  | "status-review"
  | "status-completed"
  | "status-cancelled"
  | "status-full";

export interface TournamentLifecyclePresentation {
  /** The stored database TournamentStatus */
  rawStatus: TournamentStatus;
  /** Canonical display status name */
  displayStatus: TournamentDisplayStatus;
  /** Text rendered on status badges */
  badgeLabel: string;
  /** CSS class applied to status badge pill */
  badgeStyle: TournamentBadgeStyle;
  /** Human-readable status label on tournament detail page */
  detailStatusLabel: string;
  /** Descriptive explanation of current tournament entry availability */
  detailStatusDescription: string;
  /** Call-to-action button label */
  ctaLabel: string;
  /** Whether the registration CTA is disabled */
  isCtaDisabled: boolean;
  /** Strict boolean flag whether new registrations and payments are allowed */
  canRegister: boolean;
  /** Machine-readable error code if registration is rejected */
  rejectionCode?: string;
  /** User-facing explanation for rejection */
  rejectionReason?: string;
  /** Remaining available spots */
  spotsLeft: number;
}

export interface TournamentLifecycleInput {
  status: TournamentStatus | string;
  startDate: Date | string;
  endDate: Date | string;
  registrationOpenAt?: Date | string | null;
  registrationCloseAt?: Date | string | null;
  fieldCapacity: number;
  registrationsCount?: number;
  timeZone?: string;
  publishedAt?: Date | string | null;
  /** Optional reference time for unit testing temporal transitions */
  referenceDate?: Date;
}

/**
 * Timezone Policy:
 * - Tournament dates (startDate, endDate, registrationOpenAt, registrationCloseAt) are stored as UTC timestamps in PostgreSQL.
 * - Temporal comparisons (now < registrationOpenAt, now > registrationCloseAt) are evaluated in UTC milliseconds
 *   to ensure absolute deterministic transitions across all server regions.
 * - When dates are displayed to users, they are localized using the tournament's configured `timeZone` (default: "Asia/Kolkata").
 */

/**
 * Centralized Authoritative Tournament Lifecycle Service.
 * Evaluates the stored tournament state, publication flag, registration window, capacity,
 * and cancellation status to produce synchronized lifecycle presentation and registration eligibility.
 */
export function deriveTournamentLifecycle(input: TournamentLifecycleInput): TournamentLifecyclePresentation {
  const now = input.referenceDate ?? new Date();
  const capacity = Math.max(1, input.fieldCapacity);
  const activeCount = Math.max(0, input.registrationsCount ?? 0);
  const spotsLeft = Math.max(0, capacity - activeCount);

  const regOpen = input.registrationOpenAt ? new Date(input.registrationOpenAt) : null;
  const regClose = input.registrationCloseAt ? new Date(input.registrationCloseAt) : null;

  const rawStatus = (input.status as TournamentStatus) || TournamentStatus.DRAFT;

  // 1. CANCELLED: Tournament was cancelled. Registration permanently prohibited.
  if (rawStatus === TournamentStatus.CANCELLED) {
    return {
      rawStatus,
      displayStatus: "Cancelled",
      badgeLabel: "Cancelled",
      badgeStyle: "status-cancelled",
      detailStatusLabel: "Cancelled",
      detailStatusDescription: "This tournament has been cancelled. Registrations are not accepted.",
      ctaLabel: "Tournament cancelled",
      isCtaDisabled: true,
      canRegister: false,
      rejectionCode: "TOURNAMENT_CANCELLED",
      rejectionReason: "This tournament has been cancelled. Registrations are not accepted.",
      spotsLeft: 0,
    };
  }

  // 2. FINALIZED: Tournament has officially concluded. Registration closed.
  if (rawStatus === TournamentStatus.FINALIZED) {
    return {
      rawStatus,
      displayStatus: "Completed",
      badgeLabel: "Completed",
      badgeStyle: "status-completed",
      detailStatusLabel: "Completed",
      detailStatusDescription: "This tournament has completed. Competition results are finalized.",
      ctaLabel: "Tournament completed",
      isCtaDisabled: true,
      canRegister: false,
      rejectionCode: "TOURNAMENT_COMPLETED",
      rejectionReason: "This tournament has completed. Registrations are closed.",
      spotsLeft: 0,
    };
  }

  // 3. SCORING_REVIEW: Play concluded; scorecards under official audit. Registration closed.
  if (rawStatus === TournamentStatus.SCORING_REVIEW) {
    return {
      rawStatus,
      displayStatus: "Scoring review",
      badgeLabel: "Scoring review",
      badgeStyle: "status-review",
      detailStatusLabel: "Scoring review",
      detailStatusDescription: "Tournament rounds have concluded and scorecards are in official review.",
      ctaLabel: "Tournament concluded",
      isCtaDisabled: true,
      canRegister: false,
      rejectionCode: "TOURNAMENT_IN_REVIEW",
      rejectionReason: "Tournament play has ended and scoring review is underway.",
      spotsLeft: 0,
    };
  }

  // 4. IN_PROGRESS: Tournament play is currently active. Late registrations prohibited by policy.
  if (rawStatus === TournamentStatus.IN_PROGRESS) {
    return {
      rawStatus,
      displayStatus: "In progress",
      badgeLabel: "In progress",
      badgeStyle: "status-inprogress",
      detailStatusLabel: "In progress",
      detailStatusDescription: "This tournament is currently in progress. Registrations are closed.",
      ctaLabel: "Tournament in progress",
      isCtaDisabled: true,
      canRegister: false,
      rejectionCode: "TOURNAMENT_IN_PROGRESS",
      rejectionReason: "This tournament is currently in progress. Registrations are closed.",
      spotsLeft: 0,
    };
  }

  // 5. REGISTRATION_CLOSED: Manually closed by administrator before start of play.
  if (rawStatus === TournamentStatus.REGISTRATION_CLOSED) {
    return {
      rawStatus,
      displayStatus: "Registration closed",
      badgeLabel: "Registration closed",
      badgeStyle: "status-closed",
      detailStatusLabel: "Registration closed",
      detailStatusDescription: "Registration has been closed by tournament administrators.",
      ctaLabel: "Registration closed",
      isCtaDisabled: true,
      canRegister: false,
      rejectionCode: "REGISTRATION_CLOSED",
      rejectionReason: "Registration is currently closed for this tournament.",
      spotsLeft,
    };
  }

  // 6. DRAFT: Unpublished tournament.
  if (rawStatus === TournamentStatus.DRAFT) {
    return {
      rawStatus,
      displayStatus: "Coming soon",
      badgeLabel: "Draft",
      badgeStyle: "status-soon",
      detailStatusLabel: "Draft (Unpublished)",
      detailStatusDescription: "This tournament is currently in draft state and is not published.",
      ctaLabel: "Registration unavailable",
      isCtaDisabled: true,
      canRegister: false,
      rejectionCode: "TOURNAMENT_NOT_PUBLISHED",
      rejectionReason: "Tournament is not published.",
      spotsLeft,
    };
  }

  // 7. PUBLISHED: Officially scheduled, but registration window not yet active.
  if (rawStatus === TournamentStatus.PUBLISHED) {
    return {
      rawStatus,
      displayStatus: "Coming soon",
      badgeLabel: "Coming soon",
      badgeStyle: "status-soon",
      detailStatusLabel: "Coming soon",
      detailStatusDescription: "Registration has not opened yet. Sign up to receive an official notification.",
      ctaLabel: "Notify me when open",
      isCtaDisabled: true,
      canRegister: false,
      rejectionCode: "REGISTRATION_NOT_YET_OPEN",
      rejectionReason: "Registration for this tournament has not opened yet.",
      spotsLeft,
    };
  }

  // 8. REGISTRATION_OPEN: Registration is administratively open, subject to window and capacity.
  if (rawStatus === TournamentStatus.REGISTRATION_OPEN) {
    // 8a. Registration window has not opened yet (future registrationOpenAt)
    if (regOpen && now < regOpen) {
      return {
        rawStatus,
        displayStatus: "Opens soon",
        badgeLabel: "Opens soon",
        badgeStyle: "status-soon",
        detailStatusLabel: "Opens soon",
        detailStatusDescription: `Registration opens on ${regOpen.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}.`,
        ctaLabel: "Notify me when open",
        isCtaDisabled: true,
        canRegister: false,
        rejectionCode: "REGISTRATION_NOT_YET_OPEN",
        rejectionReason: "Registration for this tournament has not opened yet.",
        spotsLeft,
      };
    }

    // 8b. Registration deadline has elapsed (past registrationCloseAt)
    if (regClose && now > regClose) {
      return {
        rawStatus,
        displayStatus: "Registration closed",
        badgeLabel: "Registration closed",
        badgeStyle: "status-closed",
        detailStatusLabel: "Registration closed",
        detailStatusDescription: "The registration deadline for this tournament has passed.",
        ctaLabel: "Registration closed",
        isCtaDisabled: true,
        canRegister: false,
        rejectionCode: "REGISTRATION_DEADLINE_PASSED",
        rejectionReason: "The registration deadline for this tournament has passed.",
        spotsLeft,
      };
    }

    // 8c. Field capacity has been reached
    if (spotsLeft <= 0) {
      return {
        rawStatus,
        displayStatus: "Full",
        badgeLabel: "Full",
        badgeStyle: "status-full",
        detailStatusLabel: "Tournament full",
        detailStatusDescription: "This tournament has reached maximum player capacity.",
        ctaLabel: "Tournament at capacity",
        isCtaDisabled: true,
        canRegister: false,
        rejectionCode: "TOURNAMENT_CAPACITY_FULL",
        rejectionReason: "This tournament has reached maximum player capacity. Registration is currently full.",
        spotsLeft: 0,
      };
    }

    // 8d. Active, eligible registration open
    return {
      rawStatus,
      displayStatus: "Registration open",
      badgeLabel: "Registration open",
      badgeStyle: "status-open",
      detailStatusLabel: "Registration open",
      detailStatusDescription: "Registration is currently open for this event.",
      ctaLabel: "Register for tournament",
      isCtaDisabled: false,
      canRegister: true,
      spotsLeft,
    };
  }

  // Fallback default for unknown / unexpected states
  return {
    rawStatus,
    displayStatus: "Coming soon",
    badgeLabel: "Coming soon",
    badgeStyle: "status-soon",
    detailStatusLabel: "Coming soon",
    detailStatusDescription: "Event details are being finalized.",
    ctaLabel: "Notify me when open",
    isCtaDisabled: true,
    canRegister: false,
    rejectionCode: "REGISTRATION_NOT_OPEN",
    rejectionReason: "Registration is not currently open for this tournament.",
    spotsLeft,
  };
}
