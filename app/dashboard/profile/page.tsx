"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Globe,
  Building,
  Activity,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  country: string;
  homeClub: string | null;
  handicapIndex: number | null;
  handicapStatus: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: string;
}

export default function GolferProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    country: "India",
    homeClub: "",
    handicapIndex: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/golfer/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const json = await res.json();
        setProfile(json.profile);
        setFormData({
          firstName: json.profile.firstName || "",
          lastName: json.profile.lastName || "",
          phone: json.profile.phone || "",
          country: json.profile.country || "India",
          homeClub: json.profile.homeClub || "",
          handicapIndex: json.profile.handicapIndex !== null ? String(json.profile.handicapIndex) : "",
        });
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load golfer profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const hdcpNum = formData.handicapIndex.trim() !== "" ? parseFloat(formData.handicapIndex) : null;

    try {
      const res = await fetch("/api/golfer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || null,
          country: formData.country,
          homeClub: formData.homeClub || null,
          handicapIndex: hdcpNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to save profile.");
        setSaving(false);
        return;
      }

      setSuccessMessage("Profile details updated successfully.");
      setProfile((prev) => (prev ? { ...prev, ...data.profile } : null));
    } catch {
      setErrorMessage("An unexpected error occurred while updating profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-white/50 space-y-3">
        <Loader2 className="animate-spin text-[#dfbf77]" size={32} />
        <p className="text-xs">Loading profile settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Golfer Profile Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          View and update your verified player details and competition preferences
        </p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle size={16} className="text-rose-600" />
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-[#0b3b24] text-[#dfff55] flex items-center justify-center text-2xl font-black shadow-md">
            {profile?.firstName?.[0] || "G"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {profile?.firstName} {profile?.lastName}
              </h3>
              {profile?.isEmailVerified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck size={11} /> Verified Account
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{profile?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Email (Protected) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Verified Email Address (Protected)
            </label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={profile?.email || ""}
                className="w-full px-4 py-2.5 pl-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs cursor-not-allowed"
              />
              <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Your registered email links all official entries, payments, and scoring archives.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mobile / Phone</label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Country</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <Globe size={15} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Home Club / Facility</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.homeClub}
                  onChange={(e) => setFormData({ ...formData, homeClub: e.target.value })}
                  placeholder="e.g. Prestige Golfshire Club"
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <Building size={15} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Handicap Index (0.0 to 54.0)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="54"
                  value={formData.handicapIndex}
                  onChange={(e) => setFormData({ ...formData, handicapIndex: e.target.value })}
                  placeholder="e.g. 10.4"
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <Activity size={15} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Declared handicap index for flight pairings.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0b3b24] to-[#124d31] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-emerald-950/10"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
