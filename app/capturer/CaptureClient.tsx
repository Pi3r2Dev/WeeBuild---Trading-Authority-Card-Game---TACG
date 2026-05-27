"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { Card } from "../components/card/Card";
import { ERA_LABEL } from "@/lib/levels";
import { captureCard, type CaptureResult } from "./actions";

const PIXEL: CSSProperties = { fontFamily: "var(--font-pixel-display)", letterSpacing: 1 };

const EXAMPLES = ["https://lemonde.fr", "https://firecrawl.dev", "https://example.com"];

export function CaptureClient() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run(target: string) {
    const u = target.trim();
    if (!u) return;
    setUrl(u);
    startTransition(async () => setResult(await captureCard(u)));
  }

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
          disabled={pending || !url.trim()}
          style={{
            padding: "12px 22px",
            background: pending ? "var(--hub-bg-2)" : "var(--hub-accent)",
            color: pending ? "var(--hub-fg-soft)" : "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: pending ? "default" : "pointer",
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
            onClick={() => run(ex)}
            disabled={pending}
            style={{
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid var(--hub-line)",
              borderRadius: 999,
              color: "var(--hub-fg-soft)",
              fontSize: 12,
              cursor: pending ? "default" : "pointer",
            }}
          >
            {ex.replace(/^https?:\/\//, "")}
          </button>
        ))}
      </div>

      {pending && <p style={{ color: "var(--hub-fg-soft)" }}>Firecrawl capture la page, puis on dérive le score…</p>}

      {!pending && result && !result.ok && (
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

      {!pending && result?.ok && <Result result={result} />}
    </div>
  );
}

function Result({ result }: { result: Extract<CaptureResult, { ok: true }> }) {
  const { card, authority, extractSource } = result;
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
          <Badge text={extractSource === "llm" ? "extraction LLM" : "extraction fallback (clé LiteLLM absente)"} />
        </div>

        <div
          style={{
            padding: "10px 14px",
            marginBottom: 18,
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 8,
            color: "#fcd34d",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          ⚠️ Score <strong>indicatif</strong> — signaux <strong>on-page uniquement</strong> (v1). Pas encore de
          Search Console, backlinks, ni GEO. Indicateur de jeu, pas une promesse de classement.
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
                    width: `${(s.points / s.max) * 100}%`,
                    height: "100%",
                    background: "var(--hub-accent)",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
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
