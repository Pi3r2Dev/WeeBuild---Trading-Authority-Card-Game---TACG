import type { ElementKind, Level, LinkType } from "./types";

const GLYPH_BASE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Pictogrammes RPG sobres par élément (niche → picto). */
export function ElementGlyph({ el, size = 22 }: { el: ElementKind; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", ...GLYPH_BASE };
  switch (el) {
    case "tech": // foudre
      return (
        <svg {...p}>
          <path d="M13 2 L4 14 H11 L9 22 L20 10 H13 Z" />
        </svg>
      );
    case "finance": // gemme
      return (
        <svg {...p}>
          <path d="M6 3 L18 3 L22 9 L12 22 L2 9 Z M6 3 L9 9 L12 22 M18 3 L15 9 L12 22 M2 9 L22 9" />
        </svg>
      );
    case "sante": // cœur / vie
      return (
        <svg {...p}>
          <path d="M12 22 C 12 22 4 16 4 10 A 5 5 0 0 1 12 6 A 5 5 0 0 1 20 10 C 20 16 12 22 12 22 Z" />
        </svg>
      );
    case "media": // journal
      return (
        <svg {...p}>
          <rect x="3" y="6" width="18" height="14" rx="1" />
          <path d="M3 10 H21 M8 6 V20" />
        </svg>
      );
    default:
      return null;
  }
}

const GEM_COLORS: Record<LinkType, { a: string; b: string; hi: string; label: string }> = {
  dofollow: { a: "#ff5577", b: "#7a0a1f", hi: "#ffd1da", label: "DO" },
  nofollow: { a: "#5b8cff", b: "#0a1c5a", hi: "#cfe0ff", label: "NO" },
  sponsored: { a: "#fbbf24", b: "#7a4a0a", hi: "#fff3c4", label: "SP" },
};

/** Gemme dofollow/nofollow — variante recto compacte avec label incrusté. */
export function GemBadgeRecto({ type }: { type: LinkType }) {
  const c = GEM_COLORS[type];
  return (
    <div
      style={{
        position: "relative",
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: "drop-shadow(0 0 6px rgba(255,255,255,0.2))",
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ position: "absolute", inset: 0 }}>
        <polygon points="12,2 21,9 17,22 7,22 3,9" fill={c.a} stroke={c.b} strokeWidth="1.2" />
        <polygon points="12,2 21,9 12,11 3,9" fill={c.a} opacity="0.7" />
        <polygon points="12,2 17,9 12,11 7,9" fill={c.hi} opacity="0.9" />
      </svg>
      <span
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: "var(--font-pixel-display)",
          fontSize: 7,
          fontWeight: 700,
          color: c.b,
          letterSpacing: 0.5,
          marginTop: 2,
        }}
      >
        {c.label}
      </span>
    </div>
  );
}

/** Gemme pleine (verso) — rubis / saphir / topaze facettée. */
export function GemstoneSVG({ type, size = 20 }: { type: LinkType; size?: number }) {
  const c = GEM_COLORS[type];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.25))" }}
    >
      <polygon points="12,2 21,9 17,22 7,22 3,9" fill={c.a} stroke={c.b} strokeWidth="1.2" />
      <polygon points="12,2 21,9 12,11 3,9" fill={c.a} opacity="0.7" />
      <polygon points="12,2 17,9 12,11 7,9" fill={c.hi} opacity="0.85" />
      <line x1="7" y1="22" x2="12" y2="11" stroke={c.b} strokeWidth="0.8" />
      <line x1="17" y1="22" x2="12" y2="11" stroke={c.b} strokeWidth="0.8" />
    </svg>
  );
}

/** 4 cellules — remplies jusqu'au niveau. Hérite de la couleur (currentColor). */
export function LevelDots({ level }: { level: Level }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            width: 9,
            height: 9,
            background: i <= level ? "currentColor" : "transparent",
            border: "1.5px solid currentColor",
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}
