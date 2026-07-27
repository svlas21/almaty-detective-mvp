"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    pannellum: any;
  }
}

interface PanoramaViewerProps {
  imageUrl: string;
  onReady?: () => void;
}

export default function PanoramaViewer({ imageUrl, onReady }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

  function initViewer() {
    if (!containerRef.current || !window.pannellum) return;
    if (viewerRef.current) viewerRef.current.destroy();

    viewerRef.current = window.pannellum.viewer(containerRef.current, {
      type: "equirectangular",
      panorama: imageUrl,
      autoLoad: true,
      compass: false,
      showControls: true,
    });
    viewerRef.current.on("load", () => onReady?.());
  }

  useEffect(() => {
    if (scriptLoadedRef.current) initViewer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.css"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.js"
        strategy="afterInteractive"
        onLoad={() => {
          scriptLoadedRef.current = true;
          initViewer();
        }}
      />
      <div
        ref={containerRef}
        style={{ width: "100%", flex: 1, minHeight: 400, borderRadius: 8, overflow: "hidden" }}
      />
    </>
  );
}