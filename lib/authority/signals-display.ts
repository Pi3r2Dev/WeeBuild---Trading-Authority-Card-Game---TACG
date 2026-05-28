/**
 * Utilitaires d'affichage — partition des signaux on-page vs GSC (score v2).
 * Fonctions pures pour l'UI fiche carte / capture.
 */

import type { AuthoritySignal } from "@/lib/authority/score";

export interface AuthoritySignalSections {
  onpage: AuthoritySignal[];
  gsc: AuthoritySignal[];
}

/** Sépare les signaux v1 (Firecrawl) des signaux `gsc_*` (Search Console). */
export function partitionAuthoritySignals(signals: AuthoritySignal[]): AuthoritySignalSections {
  const onpage: AuthoritySignal[] = [];
  const gsc: AuthoritySignal[] = [];
  for (const signal of signals) {
    if (signal.key.startsWith("gsc_")) gsc.push(signal);
    else onpage.push(signal);
  }
  return { onpage, gsc };
}

/** Somme points / max d'une section (barre de sous-total). */
export function sectionScore(signals: AuthoritySignal[]): { points: number; max: number } {
  return {
    points: signals.reduce((sum, s) => sum + s.points, 0),
    max: signals.reduce((sum, s) => sum + s.max, 0),
  };
}

const GSC_COVERAGE_KEYS = ["gsc_indexed_pages", "gsc_pages_with_traffic", "gsc_query_count"] as const;

/**
 * Résumé compact de la couverture site-wide GSC (puces sous le titre de section).
 * Ignore les signaux sans donnée (`pas de donnée`).
 */
export function gscCoverageChips(gscSignals: AuthoritySignal[]): string[] {
  const chips: string[] = [];
  for (const key of GSC_COVERAGE_KEYS) {
    const signal = gscSignals.find((s) => s.key === key);
    if (!signal || signal.detail === "pas de donnée") continue;
    chips.push(shortGscDetail(signal));
  }
  return chips;
}

function shortGscDetail(signal: AuthoritySignal): string {
  switch (signal.key) {
    case "gsc_indexed_pages":
      return signal.detail.replace(/\s*\(sitemap\)$/i, "");
    case "gsc_pages_with_traffic":
      return signal.detail.replace(/\s*\(28 j\)$/i, "");
    case "gsc_query_count":
      return signal.detail.replace(/\s*\(28 j\)$/i, "");
    default:
      return signal.detail;
  }
}
