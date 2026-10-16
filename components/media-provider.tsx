"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface MediaContextType {
  getMedia: (slotKey: string, fallbackUrl: string) => string;
  mediaMap: Record<string, string>;
  refreshMedia: () => Promise<void>;
}

const MediaContext = createContext<MediaContextType>({
  getMedia: (_key, fallback) => fallback,
  mediaMap: {},
  refreshMedia: async () => {},
});

export function MediaProvider({
  children,
  initialMedia = {},
}: {
  children: React.ReactNode;
  initialMedia?: Record<string, string>;
}) {
  const [mediaMap, setMediaMap] = useState<Record<string, string>>(initialMedia);

  const fetchMedia = async () => {
    try {
      const res = await fetch("/api/media", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMediaMap(data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const getMedia = (slotKey: string, fallbackUrl: string) => {
    return mediaMap[slotKey] || fallbackUrl;
  };

  return (
    <MediaContext.Provider value={{ getMedia, mediaMap, refreshMedia: fetchMedia }}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia() {
  return useContext(MediaContext);
}
