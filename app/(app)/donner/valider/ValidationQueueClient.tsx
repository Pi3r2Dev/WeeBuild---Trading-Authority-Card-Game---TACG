"use client";

import Link from "next/link";
import { ACCENT_GREEN, ACCENT_VIOLET, LEVEL_LABEL } from "@/app/components/hub/constants";
import { Body, CreditsBadge, ScreenHeader, StatusBar } from "@/app/components/hub/primitives";
import { BottomNav } from "@/app/components/hub/BottomNav";
import type { ValidationQueueItem } from "@/lib/links/types";

/**
 * File d'attente de validation (client) — suggestions `GENERATED` à transformer
 * en liens éditoriaux. Liste + état vide. Données en props (loader serveur).
 */
export function ValidationQueueClient({ items }: { items: ValidationQueueItem[] }) {
  return (
    <>
      <StatusBar />
      <Body>
        <ScreenHeader
          title="Valider mes suggestions"
          subtitle="Transforme une suggestion IA en lien éditorial — après ta touche personnelle sur l’ancre."
        />
        {items.length === 0 ? <EmptyState /> : <div style={{ marginTop: 6 }}>{items.map((it) => <QueueRow key={it.suggestionId} item={it} />)}</div>}
      </Body>
      <BottomNav />
    </>
  );
}

function QueueRow({ item }: { item: ValidationQueueItem }) {
  return (
    <Link
      href={`/donner/valider/${item.suggestionId}`}
      style={{
        display: "block",
        textDecoration: "none",
        padding: 12,
        marginBottom: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hub-fg)" }}>
          {item.sourceDomain} <span style={{ color: ACCENT_VIOLET }}>→</span> {item.targetDomain}
        </div>
        <CreditsBadge value={`+${item.credits}`} tone="gain" />
      </div>
      <div style={{ fontSize: 10, color: "var(--hub-fg-soft)", marginTop: 3 }}>
        {item.targetOwner} · {LEVEL_LABEL[item.targetLevel] ?? `LV.${item.targetLevel}`} · pertinence {Math.round(item.relevance * 100)}%
      </div>
      <div style={{ fontSize: 11, color: "var(--hub-fg-soft)", marginTop: 8, lineHeight: 1.4, fontStyle: "italic" }}>
        « {item.articleTopic} »
      </div>
      <div
        style={{
          marginTop: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-pixel-display)",
          fontSize: 8,
          letterSpacing: 1,
          color: ACCENT_GREEN,
        }}
      >
        VALIDER CETTE SUGGESTION →
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 18,
        background: "rgba(138,43,226,0.08)",
        border: "1px dashed rgba(138,43,226,0.45)",
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--hub-fg)", marginBottom: 6 }}>
        Aucune suggestion à valider
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--hub-fg-soft)", lineHeight: 1.5 }}>
        Lance le matching IA sur une de tes cartes pour découvrir des partenaires éditoriaux, puis reviens valider tes suggestions ici.
      </p>
      <Link
        href="/donner"
        style={{
          display: "inline-block",
          padding: "10px 18px",
          background: ACCENT_VIOLET,
          color: "#fff",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        Aller au flux Donner
      </Link>
    </div>
  );
}
