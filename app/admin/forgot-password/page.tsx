"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate secure time-limited reset token dispatch
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/admin/login" className="inline-flex items-center gap-2 text-xs text-[#9e7932] hover:underline mb-4 font-bold">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
          <div className="inline-flex items-center justify-center mb-3">
            <img
              src="/logo.png"
              alt="GolfPulse"
              className="h-14 w-auto object-contain drop-shadow-sm"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#0e2138]">Reset Password</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter your authorized administrative email address
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
              <h3 className="text-base font-bold text-[#0e2138] mb-2">Password Reset Initiated</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                If an administrator account is associated with <span className="text-[#9e7932] font-semibold">{email}</span>, a secure single-use recovery token will be dispatched by the configured email provider.
              </p>
              <Link
                href="/admin/login"
                className="inline-block px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0e2138] text-xs font-semibold transition-colors"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@golfpulse.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[#0e2138] placeholder-slate-400 text-sm focus:outline-none focus:border-[#9e7932] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#c29b4e] to-[#dfbf77] text-[#0e2138] font-bold text-sm shadow-md shadow-[#c29b4e]/20 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Send Reset Instructions"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
