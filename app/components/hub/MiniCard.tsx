"use client";

import Link from "next/link";
import type { CardData, CardState } from "../card/types";
import { Card } from "../card/Card";
import { AuthorityTrustBadge } from "../authority/AuthorityTrustBadge";
import { shouldShowAuthorityTrustBadge } from "@/lib/authority/trust";
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
      {shouldShowAuthorityTrustBadge(card.authorityTrust) && (
        <AuthorityTrustBadge
          trust={card.authorityTrust === "declared" ? "declared" : "estimated"}
          style={{ position: "absolute", top: -6, left: -6, zIndex: 2 }}
        />
      )}
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

/** Les sites possédés en éventail TCG ; clic → fiche `/carte/[id]`. */
export function MyHand({
  sites,
  fan = true,
  rescanBadges = {},
}: {
  sites: CardData[];
  fan?: boolean;
  /** Libellé cooldown rescan par `cardId` (ex. « Rescan dans 3 j »). */
  rescanBadges?: Record<string, string>;
}) {
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
        const rescanBadge = rescanBadges[site.id];
        return (
          <Link
            key={site.id}
            href={`/carte/${site.id}`}
            aria-label={`Voir la carte ${site.domain}`}
            style={{
              marginLeft: i === 0 ? 0 : -overlap,
              transform: `rotateZ(${rot}deg) translateY(${tY}px)`,
              transformOrigin: "center bottom",
              transition: "transform 0.3s cubic-bezier(.2,.7,.2,1)",
              cursor: "pointer",
              zIndex: i,
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.5))",
              textDecoration: "none",
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
              {rescanBadge && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 4,
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "3px 8px",
                    background: "rgba(15,23,42,0.92)",
                    border: "1px solid rgba(251,191,36,0.45)",
                    color: "#fcd34d",
                    fontFamily: "var(--font-pixel-display)",
                    fontSize: 6,
                    letterSpacing: 0.6,
                    borderRadius: 4,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
                    zIndex: 2,
                  }}
                >
                  {rescanBadge}
                </div>
              )}
            </div>
          </Link>
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
