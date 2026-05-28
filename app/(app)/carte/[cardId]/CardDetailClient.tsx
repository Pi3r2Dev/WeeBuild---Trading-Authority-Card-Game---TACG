"use client";

import { useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { Card } from "@/app/components/card/Card";
import { ERA_LABEL } from "@/lib/levels";
import { rescanCardAction, enrichGscCardAction, type RescanCardResult } from "./actions";
import type { CardData } from "@/lib/domain";
import type { AuthorityResultV2 } from "@/lib/authority/score-v2";

const PIXEL: CSSProperties = { fontFamily: "var(--font-pixel-display)", letterSpacing: 1 };

export interface CardDetailView {
  siteId: string;
  card: CardData;
  authority: AuthorityResultV2;
  extractSource: "llm" | "fallback";
  canRescan: boolean;
  nextRescanAt: string | null;
  isAdmin: boolean;
  lastRescanAt: string | null;
}

export function CardDetailClient({ initial }: { initial: CardDetailView }) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [gscWarning, setGscWarning] = useState<string | null>(null);
  const [pending, startRescan] = useTransition();
  const [gscPending, startGscEnrich] = useTransition();

  function runGscEnrich() {
    setError(null);
    setGscWarning(null);
    startGscEnrich(async () => {
      const result = await enrichGscCardAction(view.card.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setView((prev) => ({
        ...prev,
        card: result.card,
        authority: result.authority,
      }));
    });
  }

  function runRescan() {
    setError(null);
    setGscWarning(null);
    startRescan(async () => {
      const result: RescanCardResult = await rescanCardAction(view.card.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.gscWarning) setGscWarning(result.gscWarning);
      setView((prev) => ({
        ...prev,
        card: result.card,
        authority: result.authority,
        extractSource: result.extractSource,
        canRescan: prev.isAdmin,
        nextRescanAt: prev.isAdmin ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastRescanAt: new Date().toISOString(),
      }));
    });
  }

  const { card, authority, extractSource, canRescan, nextRescanAt, isAdmin } = view;
  const withGsc = authority.withGsc;
  const busy = pending || gscPending;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <Link
          href="/"
          style={{
            background: "transparent",
            border: "none",
            fontFamily: "var(--font-pixel-display)",
            fontSize: 8,
            color: "var(--hub-fg-soft)",
            letterSpacing: 2,
            textDecoration: "none",
          }}
        >
          ← MA MAIN
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "10px 0 4px" }}>{card.domain}</h1>
        <p style={{ color: "var(--hub-fg-soft)", margin: 0, fontSize: 13 }}>{card.url}</p>
      </div>

      <div style={{ display: "flex", gap: 36, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "flex", justifyContent: "center", flex: "0 0 auto" }}>
          <Card data={card} state={card.status} />
        </div>

        <div style={{ flex: "1 1 360px", minWidth: 300 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
            <span style={{ ...PIXEL, fontSize: 40, color: "var(--hub-accent-2)" }}>{authority.score}</span>
            <span style={{ color: "var(--hub-fg-soft)", fontSize: 13 }}>/ 100 · score d&apos;autorité</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
            <Badge text={`NIVEAU ${card.level} · ${ERA_LABEL[card.level]}`} accent />
            <Badge text={authority.metricVersion === "v2-gsc" ? "métrique v2 · GSC" : "métrique v1 · on-page"} />
            <Badge text={extractSource === "llm" ? "extraction LLM" : "extraction fallback"} />
            {isAdmin && <Badge text="admin · rescan illimité" accent />}
          </div>

          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={runRescan}
              disabled={busy || !canRescan}
              style={{
                padding: "12px 18px",
                width: "100%",
                background: busy || !canRescan ? "var(--hub-bg-2)" : "var(--hub-accent)",
                color: busy || !canRescan ? "var(--hub-fg-soft)" : "#fff",
                border: "none",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: busy || !canRescan ? "default" : "pointer",
                textAlign: "left",
              }}
            >
              {pending
                ? "Rescan en cours…"
                : canRescan
                  ? "↻ Rescanner la carte"
                  : "Rescan indisponible"}
            </button>
            <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--hub-fg-dim)", lineHeight: 1.45 }}>
              {isAdmin
                ? "Mode admin : pas de limite hebdomadaire."
                : canRescan
                  ? withGsc
                    ? "1 rescan / semaine · Firecrawl + Search Console (28 j) recalculés."
                    : "1 rescan par semaine · Firecrawl recapture le site et recalcule le score."
                  : nextRescanAt
                    ? `Prochain rescan possible le ${new Date(nextRescanAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}.`
                    : "Quota hebdomadaire atteint."}
            </p>
          </div>

          {!withGsc && (
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={runGscEnrich}
                disabled={busy}
                style={{
                  padding: "12px 18px",
                  width: "100%",
                  background: busy ? "var(--hub-bg-2)" : "rgba(57,255,20,0.12)",
                  color: busy ? "var(--hub-fg-soft)" : "var(--hub-accent-2)",
                  border: "1px solid rgba(57,255,20,0.45)",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: busy ? "default" : "pointer",
                  textAlign: "left",
                }}
              >
                {gscPending ? "Connexion Search Console…" : "↗ Enrichir avec Google Search Console"}
              </button>
              <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--hub-fg-dim)", lineHeight: 1.45 }}>
                Même compte Google qu&apos;à la connexion · propriété vérifiée dans ta Search Console.
              </p>
            </div>
          )}

          {(pending || gscPending) && (
            <p style={{ color: "var(--hub-fg-soft)", fontSize: 13, marginBottom: 12 }}>
              {gscPending
                ? "Interrogation Search Console (28 j) et recalcul du score v2…"
                : withGsc
                  ? "Firecrawl + Search Console en cours, puis mise à jour du score…"
                  : "Firecrawl recapture la page, puis on met à jour le résumé et le score…"}
            </p>
          )}

          {gscWarning && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 12,
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.35)",
                borderRadius: 8,
                color: "#fcd34d",
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              Search Console : {gscWarning}
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "12px 16px",
                marginBottom: 14,
                background: "rgba(220,38,38,0.12)",
                border: "1px solid rgba(220,38,38,0.4)",
                borderRadius: 10,
                color: "#fca5a5",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              padding: "10px 14px",
              marginBottom: 18,
              background: withGsc ? "rgba(57,255,20,0.06)" : "rgba(251,191,36,0.08)",
              border: `1px solid ${withGsc ? "rgba(57,255,20,0.35)" : "rgba(251,191,36,0.3)"}`,
              borderRadius: 8,
              color: withGsc ? "#86efac" : "#fcd34d",
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            {withGsc ? (
              <>
                Score <strong>indicatif v2</strong> — blend on-page + Search Console (28 j). Indicateur de jeu, pas
                une promesse de classement.
              </>
            ) : (
              <>
                Score <strong>indicatif v1</strong> — signaux on-page uniquement. Utilise le bouton Search Console
                ci-dessus pour passer en métrique v2 (impressions, clics, position).
              </>
            )}
          </div>

          <div style={{ ...PIXEL, fontSize: 10, color: "var(--hub-fg-soft)", marginBottom: 10 }}>DÉTAIL DU SCORE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {authority.signals.map((s) => (
              <div key={s.key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                  <span style={{ color: "var(--hub-fg)" }}>{s.label}</span>
                  <span style={{ color: "var(--hub-fg-soft)" }}>
                    {s.detail} · <strong style={{ color: "var(--hub-fg)" }}>{s.points}</strong>/{s.max}
                  </span>
                </div>
                <div style={{ height: 6, background: "var(--hub-bg-2)", borderRadius: 999, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${s.max > 0 ? (s.points / s.max) * 100 : 0}%`,
                      height: "100%",
                      background: s.key.startsWith("gsc_") ? "var(--hub-accent-2)" : "var(--hub-accent)",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <span
      style={{
        ...PIXEL,
        fontSize: 9,
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${accent ? "var(--hub-accent-2)" : "var(--hub-line)"}`,
        color: accent ? "var(--hub-accent-2)" : "var(--hub-fg-soft)",
      }}
    >
      {text}
    </span>
  );
}
