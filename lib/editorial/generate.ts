/**
 * Génération de texte éditorial P3 (cf. docs/draft-pipeline-ia.md §4,
 * docs/draft-gameplay-technique.md §2.5 — axe éditorial B). Pour une paire
 * (site source = DONNEUR potentiel → site cible = BÉNÉFICIAIRE), produit en
 * FRANÇAIS :
 *   - un ANGLE d'article plausible reliant la thématique source→cible (un sujet
 *     que la source pourrait réellement publier, PAS un lien forcé) ;
 *   - un TEXTE D'ANCRE contextualisé, dont le TYPE (`AnchorType`) est imposé en
 *     amont par le plan de quotas anti-footprint (cf. anchor-quota.ts) ;
 *   - une justification courte (`rationale`).
 *
 * Modèle : `groq-qwen3-32b` (alias FR de la passerelle LiteLLM). C'est un modèle
 * « reasoning » : on désactive la réflexion verbeuse via le suffixe Qwen3
 * `/no_think` (sinon ~1100 reasoning tokens, latence ~45 s). Sortie JSON stricte.
 *
 * ⚠ L'IA PROPOSE, l'humain VALIDE : la sortie est une proposition ÉDITABLE. Rien
 * ici ne crée de lien ni ne publie ; le `status` reste `GENERATED`.
 *
 * Module serveur (appelle LiteLLM ; jamais importé côté client).
 */

import { AnchorType } from "@/lib/generated/prisma/enums";
import { chatJson, LlmError, type LlmModel } from "@/lib/services/litellm";
import { ANCHOR_TYPE_BRIEF } from "./anchor-quota";

/** Modèle de génération FR (alias LiteLLM, cf. CLAUDE.md « Target architecture »). */
const GEN_MODEL: LlmModel = "groq-qwen3-32b";

/**
 * Timeout généreux : `groq-qwen3-32b` passe par une file (queue) côté infra. La
 * COMPLÉTION est rapide (~4 s avec `/no_think`) mais le temps de FILE peut
 * dépasser 60 s en pic ; 90 s absorbe ces pics sans bloquer indéfiniment (un
 * échec reste gracieux — placeholder conservé).
 */
const GEN_TIMEOUT_MS = 90_000;

/** Données minimales d'un site pour la génération (source OU cible). */
export interface SiteForGeneration {
  domain: string;
  url?: string | null;
  title?: string | null;
  description?: string | null;
  thematique?: string | null;
  element?: string | null;
}

/** Sortie d'une génération de suggestion. */
export interface GeneratedSuggestion {
  /** Angle / sujet d'article proposé (FR). → `EditorialSuggestion.articleTopic`. */
  topicAngle: string;
  /** Texte d'ancre contextualisé (FR). → `EditorialSuggestion.proposedAnchor`. */
  anchorText: string;
  /** Type d'ancre effectif. → `EditorialSuggestion.proposedAnchorType`. */
  anchorType: AnchorType;
  /** Justification courte du rapprochement éditorial. → `rationale`. */
  rationale: string;
}

/** Options de génération. */
export interface GenerateOptions {
  /** Type d'ancre imposé par le plan de quotas (anti-footprint). */
  anchorType: AnchorType;
  /**
   * Consigne de VARIATION optionnelle, injectée quand on RÉGÉNÈRE après une
   * collision de dédup sémantique (cf. generate-for-session.ts). Force un angle
   * différent (autre facette, autre format d'article).
   */
  variationHint?: string;
  /** Température (créativité). Défaut 0.7 — diversité des angles. */
  temperature?: number;
}

interface LlmSuggestionJson {
  angle?: string;
  ancre?: string;
  justification?: string;
}

/** Texte descriptif d'un site pour le prompt (compact). */
function describeSite(s: SiteForGeneration): string {
  const parts = [
    `domaine: ${s.domain}`,
    s.url ? `url: ${s.url}` : "",
    s.thematique ? `thématique: ${s.thematique}` : "",
    s.element ? `élément: ${s.element}` : "",
    s.title ? `titre: ${s.title}` : "",
    s.description ? `description: ${s.description}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

const SYSTEM_PROMPT =
  "Tu es un stratège en relations éditoriales (link building éditorial, axe B). " +
  "Un site SOURCE pourrait publier un article qui MENTIONNE et lie naturellement un site CIBLE. " +
  "Ta mission : proposer un ANGLE d'article que la SOURCE pourrait RÉELLEMENT écrire (pertinent pour SON audience), " +
  "où une référence à la CIBLE serait NATURELLE — jamais un lien forcé ni un publi-rédactionnel déguisé. " +
  "RÈGLES STRICTES anti-empreinte : " +
  "1) L'angle doit être un vrai sujet rédactionnel, pas un prétexte à lien. " +
  "2) Ne promets JAMAIS un « dofollow garanti » ni un « boost de référencement ». " +
  "3) Le texte d'ancre doit s'intégrer à une phrase, jamais être une liste de mots-clés sur-optimisés. " +
  "4) Évite toute formule templatée / réutilisable telle quelle. " +
  "Tu renvoies STRICTEMENT un objet JSON " +
  '{"angle": string, "ancre": string, "justification": string} en français, sans aucun autre texte. ' +
  "angle : titre/angle d'article concret (≤ 140 caractères). " +
  "ancre : le texte cliquable du lien, contextualisé. " +
  "justification : 1 phrase expliquant pourquoi ce rapprochement est éditorialement légitime (≤ 160 caractères).";

/**
 * Génère un angle d'article + une ancre pour la paire source→cible.
 *
 * @throws {LlmError} clé absente, infra injoignable/timeout, JSON invalide. Le
 *   branchement (generate-for-session.ts) capture et conserve le placeholder.
 */
export async function generateSuggestionContent(
  sourceSite: SiteForGeneration,
  targetSite: SiteForGeneration,
  opts: GenerateOptions,
): Promise<GeneratedSuggestion> {
  const anchorBrief = ANCHOR_TYPE_BRIEF[opts.anchorType];
  const variation = opts.variationHint
    ? `\n\nCONTRAINTE DE VARIATION : ${opts.variationHint} Propose un angle SENSIBLEMENT DIFFÉRENT (autre facette du sujet, autre format).`
    : "";

  const user =
    `SITE SOURCE (le donneur, qui publierait l'article) :\n${describeSite(sourceSite)}\n\n` +
    `SITE CIBLE (le bénéficiaire, mentionné dans l'article) :\n${describeSite(targetSite)}\n\n` +
    `TYPE D'ANCRE IMPOSÉ : ${anchorBrief}\n` +
    `Le champ "ancre" DOIT respecter ce type d'ancre.` +
    variation +
    `\n\n/no_think`;

  const out = await chatJson<LlmSuggestionJson>({
    model: GEN_MODEL,
    system: SYSTEM_PROMPT,
    user,
    temperature: opts.temperature ?? 0.7,
    timeoutMs: GEN_TIMEOUT_MS,
  });

  const topicAngle = (out.angle ?? "").trim();
  let anchorText = (out.ancre ?? "").trim();
  const rationale = (out.justification ?? "").trim();

  if (!topicAngle) throw new LlmError("Angle d'article vide dans la réponse LLM.");
  if (!anchorText) {
    // Garde-fou : pour une URL nue, on peut retomber sur l'URL/domaine de la cible.
    if (opts.anchorType === AnchorType.NAKED_URL) {
      anchorText = targetSite.url ?? `https://${targetSite.domain}`;
    } else {
      throw new LlmError("Texte d'ancre vide dans la réponse LLM.");
    }
  }

  return {
    topicAngle,
    anchorText,
    anchorType: opts.anchorType,
    rationale: rationale || "Rapprochement thématique entre la source et la cible.",
  };
}

/** Texte servant de base à l'embedding de dédup (angle + ancre). */
export function suggestionEmbeddingText(g: GeneratedSuggestion): string {
  return `${g.topicAngle}\n${g.anchorText}`;
}
