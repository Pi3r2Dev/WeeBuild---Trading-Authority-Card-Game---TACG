"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Body, ScreenHeader, SectionLabel, StatusBar } from "@/app/components/hub/primitives";
import {
  componentToColor,
  THRESHOLDS_C1,
  THRESHOLDS_C2,
  THRESHOLDS_C3,
  THRESHOLDS_C4,
} from "@/lib/naturality/policy";
import type { NaturalityColor, NaturalitySnapshotView } from "@/lib/naturality/types";

const COLOR_HEX: Record<NaturalityColor, string> = {
  green: "#39FF14",
  orange: "#fbbf24",
  red: "#fca5a5",
};

const COLOR_LABEL: Record<NaturalityColor, string> = {
  green: "SAIN",
  orange: "À SURVEILLER",
  red: "ALERTE",
};

const COMPONENTS = [
  { key: "anchorDiversity" as const, label: "C1 · Diversité des ancres", thresholds: THRESHOLDS_C1 },
  { key: "angleDiversity" as const, label: "C2 · Diversité des angles", thresholds: THRESHOLDS_C2 },
  { key: "graphDensity" as const, label: "C3 · Santé du graphe", thresholds: THRESHOLDS_C3 },
  { key: "velocity" as const, label: "C4 · Vélocité de pose", thresholds: THRESHOLDS_C4 },
];

/**
 * Dashboard CLIENT P4-A — jauge NS globale + 4 barres de composantes + historique
 * + bouton « Recalculer » (POST `/admin/naturality-snapshot`, synchrone / lazy).
 */
export function NaturaliteDashboard({
  latest,
  history,
}: {
  latest: NaturalitySnapshotView | null;
  history: NaturalitySnapshotView[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRecompute() {
    setError(null);
    start(async () => {
      const res = await fetch("/admin/naturality-snapshot", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Échec du recalcul (HTTP ${res.status}).`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <StatusBar />
      <Body>
        <ScreenHeader
          title="Naturalité"
          subtitle="Audit anti-footprint plateforme — score de naturalité (P4-A)"
          right={
            <button type="button" onClick={onRecompute} disabled={pending} style={recomputeBtn(!pending)}>
              {pending ? "Calcul…" : "Recalculer"}
            </button>
          }
        />

        {error && <p style={{ fontSize: 12, color: COLOR_HEX.red, lineHeight: 1.45 }}>{error}</p>}

        {!latest ? (
          <EmptyState />
        ) : (
          <>
            <Gauge snapshot={latest} />

            <SectionLabel>COMPOSANTES</SectionLabel>
            {COMPONENTS.map((c) => {
              const value = latest.components[c.key];
              const color = componentToColor(value, c.thresholds);
              return <ComponentBar key={c.key} label={c.label} value={value} color={color} />;
            })}

            <SectionLabel>HISTORIQUE (10 DERNIERS)</SectionLabel>
            <History history={history} />
          </>
        )}
      </Body>
    </>
  );
}

function Gauge({ snapshot }: { snapshot: NaturalitySnapshotView }) {
  const hex = COLOR_HEX[snapshot.color];
  return (
    <div
      style={{
        marginTop: 8,
        padding: 16,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${hex}55`,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 8, letterSpacing: 1.5, color: hex }}>
          SCORE DE NATURALITÉ
        </div>
        <div style={{ fontSize: 13, color: "var(--hub-fg-soft)", marginTop: 6 }}>{COLOR_LABEL[snapshot.color]}</div>
        <div style={{ fontSize: 10, color: "var(--hub-fg-soft)", marginTop: 4 }}>
          {new Date(snapshot.createdAt).toLocaleString("fr-FR")}
        </div>
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, color: hex, lineHeight: 1 }}>
        {(snapshot.naturalScore * 100).toFixed(0)}
        <span style={{ fontSize: 16, color: "var(--hub-fg-soft)" }}>/100</span>
      </div>
    </div>
  );
}

function ComponentBar({ label, value, color }: { label: string; value: number; color: NaturalityColor }) {
  const hex = COLOR_HEX[color];
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--hub-fg)" }}>
        <span>{label}</span>
        <span style={{ color: hex, fontWeight: 700 }}>{pct}</span>
      </div>
      <div style={{ marginTop: 6, height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: hex, boxShadow: `0 0 8px ${hex}88` }} />
      </div>
    </div>
  );
}

function History({ history }: { history: NaturalitySnapshotView[] }) {
  if (history.length === 0) {
    return <p style={{ fontSize: 12, color: "var(--hub-fg-soft)" }}>Aucun historique.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {history.map((s) => (
        <div
          key={s.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 10px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            fontSize: 11,
          }}
        >
          <span style={{ color: "var(--hub-fg-soft)" }}>{new Date(s.createdAt).toLocaleString("fr-FR")}</span>
          <span style={{ color: COLOR_HEX[s.color], fontWeight: 700 }}>{(s.naturalScore * 100).toFixed(0)}/100</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 20,
        background: "rgba(255,255,255,0.03)",
        border: "1px dashed rgba(255,255,255,0.18)",
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 13, color: "var(--hub-fg)", margin: 0 }}>Aucun snapshot encore calculé.</p>
      <p style={{ fontSize: 12, color: "var(--hub-fg-soft)", margin: "6px 0 0" }}>
        Clique sur « Recalculer » pour générer le premier snapshot plateforme.
      </p>
    </div>
  );
}

function recomputeBtn(enabled: boolean): CSSProperties {
  return {
    height: 36,
    padding: "0 14px",
    background: enabled ? "#8A2BE2" : "rgba(255,255,255,0.08)",
    color: enabled ? "#fff" : "var(--hub-fg-soft)",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: enabled ? "pointer" : "default",
  };
}
