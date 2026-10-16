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
  const isRegistrationOpen = tournament.status === "Registration open" && tournament.spotsLeft > 0;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        disabled={!isRegistrationOpen}
        className={`button ${
          isRegistrationOpen
            ? "button-gold cursor-pointer hover:brightness-105 active:scale-95 transition-all shadow-md"
            : "button-dark opacity-60 cursor-not-allowed"
        }`}
      >
        {tournament.status === "Registration open"
          ? tournament.spotsLeft > 0
            ? "Register for tournament"
            : "Tournament at capacity"
          : "Notify me when open"}{" "}
        <ArrowUpRight size={16} />
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
