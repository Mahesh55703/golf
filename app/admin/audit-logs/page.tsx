"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, FileText, Calendar, User, Loader2 } from "lucide-react";

export default function AuditLogsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"media" | "security">("media");

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/audit-logs");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#9e7932] font-bold">
            Compliance & Auditing
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0e2138] mt-1">Audit Logs</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Complete immutable ledger of all media replacements, crops, and administrative actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("media")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "media"
                ? "bg-gradient-to-r from-[#c29b4e] to-[#dfbf77] text-[#0e2138] shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Media Modifications
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "security"
                ? "bg-gradient-to-r from-[#c29b4e] to-[#dfbf77] text-[#0e2138] shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Security & Auth
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 size={32} className="animate-spin text-[#9e7932]" />
        </div>
      ) : activeTab === "media" ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Action</th>
                <th className="py-4 px-6">Details</th>
                <th className="py-4 px-6">Modified By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.mediaLogs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-[#c29b4e]/10 text-[#9e7932] border border-[#c29b4e]/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-[#0e2138] font-medium">{log.details}</td>
                  <td className="py-4 px-6 text-slate-600 font-semibold">{log.adminUser?.name || "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Action</th>
                <th className="py-4 px-6">Details</th>
                <th className="py-4 px-6">Target / Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.adminLogs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-[#0e2138] font-medium">{log.details}</td>
                  <td className="py-4 px-6 text-slate-600 font-semibold">
                    {log.targetEmail || log.adminUser?.email || "System"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
