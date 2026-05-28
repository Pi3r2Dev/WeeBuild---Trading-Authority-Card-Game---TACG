"use client";

import type { CSSProperties } from "react";
import type { AuthorityTrust } from "@/lib/authority/trust";
import { authorityTrustBadgeLabel } from "@/lib/authority/trust";

const PIXEL: CSSProperties = {
  fontFamily: "var(--font-pixel-display)",
  letterSpacing: 1,
  fontWeight: 700,
};

const TRUST_STYLE: Record<
  Exclude<AuthorityTrust, "verified">,
  { background: string; border: string; color: string; shadow: string }
> = {
  estimated: {
    background: "rgba(251,191,36,0.92)",
    border: "rgba(251,191,36,0.55)",
    color: "#422006",
    shadow: "0 0 10px rgba(251,191,36,0.45)",
  },
  declared: {
    background: "rgba(251,146,60,0.92)",
    border: "rgba(251,146,60,0.55)",
    color: "#431407",
    shadow: "0 0 10px rgba(251,146,60,0.4)",
  },
};

/** Badge pixel « ESTIMÉ » / « DÉCLARÉ » sur mini-cartes (visible par tous les joueurs). */
export function AuthorityTrustBadge({
  trust,
  fontSize = 7,
  style,
}: {
  trust: Exclude<AuthorityTrust, "verified">;
  fontSize?: number;
  style?: CSSProperties;
}) {
  const palette = TRUST_STYLE[trust];
  return (
    <div
      style={{
        ...PIXEL,
        padding: "3px 7px",
        fontSize,
        borderRadius: 4,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        boxShadow: palette.shadow,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {authorityTrustBadgeLabel(trust)}
    </div>
  );
}
