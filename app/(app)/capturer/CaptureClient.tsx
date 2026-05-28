"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { Card } from "@/app/components/card/Card";
import { ERA_LABEL } from "@/lib/levels";
import { captureCard, type CaptureResult } from "./actions";
import { enrichWithGscAction, type EnrichGscResult } from "./gsc-actions";
import { MatchingTrigger } from "@/app/components/hub/MatchingTrigger";
import { GAME_LOOP_ENABLED } from "@/app/components/app/flags";

const PIXEL: CSSProperties = { fontFamily: "var(--font-pixel-display)", letterSpacing: 1 };

const EXAMPLES = ["https://lemonde.fr", "https://firecrawl.dev", "https://example.com"];

export function CaptureClient() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [pending, startCapture] = useTransition();
  const [gscPending, startGsc] = useTransition();

  function run(target: string) {
    const u = target.trim();
    if (!u) return;
    setUrl(u);
    startCapture(async () => setResult(await captureCard(u)));
  }

  function runGscEnrich(siteId: string) {
    startGsc(async () => {
      const enriched: EnrichGscResult = await enrichWithGscAction(siteId);
      if (enriched.ok) {
        setResult({
          ok: true,
          card: enriched.card,
          authority: enriched.authority,
          extractSource: "llm",
          siteId: enriched.card.siteId,
        });
      } else {
        setResult({ ok: false, error: enriched.error });
      }
    });
  }

  const busy = pending || gscPending;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(url);
        }}
        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://votre-site.fr"
          inputMode="url"
          style={{
            flex: "1 1 320px",
            padding: "12px 16px",
            background: "var(--hub-bg-2)",
            border: "1px solid var(--hub-line)",
            borderRadius: 10,
            color: "var(--hub-fg)",
            fontSize: 15,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          style={{
            padding: "12px 22px",
            background: busy ? "var(--hub-bg-2)" : "var(--hub-accent)",
            color: busy ? "var(--hub-fg-soft)" : "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {pending ? "Capture en cours…" : "Générer la carte"}
        </button>
      </form>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: "var(--hub-fg-dim)", fontSize: 12 }}>Exemples :</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => run(ex)}
            disabled={busy}
            style={{
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid var(--hub-line)",
              borderRadius: 999,
              color: "var(--hub-fg-soft)",
              fontSize: 12,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {ex.replace(/^https?:\/\//, "")}
          </button>
        ))}
      </div>

      {pending && (
        <p style={{ color: "var(--hub-fg-soft)" }}>
          Firecrawl capture la page, puis on calcule le score (on-page ± Search Console si déjà lié)…
        </p>
      )}
      {gscPending && (
        <p style={{ color: "var(--hub-fg-soft)" }}>
          Interrogation de Google Search Console (28 j) et recalcul du score v2…
        </p>
      )}

      {!busy && result && !result.ok && (
        <div
          style={{
            padding: "14px 18px",
            background: "rgba(220,38,38,0.12)",
            border: "1px solid rgba(220,38,38,0.4)",
            borderRadius: 10,
            color: "#fca5a5",
          }}
        >
          {result.error}
        </div>
      )}

      {!busy && result?.ok && (
        <Result result={result} onEnrichGsc={() => runGscEnrich(result.siteId)} gscLoading={gscPending} />
      )}
    </div>
  );
}

function Result({
  result,
  onEnrichGsc,
  gscLoading,
}: {
  result: Extract<CaptureResult, { ok: true }>;
  onEnrichGsc: () => void;
  gscLoading: boolean;
}) {
  const { card, authority, extractSource } = result;
  const withGsc = authority.withGsc;

  return (
    <div style={{ display: "flex", gap: 36, flexWrap: "wrap", alignItems: "flex-start", marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "center", flex: "0 0 auto" }}>
        <Card data={card} state="dispo" />
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
        </div>

        {!withGsc && (
          <div style={{ marginBottom: 14 }}>
            <button
              type="button"
              onClick={onEnrichGsc}
              disabled={gscLoading}
              style={{
                padding: "10px 16px",
                background: "rgba(57,255,20,0.12)",
                border: "1px solid rgba(57,255,20,0.45)",
                color: "var(--hub-accent-2)",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: gscLoading ? "default" : "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              {gscLoading ? "Connexion Search Console…" : "↗ Enrichir avec Google Search Console"}
            </button>
            <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--hub-fg-dim)", lineHeight: 1.45 }}>
              Même compte Google qu&apos;à la connexion · le site doit être vérifié dans ta Search Console.
            </p>
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
              Score <strong>indicatif v2</strong> — blend <strong>on-page + Search Console</strong> (28 j). Pas encore
              de backlinks payants ni GEO. Indicateur de jeu, pas une promesse de classement. Calibrage des poids 🚧.
            </>
          ) : (
            <>
              Score <strong>indicatif v1</strong> — signaux <strong>on-page uniquement</strong>. Ajoute Search Console
              pour le Tier 2 (impressions, clics, position). Pas de GEO ni backlinks. Indicateur de jeu, pas une
              promesse de classement.
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

        {GAME_LOOP_ENABLED && (
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--hub-line)" }}>
            <div style={{ ...PIXEL, fontSize: 10, color: "var(--hub-fg-soft)", marginBottom: 10 }}>MATCHING ÉDITORIAL</div>
            <MatchingTrigger siteId={result.siteId} fullWidth redirectToDonner label="Trouver des partenaires éditoriaux" />
          </div>
        )}
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
