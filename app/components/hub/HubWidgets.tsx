import type { CardData } from "../card/types";
import type { Activity, Suggestion } from "@/lib/domain";
import { ACCENT_GREEN, ACCENT_VIOLET } from "./constants";
import { CreditsBadge } from "./primitives";
import { MiniCardTCG, PlayLink } from "./MiniCard";

/** Suggestion IA avec les cartes en jeu (donner) ou la cible de promotion. */
export function AISuggestionTCG({
  s,
  mySite,
  targetCard,
}: {
  s: Suggestion;
  mySite?: CardData;
  targetCard?: CardData;
}) {
  const isPromote = s.kind === "promote";
  const tone = isPromote ? ACCENT_VIOLET : ACCENT_GREEN;
  return (
    <div
      style={{
        padding: 12,
        background: `${tone}0a`,
        border: `1px solid ${tone}55`,
        borderRadius: 12,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span
          style={{
            padding: "3px 7px",
            background: `${tone}33`,
            color: tone,
            fontFamily: "var(--font-pixel-display)",
            fontSize: 8,
            letterSpacing: 1.5,
            borderRadius: 3,
            fontWeight: 700,
          }}
        >
          IA · {Math.round(s.relevance * 100)}%
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--hub-fg)", flex: 1 }}>{s.title}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 10 }}>
        {mySite && <MiniCardTCG card={mySite} scale={0.22} />}
        <PlayLink color={tone} label={isPromote ? "BRANDIR" : "JOUER"} />
        {targetCard && <MiniCardTCG card={targetCard} scale={0.22} />}
      </div>

      <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", lineHeight: 1.4, fontStyle: "italic", padding: "6px 0" }}>
        « {s.note} »
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 6,
          paddingTop: 8,
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <CreditsBadge value={s.credits > 0 ? `+${s.credits}` : `${s.credits}`} tone={s.credits > 0 ? "gain" : "cost"} />
        <button
          style={{
            padding: "7px 14px",
            background: tone,
            color: isPromote ? "#fff" : "#0f172a",
            fontFamily: "var(--font-hub)",
            fontWeight: 700,
            fontSize: 12,
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            boxShadow: `0 0 12px ${tone}80`,
          }}
        >
          {isPromote ? "Brandir" : "Jouer cette carte"}
        </button>
      </div>
    </div>
  );
}

/** Ligne d'activité récente (gain / dépense / en attente). */
export function ActivityRow({ a }: { a: Activity }) {
  const color = a.kind === "earn" ? ACCENT_GREEN : a.kind === "spend" ? ACCENT_VIOLET : "var(--hub-fg-soft)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        fontFamily: "var(--font-hub)",
      }}
    >
      <span style={{ width: 50, color, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{a.delta}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--hub-fg)" }}>{a.text}</div>
      </div>
      <span style={{ fontSize: 10, color: "var(--hub-fg-soft)", flexShrink: 0 }}>{a.when}</span>
    </div>
  );
}
