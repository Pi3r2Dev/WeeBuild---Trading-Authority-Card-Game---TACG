import type { Level } from "./types";

interface StatBarProps {
  label: string;
  value: number;
  pct: number;
  color: string;
  level: Level;
}

/** Stat HP/ATK en barre pixelisée (graduée tous les 10px sur N1-N2). */
export function StatBar({ label, value, pct, color, level }: StatBarProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: "var(--font-display)",
        }}
      >
        <span
          style={{
            fontSize: 8,
            color: level === 1 ? "var(--c-deep)" : "var(--c-fg-soft)",
            letterSpacing: 1.5,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: level === 4 ? 18 : 14,
            color,
            fontWeight: 900,
            textShadow: level === 4 ? `0 0 10px ${color}` : "none",
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: level === 4 ? "rgba(255,255,255,0.08)" : "var(--c-deep)",
          position: "relative",
          border: level === 4 ? "1px solid rgba(255,255,255,0.2)" : "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${pct}%`,
            background: color,
            boxShadow: level === 4 ? `0 0 8px ${color}` : "none",
            imageRendering: "pixelated",
          }}
        />
        {level <= 2 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent 0, transparent 9px, rgba(0,0,0,0.4) 9px, rgba(0,0,0,0.4) 10px)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}
