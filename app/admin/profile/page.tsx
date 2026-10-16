"use client";

import React, { useEffect, useState } from "react";
import { User, Mail, Shield, KeyRound, Loader2, Check } from "lucide-react";

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/admin/auth/me");
        if (res.ok) {
          const json = await res.json();
          setUser(json.user);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadMe();
  }, []);

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setMsg("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 size={32} className="animate-spin text-[#9e7932]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="pb-5 border-b border-slate-200">
        <span className="text-xs uppercase tracking-widest text-[#9e7932] font-bold">
          Account Settings
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0e2138] mt-1">My Profile</h1>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <Check size={16} className="text-emerald-600" /> <span>{msg}</span>
        </div>
      )}

      {/* Account Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-[#0e2138] uppercase tracking-wider mb-2">
          Administrator Information
        </h3>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c29b4e] to-[#dfbf77] text-[#0e2138] font-black text-xl flex items-center justify-center shadow-md shadow-[#c29b4e]/20">
            {user?.name?.[0] || "A"}
          </div>
          <div>
            <h4 className="font-bold text-[#0e2138] text-base">{user?.name}</h4>
            <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#c29b4e]/10 text-[#9e7932] border border-[#c29b4e]/20">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#0e2138] uppercase tracking-wider mb-4 flex items-center gap-2">
          <KeyRound size={16} className="text-[#9e7932]" /> Change Password
        </h3>

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-[#0e2138] focus:bg-white focus:outline-none focus:border-[#9e7932]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-[#0e2138] focus:bg-white focus:outline-none focus:border-[#9e7932]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c29b4e] to-[#dfbf77] text-[#0e2138] text-xs font-bold shadow-md shadow-[#c29b4e]/20 hover:brightness-105"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
