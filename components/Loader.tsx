"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Протираем лупу...",
  "Пылим досье...",
  "Ищем зацепки...",
  "Сверяем алиби...",
  "Листаем показания...",
  "Заглядываем в архив...",
];

export default function Loader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % PHRASES.length);
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="detective-loader">
      <div className="detective-loader-badge">🔍</div>
      <p className="detective-loader-text">{PHRASES[index]}</p>
    </div>
  );
}
