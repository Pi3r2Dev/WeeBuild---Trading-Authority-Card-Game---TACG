/**
 * Peuplement de `Site.embedding` (pgvector 1536d) — branché à la capture.
 *
 * Prisma 7 ne gère pas nativement le type `vector` (déclaré `Unsupported` dans
 * le schéma) → on écrit l'embedding via SQL raw (`UPDATE site SET embedding =
 * $1::vector`). On compose le texte topical (titre + description + markdown
 * tronqué) puis on délègue la troncature/normalisation à embeddings.ts.
 *
 * BEST-EFFORT : toute erreur (clé LiteLLM absente, infra injoignable, dimension
 * inattendue) est loggée et avalée — l'embedding ne doit JAMAIS faire échouer la
 * boucle capture→carte. Un site sans embedding est simplement ignoré du matching
 * pgvector (ou ré-embeddé à la volée par findPartners).
 *
 * Module serveur.
 */

import { db } from "@/lib/db";
import { embed, toPgVector } from "@/lib/services/embeddings";

/** Champs de contenu d'un site servant de matière à l'embedding topical. */
export interface SiteContent {
  title?: string | null;
  description?: string | null;
  markdown?: string | null;
}

/** Compose le texte topical d'un site (titre + description + markdown). */
export function siteText({ title, description, markdown }: SiteContent): string {
  return [title ?? "", description ?? "", markdown ?? ""].filter(Boolean).join("\n\n");
}

/**
 * Calcule et persiste l'embedding d'un site (best-effort).
 * @returns true si l'embedding a été écrit, false si skip/échec (jamais throw).
 */
export async function embedSite(siteId: string, content: SiteContent): Promise<boolean> {
  const text = siteText(content);
  if (!text.trim()) return false;
  try {
    const vec = await embed(text);
    // Prisma ne sait pas binder un `vector` → on passe le littéral textuel
    // `[a,b,...]` casté ::vector. $executeRaw paramétré (pas d'injection).
    await db.$executeRaw`UPDATE site SET embedding = ${toPgVector(vec)}::vector WHERE id = ${siteId}`;
    return true;
  } catch (e) {
    // Best-effort : on log et on continue (capture non bloquée).
    console.warn(`[embed-site] embedding non écrit pour ${siteId} : ${(e as Error).message}`);
    return false;
  }
}
