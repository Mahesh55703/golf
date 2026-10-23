"use client";

import React, { useState } from "react";
import {
  Trophy,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Lock,
} from "lucide-react";

interface DivisionInfo {
  id: string;
  name: string;
  minHandicap?: number | null;
  maxHandicap?: number | null;
  gender?: string;
}

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
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
    divisions: DivisionInfo[];
  };
  onSuccess?: () => void;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function RegistrationModal({
  isOpen,
  onClose,
  tournament,
  onSuccess,
}: RegistrationModalProps) {
  const [step, setStep] = useState<"form" | "confirm" | "payment" | "success">("form");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "India",
    homeClub: "",
    divisionId: tournament.divisions[0]?.id || "",
    handicapIndex: "",
    notes: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdRegistration, setCreatedRegistration] = useState<any>(null);
  const [confirmedRegistration, setConfirmedRegistration] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  if (!isOpen) return null;

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (tournament.handicapRequired && !formData.handicapIndex.trim()) {
      errors.handicapIndex = "Handicap index is required for this competition";
    } else if (formData.handicapIndex.trim()) {
      const num = parseFloat(formData.handicapIndex);
      if (isNaN(num) || num < 0 || num > 54) {
        errors.handicapIndex = "Handicap must be between 0.0 and 54.0";
      } else if (
        tournament.maxHandicapLimit !== null &&
        tournament.maxHandicapLimit !== undefined &&
        num > tournament.maxHandicapLimit
      ) {
        errors.handicapIndex = `Handicap exceeds tournament limit of ${tournament.maxHandicapLimit}`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (validateForm()) {
      setStep("confirm");
    }
  };

  const handleCreateRegistration = async () => {
    setSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        tournamentSlug: tournament.slug,
        divisionId: formData.divisionId || null,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        country: formData.country.trim(),
        homeClub: formData.homeClub.trim() || null,
        handicapIndex: formData.handicapIndex.trim() ? parseFloat(formData.handicapIndex) : null,
        notes: formData.notes.trim() || null,
      };

      const res = await fetch("/api/tournaments/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || "Unable to complete registration.");
        setStep("form");
        return;
      }

      setCreatedRegistration(json.registration);

      // If tournament has an entry fee, initiate payment order
      if (Number(tournament.entryFee) > 0) {
        await handleInitiatePayment(json.registration.id);
      } else {
        setConfirmedRegistration(json.registration);
        setStep("success");
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setServerError(err.message || "Network error. Please try again.");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiatePayment = async (registrationId: string) => {
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId }),
      });

      const orderJson = await res.json();
      if (!res.ok) {
        setServerError(orderJson.error || "Failed to initiate payment checkout.");
        setStep("form");
        return;
      }

      setPaymentData(orderJson);
      setStep("payment");
    } catch (err: any) {
      setServerError(err.message || "Failed to connect to payment gateway.");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteCheckout = async () => {
    if (!paymentData) return;

    // Check if Razorpay script is loaded and configured
    if (paymentData.isConfigured && paymentData.keyId) {
      // Load Razorpay checkout script if not present
      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const options = {
        key: paymentData.keyId,
        amount: paymentData.amountMinor,
        currency: paymentData.currency,
        name: "GolfPulse Tournament Entry",
        description: `${tournament.name} - Registration Fee`,
        order_id: paymentData.orderId,
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#0e2138",
        },
        handler: async function (response: any) {
          await verifyAndFinalize(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
        },
        modal: {
          ondismiss: function () {
            // Keep on payment screen so user can retry or pay later
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } else if (paymentData.isSimulation) {
      // Only in explicit non-production environments with simulation enabled
      setVerifyingPayment(true);
      setTimeout(async () => {
        await verifyAndFinalize(paymentData.orderId, `pay_sim_${Date.now().toString().slice(-6)}`, "DEV_SIMULATED_SIGNATURE");
      }, 1000);
    } else {
      // Unconfigured in production or simulation disabled
      setServerError(
        "Payment checkout is temporarily unavailable. Razorpay credentials are not configured on the server."
      );
    }
  };

  const verifyAndFinalize = async (orderId: string, paymentId: string, signature: string) => {
    setVerifyingPayment(true);
    setServerError(null);

    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentId, signature }),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "Payment verification failed.");
        return;
      }

      setConfirmedRegistration(json.registration);
      setStep("success");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setServerError(err.message || "Failed to verify payment with server.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  const selectedDivision = tournament.divisions.find((d) => d.id === formData.divisionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#faf5eb] text-[#9e7932] border border-[#dfbf77]/30">
              <Trophy size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#9e7932] uppercase tracking-wider block">
                Official Golfer Entry
              </span>
              <h2 className="text-lg font-black text-[#0e2138] leading-tight truncate max-w-xs sm:max-w-md">
                {tournament.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6">
          {serverError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              {serverError}
            </div>
          )}

          {step === "form" && (
            <form onSubmit={handleNextToConfirm} className="space-y-4 text-xs">
              {/* Event Quick Summary Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-slate-700">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#9e7932]" />
                  <span className="font-semibold text-slate-900">{tournament.club}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-[#9e7932]" />
                  <span>{tournament.startDate}</span>
                </div>
                <div className="font-bold text-[#0e2138] bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {Number(tournament.entryFee) > 0
                    ? `${Number(tournament.entryFee).toFixed(2)} ${tournament.currency || "USD"}`
                    : "Free Entry"}
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Arjun"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                  />
                  {formErrors.firstName && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Mehta"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                  />
                  {formErrors.lastName && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Contact Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="arjun.mehta@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile / WhatsApp</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                  />
                </div>
              </div>

              {/* Division Selection */}
              {tournament.divisions.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Competitive Division *</span>
                    <span className="text-[11px] text-slate-400 font-normal">Flight category</span>
                  </label>
                  <select
                    value={formData.divisionId}
                    onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#c29b4e]"
                  >
                    {tournament.divisions.map((div) => (
                      <option key={div.id} value={div.id}>
                        {div.name}
                        {div.maxHandicap ? ` (Max HDCP: ${div.maxHandicap})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Handicap & Home Club */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Handicap Index {tournament.handicapRequired ? "*" : "(Optional)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="54"
                    value={formData.handicapIndex}
                    onChange={(e) => setFormData({ ...formData, handicapIndex: e.target.value })}
                    placeholder="e.g. 12.4"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                  />
                  {formErrors.handicapIndex && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.handicapIndex}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    Self-declared handicap index for pairings snapshot.
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Home Club / Facility</label>
                  <input
                    type="text"
                    value={formData.homeClub}
                    onChange={(e) => setFormData({ ...formData, homeClub: e.target.value })}
                    placeholder="e.g. Royal Calcutta Golf Club"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                  />
                </div>
              </div>

              {/* Special Requests / Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Special Notes / Cart Requests</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Pairing preferences, diet requirements, or rental clubs needed..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {tournament.spotsLeft} spots remaining
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#0e2138] text-white font-bold hover:bg-[#1a365d] active:scale-95 transition-all flex items-center gap-2 shadow-sm"
                  >
                    Review Entry <ArrowRight size={14} className="text-[#dfbf77]" />
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === "confirm" && (
            <div className="space-y-5 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#9e7932] tracking-wider block">
                  Registration Review
                </span>
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Golfer Name</span>
                    <strong className="text-slate-900 text-sm">
                      {formData.firstName} {formData.lastName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Email Address</span>
                    <strong className="text-slate-900">{formData.email}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tournament</span>
                    <strong className="text-slate-900">{tournament.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Host Club</span>
                    <strong className="text-slate-900">{tournament.club}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Division</span>
                    <strong className="text-slate-900">
                      {selectedDivision?.name || "Open Championship"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Declared Handicap</span>
                    <strong className="text-slate-900">
                      {formData.handicapIndex ? formData.handicapIndex : "Open / Scratch"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="p-4 rounded-2xl bg-[#faf5eb] border border-[#dfbf77]/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#9e7932] uppercase tracking-wider block">
                    Tournament Entry Fee
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {Number(tournament.entryFee) > 0
                      ? "Payable securely via online checkout"
                      : "Complimentary event entry"}
                  </span>
                </div>
                <div className="text-xl font-black text-[#0e2138]">
                  {Number(tournament.entryFee) > 0 ? (
                    <>
                      {Number(tournament.entryFee).toFixed(2)}{" "}
                      <span className="text-xs font-semibold">{tournament.currency || "USD"}</span>
                    </>
                  ) : (
                    "FREE"
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all"
                >
                  ← Edit Details
                </button>
                <button
                  type="button"
                  onClick={handleCreateRegistration}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c29b4e] to-[#dfbf77] text-[#0e2138] font-bold hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-[#c29b4e]/20"
                >
                  {submitting && <Loader2 size={14} className="animate-spin text-[#0e2138]" />}
                  {Number(tournament.entryFee) > 0 ? "Proceed to Payment →" : "Confirm Free Entry"}
                </button>
              </div>
            </div>
          )}

          {step === "payment" && paymentData && (
            <div className="space-y-5 text-xs text-center py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#faf5eb] text-[#9e7932] border border-[#dfbf77]/40 flex items-center justify-center">
                <CreditCard size={28} />
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9e7932] block mb-1">
                  {paymentData.isSimulation ? "Development Sandbox Checkout" : "Secure Checkout"}
                </span>
                <h3 className="text-xl font-black text-[#0e2138]">
                  Complete Entry Fee Payment
                </h3>
                {paymentData.isSimulation ? (
                  <div className="mt-1 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-semibold inline-block">
                    ⚠️ SIMULATED PAYMENT (TEST MODE) — NO REAL FUNDS WILL BE CHARGED
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Your place is reserved pending payment verification.
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-sm mx-auto text-left space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Registration Ref</span>
                  <span className="font-mono font-bold text-slate-900">
                    {createdRegistration?.referenceNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Payment Ref</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 block">
                      {paymentData.paymentReference}
                    </span>
                    {paymentData.isSimulation && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                        SIMULATED ORDER
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Total Payable</span>
                  <span className="text-base font-black text-[#0e2138]">
                    {paymentData.amount.toFixed(2)} {paymentData.currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <Lock size={12} className={paymentData.isSimulation ? "text-amber-600" : "text-emerald-600"} />
                <span>
                  {paymentData.isSimulation
                    ? "Sandbox Simulation (ENABLE_PAYMENT_SIMULATION=true)"
                    : "256-bit encrypted gateway verification"}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all"
                >
                  Pay Later
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCheckout}
                  disabled={verifyingPayment}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c29b4e] to-[#dfbf77] text-[#0e2138] font-bold hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-[#c29b4e]/20"
                >
                  {verifyingPayment && <Loader2 size={14} className="animate-spin text-[#0e2138]" />}
                  {verifyingPayment
                    ? (paymentData.isSimulation ? "Simulating Payment..." : "Verifying...")
                    : paymentData.isSimulation
                    ? `Simulate Pay ${paymentData.amount.toFixed(2)} ${paymentData.currency} (TEST)`
                    : `Pay ${paymentData.amount.toFixed(2)} ${paymentData.currency}`}
                </button>
              </div>
            </div>
          )}

          {step === "success" && confirmedRegistration && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest block mb-1">
                  Registration Confirmed!
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Welcome to {confirmedRegistration.tournamentName || tournament.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your entry is securely confirmed and verified in GolfPulse.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-sm mx-auto text-left text-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Reference Number</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {confirmedRegistration.referenceNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Golfer</span>
                  <span className="font-bold text-slate-900">{confirmedRegistration.golferName}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Division</span>
                  <span className="font-bold text-slate-900">{confirmedRegistration.divisionName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payment Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck size={12} /> {confirmedRegistration.paymentStatus || "PAID"}
                    </span>
                    {paymentData?.isSimulation && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                        SIMULATED TEST
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#0e2138] text-white font-bold text-xs hover:bg-[#1a365d] active:scale-95 transition-all shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
