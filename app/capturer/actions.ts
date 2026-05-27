"use server";

/**
 * Server action — la première tranche verticale RÉELLE (cf. CLAUDE.md « POC »).
 * URL → capture (Firecrawl) → extraction éditoriale (LiteLLM/fallback) → score
 * d'autorité provisoire → `CardData` rendue par le composant <Card/> validé.
 *
 * C'est exactement le « jour où l'infra arrive » annoncé dans lib/data : on
 * remplace l'implémentation (mock → services), pas l'écran. Ici on n'altère pas
 * les accesseurs existants, on ajoute le chemin live à côté.
 */

import type { CardData } from "@/lib/domain";
import { captureSite, CaptureError } from "@/lib/services/capture";
import { computeAuthority, type AuthorityResult } from "@/lib/authority/score";
import { extractEditorial, type EditorialExtract } from "@/lib/authority/extract";

export interface CaptureSuccess {
  ok: true;
  card: CardData;
  authority: AuthorityResult;
  /** D'où vient l'extraction éditoriale : LLM réel ou fallback déterministe. */
  extractSource: EditorialExtract["source"];
}
export interface CaptureFailure {
  ok: false;
  error: string;
}
export type CaptureResult = CaptureSuccess | CaptureFailure;

export async function captureCard(rawUrl: string): Promise<CaptureResult> {
  try {
    const site = await captureSite(rawUrl);
    const [extract, authority] = await Promise.all([
      extractEditorial(site),
      Promise.resolve(computeAuthority(site)),
    ]);

    const { stats, level } = authority;
    const card: CardData = {
      id: site.domain,
      level,
      domain: site.domain,
      url: site.url.replace(/^https?:\/\//, ""),
      anchor: extract.anchor,
      element: extract.element,
      thematique: extract.thematique,
      summary: extract.summary,
      hp: stats.hp,
      atk: stats.atk,
      tf: stats.tf,
      cf: stats.cf,
      dr: stats.dr,
      // Champs couche TCG non dérivables d'une capture — placeholders assumés.
      linkType: "dofollow",
      owner: site.domain,
      status: "dispo",
      price: level,
      edition: "—",
      editionTotal: "—",
    };

    return { ok: true, card, authority, extractSource: extract.source };
  } catch (e) {
    if (e instanceof CaptureError) return { ok: false, error: e.message };
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}
