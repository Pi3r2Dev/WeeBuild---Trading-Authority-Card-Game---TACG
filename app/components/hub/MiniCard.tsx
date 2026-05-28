"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import type { CardData, CardState } from "../card/types";
import { Card } from "../card/Card";
import { AuthorityTrustBadge } from "../authority/AuthorityTrustBadge";
import { shouldShowAuthorityTrustBadge } from "@/lib/authority/trust";
import {
  HAND_FAN_SCALE,
  HAND_GRAB_SCALE,
  HAND_HOVER_LIFT,
  HAND_HOVER_ZOOM,
} from "@/lib/hub/hand-gesture";
import { useHandCardGesture } from "./useHandCardGesture";
import styles from "./MiniCard.module.css";
import { ACCENT_GREEN, ACCENT_VIOLET } from "./constants";

const emptySubscribe = () => () => {};

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

function HandCardFace({
  site,
  scale,
  interactive,
}: {
  site: CardData;
  scale: number;
  interactive: boolean;
}) {
  return (
    <div
      className={`${styles.handCardScaled} ${interactive ? styles.handCardScaledInteractive : ""}`}
      style={{ transform: `scale(${scale})` }}
    >
      <Card data={site} level={site.level} state="dispo" interactive={interactive} />
    </div>
  );
}

/** Les sites possédés en éventail TCG — survol zoom · tap → fiche · drag → attraper. */
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
  const scale = HAND_FAN_SCALE;
  const cardW = CARD_W * scale;
  const cardH = CARD_H * scale;
  const n = sites.length;
  const overlap = fan ? 36 : 8;
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const { hoveredId, setHoveredId, grabbed, onCardPointerDown } = useHandCardGesture();

  return (
    <>
      <div className={styles.hand} style={{ height: cardH + (fan ? 30 : 12) }}>
        {sites.map((site, i) => {
          const offset = i - (n - 1) / 2;
          const rot = fan ? offset * 6 : 0;
          const tY = fan ? Math.abs(offset) * 6 : 0;
          const rescanBadge = rescanBadges[site.id];
          const isHovered = hoveredId === site.id && grabbed?.card.id !== site.id;
          const isGrabbed = grabbed?.card.id === site.id;
          const isRaised = isHovered || isGrabbed;
          const hoverScale = isHovered ? HAND_HOVER_ZOOM : 1;
          const hoverLift = isHovered ? HAND_HOVER_LIFT : 0;

          return (
            <div
              key={site.id}
              role="button"
              tabIndex={0}
              aria-label={`Carte ${site.domain} — tape pour ouvrir, glisse pour attraper`}
              className={`${styles.handCard} ${isHovered ? styles.handCardHovered : ""} ${isGrabbed ? styles.handCardGhost : ""}`}
              style={{
                marginLeft: i === 0 ? 0 : -overlap,
                width: cardW,
                height: cardH,
                transform: `rotateZ(${rot}deg) translateY(${tY - hoverLift}px) scale(${hoverScale})`,
                zIndex: isRaised ? 100 + i : i,
              }}
              onPointerEnter={() => setHoveredId(site.id)}
              onPointerLeave={() => setHoveredId((id) => (id === site.id ? null : id))}
              onPointerDown={(e) => onCardPointerDown(e, site)}
            >
              <div className={styles.handCardInner} style={{ width: cardW, height: cardH }}>
                <HandCardFace site={site} scale={scale} interactive={false} />
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
                      pointerEvents: "none",
                    }}
                  >
                    {rescanBadge}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {mounted &&
        grabbed &&
        createPortal(
          <>
            <div
              className={styles.grabbedCard}
              style={{
                left: grabbed.x,
                top: grabbed.y,
                width: CARD_W * HAND_GRAB_SCALE,
                height: CARD_H * HAND_GRAB_SCALE,
                transform: `translate(-50%, -50%) rotateZ(${grabbed.tiltDeg}deg)`,
              }}
            >
              <div
                className={styles.handCardScaledInteractive}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: `scale(${HAND_GRAB_SCALE})`,
                  transformOrigin: "top left",
                }}
              >
                <Card data={grabbed.card} level={grabbed.card.level} state="dispo" interactive />
              </div>
            </div>
            <p className={styles.grabbedHint} aria-live="polite">
              Carte en main — relâche pour la remettre
            </p>
          </>,
          document.body,
        )}
    </>
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
