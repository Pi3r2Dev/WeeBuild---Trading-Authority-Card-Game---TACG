"use client";

import { useState } from "react";
import type { CardData, CardState } from "../card/types";
import { Card } from "../card/Card";
import { ACCENT_GREEN, ACCENT_VIOLET } from "./constants";

const CARD_W = 320;
const CARD_H = 540;

/** Vraie carte D mise à l'échelle — préserve l'identité TCG dans les listes. */
export function MiniCardTCG({
  card,
  scale = 0.32,
  state = "dispo",
  onClick,
  selected = false,
  badge,
}: {
  card: CardData;
  scale?: number;
  state?: CardState;
  onClick?: () => void;
  selected?: boolean;
  badge?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: CARD_W * scale,
        height: CARD_H * scale,
        position: "relative",
        flexShrink: 0,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.25s",
        transform: selected ? "translateY(-8px)" : "translateY(0)",
        filter: selected
          ? `drop-shadow(0 12px 22px ${ACCENT_VIOLET}88)`
          : "drop-shadow(0 6px 14px rgba(0,0,0,0.5))",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        <Card data={card} level={card.level} state={state} interactive={false} />
      </div>
      {badge && (
        <div
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            padding: "3px 7px",
            background: ACCENT_GREEN,
            color: "#0f172a",
            fontFamily: "var(--font-pixel-display)",
            fontSize: 7,
            letterSpacing: 1,
            borderRadius: 4,
            fontWeight: 700,
            boxShadow: `0 0 10px ${ACCENT_GREEN}80`,
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

/** Les sites possédés en éventail TCG ; la carte sélectionnée se soulève. */
export function MyHand({ sites, fan = true }: { sites: CardData[]; fan?: boolean }) {
  const [selectedId, setSelectedId] = useState(sites[0]?.id);
  const scale = 0.34;
  const cardW = CARD_W * scale;
  const cardH = CARD_H * scale;
  const n = sites.length;
  const overlap = fan ? 36 : 8;

  return (
    <div
      style={{
        position: "relative",
        height: cardH + (fan ? 30 : 12),
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      {sites.map((site, i) => {
        const offset = i - (n - 1) / 2;
        const rot = fan ? offset * 6 : 0;
        const tY = fan ? Math.abs(offset) * 6 : 0;
        const selected = site.id === selectedId;
        return (
          <div
            key={site.id}
            onClick={() => setSelectedId(site.id)}
            style={{
              marginLeft: i === 0 ? 0 : -overlap,
              transform: `rotateZ(${rot}deg) translateY(${tY}px)${selected ? " translateY(-12px)" : ""}`,
              transformOrigin: "center bottom",
              transition: "transform 0.3s cubic-bezier(.2,.7,.2,1)",
              cursor: "pointer",
              zIndex: selected ? 20 : i,
              filter: selected
                ? `drop-shadow(0 14px 22px ${ACCENT_VIOLET}88)`
                : "drop-shadow(0 8px 16px rgba(0,0,0,0.5))",
            }}
          >
            <div style={{ width: cardW, height: cardH, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
              >
                <Card data={site} level={site.level} state="dispo" interactive={false} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Flèche "jouer une carte vers une autre". */
export function PlayLink({ color = ACCENT_GREEN, label = "JOUE" }: { color?: string; label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 36 }}>
      <svg width="32" height="14" viewBox="0 0 32 14" fill="none">
        <path d="M2 7 H26" stroke={color} strokeWidth="2" strokeDasharray="3 2" />
        <polygon points="26,3 32,7 26,11" fill={color} />
      </svg>
      <span style={{ fontFamily: "var(--font-pixel-display)", fontSize: 7, color, letterSpacing: 1.2 }}>{label}</span>
    </div>
  );
}
