import type { ReactNode } from "react";
import { icons } from "./icons";

/** Cadre téléphone 390×844 (présentation mobile-first sur desktop). */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 390,
        height: 844,
        borderRadius: 32,
        background: "#000",
        padding: 6,
        position: "relative",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08) inset",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 28,
          background: "#000",
          borderRadius: 14,
          zIndex: 50,
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 26,
          overflow: "hidden",
          position: "relative",
          background: "var(--hub-bg-0)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function CreditsBadge({
  value,
  size = "md",
  tone = "gain",
}: {
  value: number | string;
  size?: "md" | "lg";
  tone?: "gain" | "cost";
}) {
  const big = size === "lg";
  const color = tone === "cost" ? "#fff" : "var(--hub-accent-2)";
  const bg = tone === "cost" ? "rgba(255,255,255,0.05)" : "rgba(57,255,20,0.10)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: big ? 7 : 4,
        padding: big ? "7px 12px" : "3px 8px",
        background: bg,
        border: `1px solid ${tone === "cost" ? "rgba(255,255,255,0.15)" : "rgba(57,255,20,0.45)"}`,
        color,
        borderRadius: 999,
        fontFamily: "var(--font-hub)",
        fontWeight: big ? 700 : 600,
        fontSize: big ? 22 : 12,
        letterSpacing: big ? 0 : 0.3,
        lineHeight: 1,
        boxShadow: tone === "gain" ? `0 0 ${big ? 16 : 8}px rgba(57,255,20,${big ? 0.35 : 0.2})` : "none",
      }}
    >
      <span style={{ display: "inline-flex" }}>{icons.diamond(big ? 16 : 11)}</span>
      <span>{value}</span>
    </span>
  );
}

export function StatusBar() {
  return (
    <div
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 22px",
        fontFamily: "var(--font-hub)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--hub-fg)",
      }}
    >
      <span style={{ marginTop: 4 }}>9:41</span>
      <span style={{ marginTop: 4, display: "flex", gap: 5, alignItems: "center" }}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="0.5" />
          <rect x="4" y="5" width="3" height="6" rx="0.5" />
          <rect x="8" y="3" width="3" height="8" rx="0.5" />
          <rect x="12" y="0" width="3" height="11" rx="0.5" />
        </svg>
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="0.5" y="0.5" width="18" height="10" rx="2" />
          <rect x="2" y="2" width="13" height="7" fill="currentColor" rx="1" />
          <rect x="19.5" y="3.5" width="2" height="4" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}

export function Body({ children, pad = 16, bottom = 72 }: { children: ReactNode; pad?: number; bottom?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        left: 0,
        right: 0,
        bottom,
        padding: `0 ${pad}px ${pad}px ${pad}px`,
        overflowY: "auto",
      }}
    >
      {children}
    </div>
  );
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "14px 0 10px 0",
        fontFamily: "var(--font-hub)",
      }}
    >
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--hub-fg)", letterSpacing: -0.3 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "var(--hub-fg-soft)", marginTop: 4 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 18,
        marginBottom: 10,
        fontFamily: "var(--font-pixel-display)",
        fontSize: 8,
        color: "var(--hub-fg-soft)",
        letterSpacing: 2,
      }}
    >
      <span>{children}</span>
      {action}
    </div>
  );
}
