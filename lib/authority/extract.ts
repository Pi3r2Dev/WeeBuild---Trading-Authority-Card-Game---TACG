/**
 * Extraction éditoriale (étape 2 du pipeline, cf. draft-pipeline-ia.md §3).
 * À partir du site capturé → résumé FR, thématique, « élément » de jeu, et une
 * ancre suggérée. Server-only.
 *
 * Deux chemins : LLM via LiteLLM (`groq-fast`) si une clé est configurée,
 * sinon FALLBACK déterministe (heuristique mots-clés + métadonnées) pour que la
 * boucle capture→carte tourne en dev sans clé. Le champ `source` le signale.
 *
 * NB : module à usage serveur (appelle LiteLLM, jamais importé côté client).
 */

import type { ElementKind } from "@/lib/domain";
import type { CapturedSite } from "@/lib/services/capture-types";
import { chatJson, isConfigured, LlmError } from "@/lib/services/litellm";

export interface EditorialExtract {
  /** Résumé court FR (1–2 phrases). */
  summary: string;
  /** Libellé thématique court, majuscules (« TECH », « CUISINE »…). */
  thematique: string;
  element: ElementKind;
  /** Ancre éditoriale suggérée (texte de lien contextualisé). */
  anchor: string;
  source: "llm" | "fallback";
}

const ELEMENTS: ElementKind[] = ["tech", "finance", "sante", "media"];

/** Mots-clés par élément — sert au fallback ET à valider la sortie LLM. */
const ELEMENT_KEYWORDS: Record<ElementKind, string[]> = {
  tech: ["dev", "code", "logiciel", "software", "seo", " ia ", "intelligence artificielle", "tech", "hardware", "gpu", "app", "web", "numérique", "startup", "data"],
  finance: ["finance", "bourse", "épargne", "investiss", "crédit", "banque", "assurance", "budget", "crypto", "trading", "fiscal", "impôt"],
  sante: ["santé", "recette", "cuisine", "sport", "fitness", "médecine", "bien-être", "nutrition", "yoga", "beauté", "régime"],
  media: ["presse", "actualité", "news", "magazine", "journal", "média", "culture", "reportage"],
};

function guessElement(text: string): ElementKind {
  const hay = ` ${text.toLowerCase()} `;
  let best: ElementKind = "media";
  let bestScore = 0;
  for (const el of ELEMENTS) {
    const score = ELEMENT_KEYWORDS[el].reduce((n, kw) => n + (hay.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

const THEMATIQUE_LABEL: Record<ElementKind, string> = {
  tech: "TECH",
  finance: "FINANCE",
  sante: "SANTÉ",
  media: "MÉDIA",
};

/** Nettoie le markdown en texte brut (sans titres ni syntaxe de lien). */
function plainText(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackExtract(site: CapturedSite): EditorialExtract {
  const element = guessElement(`${site.title} ${site.description} ${site.markdown.slice(0, 2000)}`);
  const base = site.description || plainText(site.markdown).slice(0, 220);
  const summary = base ? `${base.slice(0, 200).trim()}${base.length > 200 ? "…" : ""}` : `Site ${site.domain}.`;
  return {
    summary,
    thematique: THEMATIQUE_LABEL[element],
    element,
    anchor: site.title || site.domain,
    source: "fallback",
  };
}

interface LlmExtract {
  summary?: string;
  thematique?: string;
  element?: string;
  anchor?: string;
}

/**
 * Extrait les champs éditoriaux du site. Ne jette jamais : en cas d'erreur LLM
 * (clé absente, timeout, JSON invalide), retombe sur le fallback déterministe.
 */
export async function extractEditorial(site: CapturedSite): Promise<EditorialExtract> {
  if (!isConfigured()) return fallbackExtract(site);

  const system =
    "Tu es un analyste éditorial SEO. À partir du contenu d'une page web, tu renvoies STRICTEMENT un objet JSON " +
    '{"summary","thematique","element","anchor"} en français. ' +
    "summary : 1 à 2 phrases factuelles décrivant le site (≤ 220 caractères). " +
    "thematique : un label court en MAJUSCULES (ex: TECH, CUISINE, FINANCE, PRESSE). " +
    'element : exactement une de ["tech","finance","sante","media"] (santé/cuisine/sport → sante ; presse/blog généraliste → media). ' +
    "anchor : une ancre de lien éditoriale naturelle (texte cliquable), pas une URL nue.";
  const user = `URL: ${site.url}\nTitre: ${site.title}\nDescription: ${site.description}\n\nContenu (markdown, tronqué):\n${site.markdown.slice(0, 4000)}`;

  try {
    const out = await chatJson<LlmExtract>({ model: "groq-fast", system, user });
    const element = ELEMENTS.includes(out.element as ElementKind)
      ? (out.element as ElementKind)
      : guessElement(`${site.title} ${out.summary ?? ""} ${out.thematique ?? ""}`);
    const summary = (out.summary ?? "").trim();
    return {
      summary: summary || fallbackExtract(site).summary,
      thematique: (out.thematique ?? "").trim().toUpperCase() || THEMATIQUE_LABEL[element],
      element,
      anchor: (out.anchor ?? "").trim() || site.title || site.domain,
      source: "llm",
    };
  } catch (e) {
    if (e instanceof LlmError) return fallbackExtract(site);
    throw e;
  }
}
