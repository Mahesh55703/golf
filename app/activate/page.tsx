"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Key, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";

function GolferActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlToken = searchParams.get("token") || "";
  const urlEmail = searchParams.get("email") || "";

  const [mode, setMode] = useState<"request" | "confirm">(urlToken ? "confirm" : "request");
  const [email, setEmail] = useState(urlEmail);
  const [token, setToken] = useState(urlToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (urlToken) {
      setMode("confirm");
      setToken(urlToken);
    }
    if (urlEmail) {
      setEmail(urlEmail);
    }
  }, [urlToken, urlEmail]);

  const handleRequestActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/golfer/auth/activate/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setStatusMessage(data.message || "An activation link has been sent if an account matches.");
      setIsSuccess(true);
    } catch {
      setErrorMessage("Failed to send activation email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/golfer/auth/activate/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Activation failed.");
        setSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setStatusMessage("Account successfully activated! Redirecting to dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch {
      setErrorMessage("An error occurred during account activation.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6fbf4] text-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/60 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-100/50 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <Image src="/logo.png" alt="GolfPulse" width={180} height={48} priority />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activate Player Account</h1>
          <p className="text-xs text-slate-500 mt-1">
            Access tournament registrations, scorecards, and statistics
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <p className="font-semibold">{errorMessage}</p>
            </div>
          )}

          {statusMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <p className="font-semibold">{statusMessage}</p>
            </div>
          )}

          {mode === "request" ? (
            <form onSubmit={handleRequestActivation} className="space-y-4">
              <p className="text-xs text-slate-600 mb-2">
                Enter the email address you used when registering for a tournament. We will send you a secure activation link.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registered Email</label>
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

              <button
                type="submit"
                disabled={submitting || (isSuccess && !errorMessage)}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#0b3b24] to-[#124d31] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/15"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Send Activation Link</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode("confirm")}
                  className="text-xs text-emerald-700 font-semibold hover:underline"
                >
                  Already have an activation token?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleConfirmActivation} className="space-y-4">
              <p className="text-xs text-slate-600 mb-2">
                Set a secure password for your account to finish activation.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Activation Token</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste activation token from email"
                    className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition-all"
                  />
                  <Key size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password (min 8 chars)</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition-all"
                  />
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition-all"
                  />
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || (isSuccess && !errorMessage)}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#0b3b24] to-[#124d31] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/15"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Activate & Sign In</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode("request")}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Need a new activation link?
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            <p>
              Already activated?{" "}
              <Link href="/login" className="text-emerald-700 font-bold hover:underline">
                Sign In to Player Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GolferActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e2138] flex items-center justify-center text-white text-xs">Loading activation portal...</div>}>
      <GolferActivateContent />
    </Suspense>
  );
}
