"use client";

import { useState, type CSSProperties } from "react";
import type { CardData, CardState, Level } from "./types";
import { LEVELS } from "@/lib/levels";
import { CardFront } from "./CardFront";
import { CardBack } from "./CardBack";
import { usePointerTilt } from "./usePointerTilt";

export const CARD_W = 320;
export const CARD_H = 540;

interface CardProps {
  data: CardData;
  /** Override du niveau intrinsèque de la carte (utile pour les démos). */
  level?: Level;
  state?: CardState;
  interactive?: boolean;
}

const FACE_BASE: CSSProperties = {
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  transition: "opacity 0s linear 0.35s",
};

/** Carte complète : tilt 3D au pointeur + flip recto/verso + overlay d'état. */
export function Card({ data, level, state = "dispo", interactive = true }: CardProps) {
  const [flipped, setFlipped] = useState(false);
  const tiltRef = usePointerTilt<HTMLDivElement>();
  const lvl = level ?? data.level;
  const faceBg = LEVELS[lvl].faceBg;

  return (
    <div
      ref={tiltRef}
      className={`lvl-${lvl} no-select`}
      style={{
        width: CARD_W,
        height: CARD_H,
        perspective: 1400,
        cursor: interactive ? "pointer" : "default",
      }}
      onClick={interactive ? () => setFlipped((f) => !f) : undefined}
      title={interactive ? "Clic : retourner · curseur : incliner" : undefined}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* Couche tilt — inclinaison 3D + léger lift, pilotée par les vars du hook */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
            transform:
              "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(calc(1 + 0.04 * var(--active, 0)))",
            transition: "transform 0.22s ease-out",
          }}
        >
          {/* Couche flip recto/verso */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
              transition: "transform 0.7s cubic-bezier(.6,.05,.3,1)",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
            }}
          >
            <div style={{ ...FACE_BASE, background: faceBg, opacity: flipped ? 0 : 1 }}>
              <CardFront data={data} level={lvl} />
            </div>
            <div style={{ ...FACE_BASE, background: faceBg, transform: "rotateY(180deg)", opacity: flipped ? 1 : 0 }}>
              <CardBack data={data} level={lvl} gabarit="D" />
            </div>
          </div>

          {/* Glare — reflet spéculaire qui suit le pointeur (au-dessus des faces) */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "var(--frame-radius)",
              background:
                "radial-gradient(circle at var(--px, 50%) var(--py, 50%), rgba(255,255,255,0.5), rgba(255,255,255,0) 42%)",
              mixBlendMode: "overlay",
              opacity: "var(--active, 0)",
              transition: "opacity 0.22s ease-out",
              transform: "translateZ(2px)",
              pointerEvents: "none",
              zIndex: 6,
            }}
          />
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
    const dashed = {
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
