"use client";

import { useEffect, useState } from "react";
import { ACCENT_GREEN, ACCENT_VIOLET } from "../hub/constants";
// R&D transition (cf. plan 4b, Q1) : reste sur fixtures. Import direct (composant
// "use client" → pas d'accesseur lib/data couplé à Prisma).
import { NAV_DECK } from "@/lib/data/fixtures";
import { StatusBar } from "../hub/primitives";
import { Card } from "../card/Card";
import { TransitionFrame } from "./TransitionFrame";

const target = NAV_DECK.find((c) => c.id === "jdg")!;

// Dimensions de base de la carte (px), avant mise à l'échelle.
const CARD_W = 320;
const CARD_H = 540;

type Placement = { x: number; y: number; scale: number };

const FROM: Placement = { x: 18, y: 558, scale: 0.32 };
const TO: Placement = { x: 24, y: 250, scale: 0.26 };

/** Centre (cx, cy) d'une carte placée, en tenant compte de son échelle. */
function center(p: Placement) {
  return { cx: p.x + CARD_W * p.scale * 0.5, cy: p.y + CARD_H * p.scale * 0.5 };
}

/** La carte cible « vole » du drawer Écosystème vers le slot MEILLEUR FIT de Donner. */
export function CardFlight() {
  const [eco, setEco] = useState(true);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setEco((e) => !e), 3200);
    return () => clearTimeout(t);
  }, [eco, cycle]);

  const f = center(FROM);
  const t = center(TO);
  const ctrlX = (f.cx + t.cx) / 2 + 90;
  const ctrlY = (f.cy + t.cy) / 2;

  return (
    <TransitionFrame
      phases={[
        { label: "1·ÉCOSYSTÈME", color: ACCENT_GREEN },
        { label: "2·DONNER", color: ACCENT_VIOLET },
      ]}
      active={eco ? 0 : 1}
      onReplay={() => {
        setEco(true);
        setCycle((n) => n + 1);
      }}
    >
      <StatusBar />

      {/* Slot Donner (haut) — la carte s'y dépose */}
      <Zone
        top={232}
        label="DONNER · MEILLEUR FIT"
        accent={ACCENT_GREEN}
        filled={!eco}
        height={168}
      />

      {/* Drawer Écosystème (bas) — la carte en part */}
      <Zone
        top={540}
        label="ÉCOSYSTÈME · territoire"
        accent={ACCENT_VIOLET}
        filled={eco}
        height={200}
      />

      {/* Traîne courbe */}
      <svg viewBox="0 0 390 844" style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none", opacity: eco ? 0 : 0.85, transition: "opacity 0.6s ease-out 0.2s" }}>
        <defs>
          <linearGradient id="trail-grad" x1={f.cx} y1={f.cy} x2={t.cx} y2={t.cy} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#39FF14" stopOpacity="0" />
            <stop offset="0.4" stopColor="#39FF14" stopOpacity="0.7" />
            <stop offset="1" stopColor="#8A2BE2" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <path d={`M ${f.cx} ${f.cy} Q ${ctrlX} ${ctrlY} ${t.cx} ${t.cy}`} fill="none" stroke="url(#trail-grad)" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />
      </svg>

      {/* Carte volante */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "top left",
          transform: eco
            ? `translate(${FROM.x}px, ${FROM.y}px) scale(${FROM.scale})`
            : `translate(${TO.x}px, ${TO.y}px) scale(${TO.scale})`,
          transition: "transform 1.05s cubic-bezier(.6,.05,.3,1)",
          zIndex: 10,
          filter: `drop-shadow(0 ${eco ? 14 : 8}px ${eco ? 24 : 14}px rgba(0,0,0,0.55))`,
          pointerEvents: "none",
        }}
      >
        <Card data={target} state="dispo" interactive={false} />
      </div>
    </TransitionFrame>
  );
}

function Zone({ top, label, accent, filled, height }: { top: number; label: string; accent: string; filled: boolean; height: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 16,
        right: 16,
        height,
        borderRadius: 12,
        border: `1px ${filled ? "solid" : "dashed"} ${accent}${filled ? "88" : "44"}`,
        background: filled ? `${accent}0d` : "transparent",
        transition: "all 0.5s ease-out",
        zIndex: 2,
      }}
    >
      <span style={{ position: "absolute", top: -8, left: 12, padding: "2px 8px", background: accent, color: "#0f172a", fontFamily: "var(--font-pixel-display)", fontSize: 7, letterSpacing: 1.5, borderRadius: 3, fontWeight: 700 }}>
        {label}
      </span>
    </div>
  );
}
