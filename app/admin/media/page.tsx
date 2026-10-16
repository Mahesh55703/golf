"use client";

import React, { useEffect, useState, useRef } from "react";
import ImageCropModal from "@/components/admin/image-crop-modal";
import {
  Image as ImageIcon,
  Crop,
  RotateCcw,
  Upload,
  Eye,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";

interface SlotItem {
  id: string;
  slotKey: string;
  pageKey: string;
  displayName: string;
  description: string;
  aspectRatio: string;
  recommendedWidth: number;
  recommendedHeight: number;
  defaultUrl: string;
  activeAssetId?: string | null;
  activeAsset?: {
    id: string;
    url: string;
    title: string;
    fileSize: number;
  } | null;
  lastUpdatedBy?: {
    name: string;
    email: string;
  } | null;
  updatedAt: string;
}

const PAGE_FILTERS = [
  { label: "All Pages", value: "all" },
  { label: "Homepage", value: "home" },
  { label: "Tournaments", value: "tournaments" },
  { label: "Golf Clubs", value: "clubs" },
  { label: "Gallery", value: "gallery" },
  { label: "About Us", value: "about" },
  { label: "FAQ", value: "faq" },
  { label: "Leaderboards", value: "leaderboards" },
  { label: "Contact", value: "contact" },
];

export default function WebsiteMediaManagerPage() {
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [selectedPage, setSelectedPage] = useState("all");
  const [loading, setLoading] = useState(true);
  const [activeSlot, setActiveSlot] = useState<SlotItem | null>(null);

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [targetSlotForCrop, setTargetSlotForCrop] = useState<SlotItem | null>(null);

  // Feedback states
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [uploadingSlotKey, setUploadingSlotKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/media/slots?pageKey=${selectedPage}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch (e) {
      console.error("Failed to load slots:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedPage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, slot: SlotItem) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Open crop editor with selected image
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setTargetSlotForCrop(slot);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!targetSlotForCrop) return;
    setCropModalOpen(false);

    try {
      setUploadingSlotKey(targetSlotForCrop.slotKey);
      const formData = new FormData();
      formData.append("file", croppedBlob, `${targetSlotForCrop.slotKey}_cropped.webp`);
      formData.append("title", `${targetSlotForCrop.displayName} (Cropped)`);
      formData.append("targetSlotKey", targetSlotForCrop.slotKey);

      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload and assignment failed");

      setFeedback({
        message: `Image cropped and published for "${targetSlotForCrop.displayName}"!`,
        type: "success",
      });

      await fetchSlots();
    } catch (err: any) {
      setFeedback({ message: err.message || "Operation failed", type: "error" });
    } finally {
      setUploadingSlotKey(null);
      setTargetSlotForCrop(null);
    }
  };

  const handleResetToDefault = async (slot: SlotItem) => {
    if (!confirm(`Reset "${slot.displayName}" back to its default stock image?`)) return;

    try {
      setUploadingSlotKey(slot.slotKey);
      const res = await fetch("/api/admin/media/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotKey: slot.slotKey, resetToDefault: true }),
      });

      if (!res.ok) throw new Error("Failed to reset");

      setFeedback({
        message: `Reset "${slot.displayName}" to default.`,
        type: "success",
      });

      await fetchSlots();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setUploadingSlotKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-[#9e7932] font-bold">
            Production Management
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
            Website Media Manager
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Replace, crop, and publish live images for any public page without modifying source code.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <Check size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-red-600" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 uppercase tracking-wider font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-thin">
        {PAGE_FILTERS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedPage(tab.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedPage === tab.value
                ? "bg-[#0e2138] text-white shadow-sm"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Slots List */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 size={32} className="animate-spin text-[#9e7932]" />
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <ImageIcon size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-800">No image slots configured for this page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {slots.map((slot) => {
            const currentUrl = slot.activeAsset ? slot.activeAsset.url : slot.defaultUrl;
            const isCustom = Boolean(slot.activeAsset);
            const isUpdating = uploadingSlotKey === slot.slotKey;

            return (
              <div
                key={slot.slotKey}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Image Preview Container */}
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    <img
                      src={currentUrl}
                      alt={slot.displayName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md text-[10px] font-bold uppercase tracking-wider bg-white/90 shadow-sm border border-slate-200">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isCustom ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      <span className={isCustom ? "text-emerald-700" : "text-amber-700"}>
                        {isCustom ? "Custom Published" : "Stock Default"}
                      </span>
                    </div>

                    {/* Aspect & Dimensions Badge */}
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/75 backdrop-blur-md text-[10px] text-white font-mono">
                      {slot.aspectRatio} • {slot.recommendedWidth}×{slot.recommendedHeight}
                    </div>

                    {/* Loading Overlay */}
                    {isUpdating && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center text-slate-900 gap-2">
                        <Loader2 size={20} className="animate-spin text-[#9e7932]" />
                        <span className="text-xs font-bold">Publishing Update...</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="p-5 space-y-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#9e7932] block">
                      {slot.slotKey}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">{slot.displayName}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{slot.description}</p>
                  </div>
                </div>

                {/* Slot Actions Toolbar */}
                <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Replace / Upload button */}
                    <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors">
                      <Upload size={13} className="text-[#9e7932]" />
                      <span>Replace</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={isUpdating}
                        onChange={(e) => handleFileSelect(e, slot)}
                      />
                    </label>

                    {/* Recrop button */}
                    <button
                      onClick={() => {
                        setCropImageSrc(currentUrl);
                        setTargetSlotForCrop(slot);
                        setCropModalOpen(true);
                      }}
                      disabled={isUpdating}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors"
                    >
                      <Crop size={13} className="text-[#9e7932]" />
                      <span>Crop</span>
                    </button>
                  </div>

                  {/* Reset to Default */}
                  {isCustom && (
                    <button
                      onClick={() => handleResetToDefault(slot)}
                      disabled={isUpdating}
                      title="Reset to default stock image"
                      className="p-2 rounded-xl bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 shadow-xs transition-colors"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={cropImageSrc}
        recommendedAspect={targetSlotForCrop?.aspectRatio}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
