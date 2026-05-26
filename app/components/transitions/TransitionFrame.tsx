"use client";

import type { ReactNode } from "react";
import { ACCENT_VIOLET } from "../hub/constants";
import { PhoneFrame } from "../hub/primitives";

export interface Phase {
  label: string;
  color: string;
}

/** Cadre commun des démos de transition : phone + HUD de phases + Replay. */
export function TransitionFrame({
  phases,
  active,
  onReplay,
  children,
}: {
  phases: Phase[];
  active: number;
  onReplay: () => void;
  children: ReactNode;
}) {
  return (
    <PhoneFrame>
      {children}

      <div
        style={{
          position: "absolute",
          top: 50,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 30,
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "4px 10px",
          background: "rgba(0,0,0,0.6)",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(6px)",
          fontFamily: "var(--font-pixel-display)",
          fontSize: 7,
          letterSpacing: 1.5,
          whiteSpace: "nowrap",
        }}
      >
        {phases.map((p, i) => (
          <span key={p.label} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            {i > 0 && <span style={{ color: "#fbbf24" }}>·</span>}
            <span style={{ color: i === active ? p.color : "var(--hub-fg-dim)", transition: "color 0.4s" }}>{p.label}</span>
          </span>
        ))}
      </div>

      <button
        onClick={onReplay}
        style={{
          position: "absolute",
          top: 100,
          right: 14,
          zIndex: 30,
          padding: "6px 12px",
          background: "rgba(138,43,226,0.20)",
          border: `1px solid ${ACCENT_VIOLET}88`,
          color: "#fff",
          fontFamily: "var(--font-hub)",
          fontWeight: 600,
          fontSize: 11,
          borderRadius: 999,
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12 A9 9 0 1 1 7 20 M3 12 L3 6 M3 12 L9 12" />
        </svg>
        Rejouer
      </button>
    </PhoneFrame>
  );
}
