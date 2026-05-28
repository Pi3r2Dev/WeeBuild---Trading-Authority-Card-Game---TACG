"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ACCENT_GREEN } from "../hub/constants";
import { CreditsBadge, StatusBar } from "../hub/primitives";
import { TransitionFrame } from "./TransitionFrame";

const FROM = 47;
const GAIN = 12;
const COIN_COUNT = 12;

type Phase = "idle" | "notify" | "pouring" | "final";

/** Index de la phase active dans le HUD (0 = idle, 1 = en cours, 2 = final). */
function phaseIndex(phase: Phase): number {
  switch (phase) {
    case "idle":
      return 0;
    case "final":
      return 2;
    default:
      return 1;
  }
}

/** Les crédits gagnés « tombent » dans le solde après vérification d'un lien. */
export function CreditRain() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [counter, setCounter] = useState(FROM);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    setCounter(FROM);
    setPhase("idle");
    timers.push(setTimeout(() => setPhase("notify"), 1400));
    timers.push(setTimeout(() => setPhase("pouring"), 2100));
    timers.push(
      setTimeout(() => {
        let c = FROM;
        const tick = () => {
          if (c < FROM + GAIN) {
            c += 1;
            setCounter(c);
            timers.push(setTimeout(tick, 80));
          }
        };
        tick();
      }, 2500)
    );
    timers.push(setTimeout(() => setPhase("final"), 3900));
    timers.push(setTimeout(() => setCycle((n) => n + 1), 7000));
    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  const popping = phase === "pouring" || phase === "final";
  const active = phaseIndex(phase);

  return (
    <TransitionFrame
      phases={[
        { label: "IDLE", color: "#8A2BE2" },
        { label: "+12 CRÉDITS", color: ACCENT_GREEN },
        { label: "SOLDE 59", color: "#8A2BE2" },
      ]}
      active={active}
      onReplay={() => setCycle((n) => n + 1)}
    >
      <StatusBar />
      <div style={{ position: "absolute", top: 44, left: 0, right: 0, padding: "78px 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--hub-fg)", letterSpacing: -0.3 }}>Salut, Alex</div>
            <div style={{ fontSize: 12, color: "var(--hub-fg-soft)", marginTop: 4 }}>Mise à jour du solde</div>
          </div>
          <div key={counter} style={{ position: "relative", animation: popping ? "badgePop 0.32s ease-out" : "none" }}>
            <CreditsBadge value={counter} size="lg" />
            {phase === "final" && (
              <span style={{ position: "absolute", top: -2, right: -18, fontFamily: "var(--font-hub)", fontSize: 14, fontWeight: 700, color: ACCENT_GREEN, textShadow: `0 0 8px ${ACCENT_GREEN}` }}>
                +{GAIN}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notification "lien vérifié" */}
      {phase !== "idle" && (
        <div
          style={{
            position: "absolute",
            top: 150,
            left: 16,
            right: 16,
            zIndex: 25,
            padding: "12px 14px",
            background: "rgba(57,255,20,0.12)",
            border: "1px solid rgba(57,255,20,0.55)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            animation: "notifSlide 0.4s ease-out",
            opacity: phase === "final" ? 0.55 : 1,
            transition: "opacity 0.6s ease-out",
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, #6ee7b7, #22c55e 50%, #15803d)", border: "2px solid #052e16", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 12px ${ACCENT_GREEN}88` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12 L10 18 L20 6" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 8, color: ACCENT_GREEN, letterSpacing: 1.5 }}>LIEN VÉRIFIÉ</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hub-fg)", marginTop: 3 }}>journa-geekachu.fr</div>
            <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", marginTop: 2 }}>Capture confirmée · récompense créditée</div>
          </div>
          <div style={{ fontFamily: "var(--font-hub)", fontWeight: 800, fontSize: 18, color: ACCENT_GREEN, textShadow: `0 0 10px ${ACCENT_GREEN}`, display: "inline-flex", alignItems: "center", gap: 4 }}>
            +{GAIN} <span style={{ fontSize: 14 }}>◆</span>
          </div>
        </div>
      )}

      {/* Pluie de pièces */}
      {phase === "pouring" &&
        Array.from({ length: COIN_COUNT }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 18,
              height: 18,
              zIndex: 22,
              pointerEvents: "none",
              opacity: 0,
              animation: `coinFly${i % 3} 0.95s cubic-bezier(.55,.05,.4,.85) ${i * 0.075}s forwards`,
            }}
          >
            <Coin />
          </div>
        ))}
    </TransitionFrame>
  );
}

function Coin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 6px ${ACCENT_GREEN}cc)` } as CSSProperties}>
      <defs>
        <linearGradient id="coin-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bbf7d0" />
          <stop offset="0.5" stopColor="#39FF14" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <polygon points="12,2 22,9 12,22 2,9" fill="url(#coin-grad)" stroke="#052e16" strokeWidth="1" />
      <polygon points="12,2 17,9 12,12 7,9" fill="#ecfccb" opacity="0.7" />
    </svg>
  );
}
