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
  /** Горизонтальный охват картинки в градусах. null/360 — полная панорама.
   *  Для широких кадров из Nano Banana (~160°) — частичная панорама без
   *  растяжения на 360°: масштаб естественный, поворот в пределах кадра. */
  haov?: number | null;
}

export default function PanoramaViewer({ imageUrl, onReady, haov }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  function initViewer() {
    if (!containerRef.current || !window.pannellum) return;
    if (viewerRef.current) viewerRef.current.destroy();

    const partial = !!haov && haov < 360;
    const base = {
      type: "equirectangular",
      panorama: imageUrl,
      autoLoad: true,
      compass: false,
      showControls: true,
    };
    const create = (vaov?: number) =>
      window.pannellum.viewer(
        containerRef.current,
        partial && vaov
          ? {
              ...base,
              // частичная панорама: охват по горизонтали haov, по вертикали —
              // по пропорциям картинки; смотреть можно только в пределах кадра
              haov,
              vaov,
              vOffset: 0,
              minYaw: -haov! / 2,
              maxYaw: haov! / 2,
              minPitch: -vaov / 2,
              maxPitch: vaov / 2,
              hfov: Math.min(100, haov! * 0.6),
              yaw: 0,
              pitch: 0,
            }
          : {
              ...base,
              // У сгенерированных панорам низ (надир) и верх (зенит) почти всегда
              // смазаны: не даём смотреть прямо под ноги и прямо в небо.
              minPitch: -45,
              maxPitch: 60,
            }
      );

    if (partial) {
      // вертикальный охват считаем из пропорций картинки
      const img = new Image();
      img.onload = () => {
        if (viewerRef.current) viewerRef.current.destroy();
        const vaov = (haov! * img.naturalHeight) / img.naturalWidth;
        viewerRef.current = create(vaov);
        viewerRef.current.on("load", () => onReady?.());
      };
      img.src = imageUrl;
      return;
    }
    viewerRef.current = create();
    viewerRef.current.on("load", () => onReady?.());
  }

  useEffect(() => {
    // На повторном монтировании (например, второй заход в осмотр этой же или
    // другой локации) скрипт Pannellum уже загружен глобально, и <Script
    // onLoad> для него больше не сработает — next/script вызывает onLoad один
    // раз за весь src на странице, а не при каждом монтировании компонента.
    // Поэтому здесь дополнительно проверяем window.pannellum напрямую.
    if (window.pannellum) initViewer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, haov]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.css"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.js"
        strategy="afterInteractive"
        onLoad={initViewer}
      />
      <div
        ref={containerRef}
        style={{ width: "100%", flex: 1, minHeight: 400, borderRadius: 8, overflow: "hidden" }}
      />
    </>
  );
}