"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Lock,
  Unlock,
  Save,
  Send,
  Search,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  Check,
} from "lucide-react";

interface TournamentItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  format: string;
  rounds: { id: string; roundNumber: number; roundDate: string; name: string | null }[];
}

interface RegistrationItem {
  id: string;
  golfer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    handicapIndex: number | null;
  };
  handicapSnapshot: number | null;
  division: { id: string; name: string } | null;
  scorecards: {
    id: string;
    roundId: string;
    status: string;
    totalGross: number | null;
    totalNet: number | null;
    totalStableford: number | null;
    thruHoles: number;
    isCompleted: boolean;
  }[];
}

interface HoleScoreInput {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  grossStrokes: number | "";
  putts?: number | "";
  fairwayHit?: boolean | null;
  greenInRegulation?: boolean | null;
}

export default function AdminScoringPage() {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [rounds, setRounds] = useState<{ id: string; roundNumber: number; name: string | null }[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [selectedGolferId, setSelectedGolferId] = useState<string>("");
  const [searchGolfer, setSearchGolfer] = useState("");
  
  // Scorecard state
  const [existingScorecard, setExistingScorecard] = useState<any>(null);
  const [holes, setHoles] = useState<HoleScoreInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingScorecard, setLoadingScorecard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Verification state
  const [verificationNotes, setVerificationNotes] = useState("");
  const [actionPending, setActionPending] = useState(false);

  // Initialize 18 holes template
  const initHoles = () => {
    return Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: i % 3 === 0 ? 3 : i % 3 === 1 ? 4 : 5,
      strokeIndex: i + 1,
      grossStrokes: "" as const,
      putts: "" as const,
    }));
  };

  // Load tournaments
  useEffect(() => {
    async function loadTournaments() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/tournaments?limit=50");
        if (res.ok) {
          const data = await res.json();
          setTournaments(data.tournaments || []);
          if (data.tournaments && data.tournaments.length > 0) {
            setSelectedTournamentId(data.tournaments[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load tournaments", err);
      } finally {
        setLoading(false);
      }
    }
    loadTournaments();
  }, []);

  // When tournament changes, load its rounds & registrations
  useEffect(() => {
    if (!selectedTournamentId) return;

    async function loadTournamentData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/tournaments/${selectedTournamentId}`);
        if (res.ok) {
          const data = await res.json();
          const tRounds = data.tournament?.rounds || [];
          setRounds(tRounds);
          if (tRounds.length > 0) {
            setSelectedRoundId(tRounds[0].id);
          } else {
            setSelectedRoundId("");
          }
        }

        // Fetch registrations for this tournament
        const regRes = await fetch(`/api/admin/registrations?tournamentId=${selectedTournamentId}&limit=100`);
        if (regRes.ok) {
          const regData = await regRes.json();
          setRegistrations(regData.registrations || []);
          if (regData.registrations && regData.registrations.length > 0) {
            setSelectedGolferId(regData.registrations[0].golfer.id);
          } else {
            setSelectedGolferId("");
          }
        }
      } catch (err) {
        console.error("Failed to load tournament details", err);
      } finally {
        setLoading(false);
      }
    }
    loadTournamentData();
  }, [selectedTournamentId]);

  // When round or golfer changes, fetch existing scorecard
  useEffect(() => {
    if (!selectedRoundId || !selectedGolferId) {
      setExistingScorecard(null);
      setHoles(initHoles());
      return;
    }

    async function loadScorecard() {
      try {
        setLoadingScorecard(true);
        setMessage(null);
        const res = await fetch(`/api/admin/scoring/scorecard?roundId=${selectedRoundId}&golferId=${selectedGolferId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.scorecard) {
            setExistingScorecard(data.scorecard);
            // Populate holes
            const loadedHoles = initHoles().map((h) => {
              const found = data.scorecard.holeScores?.find((hs: any) => hs.holeNumber === h.holeNumber);
              if (found) {
                return {
                  ...h,
                  par: found.par,
                  strokeIndex: found.strokeIndex,
                  grossStrokes: found.grossStrokes,
                  putts: found.putts ?? "",
                };
              }
              return h;
            });
            setHoles(loadedHoles);
          } else {
            setExistingScorecard(null);
            setHoles(initHoles());
          }
        } else {
          setExistingScorecard(null);
          setHoles(initHoles());
        }
      } catch (err) {
        console.error("Failed to load scorecard", err);
        setExistingScorecard(null);
        setHoles(initHoles());
      } finally {
        setLoadingScorecard(false);
      }
    }

    loadScorecard();
  }, [selectedRoundId, selectedGolferId]);

  // Handle stroke change
  const handleScoreChange = (holeNumber: number, value: string) => {
    const num = value === "" ? "" : parseInt(value, 10);
    if (num !== "" && (isNaN(num) || num < 1 || num > 25)) return;

    setHoles((prev) =>
      prev.map((h) => (h.holeNumber === holeNumber ? { ...h, grossStrokes: num } : h))
    );
  };

  // Current registration object
  const currentReg = registrations.find((r) => r.golfer.id === selectedGolferId);

  // Quick calculations for display
  const outHoles = holes.slice(0, 9);
  const inHoles = holes.slice(9, 18);

  const sumGross = (slice: HoleScoreInput[]) =>
    slice.reduce((acc, h) => (typeof h.grossStrokes === "number" ? acc + h.grossStrokes : acc), 0);
  const sumPar = (slice: HoleScoreInput[]) => slice.reduce((acc, h) => acc + h.par, 0);

  const outGross = sumGross(outHoles);
  const inGross = sumGross(inHoles);
  const totalGross = outGross + inGross;
  const totalPar = sumPar(holes);
  const thruCount = holes.filter((h) => typeof h.grossStrokes === "number" && h.grossStrokes > 0).length;

  // Save or submit scorecard
  const saveScores = async (isSubmitting = false) => {
    if (!selectedRoundId || !selectedGolferId || !currentReg) {
      setMessage({ type: "error", text: "Please select tournament, round, and golfer." });
      return;
    }

    const validHoles = holes
      .filter((h) => typeof h.grossStrokes === "number" && h.grossStrokes > 0)
      .map((h) => ({
        holeNumber: h.holeNumber,
        par: h.par,
        strokeIndex: h.strokeIndex,
        grossStrokes: Number(h.grossStrokes),
        putts: h.putts !== "" && h.putts !== undefined ? Number(h.putts) : null,
      }));

    if (validHoles.length === 0) {
      setMessage({ type: "error", text: "Please enter at least one hole score." });
      return;
    }

    if (isSubmitting && validHoles.length < 18) {
      if (!confirm(`Only ${validHoles.length}/18 holes entered. Submit incomplete scorecard anyway?`)) {
        return;
      }
    }

    try {
      setSaving(true);
      setMessage(null);

      const res = await fetch("/api/admin/scoring/scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId: selectedRoundId,
          golferId: selectedGolferId,
          registrationId: currentReg.id,
          holeScores: validHoles,
          isSubmitting,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save score");
      }

      setMessage({ type: "success", text: data.message });
      setExistingScorecard(data.scorecard);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Perform scorecard verification action
  const handleVerifyAction = async (action: "VERIFY" | "REQUEST_CORRECTION" | "UNLOCK") => {
    if (!existingScorecard) return;

    try {
      setActionPending(true);
      setMessage(null);

      const res = await fetch("/api/admin/scoring/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scorecardId: existingScorecard.id,
          action,
          notes: verificationNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification action failed");
      }

      setMessage({ type: "success", text: data.message });
      setExistingScorecard(data.scorecard);
      setVerificationNotes("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionPending(false);
    }
  };

  const isVerified = existingScorecard?.status === "VERIFIED";

  // Filter golfers list
  const filteredRegs = registrations.filter((r) => {
    const fullName = `${r.golfer.firstName} ${r.golfer.lastName}`.toLowerCase();
    const query = searchGolfer.toLowerCase();
    return fullName.includes(query) || r.golfer.email.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/admin/dashboard" className="hover:text-slate-800">Admin</Link>
            <ChevronRight size={14} />
            <span className="text-slate-800 font-medium">Scoring & Verification</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Trophy className="text-[#c29b4e]" size={28} />
            Hole-by-Hole Tournament Scoring
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter player stroke cards, auto-evaluate WHS handicaps, and verify final competition standings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/leaderboards"
            target="_blank"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Eye size={16} />
            View Public Leaderboard
          </Link>
        </div>
      </div>

      {/* Alert banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs uppercase font-bold tracking-wider hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Controls + Golfer Selection (Left 1/3) & Scorecard Matrix (Right 2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tournament & Golfer Selector */}
        <div className="lg:col-span-4 space-y-5">
          {/* Tournament & Round Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Tournament & Round</h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Tournament</label>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="w-full text-sm rounded-lg border-slate-300 bg-white text-slate-800 focus:border-[#c29b4e] focus:ring-[#c29b4e]"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Round</label>
              {rounds.length > 0 ? (
                <select
                  value={selectedRoundId}
                  onChange={(e) => setSelectedRoundId(e.target.value)}
                  className="w-full text-sm rounded-lg border-slate-300 bg-white text-slate-800 focus:border-[#c29b4e] focus:ring-[#c29b4e]"
                >
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      Round {r.roundNumber} {r.name ? `— ${r.name}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-200">
                  No rounds scheduled for this tournament yet.
                </div>
              )}
            </div>
          </div>

          {/* Golfer Roster Selector */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
            <div className="p-4 border-b border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Competitor Field</h2>
                <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  {filteredRegs.length} Registered
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Filter golfer name or email..."
                  value={searchGolfer}
                  onChange={(e) => setSearchGolfer(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-[#c29b4e] focus:ring-[#c29b4e]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {filteredRegs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No golfers registered matching search.
                </div>
              ) : (
                filteredRegs.map((r) => {
                  const isSelected = r.golfer.id === selectedGolferId;
                  const regScorecard = r.scorecards?.find((sc) => sc.roundId === selectedRoundId);

                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedGolferId(r.golfer.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-[#faf5eb] border border-[#c29b4e]/40 shadow-sm"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                          {r.golfer.firstName} {r.golfer.lastName}
                          {regScorecard?.status === "VERIFIED" && (
                            <CheckCircle2 size={14} className="text-emerald-600" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {r.division?.name || "General"} • HCP: {r.handicapSnapshot ?? r.golfer.handicapIndex ?? "0"}
                        </div>
                      </div>

                      <div className="text-right">
                        {regScorecard ? (
                          <div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                regScorecard.status === "VERIFIED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : regScorecard.status === "SUBMITTED"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {regScorecard.status}
                            </span>
                            <div className="text-xs font-bold text-slate-800 mt-1">
                              {regScorecard.totalGross ?? "—"} ({regScorecard.thruHoles}h)
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Not started</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Scorecard Matrix & Verification Actions */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Golfer Card */}
          {currentReg ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Scorecard Entry</span>
                  {existingScorecard?.status ? (
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        existingScorecard.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : existingScorecard.status === "SUBMITTED"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : existingScorecard.status === "CORRECTION_NEEDED"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {existingScorecard.status}
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      NEW CARD
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {currentReg.golfer.firstName} {currentReg.golfer.lastName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Division: <span className="font-semibold text-slate-700">{currentReg.division?.name || "General"}</span> | Handicap Index:{" "}
                  <span className="font-semibold text-slate-700">{currentReg.handicapSnapshot ?? currentReg.golfer.handicapIndex ?? "0"}</span>
                </p>
              </div>

              {/* Status metrics */}
              <div className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Thru</div>
                  <div className="text-base font-extrabold text-slate-800">{thruCount}/18</div>
                </div>
                <div className="w-[1px] h-8 bg-slate-200" />
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Gross</div>
                  <div className="text-base font-extrabold text-[#9e7932]">{totalGross || "—"}</div>
                </div>
                <div className="w-[1px] h-8 bg-slate-200" />
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">To Par</div>
                  <div className="text-base font-extrabold text-slate-800">
                    {thruCount > 0 ? (totalGross - totalPar > 0 ? `+${totalGross - totalPar}` : totalGross - totalPar === 0 ? "E" : totalGross - totalPar) : "—"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              Please select a registered golfer from the roster on the left.
            </div>
          )}

          {/* 18-Hole Matrix */}
          {currentReg && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Hole Breakdown Matrix (Gross Strokes)
                </div>
                {isVerified && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1">
                    <Lock size={12} /> Scorecard Locked
                  </span>
                )}
              </div>

              {loadingScorecard ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="animate-spin text-[#c29b4e]" size={24} />
                  <span className="text-xs">Loading scorecard data...</span>
                </div>
              ) : (
                <div className="overflow-x-auto p-4 space-y-4">
                  {/* Front 9 */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Front 9 (OUT)</h4>
                    <table className="w-full text-center text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2 border-r border-slate-200">Hole</th>
                          {outHoles.map((h) => (
                            <th key={h.holeNumber} className="p-2 border-r border-slate-200 w-10">
                              {h.holeNumber}
                            </th>
                          ))}
                          <th className="p-2 bg-slate-200 font-bold">OUT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="bg-white text-slate-600">
                          <td className="p-2 font-bold text-left border-r border-slate-200 bg-slate-50">Par</td>
                          {outHoles.map((h) => (
                            <td key={h.holeNumber} className="p-2 border-r border-slate-100 font-medium">
                              {h.par}
                            </td>
                          ))}
                          <td className="p-2 font-bold bg-slate-100">{sumPar(outHoles)}</td>
                        </tr>
                        <tr className="bg-white text-slate-500">
                          <td className="p-2 font-bold text-left border-r border-slate-200 bg-slate-50">SI</td>
                          {outHoles.map((h) => (
                            <td key={h.holeNumber} className="p-2 border-r border-slate-100 text-[11px]">
                              {h.strokeIndex}
                            </td>
                          ))}
                          <td className="p-2 bg-slate-100 font-medium">—</td>
                        </tr>
                        <tr className="bg-amber-50/40 font-bold">
                          <td className="p-2 font-bold text-left border-r border-slate-200 bg-amber-50 text-slate-900">
                            Gross
                          </td>
                          {outHoles.map((h) => (
                            <td key={h.holeNumber} className="p-1 border-r border-slate-200">
                              <input
                                type="number"
                                min={1}
                                max={20}
                                disabled={isVerified}
                                value={h.grossStrokes}
                                onChange={(e) => handleScoreChange(h.holeNumber, e.target.value)}
                                className={`w-9 text-center py-1 text-sm font-extrabold rounded border ${
                                  isVerified
                                    ? "bg-slate-100 text-slate-500 border-slate-200"
                                    : "bg-white text-slate-900 border-slate-300 focus:border-[#c29b4e] focus:ring-1 focus:ring-[#c29b4e]"
                                }`}
                              />
                            </td>
                          ))}
                          <td className="p-2 font-extrabold text-sm text-[#9e7932] bg-amber-100/50">
                            {outGross || "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Back 9 */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Back 9 (IN)</h4>
                    <table className="w-full text-center text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2 border-r border-slate-200">Hole</th>
                          {inHoles.map((h) => (
                            <th key={h.holeNumber} className="p-2 border-r border-slate-200 w-10">
                              {h.holeNumber}
                            </th>
                          ))}
                          <th className="p-2 bg-slate-200 font-bold">IN</th>
                          <th className="p-2 bg-[#faf5eb] font-extrabold text-[#9e7932] border-l border-amber-200">TOT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="bg-white text-slate-600">
                          <td className="p-2 font-bold text-left border-r border-slate-200 bg-slate-50">Par</td>
                          {inHoles.map((h) => (
                            <td key={h.holeNumber} className="p-2 border-r border-slate-100 font-medium">
                              {h.par}
                            </td>
                          ))}
                          <td className="p-2 font-bold bg-slate-100">{sumPar(inHoles)}</td>
                          <td className="p-2 font-extrabold bg-[#faf5eb] border-l border-amber-200 text-slate-800">{totalPar}</td>
                        </tr>
                        <tr className="bg-white text-slate-500">
                          <td className="p-2 font-bold text-left border-r border-slate-200 bg-slate-50">SI</td>
                          {inHoles.map((h) => (
                            <td key={h.holeNumber} className="p-2 border-r border-slate-100 text-[11px]">
                              {h.strokeIndex}
                            </td>
                          ))}
                          <td className="p-2 bg-slate-100 font-medium">—</td>
                          <td className="p-2 bg-[#faf5eb] border-l border-amber-200">—</td>
                        </tr>
                        <tr className="bg-amber-50/40 font-bold">
                          <td className="p-2 font-bold text-left border-r border-slate-200 bg-amber-50 text-slate-900">
                            Gross
                          </td>
                          {inHoles.map((h) => (
                            <td key={h.holeNumber} className="p-1 border-r border-slate-200">
                              <input
                                type="number"
                                min={1}
                                max={20}
                                disabled={isVerified}
                                value={h.grossStrokes}
                                onChange={(e) => handleScoreChange(h.holeNumber, e.target.value)}
                                className={`w-9 text-center py-1 text-sm font-extrabold rounded border ${
                                  isVerified
                                    ? "bg-slate-100 text-slate-500 border-slate-200"
                                    : "bg-white text-slate-900 border-slate-300 focus:border-[#c29b4e] focus:ring-1 focus:ring-[#c29b4e]"
                                }`}
                              />
                            </td>
                          ))}
                          <td className="p-2 font-extrabold text-sm text-[#9e7932] bg-amber-100/50">
                            {inGross || "—"}
                          </td>
                          <td className="p-2 font-extrabold text-sm text-[#9e7932] bg-[#f5ebd7] border-l border-amber-300">
                            {totalGross || "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Save and Submit Controls */}
                  <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      * Auto-saves Net strokes & Stableford points according to WHS handicap index.
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => saveScores(false)}
                        disabled={saving || isVerified}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Save size={14} />
                        {saving ? "Saving..." : "Save Progress"}
                      </button>

                      <button
                        type="button"
                        onClick={() => saveScores(true)}
                        disabled={saving || isVerified}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0e382c] hover:bg-[#144d3d] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Send size={14} />
                        Submit for Verification
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification & Review Panel (Platform Admin) */}
          {existingScorecard && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-[#c29b4e]" />
                  Tournament Committee Review & Verification
                </h4>
                <span className="text-xs text-slate-500">
                  Status: <strong className="text-slate-800">{existingScorecard.status}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Correction / Committee Audit Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional review reason or adjustment note..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 py-2 px-3 focus:border-[#c29b4e] focus:ring-[#c29b4e]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                {isVerified ? (
                  <button
                    type="button"
                    onClick={() => handleVerifyAction("UNLOCK")}
                    disabled={actionPending}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Unlock size={14} />
                    Unlock for Score Corrections
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleVerifyAction("VERIFY")}
                      disabled={actionPending}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Check size={14} />
                      Verify & Lock Scorecard
                    </button>

                    <button
                      type="button"
                      onClick={() => handleVerifyAction("REQUEST_CORRECTION")}
                      disabled={actionPending}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      Request Correction
                    </button>
                  </>
                )}
              </div>

              {/* Audit trail */}
              {existingScorecard.auditLogs && existingScorecard.auditLogs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Audit Log History
                  </span>
                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                    {existingScorecard.auditLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="text-xs p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-slate-800">{log.action}</strong>
                          {log.reason && <span className="text-slate-600"> — {log.reason}</span>}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
