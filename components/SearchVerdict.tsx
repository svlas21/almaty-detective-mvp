"use client";

import { useEffect } from "react";
import RichText from "@/components/RichText";
import { stamp } from "@/lib/sfx";

/** Итог осмотра пустой локации: запись в протокол со штампом (и звук удара). */
export default function SearchVerdict({ note }: { note: string }) {
  useEffect(() => {
    const t = setTimeout(stamp, 150);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="search-verdict" role="status">
      <div className="search-verdict-head">
        <span className="search-verdict-label">Итог осмотра · запись в протокол</span>
        <span className="search-verdict-stamp">Улик не обнаружено</span>
      </div>
      <RichText text={note} className="search-verdict-text" />
    </div>
  );
}
