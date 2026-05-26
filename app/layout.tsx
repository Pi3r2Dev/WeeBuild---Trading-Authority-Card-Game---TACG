import type { Metadata, Viewport } from "next";
import { Inter, Orbitron, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import "./styles/tokens.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
});
const pressStart = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press-start",
  display: "swap",
});
const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-vt323",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WeBuild — Trading Authority Game",
  description:
    "Le link-building SEO transformé en jeu de cartes. Chaque site déclaré devient une carte dont la rareté reflète son autorité.",
};

export const viewport: Viewport = {
  themeColor: "#0B0C10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${orbitron.variable} ${pressStart.variable} ${vt323.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
