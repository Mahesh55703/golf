"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCw, Check, Loader2, Sparkles } from "lucide-react";

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  recommendedAspect?: string; // e.g. "16:9", "21:9", "4:3", "1:1"
  onCropComplete: (croppedBlob: Blob) => void;
}

const ASPECT_RATIOS = [
  { label: "Hero Wide (16:9)", value: 16 / 9 },
  { label: "Cinematic (21:9)", value: 21 / 9 },
  { label: "Landscape (4:3)", value: 4 / 3 },
  { label: "Gallery (3:2)", value: 3 / 2 },
  { label: "Square (1:1)", value: 1 / 1 },
  { label: "Portrait (3:4)", value: 3 / 4 },
];

function parseAspect(aspect?: string): number {
  if (!aspect) return 16 / 9;
  if (aspect === "21:9") return 21 / 9;
  if (aspect === "16:9") return 16 / 9;
  if (aspect === "4:3") return 4 / 3;
  if (aspect === "3:2") return 3 / 2;
  if (aspect === "1:1") return 1;
  if (aspect === "3:4") return 3 / 4;
  return 16 / 9;
}

export default function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  recommendedAspect,
  onCropComplete,
}: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedAspect, setSelectedAspect] = useState<number>(parseAspect(recommendedAspect));
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropCompleteCallback = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setIsProcessing(true);

    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = imageSrc;

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not create canvas context");

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.save();
      if (rotation !== 0) {
        // Handle rotation if needed
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            onCropComplete(blob);
          }
        },
        "image/webp",
        0.92
      );
    } catch (err) {
      console.error("Crop error:", err);
      setIsProcessing(false);
      alert("Failed to crop image. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#faf5eb] text-[#9e7932] border border-[#dfbf77]/30">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Image Crop & Framing Studio</h2>
              <p className="text-xs text-slate-500">
                Preset recommended for this slot: <span className="text-[#9e7932] font-bold">{recommendedAspect || "16:9"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cropper Work Area */}
        <div className="relative w-full h-[460px] bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={selectedAspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
          />
        </div>

        {/* Controls Toolbar */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col gap-4">
          {/* Aspect presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600 uppercase tracking-wider font-bold mr-2">Aspect Ratio:</span>
            {ASPECT_RATIOS.map((asp) => (
              <button
                key={asp.label}
                onClick={() => setSelectedAspect(asp.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  Math.abs(selectedAspect - asp.value) < 0.01
                    ? "bg-[#0e2138] text-white shadow-sm"
                    : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {asp.label}
              </button>
            ))}
          </div>

          {/* Sliders and Rotate */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <ZoomOut size={16} className="text-slate-400" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.05}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#0e2138] cursor-pointer"
              />
              <ZoomIn size={16} className="text-slate-400" />
              <span className="text-xs text-slate-600 font-mono font-bold w-12">{zoom.toFixed(2)}x</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors"
              >
                <RotateCw size={14} /> Rotate 90°
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setCrop({ x: 0, y: 0 });
                }}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCrop}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0e2138] text-white font-bold text-xs shadow-md hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-[#dfbf77]" /> Processing Crop...
                  </>
                ) : (
                  <>
                    <Check size={16} className="text-[#dfbf77]" /> Save & Apply Crop
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
