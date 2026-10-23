"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Flag,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";

interface ClubOption {
  id: string;
  name: string;
  courses: Array<{ id: string; name: string }>;
}

interface Tournament {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hostClubId: string | null;
  defaultCourseId: string | null;
  startDate: string;
  endDate: string;
  timeZone: string;
  format: string;
  access: string;
  status: string;
  entryFee: number;
  currency: string;
  fieldCapacity: number;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  handicapRequired: boolean;
  maxHandicapLimit: number | null;
  heroImageUrl: string | null;
  featured: boolean;
  hostClub?: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  } | null;
  defaultCourse?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    registrations: number;
    divisions: number;
    rounds: number;
  };
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [detailModal, setDetailModal] = useState<Tournament | null>(null);
  const [cancelModal, setCancelModal] = useState<Tournament | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    hostClubId: "",
    defaultCourseId: "",
    startDate: "",
    endDate: "",
    timeZone: "Asia/Kolkata",
    format: "STROKE_PLAY",
    access: "PUBLIC",
    status: "DRAFT",
    entryFee: 0,
    currency: "USD",
    fieldCapacity: 72,
    registrationOpenAt: "",
    registrationCloseAt: "",
    handicapRequired: false,
    maxHandicapLimit: "" as any,
    heroImageUrl: "",
    featured: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load clubs & courses for selector
  const fetchClubsOptions = async () => {
    try {
      const res = await fetch("/api/admin/clubs?limit=50&isActive=true");
      if (res.ok) {
        const data = await res.json();
        // For each club, fetch courses if needed or use club list
        const clubOptions: ClubOption[] = [];
        for (const c of data.clubs) {
          const detailRes = await fetch(`/api/admin/clubs/${c.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            clubOptions.push({
              id: detail.club.id,
              name: detail.club.name,
              courses: detail.club.courses || [],
            });
          }
        }
        setClubs(clubOptions);
      }
    } catch (err) {
      console.error("Failed to load clubs options:", err);
    }
  };

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (formatFilter !== "all") params.set("format", formatFilter);
      if (clubFilter !== "all") params.set("clubId", clubFilter);
      params.set("page", page.toString());
      params.set("limit", "10");

      const res = await fetch(`/api/admin/tournaments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTournaments(data.tournaments || []);
        setPagination(data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      console.error("Failed to load tournaments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubsOptions();
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [page, statusFilter, formatFilter, clubFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTournaments();
  };

  const openCreateModal = () => {
    setEditingTournament(null);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);

    const firstClub = clubs[0];
    const firstCourse = firstClub?.courses[0];

    setFormData({
      name: "",
      slug: "",
      description: "",
      hostClubId: firstClub?.id || "",
      defaultCourseId: firstCourse?.id || "",
      startDate: nextWeek.toISOString().slice(0, 10),
      endDate: nextWeekEnd.toISOString().slice(0, 10),
      timeZone: "Asia/Kolkata",
      format: "STROKE_PLAY",
      access: "PUBLIC",
      status: "DRAFT",
      entryFee: 50,
      currency: "USD",
      fieldCapacity: 72,
      registrationOpenAt: "",
      registrationCloseAt: "",
      handicapRequired: false,
      maxHandicapLimit: "",
      heroImageUrl: "",
      featured: false,
    });
    setFormErrors({});
    setServerError(null);
    setModalOpen(true);
  };

  const openEditModal = (t: Tournament) => {
    setEditingTournament(t);
    setFormData({
      name: t.name || "",
      slug: t.slug || "",
      description: t.description || "",
      hostClubId: t.hostClubId || "",
      defaultCourseId: t.defaultCourseId || "",
      startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : "",
      endDate: t.endDate ? new Date(t.endDate).toISOString().slice(0, 10) : "",
      timeZone: t.timeZone || "Asia/Kolkata",
      format: t.format || "STROKE_PLAY",
      access: t.access || "PUBLIC",
      status: t.status || "DRAFT",
      entryFee: Number(t.entryFee) || 0,
      currency: t.currency || "USD",
      fieldCapacity: t.fieldCapacity || 72,
      registrationOpenAt: t.registrationOpenAt
        ? new Date(t.registrationOpenAt).toISOString().slice(0, 10)
        : "",
      registrationCloseAt: t.registrationCloseAt
        ? new Date(t.registrationCloseAt).toISOString().slice(0, 10)
        : "",
      handicapRequired: t.handicapRequired || false,
      maxHandicapLimit: t.maxHandicapLimit !== null ? t.maxHandicapLimit : "",
      heroImageUrl: t.heroImageUrl || "",
      featured: t.featured || false,
    });
    setFormErrors({});
    setServerError(null);
    setModalOpen(true);
  };

  const handleClubChange = (clubId: string) => {
    const selectedClub = clubs.find((c) => c.id === clubId);
    const firstCourse = selectedClub?.courses[0]?.id || "";
    setFormData((prev) => ({
      ...prev,
      hostClubId: clubId,
      defaultCourseId: firstCourse,
    }));
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const autoSlug = !editingTournament
        ? name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        : prev.slug;
      return { ...prev, name, slug: autoSlug };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setServerError(null);
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Tournament name is required";
    if (!formData.slug.trim()) errors.slug = "Unique slug is required";
    if (!formData.startDate) errors.startDate = "Start date is required";
    if (!formData.endDate) errors.endDate = "End date is required";
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      errors.endDate = "End date cannot precede start date";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      const url = editingTournament
        ? `/api/admin/tournaments/${editingTournament.id}`
        : "/api/admin/tournaments";
      const method = editingTournament ? "PUT" : "POST";

      const payload = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        registrationOpenAt: formData.registrationOpenAt
          ? new Date(formData.registrationOpenAt).toISOString()
          : null,
        registrationCloseAt: formData.registrationCloseAt
          ? new Date(formData.registrationCloseAt).toISOString()
          : null,
        entryFee: Number(formData.entryFee),
        fieldCapacity: Number(formData.fieldCapacity),
        maxHandicapLimit: formData.maxHandicapLimit !== "" ? Number(formData.maxHandicapLimit) : null,
        hostClubId: formData.hostClubId || null,
        defaultCourseId: formData.defaultCourseId || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.details && Array.isArray(json.details)) {
          const fieldMap: Record<string, string> = {};
          json.details.forEach((d: any) => {
            if (d.path?.[0]) fieldMap[d.path[0]] = d.message;
          });
          setFormErrors(fieldMap);
        } else {
          setServerError(json.error || "Failed to save tournament.");
        }
        return;
      }

      setSuccessMessage(
        editingTournament
          ? "Tournament updated successfully."
          : "Tournament created and published to database."
      );
      setTimeout(() => setSuccessMessage(null), 3500);
      setModalOpen(false);
      fetchTournaments();
    } catch (err: any) {
      setServerError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Lifecycle Action (Publish, Open Reg, Close Reg, Cancel)
  const handleLifecycleTransition = async (tournamentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Lifecycle transition rejected.");
        return;
      }
      setSuccessMessage(`Tournament status transitioned to ${newStatus.replace("_", " ")}.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      setCancelModal(null);
      fetchTournaments();
    } catch (err: any) {
      alert("Error transitioning status: " + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REGISTRATION_OPEN":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PUBLISHED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "REGISTRATION_CLOSED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "IN_PROGRESS":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "SCORING_REVIEW":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "FINALIZED":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-[#9e7932] font-extrabold flex items-center gap-1.5">
            <Trophy size={14} /> Competitive Schedule
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[#0e2138] mt-1 tracking-tight">
            Tournament Management
          </h1>
          <p className="text-xs md:text-sm text-slate-600 font-medium mt-1">
            Create, schedule, publish, and govern golf tournaments across partner clubs.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0e2138] text-white font-bold text-xs hover:bg-[#1a365d] active:scale-95 transition-all shadow-sm"
        >
          <Plus size={16} className="text-[#dfbf77]" /> Create Tournament
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          {successMessage}
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-80">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tournaments, slug, club..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-bold uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#c29b4e]"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="REGISTRATION_OPEN">Registration Open</option>
              <option value="REGISTRATION_CLOSED">Registration Closed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FINALIZED">Finalized</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Format Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-bold uppercase">Format:</span>
            <select
              value={formatFilter}
              onChange={(e) => {
                setFormatFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#c29b4e]"
            >
              <option value="all">All Formats</option>
              <option value="STROKE_PLAY">Stroke Play</option>
              <option value="STABLEFORD">Stableford</option>
              <option value="MATCH_PLAY">Match Play</option>
              <option value="SCRAMBLE">Scramble</option>
              <option value="BETTER_BALL">Better Ball</option>
            </select>
          </div>

          {/* Club Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-bold uppercase">Host:</span>
            <select
              value={clubFilter}
              onChange={(e) => {
                setClubFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#c29b4e] max-w-[140px] truncate"
            >
              <option value="all">All Host Clubs</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tournaments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin text-[#dfbf77] mb-2" />
            <p className="text-xs font-medium">Loading tournaments from database...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="p-4 rounded-full bg-slate-50 text-slate-400 mb-3">
              <Trophy size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No tournaments found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Try adjusting your filters or create a new tournament competition.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Tournament & Club</th>
                  <th className="px-4 py-3.5">Dates</th>
                  <th className="px-4 py-3.5">Format & Fee</th>
                  <th className="px-4 py-3.5">Capacity</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tournaments.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {t.heroImageUrl ? (
                          <img
                            src={t.heroImageUrl}
                            alt={t.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#faf5eb] border border-[#dfbf77]/30 flex items-center justify-center text-[#9e7932] shrink-0">
                            <Trophy size={18} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <button
                            onClick={() => setDetailModal(t)}
                            className="text-sm font-bold text-slate-900 hover:text-[#9e7932] truncate text-left block"
                          >
                            {t.name}
                          </button>
                          <span className="text-[11px] text-slate-500 font-medium block truncate">
                            {t.hostClub?.name || "Unassigned Club"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <span>
                          {new Date(t.startDate).toLocaleDateString()}
                          {t.startDate !== t.endDate && ` – ${new Date(t.endDate).toLocaleDateString()}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-0.5">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {t.format.replace("_", " ")}
                        </span>
                        <div className="text-[11px] font-bold text-slate-800">
                          ${Number(t.entryFee).toFixed(2)} USD
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Users size={13} className="text-slate-400" />
                        <span>
                          {t._count?.registrations || 0} / {t.fieldCapacity}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                          t.status
                        )}`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Status Quick Actions */}
                        {t.status === "DRAFT" && (
                          <button
                            onClick={() => handleLifecycleTransition(t.id, "PUBLISHED")}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200 transition-all"
                          >
                            Publish
                          </button>
                        )}
                        {t.status === "PUBLISHED" && (
                          <button
                            onClick={() => handleLifecycleTransition(t.id, "REGISTRATION_OPEN")}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all"
                          >
                            Open Reg
                          </button>
                        )}
                        {t.status === "REGISTRATION_OPEN" && (
                          <button
                            onClick={() => handleLifecycleTransition(t.id, "REGISTRATION_CLOSED")}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200 transition-all"
                          >
                            Close Reg
                          </button>
                        )}
                        {t.status === "REGISTRATION_CLOSED" && (
                          <>
                            <button
                              onClick={() => handleLifecycleTransition(t.id, "REGISTRATION_OPEN")}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 transition-all"
                            >
                              Open Reg
                            </button>
                            <button
                              onClick={() => handleLifecycleTransition(t.id, "IN_PROGRESS")}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-200 transition-all"
                            >
                              Start Play
                            </button>
                          </>
                        )}
                        {t.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => handleLifecycleTransition(t.id, "SCORING_REVIEW")}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-200 transition-all"
                          >
                            Review Scores
                          </button>
                        )}
                        {t.status === "SCORING_REVIEW" && (
                          <button
                            onClick={() => handleLifecycleTransition(t.id, "FINALIZED")}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-300 transition-all"
                          >
                            Finalize
                          </button>
                        )}

                        <Link
                          href={`/tournaments/${t.slug}`}
                          target="_blank"
                          title="View on Public Site"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <ExternalLink size={15} />
                        </Link>
                        <button
                          onClick={() => openEditModal(t)}
                          title="Edit Tournament"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#9e7932] hover:bg-slate-100 transition-colors"
                        >
                          <Edit size={15} />
                        </button>
                        {t.status !== "CANCELLED" && t.status !== "FINALIZED" && (
                          <button
                            onClick={() => setCancelModal(t)}
                            title="Cancel Tournament"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {tournaments.length} of {pagination.total} tournaments
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 font-bold text-slate-700">
                {page} / {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Tournament Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-bold text-[#9e7932] uppercase tracking-wider">
                  {editingTournament ? "Update Tournament" : "New Competition"}
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingTournament ? `Edit ${editingTournament.name}` : "Create Tournament Event"}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              {serverError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 font-medium">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  {serverError}
                </div>
              )}

              {/* Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tournament Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Indore Championship Open 2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unique Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="indore-open-2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                  />
                  {formErrors.slug && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.slug}</p>
                  )}
                </div>
              </div>

              {/* Host Club & Course Cascade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Building2 size={13} className="text-[#9e7932]" /> Host Club *
                  </label>
                  <select
                    value={formData.hostClubId}
                    onChange={(e) => handleClubChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#c29b4e]"
                  >
                    <option value="">Select Host Club...</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Flag size={13} className="text-[#9e7932]" /> Default Golf Course *
                  </label>
                  <select
                    value={formData.defaultCourseId}
                    onChange={(e) => setFormData({ ...formData, defaultCourseId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#c29b4e]"
                  >
                    {(() => {
                      const selClub = clubs.find((c) => c.id === formData.hostClubId);
                      if (!selClub || selClub.courses.length === 0) {
                        return <option value="">No courses configured for club</option>;
                      }
                      return selClub.courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Official tournament brief, schedule details, eligibility criteria..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                />
              </div>

              {/* Dates & Timezone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                  {formErrors.startDate && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                  {formErrors.endDate && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.endDate}</p>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Time Zone</label>
                  <input
                    type="text"
                    value={formData.timeZone}
                    onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                </div>
              </div>

              {/* Format, Access & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tournament Format</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#c29b4e]"
                  >
                    <option value="STROKE_PLAY">Stroke Play</option>
                    <option value="STABLEFORD">Stableford</option>
                    <option value="MATCH_PLAY">Match Play</option>
                    <option value="SCRAMBLE">Scramble</option>
                    <option value="BETTER_BALL">Better Ball</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Access Type</label>
                  <select
                    value={formData.access}
                    onChange={(e) => setFormData({ ...formData, access: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#c29b4e]"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="MEMBERS_ONLY">Members Only</option>
                    <option value="INVITATIONAL">Invitational</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lifecycle Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#c29b4e]"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="REGISTRATION_OPEN">Registration Open</option>
                    <option value="REGISTRATION_CLOSED">Registration Closed</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="FINALIZED">Finalized</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Entry Fee & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Entry Fee ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formData.entryFee}
                    onChange={(e) => setFormData({ ...formData, entryFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Field Capacity (Players)</label>
                  <input
                    type="number"
                    min="4"
                    max="288"
                    value={formData.fieldCapacity}
                    onChange={(e) => setFormData({ ...formData, fieldCapacity: parseInt(e.target.value) || 72 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Handicap Limit</label>
                  <input
                    type="number"
                    min="0"
                    max="54"
                    step="0.1"
                    placeholder="None (Open)"
                    value={formData.maxHandicapLimit}
                    onChange={(e) => setFormData({ ...formData, maxHandicapLimit: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                </div>
              </div>

              {/* Hero Image & Media Integration */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hero Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.heroImageUrl}
                    onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                  <Link
                    href={`/admin/media?page=tournaments`}
                    target="_blank"
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 shrink-0 flex items-center gap-1"
                  >
                    Media Slots <ExternalLink size={13} />
                  </Link>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Public page uses Website Media Manager slot: tournaments.{formData.slug || "[slug]"}.hero.
                </p>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.handicapRequired}
                    onChange={(e) => setFormData({ ...formData, handicapRequired: e.target.checked })}
                    className="rounded border-slate-300 text-[#9e7932] focus:ring-[#c29b4e]"
                  />
                  Handicap index required for entry
                </label>
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded border-slate-300 text-[#9e7932] focus:ring-[#c29b4e]"
                  />
                  Featured tournament on homepage
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0e2138] text-white font-bold hover:bg-[#1a365d] disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editingTournament ? "Save Tournament" : "Create Tournament"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tournament Details Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#faf5eb] text-[#9e7932]">
                  <Trophy size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{detailModal.name}</h3>
                  <span className="text-xs font-mono text-slate-400">/{detailModal.slug}</span>
                </div>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {detailModal.heroImageUrl && (
              <img
                src={detailModal.heroImageUrl}
                alt={detailModal.name}
                className="w-full h-44 rounded-xl object-cover border border-slate-200"
              />
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              {detailModal.description || "No official description provided."}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Host Club</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {detailModal.hostClub?.name || "Unassigned"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Format</span>
                <span className="font-semibold text-slate-800">{detailModal.format.replace("_", " ")}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Entry Fee</span>
                <span className="font-semibold text-slate-800">${Number(detailModal.entryFee).toFixed(2)} USD</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Field Size</span>
                <span className="font-semibold text-slate-800">{detailModal.fieldCapacity} golfers</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Link
                href={`/tournaments/${detailModal.slug}`}
                target="_blank"
                className="text-xs font-bold text-[#9e7932] hover:underline flex items-center gap-1"
              >
                View Public Event Page <ExternalLink size={13} />
              </Link>
              <button
                onClick={() => {
                  const t = detailModal;
                  setDetailModal(null);
                  openEditModal(t);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all"
              >
                Edit Event Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel Tournament?</h3>
                <p className="text-xs text-slate-500">Official lifecycle transition</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to transition <strong>{cancelModal.name}</strong> to{" "}
              <span className="text-rose-600 font-bold">CANCELLED</span>? This will close all active
              registrations and preserve tournament audit logs.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setCancelModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Never mind
              </button>
              <button
                onClick={() => handleLifecycleTransition(cancelModal.id, "CANCELLED")}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
