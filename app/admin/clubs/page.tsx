"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Landmark,
  Search,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Globe,
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Clock,
  Trophy,
  Filter,
} from "lucide-react";

interface Club {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  timeZone: string;
  isActive: boolean;
  heroImageUrl: string | null;
  logoUrl: string | null;
  _count: {
    courses: number;
    tournaments: number;
  };
}

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [detailModalClub, setDetailModalClub] = useState<Club | null>(null);
  const [deleteConfirmClub, setDeleteConfirmClub] = useState<Club | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    city: "",
    state: "",
    country: "India",
    timeZone: "Asia/Kolkata",
    phone: "",
    email: "",
    website: "",
    heroImageUrl: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeFilter !== "all") params.set("isActive", activeFilter);
      params.set("page", page.toString());
      params.set("limit", "10");

      const res = await fetch(`/api/admin/clubs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClubs(data.clubs || []);
        setPagination(data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      console.error("Failed to load clubs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, [page, activeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClubs();
  };

  const openCreateModal = () => {
    setEditingClub(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      city: "",
      state: "",
      country: "India",
      timeZone: "Asia/Kolkata",
      phone: "",
      email: "",
      website: "",
      heroImageUrl: "",
      isActive: true,
    });
    setFormErrors({});
    setServerError(null);
    setModalOpen(true);
  };

  const openEditModal = (club: Club) => {
    setEditingClub(club);
    setFormData({
      name: club.name || "",
      slug: club.slug || "",
      description: club.description || "",
      city: club.city || "",
      state: club.state || "",
      country: club.country || "India",
      timeZone: club.timeZone || "Asia/Kolkata",
      phone: club.phone || "",
      email: club.email || "",
      website: club.website || "",
      heroImageUrl: club.heroImageUrl || "",
      isActive: club.isActive,
    });
    setFormErrors({});
    setServerError(null);
    setModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const autoSlug = !editingClub
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

    // Client-side quick checks
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Club name is required";
    if (!formData.slug.trim()) errors.slug = "Unique slug is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      const url = editingClub ? `/api/admin/clubs/${editingClub.id}` : "/api/admin/clubs";
      const method = editingClub ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
          setServerError(json.error || "Failed to save club record.");
        }
        return;
      }

      setSuccessMessage(editingClub ? "Club updated successfully." : "Club created successfully.");
      setTimeout(() => setSuccessMessage(null), 3500);
      setModalOpen(false);
      fetchClubs();
    } catch (err: any) {
      setServerError(err.message || "An unexpected network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateClub = async () => {
    if (!deleteConfirmClub) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/clubs/${deleteConfirmClub.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to deactivate club.");
        return;
      }
      setSuccessMessage("Club safely deactivated (soft-deactivated).");
      setTimeout(() => setSuccessMessage(null), 3500);
      setDeleteConfirmClub(null);
      fetchClubs();
    } catch (err: any) {
      alert("Error deactivating club: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-[#9e7932] font-extrabold flex items-center gap-1.5">
            <Landmark size={14} /> Golf Facilities Directory
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[#0e2138] mt-1 tracking-tight">
            Club Management
          </h1>
          <p className="text-xs md:text-sm text-slate-600 font-medium mt-1">
            Manage golf clubs, facility information, host associations, and media overrides.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0e2138] text-white font-bold text-xs hover:bg-[#1a365d] active:scale-95 transition-all shadow-sm"
        >
          <Plus size={16} className="text-[#dfbf77]" /> Add New Club
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          {successMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-96">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search clubs by name, city, state..."
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-500 font-semibold">Status:</span>
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#c29b4e]"
          >
            <option value="all">All Clubs</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive / Deactivated</option>
          </select>
        </div>
      </div>

      {/* Clubs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin text-[#dfbf77] mb-2" />
            <p className="text-xs font-medium">Loading clubs from Neon PostgreSQL...</p>
          </div>
        ) : clubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="p-4 rounded-full bg-slate-50 text-slate-400 mb-3">
              <Landmark size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No clubs found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Try adjusting your search criteria or add your first golf facility.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Club Details</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">Courses</th>
                  <th className="px-4 py-3.5">Tournaments</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clubs.map((club) => (
                  <tr key={club.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {club.heroImageUrl ? (
                          <img
                            src={club.heroImageUrl}
                            alt={club.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Landmark size={18} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <button
                            onClick={() => setDetailModalClub(club)}
                            className="text-sm font-bold text-slate-900 hover:text-[#9e7932] truncate text-left block"
                          >
                            {club.name}
                          </button>
                          <span className="text-[11px] font-mono text-slate-400 block truncate">
                            /{club.slug}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {[club.city, club.state].filter(Boolean).join(", ") || club.country}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {club._count.courses} course{club._count.courses === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                        <Trophy size={13} className="text-[#9e7932]" />
                        {club._count.tournaments}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          club.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {club.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/clubs/${club.slug}`}
                          target="_blank"
                          title="View on Public Site"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <ExternalLink size={15} />
                        </Link>
                        <button
                          onClick={() => openEditModal(club)}
                          title="Edit Club"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#9e7932] hover:bg-slate-100 transition-colors"
                        >
                          <Edit size={15} />
                        </button>
                        {club.isActive && (
                          <button
                            onClick={() => setDeleteConfirmClub(club)}
                            title="Deactivate Club"
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
              Showing {clubs.length} of {pagination.total} clubs
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

      {/* Create / Edit Club Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-bold text-[#9e7932] uppercase tracking-wider">
                  {editingClub ? "Update Existing Record" : "New Facility"}
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingClub ? `Edit ${editingClub.name}` : "Add New Golf Club"}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Club Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Prestige Golfshire Club"
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
                    placeholder="prestige-golfshire-club"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                  />
                  {formErrors.slug && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.slug}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Overview of the golf facility, terrain, and clubhouse amenities..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c29b4e]/30 focus:border-[#c29b4e]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Indore"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State / Region</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Madhya Pradesh"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="India"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="proshop@golfshire.com"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://examplegolf.com"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Time Zone</label>
                  <input
                    type="text"
                    value={formData.timeZone}
                    onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                    placeholder="Asia/Kolkata"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#c29b4e]"
                  />
                </div>
              </div>

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
                    href={`/admin/media?page=clubs`}
                    target="_blank"
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 shrink-0 flex items-center gap-1"
                  >
                    Media Slots <ExternalLink size={13} />
                  </Link>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  You can also manage the banner using the Website Media Manager (slot: clubs.{formData.slug || "[slug]"}.hero).
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-[#9e7932] focus:ring-[#c29b4e]"
                />
                <label htmlFor="isActiveCheck" className="font-bold text-slate-700 select-none">
                  Club is active (visible for tournament hosting and public exploration)
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
                  {editingClub ? "Save Changes" : "Create Club"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Club Detail Modal */}
      {detailModalClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#faf5eb] text-[#9e7932]">
                  <Landmark size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{detailModalClub.name}</h3>
                  <span className="text-xs font-mono text-slate-400">/{detailModalClub.slug}</span>
                </div>
              </div>
              <button
                onClick={() => setDetailModalClub(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {detailModalClub.heroImageUrl && (
              <img
                src={detailModalClub.heroImageUrl}
                alt={detailModalClub.name}
                className="w-full h-40 rounded-xl object-cover border border-slate-200"
              />
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              {detailModalClub.description || "No description provided."}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Location</span>
                <span className="font-semibold text-slate-800">
                  {[detailModalClub.city, detailModalClub.state, detailModalClub.country].filter(Boolean).join(", ")}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Time Zone</span>
                <span className="font-semibold text-slate-800">{detailModalClub.timeZone}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Link
                href={`/clubs/${detailModalClub.slug}`}
                target="_blank"
                className="text-xs font-bold text-[#9e7932] hover:underline flex items-center gap-1"
              >
                View Public Profile <ExternalLink size={13} />
              </Link>
              <button
                onClick={() => {
                  const c = detailModalClub;
                  setDetailModalClub(null);
                  openEditModal(c);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all"
              >
                Edit Club Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Modal */}
      {deleteConfirmClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-full bg-amber-50 border border-amber-200">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Deactivate Club?</h3>
                <p className="text-xs text-slate-500">Safe soft-deactivation</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to deactivate <strong>{deleteConfirmClub.name}</strong>?
              This will safely set its status to inactive without deleting existing tournament or course history.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirmClub(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateClub}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5"
              >
                {submitting && <Loader2 size={13} className="animate-spin" />}
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
