import type { Metadata } from "next";
import { PT_Serif, JetBrains_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Детектив Алматы",
  description: "Онлайн детективная игра про Алматы (MVP-скелет)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${ptSerif.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
