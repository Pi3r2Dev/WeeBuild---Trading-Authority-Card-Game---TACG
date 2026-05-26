"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ACCENT_GREEN, ACCENT_VIOLET } from "../hub/constants";
import { NAV_DECK } from "../hub/data";
import { CreditsBadge, StatusBar } from "../hub/primitives";
import { MiniCardTCG } from "../hub/MiniCard";
import { TransitionFrame } from "./TransitionFrame";

type Phase = "ready" | "stamping" | "sealed";

const target = NAV_DECK.find((c) => c.id === "jdg")!;

// Calendrier de la séquence (ms, relatifs au début du cycle).
const STAMP_DELAY = 1800; // ready → stamping
const SEAL_DELAY = STAMP_DELAY + 950; // stamping → sealed
const REPLAY_DELAY = SEAL_DELAY + 3000; // sealed → cycle suivant

/** Index de la phase active dans le HUD. */
function phaseIndex(phase: Phase): number {
  switch (phase) {
    case "ready":
      return 0;
    case "stamping":
      return 1;
    default:
      return 2;
  }
}

/** La carte publiée se replie et frappe l'écran comme un sceau de cire vert. */
export function WaxSealTransition() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    setPhase("ready");
    timers.push(setTimeout(() => setPhase("stamping"), STAMP_DELAY));
    timers.push(setTimeout(() => setPhase("sealed"), SEAL_DELAY));
    timers.push(setTimeout(() => setCycle((n) => n + 1), REPLAY_DELAY));
    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  const ready = phase === "ready";
  const stamping = phase === "stamping";

  return (
    <TransitionFrame
      phases={[
        { label: "4·DONNER", color: ACCENT_GREEN },
        { label: "SCEAU", color: "#fbbf24" },
        { label: "5·PREUVE", color: ACCENT_VIOLET },
      ]}
      active={phaseIndex(phase)}
      onReplay={() => setCycle((n) => n + 1)}
    >
      <StatusBar />
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 8, color: "var(--hub-fg-soft)", letterSpacing: 2 }}>
          {ready ? "PUBLIER L’ARTICLE" : "SCEAU DE PREUVE"}
        </div>
      </div>

      {/* Scène centrale */}
      <div style={{ position: "absolute", top: 200, left: 0, right: 0, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(57,255,20,0.18) 0%, transparent 65%)",
            opacity: ready ? 1 : 0.4,
            transition: "opacity 0.5s",
          }}
        />

        {/* Carte qui se replie */}
        <div
          style={{
            position: "absolute",
            transformOrigin: "center center",
            transform: ready ? "scale(1) rotate(0deg)" : "scale(0.05) rotate(360deg)",
            opacity: ready ? 1 : 0,
            transition: "transform 0.7s cubic-bezier(.7,0,.5,.4), opacity 0.45s ease-out 0.25s",
            filter: `drop-shadow(0 14px 24px ${ACCENT_GREEN}55)`,
            pointerEvents: "none",
          }}
        >
          <MiniCardTCG card={target} scale={0.42} />
        </div>

        {/* Le sceau */}
        <div
          style={{
            position: "absolute",
            width: 110,
            height: 110,
            transformOrigin: "center center",
            transform: ready ? "scale(0) rotate(-90deg)" : stamping ? "scale(1.25) rotate(0deg)" : "scale(1) rotate(0deg)",
            opacity: ready ? 0 : 1,
            transition: stamping
              ? "transform 0.20s cubic-bezier(.5,1.6,.4,1), opacity 0.05s linear"
              : "transform 0.30s cubic-bezier(.5,.1,.3,1.6) 0.15s, opacity 0.15s ease-out",
            pointerEvents: "none",
          }}
        >
          <WaxSeal />
        </div>

        {stamping && <ShockwaveRing />}
        {stamping && <ImpactSparks />}
      </div>

      {/* Caption finale */}
      <div style={{ position: "absolute", bottom: 110, left: 16, right: 16, display: "flex", justifyContent: "center", opacity: phase === "sealed" ? 1 : 0, transition: "opacity 0.4s ease-out 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: `${ACCENT_GREEN}12`, border: `1px solid ${ACCENT_GREEN}66`, borderRadius: 999 }}>
          <span style={{ fontFamily: "var(--font-pixel-display)", fontSize: 8, color: ACCENT_GREEN, letterSpacing: 1.5 }}>SCEAU APPOSÉ</span>
          <CreditsBadge value="+12" tone="gain" />
        </div>
      </div>
    </TransitionFrame>
  );
}

function WaxSeal() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 4, borderRadius: "50%", boxShadow: "0 8px 24px rgba(0,0,0,0.55)" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle at 32% 28%, #6ee7b7 0%, #22c55e 35%, #15803d 70%, #14532d 100%)",
          border: "3px solid #052e16",
          boxShadow: `inset 0 -10px 18px rgba(0,0,0,0.45), inset 0 10px 12px rgba(255,255,255,0.18), 0 0 24px ${ACCENT_GREEN}55`,
        }}
      />
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <path id="seal-ring" d="M 50 50 m -38 0 a 38 38 0 1 1 76 0 a 38 38 0 1 1 -76 0" />
        </defs>
        <text fontFamily="var(--font-pixel-display)" fontSize="6" fill="#052e16" letterSpacing="1.5">
          <textPath href="#seal-ring" startOffset="0">· LIEN VÉRIFIÉ · WEBUILD · LIEN VÉRIFIÉ · WEBUILD ·</textPath>
        </text>
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#bbf7d0",
          border: "1.5px solid #052e16",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          boxShadow: "inset 0 -3px 6px rgba(0,0,0,0.15)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12 L10 18 L20 6" />
        </svg>
        <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 5, color: "#052e16", letterSpacing: 0.4, marginTop: -2 }}>JDG ‧ +12◆</div>
      </div>
    </div>
  );
}

function ShockwaveRing() {
  return (
    <>
      <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", border: `3px solid ${ACCENT_GREEN}`, animation: "sealShockwave 0.55s ease-out", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", border: "2px solid #fbbf24", animation: "sealShockwave 0.7s ease-out 0.08s", pointerEvents: "none" }} />
    </>
  );
}

const SPARK_COUNT = 12;

function ImpactSparks() {
  return (
    <>
      {Array.from({ length: SPARK_COUNT }).map((_, i) => {
        const angle = (i / SPARK_COUNT) * 360;
        return (
          <div
            key={i}
            style={
              {
                position: "absolute",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: i % 2 ? ACCENT_GREEN : "#fbbf24",
                boxShadow: `0 0 6px ${i % 2 ? ACCENT_GREEN : "#fbbf24"}`,
                animation: `sealSpark${i % 3} 0.5s ease-out forwards`,
                "--a": `${angle}deg`,
                pointerEvents: "none",
              } as CSSProperties
            }
          />
        );
      })}
    </>
  );
}
