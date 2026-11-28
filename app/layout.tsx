import type { Metadata } from "next";
import { PT_Serif, JetBrains_Mono, PT_Mono, Marck_Script } from "next/font/google";
import "./globals.css";

const ptSerif = PT_Serif({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-pt-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Запасной моноширинный шрифт с кириллицей для «машинописи» (основной — Courier New)
const ptMono = PT_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  variable: "--font-pt-mono",
  display: "swap",
});

// Рукописный почерк (записки начальства синим карандашом)
const marckScript = Marck_Script({
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Детектив Алматы",
  description: "Онлайн детективная игра про Алматы (MVP-скелет)",
  // Автоперевод браузера (Google Translate) переписывает текст на странице,
  // и React падает с NotFoundError: insertBefore. Игра и так на русском.
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" translate="no" className={`${ptSerif.variable} ${jetbrainsMono.variable} ${ptMono.variable} ${marckScript.variable}`}>
      <body>{children}</body>
    </html>
  );
}
