"use client";

import React, { useEffect, useState } from "react";
import { FolderKanban, Search, Trash2, Calendar, HardDrive, Link as LinkIcon, Loader2, Sparkles } from "lucide-react";

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/media/library?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-[#9e7932] font-bold">
            Digital Asset Management
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">Media Library</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Browse, search, and reuse uploaded golf course photography and tournament assets.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-[#9e7932] shadow-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 size={32} className="animate-spin text-[#9e7932]" />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <FolderKanban size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-800">No assets found</p>
          <p className="text-xs text-slate-500 mt-1">Upload images via the Website Media Manager to build your library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                  <img
                    src={asset.url}
                    alt={asset.title || "Asset"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-white">
                    {(asset.fileSize / 1024).toFixed(0)} KB
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{asset.title || "Untitled Image"}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Calendar size={12} />
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                  </div>

                  {asset.assignments?.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-[#9e7932] flex items-center gap-1">
                        <LinkIcon size={10} /> Active in:
                      </span>
                      <p className="text-[10px] text-slate-600 truncate">
                        {asset.assignments.map((a: any) => a.displayName).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
