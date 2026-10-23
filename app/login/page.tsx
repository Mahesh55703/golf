"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function GolferLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/golfer/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to sign in.");
        setErrorCode(data.code || null);
        setSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6fbf4] text-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background soft ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/60 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-100/50 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <Image src="/logo.png" alt="GolfPulse" width={180} height={48} priority />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Player Portal Sign In</h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your registrations, official scorecards & performance
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold">{error}</p>
                {errorCode === "ACCOUNT_NOT_ACTIVATED" && (
                  <Link
                    href={`/activate?email=${encodeURIComponent(email)}`}
                    className="inline-block mt-2 text-emerald-700 hover:underline font-bold"
                  >
                    Activate Account Now →
                  </Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition-all"
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-[11px] text-emerald-700 hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition-all"
                />
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#0b3b24] to-[#124d31] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/15"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            <p>
              Registered for a tournament without a password?{" "}
              <Link href="/activate" className="text-emerald-700 font-bold hover:underline">
                Activate your account
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          <Link href="/tournaments" className="hover:text-slate-800 transition-colors font-medium">
            ← Browse Public Tournaments
          </Link>
        </div>
      </div>
    </div>
  );
}
