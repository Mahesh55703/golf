"use client";

import React, { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { RegistrationModal } from "@/components/registration-modal";

interface TournamentRegistrationButtonProps {
  tournament: {
    id: string;
    slug: string;
    name: string;
    club: string;
    location: string;
    startDate: string;
    endDate: string;
    entryFee: number;
    currency?: string;
    format: string;
    handicapRequired: boolean;
    maxHandicapLimit?: number | null;
    spotsLeft: number;
    status: string;
    canRegister?: boolean;
    ctaLabel?: string;
    divisions: Array<{
      id: string;
      name: string;
      minHandicap?: number | null;
      maxHandicap?: number | null;
      gender?: string;
    }>;
  };
}

export function TournamentRegistrationButton({ tournament }: TournamentRegistrationButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Authoritative registration eligibility check
  const isRegistrationOpen =
    tournament.canRegister !== undefined
      ? Boolean(tournament.canRegister) && tournament.spotsLeft > 0
      : tournament.status === "Registration open" && tournament.spotsLeft > 0;

  // Authoritative CTA text resolution
  const getCtaText = () => {
    if (tournament.ctaLabel) return tournament.ctaLabel;
    if (tournament.status === "Registration open") {
      return tournament.spotsLeft > 0 ? "Register for tournament" : "Tournament at capacity";
    }
    if (tournament.status === "In progress") return "Tournament in progress";
    if (tournament.status === "Registration closed") return "Registration closed";
    if (tournament.status === "Completed") return "Tournament completed";
    if (tournament.status === "Cancelled") return "Tournament cancelled";
    if (tournament.status === "Full") return "Tournament at capacity";
    if (tournament.status === "Coming soon" || tournament.status === "Opens soon") {
      return "Notify me when open";
    }
    return "Registration closed";
  };

  return (
    <>
      <button
        onClick={() => {
          if (isRegistrationOpen) setModalOpen(true);
        }}
        disabled={!isRegistrationOpen}
        className={`button ${
          isRegistrationOpen
            ? "button-gold cursor-pointer hover:brightness-105 active:scale-95 transition-all shadow-md"
            : "button-dark opacity-60 cursor-not-allowed"
        }`}
      >
        {getCtaText()} <ArrowUpRight size={16} />
      </button>

      {modalOpen && (
        <RegistrationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          tournament={tournament}
          onSuccess={() => {
            // Optional callback on success
          }}
        />
      )}
    </>
  );
}
