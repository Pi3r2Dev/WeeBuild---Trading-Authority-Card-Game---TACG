"use client";

import type { CSSProperties } from "react";
import type { AuthorityResultV2 } from "@/lib/authority/score-v2";
import type { AuthoritySignal } from "@/lib/authority/score";
import {
  gscCoverageChips,
  partitionAuthoritySignals,
  sectionScore,
} from "@/lib/authority/signals-display";

const PIXEL: CSSProperties = { fontFamily: "var(--font-pixel-display)", letterSpacing: 1 };

/** Bandeau explicatif v1 vs v2 — copy alignée sur les signaux GSC étendus. */
export function AuthorityMetricBanner({ withGsc }: { withGsc: boolean }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        marginBottom: 18,
        background: withGsc ? "rgba(57,255,20,0.06)" : "rgba(251,191,36,0.08)",
        border: `1px solid ${withGsc ? "rgba(57,255,20,0.35)" : "rgba(251,191,36,0.3)"}`,
        borderRadius: 8,
        color: withGsc ? "#86efac" : "#fcd34d",
        fontSize: 12.5,
        lineHeight: 1.55,
      }}
    >
      {withGsc ? (
        <>
          Score <strong>indicatif v2</strong> — blend <strong>page capturée</strong> (Firecrawl) +{" "}
          <strong>Search Console site entier</strong> (28 j : trafic, pages indexées, URLs actives). Indicateur de
          jeu, pas une promesse de classement.
        </>
      ) : (
        <>
          Score <strong>indicatif v1</strong> — signaux <strong>on-page uniquement</strong> (une URL). Enrichis avec
          Search Console pour le Tier 2 : trafic, indexation, couverture requêtes. Indicateur de jeu, pas une promesse
          de classement.
        </>
      )}
    </div>
  );
}

/** Détail du score — sections on-page / GSC, layout lisible pour les longs détails. */
export function AuthoritySignalsPanel({ authority }: { authority: AuthorityResultV2 }) {
  const { onpage, gsc } = partitionAuthoritySignals(authority.signals);
  const onpageTotal = sectionScore(onpage);
  const gscTotal = sectionScore(gsc);
  const coverage = gscCoverageChips(gsc);

  return (
    <div>
      <div style={{ ...PIXEL, fontSize: 10, color: "var(--hub-fg-soft)", marginBottom: 12 }}>DÉTAIL DU SCORE</div>

      {authority.withGsc ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <SignalSection
            title="ON-PAGE · PAGE CAPTURÉE"
            subtitle="Firecrawl — homepage ou URL saisie"
            accent="var(--hub-accent)"
            borderColor="rgba(138,43,226,0.35)"
            signals={onpage}
            total={onpageTotal}
          />
          <SignalSection
            title="SEARCH CONSOLE · SITE ENTIER"
            subtitle="Données Google — fenêtre ~28 j"
            accent="var(--hub-accent-2)"
            borderColor="rgba(57,255,20,0.35)"
            signals={gsc}
            total={gscTotal}
            chips={coverage}
          />
        </div>
      ) : (
        <SignalSection
          title="ON-PAGE · PAGE CAPTURÉE"
          subtitle="En attente de Search Console pour la vue site entier"
          accent="var(--hub-accent)"
          borderColor="rgba(138,43,226,0.25)"
          signals={onpage}
          total={onpageTotal}
        />
      )}
    </div>
  );
}

function SignalSection({
  title,
  subtitle,
  accent,
  borderColor,
  signals,
  total,
  chips,
}: {
  title: string;
  subtitle: string;
  accent: string;
  borderColor: string;
  signals: AuthoritySignal[];
  total: { points: number; max: number };
  chips?: string[];
}) {
  const fill = total.max > 0 ? (total.points / total.max) * 100 : 0;

  return (
    <section
      style={{
        paddingLeft: 12,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: chips && chips.length > 0 ? 8 : 12,
        }}
      >
        <div>
          <div style={{ ...PIXEL, fontSize: 9, color: "var(--hub-fg-soft)", marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--hub-fg-dim)", lineHeight: 1.4 }}>{subtitle}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ ...PIXEL, fontSize: 11, color: accent }}>
            {total.points}/{total.max} pts
          </div>
          <div style={{ width: 72, height: 4, background: "var(--hub-bg-2)", borderRadius: 999, marginTop: 4, overflow: "hidden" }}>
            <div style={{ width: `${fill}%`, height: "100%", background: accent, borderRadius: 999 }} />
          </div>
        </div>
      </div>

      {chips && chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {chips.map((chip) => (
            <span
              key={chip}
              style={{
                ...PIXEL,
                fontSize: 8,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(57,255,20,0.35)",
                color: "var(--hub-accent-2)",
                background: "rgba(57,255,20,0.08)",
                lineHeight: 1.3,
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {signals.map((signal) => (
          <SignalRow key={signal.key} signal={signal} accent={accent} />
        ))}
      </div>
    </section>
  );
}

function SignalRow({ signal, accent }: { signal: AuthoritySignal; accent: string }) {
  const muted = signal.detail === "pas de donnée" || (signal.max > 0 && signal.points === 0);
  const fill = signal.max > 0 ? (signal.points / signal.max) * 100 : 0;

  return (
    <div style={{ opacity: muted ? 0.72 : 1 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 4,
        }}
      >
        <span style={{ color: "var(--hub-fg)", fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{signal.label}</span>
        <span style={{ ...PIXEL, fontSize: 10, color: "var(--hub-fg-soft)", flexShrink: 0 }}>
          {signal.points}/{signal.max}
        </span>
      </div>
      <p
        style={{
          margin: "0 0 6px",
          fontSize: 11.5,
          color: muted ? "var(--hub-fg-dim)" : "var(--hub-fg-soft)",
          lineHeight: 1.45,
          wordBreak: "break-word",
        }}
      >
        {signal.detail}
      </p>
      <div style={{ height: 5, background: "var(--hub-bg-2)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${fill}%`, height: "100%", background: accent, borderRadius: 999 }} />
      </div>
    </div>
  );
}
