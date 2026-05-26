"use client";

import { useState, type CSSProperties } from "react";
import type { CardData, CardState, Level } from "./types";
import { CardFront } from "./CardFront";
import { CardBack } from "./CardBack";

export const CARD_W = 320;
export const CARD_H = 540;

interface CardProps {
  data: CardData;
  level: Level;
  state?: CardState;
  interactive?: boolean;
}

/** Carte complète : flip 3D recto/verso + overlay d'état. */
export function Card({ data, level, state = "dispo", interactive = true }: CardProps) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className={`lvl-${level} no-select`}
      style={{
        width: CARD_W,
        height: CARD_H,
        perspective: 1400,
        cursor: interactive ? "pointer" : "default",
      }}
      onClick={interactive ? () => setFlipped((f) => !f) : undefined}
      title={interactive ? "Cliquer pour retourner" : undefined}
    >
      {/* Effets d'état hors de la perspective pour ne pas perturber le flip */}
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              transformStyle: "preserve-3d",
              transition: "transform 0.7s cubic-bezier(.6,.05,.3,1)",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                background: level === 4 ? "#0a0a14" : "var(--c-card)",
                opacity: flipped ? 0 : 1,
                transition: "opacity 0s linear 0.35s",
              }}
            >
              <CardFront data={data} level={level} />
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                background: level === 4 ? "#0a0a14" : "var(--c-card)",
                transform: "rotateY(180deg)",
                opacity: flipped ? 1 : 0,
                transition: "opacity 0s linear 0.35s",
              }}
            >
              <CardBack data={data} level={level} gabarit="D" />
            </div>
          </div>
        </div>
        <StateOverlay state={state} />
      </div>
    </div>
  );
}

function StateOverlay({ state }: { state: CardState }) {
  if (state === "dispo") {
    return (
      <div
        style={{
          position: "absolute",
          inset: -2,
          boxShadow: "0 0 0 2px rgba(138,43,226,0.55), 0 0 28px rgba(138,43,226,0.45)",
          borderRadius: 4,
          pointerEvents: "none",
          animation: "haloPulse 2.4s ease-in-out infinite",
        }}
      />
    );
  }
  if (state === "en-echange") {
    const dashed: CSSProperties = {
      position: "absolute",
      inset: -2,
      background: "transparent",
      backgroundImage: "repeating-linear-gradient(45deg, #fbbf24 0 8px, transparent 8px 16px)",
      WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
      WebkitMaskComposite: "xor",
      maskComposite: "exclude",
      padding: 3,
      pointerEvents: "none",
      animation: "echangeShift 0.6s linear infinite",
      borderRadius: 4,
    } as CSSProperties;
    return (
      <>
        <div style={dashed} />
        <div
          style={{
            position: "absolute",
            top: -8,
            left: 8,
            padding: "3px 8px",
            background: "#fbbf24",
            color: "#0f172a",
            fontFamily: "var(--font-pixel-display)",
            fontSize: 7,
            letterSpacing: 1,
            pointerEvents: "none",
          }}
        >
          EN ÉCHANGE
        </div>
      </>
    );
  }
  if (state === "acquise") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            inset: -2,
            boxShadow: "0 0 0 2px rgba(57,255,20,0.65), 0 0 24px rgba(57,255,20,0.25)",
            borderRadius: 4,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 32,
            height: 32,
            background: "#39FF14",
            color: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            boxShadow: "0 0 16px rgba(57,255,20,0.7)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12 L10 18 L20 6" />
          </svg>
        </div>
      </>
    );
  }
  if (state === "verrouillee") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10,12,16,0.62)",
            backdropFilter: "grayscale(80%)",
            WebkitBackdropFilter: "grayscale(80%)",
            pointerEvents: "none",
            zIndex: 9,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-12deg)",
            padding: "8px 22px",
            background: "rgba(0,0,0,0.7)",
            color: "#94a3b8",
            border: "2px solid #94a3b8",
            fontFamily: "var(--font-pixel-display)",
            fontSize: 11,
            letterSpacing: 3,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          VERROUILLÉE
        </div>
        <div style={{ position: "absolute", top: 8, right: 8, color: "#94a3b8", pointerEvents: "none", zIndex: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="11" width="14" height="10" rx="1" />
            <path d="M8 11 V7 a4 4 0 0 1 8 0 V11" />
          </svg>
        </div>
      </>
    );
  }
  return null;
}
