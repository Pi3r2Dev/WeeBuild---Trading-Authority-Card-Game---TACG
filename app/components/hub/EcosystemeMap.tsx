"use client";

import { useState } from "react";
import { ACCENT_GREEN, ACCENT_VIOLET, ELEMENT_COLOR } from "./constants";
import type { Me, NavCard } from "@/lib/domain";
import { CreditsBadge, StatusBar } from "./primitives";
import { BottomNav } from "./BottomNav";
import { MiniCardTCG } from "./MiniCard";
import { icons } from "./icons";
import { GAME_LOOP_ENABLED } from "../app/flags";

const LINKS: [string, string][] = [
  ["korbenito", "numeramon"],
  ["numeramon", "journa-geek"],
  ["journa-geek", "citron-presse"],
  ["citron-presse", "limonade"],
  ["limonade", "echozoum"],
  ["echozoum", "forbeshadow"],
  ["forbeshadow", "wikimons"],
  ["wikimons", "marmitont"],
  ["marmitont", "korbenito"],
  ["citron-presse", "wikimons"],
];

/** Carte écosystème — composant CLIENT (état de sélection), données en props. */
export function EcosystemeMap({ me: ME, navDeck: NAV_DECK }: { me: Me; navDeck: NavCard[] }) {
  const [selectedId, setSelectedId] = useState((NAV_DECK[3] ?? NAV_DECK[0])?.id ?? "");
  const selected = NAV_DECK.find((c) => c.id === selectedId);
  const nodeById = Object.fromEntries(NAV_DECK.map((c) => [c.id, c] as const));

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 0,
          right: 0,
          zIndex: 12,
          padding: "10px 16px 8px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          background: "linear-gradient(180deg, rgba(11,12,16,0.96) 0%, transparent 100%)",
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 9, color: "var(--hub-fg-soft)", letterSpacing: 2 }}>ÉCOSYSTÈME</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--hub-fg)", marginTop: 4, letterSpacing: -0.2 }}>5 biomes · {NAV_DECK.length} sites alliés</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {GAME_LOOP_ENABLED && <CreditsBadge value={ME.credits} />}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 4, fontFamily: "var(--font-pixel-display)", fontSize: 7, color: "var(--hub-fg)", letterSpacing: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT_GREEN, boxShadow: `0 0 5px ${ACCENT_GREEN}` }} />
            VOUS
          </span>
        </div>
      </div>

      {/* Carte SVG */}
      <div style={{ position: "absolute", top: 114, left: 0, right: 0, bottom: 312, overflow: "hidden" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }} shapeRendering="crispEdges">
          <defs>
            <pattern id="grass-h" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="#2d6a4f" />
              <rect x="0" y="0" width="1" height="1" fill="#52b788" />
              <rect x="2" y="2" width="1" height="1" fill="#52b788" />
            </pattern>
            <pattern id="tech-tile-h" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#1e3a8a" />
              <rect x="0" y="0" width="2" height="2" fill="#3b82f6" />
              <rect x="4" y="4" width="1" height="1" fill="#60a5fa" />
            </pattern>
            <pattern id="presse-tile-h" width="5" height="5" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" fill="#7c2d12" />
              <rect x="0" y="0" width="1" height="1" fill="#fbbf24" />
              <rect x="3" y="3" width="1" height="1" fill="#f59e0b" />
            </pattern>
            <pattern id="finance-tile-h" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="#854d0e" />
              <rect x="1" y="1" width="2" height="2" fill="#fbbf24" />
            </pattern>
            <pattern id="encyclo-tile-h" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#4c1d95" />
              <rect x="0" y="0" width="1" height="1" fill="#a78bfa" />
              <rect x="3" y="3" width="2" height="1" fill="#7c3aed" />
            </pattern>
            <pattern id="water-h" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="#0a1638" />
              <rect x="0" y="2" width="2" height="1" fill="#1e40af" />
              <rect x="2" y="0" width="2" height="1" fill="#1e40af" />
            </pattern>
          </defs>

          <rect width="100" height="100" fill="url(#water-h)" />

          <path d="M 8 35 Q 5 22 18 18 Q 32 12 48 16 Q 62 12 78 18 Q 92 22 92 38 Q 94 52 88 64 Q 90 78 78 86 Q 64 92 50 88 Q 36 92 22 86 Q 10 78 8 64 Q 5 50 8 35 Z" fill="url(#grass-h)" stroke="#1b4332" strokeWidth="0.6" />

          <path d="M 14 26 Q 22 18 36 22 Q 42 30 38 38 Q 28 42 18 38 Q 12 32 14 26 Z" fill="url(#tech-tile-h)" stroke="#0a1638" strokeWidth="0.4" />
          <text x="26" y="32" textAnchor="middle" fontSize="3" fill="#dbeafe" fontFamily="var(--font-pixel-display)" letterSpacing="0.3">TECH</text>
          <path d="M 54 38 Q 68 32 78 42 Q 80 52 70 56 Q 58 54 52 48 Q 50 42 54 38 Z" fill="url(#presse-tile-h)" stroke="#3f1d0a" strokeWidth="0.4" />
          <text x="65" y="47" textAnchor="middle" fontSize="3" fill="#fef3c7" fontFamily="var(--font-pixel-display)" letterSpacing="0.3">PRESSE</text>
          <path d="M 70 58 Q 82 56 88 64 Q 86 76 76 78 Q 66 74 68 64 Q 68 60 70 58 Z" fill="url(#finance-tile-h)" stroke="#3a2106" strokeWidth="0.4" />
          <text x="78" y="68" textAnchor="middle" fontSize="3" fill="#fef3c7" fontFamily="var(--font-pixel-display)" letterSpacing="0.3">FINANCE</text>
          <path d="M 12 60 Q 22 56 32 62 Q 36 70 30 76 Q 18 80 12 72 Q 10 64 12 60 Z" fill="#52b788" stroke="#1b4332" strokeWidth="0.4" />
          <circle cx="18" cy="66" r="1.2" fill="#dc2626" />
          <circle cx="24" cy="70" r="1.2" fill="#dc2626" />
          <circle cx="20" cy="74" r="1.2" fill="#dc2626" />
          <circle cx="28" cy="68" r="1.2" fill="#dc2626" />
          <text x="22" y="64" textAnchor="middle" fontSize="3" fill="#0f172a" fontFamily="var(--font-pixel-display)" letterSpacing="0.3">CUISINE</text>
          <polygon points="44,84 50,68 56,84" fill="url(#encyclo-tile-h)" stroke="#2e1065" strokeWidth="0.4" />
          <polygon points="48,76 50,72 52,76 50,74" fill="#f0abfc" />
          <text x="50" y="89" textAnchor="middle" fontSize="3" fill="#e9d5ff" fontFamily="var(--font-pixel-display)" letterSpacing="0.3">ENCYCLO</text>

          {LINKS.map(([a, b], i) => {
            const na = nodeById[a];
            const nb = nodeById[b];
            if (!na || !nb) return null;
            return <line key={i} x1={na.mapX} y1={na.mapY} x2={nb.mapX} y2={nb.mapY} stroke="#fde68a" strokeWidth="0.6" strokeDasharray="1.2 1.2" opacity="0.7" />;
          })}

          {NAV_DECK.map((card) => {
            const isSel = card.id === selectedId;
            const color = ELEMENT_COLOR[card.element] || "#fff";
            return (
              <g key={card.id} style={{ cursor: "pointer" }} onClick={() => setSelectedId(card.id)} transform={`translate(${card.mapX}, ${card.mapY})`}>
                {isSel && (
                  <circle r="5" fill={color} opacity="0.25">
                    <animate attributeName="r" values="4;6;4" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
                <ellipse cx="0" cy="0.6" rx="2" ry="0.6" fill="#000" opacity="0.4" />
                <polygon points="0,0.5 -1.6,-2 1.6,-2" fill={color} stroke="#0f172a" strokeWidth="0.3" />
                <circle cx="0" cy="-3.4" r="1.8" fill={color} stroke="#0f172a" strokeWidth="0.3" />
                <circle cx="-0.4" cy="-3.8" r="0.6" fill="#fff" opacity="0.7" />
                <rect x="-2.5" y="-7" width="5" height="2.5" fill="#0f172a" rx="0.4" />
                <text x="0" y="-5.2" textAnchor="middle" fontSize="1.6" fill="#fff" fontFamily="var(--font-pixel-display)">L{card.level}</text>
              </g>
            );
          })}

          {/* Avatar VOUS (dans le biome TECH) */}
          <g transform="translate(32, 28)">
            <circle r="3.5" fill={ACCENT_GREEN} opacity="0.18">
              <animate attributeName="r" values="3;4.5;3" dur="2s" repeatCount="indefinite" />
            </circle>
            <ellipse cx="0" cy="2.4" rx="2.2" ry="0.5" fill="#000" opacity="0.45" />
            <rect x="-1.2" y="-2.2" width="2.4" height="1.2" fill="#fbbf24" />
            <rect x="-1.4" y="-1" width="2.8" height="2.6" fill={ACCENT_GREEN} />
            <rect x="-1.6" y="1.6" width="3.2" height="0.8" fill="#1e3a8a" />
            <circle r="0.35" cx="-0.5" cy="-1.8" fill="#0f172a" />
            <circle r="0.35" cx="0.5" cy="-1.8" fill="#0f172a" />
          </g>
        </svg>
      </div>

      {/* Drawer carte sélectionnée */}
      {selected && (
        <div style={{ position: "absolute", bottom: 72, left: 0, right: 0, height: 240, background: "linear-gradient(0deg, rgba(11,12,16,1) 0%, rgba(11,12,16,0.97) 70%, rgba(11,12,16,0.88) 100%)", borderTop: "1px solid rgba(255,255,255,0.12)", zIndex: 11, padding: "14px 16px", display: "flex", gap: 12 }}>
          <MiniCardTCG card={selected} scale={0.36} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 8, color: "var(--hub-fg-soft)", letterSpacing: 1.5, marginBottom: 4 }}>{(selected.biome || "").toUpperCase()} · NIV.{selected.level}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--hub-fg)" }}>{selected.domain}</div>
            <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", marginTop: 4, lineHeight: 1.35 }}>{selected.summary}</div>

            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontFamily: "var(--font-pixel-display)", fontSize: 7 }}>
              <MiniStat k="HP" v={selected.hp} color="#ff3df0" />
              <MiniStat k="ATK" v={selected.atk} color="#00ffff" />
              <MiniStat k="DR" v={selected.dr} color={ACCENT_GREEN} />
            </div>

            <div style={{ marginTop: "auto", display: "flex", gap: 6 }}>
              {selected.status === "verrouillee" ? (
                <button style={{ flex: 1, height: 34, background: "rgba(255,255,255,0.08)", color: "var(--hub-fg-dim)", fontFamily: "var(--font-hub)", fontWeight: 600, fontSize: 11, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, cursor: "not-allowed" }}>
                  Inaccessible · autorité insuffisante
                </button>
              ) : (
                <button style={{ flex: 1, height: 34, background: ACCENT_VIOLET, color: "#fff", fontFamily: "var(--font-hub)", fontWeight: 700, fontSize: 11, border: "none", borderRadius: 5, cursor: "pointer", boxShadow: `0 0 12px ${ACCENT_VIOLET}66`, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {icons.send(12)} Donner depuis votre main
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}

function MiniStat({ k, v, color }: { k: string; v: number; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", padding: "5px 6px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ color: "var(--hub-fg-soft)", letterSpacing: 1 }}>{k}</span>
      <span style={{ color, fontSize: 12, textShadow: `0 0 4px ${color}` }}>{v}</span>
    </div>
  );
}
