/**
 * Client Google Search Console (P2 — SEO Tier 2, cf. draft-metrique-autorite.md §2).
 *
 * Voie OAuth (préférée) : on échange le **refresh token** Google capté dès
 * l'OAuth Better Auth (scope `webmasters.readonly`, accessType offline, cf.
 * lib/auth.ts) contre un access token, puis on interroge la **Search Analytics
 * API**. Donnée first-party infalsifiable + preuve de propriété du site.
 *
 * Flux : `getAccessToken(userId)` (refresh→access) → `fetchSearchAnalytics(...)`
 * (POST searchAnalytics/query → agrégats) → `captureGsc(userId, siteId)`
 * (orchestre + insère un `GscSnapshot` source=OAUTH).
 *
 * Le fallback SCREENSHOT (gemma4-vision) est HORS PÉRIMÈTRE ici (le modèle
 * `GscSnapshot.source` le prévoit, mais on ne produit que des snapshots OAUTH).
 *
 * Module SERVEUR : lit `process.env` (GOOGLE_CLIENT_ID/SECRET), la DB et la
 * session — jamais importé côté client. Ne jette que des `GscError` (message FR
 * pour l'UI) pour les cas attendus (pas de compte Google, pas de refresh token,
 * site non vérifié dans GSC, API en erreur).
 */

import { db } from "@/lib/db";

/** Erreur GSC — message FR destiné à l'UI (jamais un crash brut). */
export class GscError extends Error {}

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";

/** Fenêtre par défaut : ~28 jours (standard GSC, lisse le bruit hebdomadaire). */
export const DEFAULT_WINDOW_DAYS = 28;
/**
 * GSC ne dispose pas des tout derniers jours (latence ~2-3 j). On décale donc
 * la fin de fenêtre de 3 jours pour viser des données déjà consolidées.
 */
const GSC_DATA_LAG_DAYS = 3;

const TOKEN_TIMEOUT_MS = 15_000;
const QUERY_TIMEOUT_MS = 30_000;

/** Agrégats d'une fenêtre Search Analytics (clics/impressions sommés, ctr/position moyennés). */
export interface GscAggregate {
  clicks: number;
  impressions: number;
  /** Click-through rate moyen pondéré par impressions (0–1). */
  ctr: number;
  /** Position moyenne pondérée par impressions (1 = top ; plus bas = mieux). */
  position: number;
  /** Nombre de requêtes distinctes ayant généré des impressions sur la fenêtre. */
  queryCount: number;
  /** Fenêtre couverte (date-only, ISO `YYYY-MM-DD`). */
  startDate: string;
  endDate: string;
  /** Payload brut renvoyé par l'API (rows) — conservé pour recalcul sans re-fetch. */
  raw: { rows: SearchAnalyticsRow[] };
}

// ── env helpers ───────────────────────────────────────────────────────────────
const clientId = () => process.env.GOOGLE_CLIENT_ID ?? "";
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET ?? "";

/** True si l'app a de quoi rafraîchir un token Google (sinon `captureGsc` jette). */
export function isConfigured(): boolean {
  return clientId().length > 0 && clientSecret().length > 0;
}

/** fetch avec timeout (AbortController) → GscError explicite sur abort/réseau. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  label: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) throw new GscError(`${label} : délai dépassé (${timeoutMs} ms).`);
    throw new GscError(`${label} : service injoignable (${(e as Error).message}).`);
  } finally {
    clearTimeout(timer);
  }
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

/**
 * Échange le refresh token Google du user contre un access token frais.
 *
 * Lit l'`account` Better Auth (providerId="google") du user. Met à jour
 * `accessToken`/`accessTokenExpiresAt` en base (best-effort, n'altère pas le
 * résultat en cas d'échec d'écriture).
 *
 * @throws {GscError} pas de compte Google, pas de refresh token (l'utilisateur
 *   doit s'être connecté avec consentement offline — cf. lib/auth.ts), ou refus
 *   Google (`invalid_grant` = consentement révoqué → reconnexion nécessaire).
 */
export async function getAccessToken(userId: string): Promise<string> {
  if (!isConfigured()) {
    throw new GscError("GOOGLE_CLIENT_ID/SECRET absents — configuration OAuth requise pour interroger GSC.");
  }

  const account = await db.account.findFirst({
    where: { userId, providerId: "google" },
    select: { refreshToken: true },
  });
  if (!account) {
    throw new GscError("Aucun compte Google lié à cet utilisateur.");
  }
  if (!account.refreshToken) {
    throw new GscError(
      "Aucun refresh token Google : reconnecte-toi à Google (consentement hors-ligne requis) pour autoriser l'accès Search Console.",
    );
  }

  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: account.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetchWithTimeout(
    GOOGLE_TOKEN_ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
    TOKEN_TIMEOUT_MS,
    "Rafraîchissement du token Google",
  );

  const json = (await res.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!res.ok || !json.access_token) {
    // `invalid_grant` = refresh token révoqué/expiré → l'utilisateur doit re-consentir.
    if (json.error === "invalid_grant") {
      throw new GscError(
        "Autorisation Google expirée ou révoquée : reconnecte-toi à Google pour ré-autoriser Search Console.",
      );
    }
    throw new GscError(
      `Google a refusé le rafraîchissement du token (${json.error ?? res.status}${
        json.error_description ? ` : ${json.error_description}` : ""
      }).`,
    );
  }

  // Best-effort : on persiste l'access token frais (n'altère pas le retour si l'écriture échoue).
  if (json.expires_in) {
    const expiresAt = new Date(Date.now() + json.expires_in * 1000);
    await db.account
      .updateMany({
        where: { userId, providerId: "google" },
        data: { accessToken: json.access_token, accessTokenExpiresAt: expiresAt },
      })
      .catch(() => {
        /* persistance non bloquante */
      });
  }

  return json.access_token;
}

// ── Search Analytics API ───────────────────────────────────────────────────────

interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}
interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
  error?: { code?: number; message?: string; status?: string };
}

/** ISO date-only (`YYYY-MM-DD`) en UTC — format attendu par l'API GSC. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Interroge la Search Analytics API pour `siteUrl` sur [startDate, endDate]
 * (dates ISO `YYYY-MM-DD`), dimension `query`, et agrège les rows.
 *
 * `siteUrl` doit être une PROPRIÉTÉ que l'utilisateur possède dans GSC, soit un
 * préfixe d'URL (`https://exemple.com/`) soit un domaine (`sc-domain:exemple.com`).
 * Si la propriété n'existe pas / n'est pas vérifiée → 403/404 → GscError explicite.
 *
 * @throws {GscError} site non vérifié dans GSC (403/404), ou erreur API.
 */
export async function fetchSearchAnalytics(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<GscAggregate> {
  const endpoint = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 1000,
      }),
    },
    QUERY_TIMEOUT_MS,
    "Search Console",
  );

  if (res.status === 403 || res.status === 404) {
    // Propriété absente ou non vérifiée pour ce compte.
    throw new GscError(
      `Propriété « ${siteUrl} » introuvable ou non vérifiée dans ta Search Console (${res.status}). ` +
        "Ajoute et vérifie ce site dans GSC avec le même compte Google, puis réessaie.",
    );
  }

  const json = (await res.json().catch(() => ({}))) as SearchAnalyticsResponse;
  if (!res.ok) {
    throw new GscError(`Search Console a répondu ${res.status}${json.error?.message ? ` : ${json.error.message}` : ""}.`);
  }

  const rows = json.rows ?? [];
  return { ...aggregateRows(rows), startDate, endDate, raw: { rows } };
}

/**
 * Agrège des rows Search Analytics (dimension query) :
 *   - clicks/impressions = sommes
 *   - ctr/position = moyennes PONDÉRÉES PAR IMPRESSIONS (une row à fort volume
 *     pèse plus qu'une row marginale ; évite qu'une requête à 1 impression et
 *     position 1 fausse la moyenne). Repli sur moyenne simple si 0 impression.
 *   - queryCount = nb de rows (requêtes distinctes).
 *
 * Pur (testable sans réseau).
 */
export function aggregateRows(
  rows: SearchAnalyticsRow[],
): Pick<GscAggregate, "clicks" | "impressions" | "ctr" | "position" | "queryCount"> {
  let clicks = 0;
  let impressions = 0;
  let weightedCtr = 0;
  let weightedPos = 0;
  let posSum = 0; // repli moyenne simple si impressions == 0

  for (const r of rows) {
    const imp = r.impressions ?? 0;
    clicks += r.clicks ?? 0;
    impressions += imp;
    weightedCtr += (r.ctr ?? 0) * imp;
    weightedPos += (r.position ?? 0) * imp;
    posSum += r.position ?? 0;
  }

  const queryCount = rows.length;
  const ctr = impressions > 0 ? weightedCtr / impressions : 0;
  const position =
    impressions > 0 ? weightedPos / impressions : queryCount > 0 ? posSum / queryCount : 0;

  return { clicks, impressions, ctr, position, queryCount };
}

// ── Orchestration + persistance ─────────────────────────────────────────────────

/** Candidats de propriété GSC à tenter pour une URL (l'API exige une forme exacte). */
export function siteUrlCandidates(url: string): string[] {
  const candidates: string[] = [];
  try {
    const u = new URL(url);
    const origin = `${u.protocol}//${u.host}`;
    candidates.push(`${origin}/`); // préfixe d'URL exact
    const bareHost = u.host.replace(/^www\./, "");
    candidates.push(`sc-domain:${bareHost}`); // propriété de domaine
  } catch {
    candidates.push(url);
  }
  // Dédupe en conservant l'ordre.
  return [...new Set(candidates)];
}

export interface CaptureGscResult {
  /** Id du `GscSnapshot` inséré. */
  snapshotId: string;
  siteId: string;
  /** Forme de propriété GSC qui a répondu (préfixe URL ou `sc-domain:`). */
  matchedProperty: string;
  aggregate: GscAggregate;
}

/**
 * Orchestre la capture GSC d'un site appartenant au user : token → fetch →
 * agrégats → insertion d'un `GscSnapshot` (source=OAUTH, fenêtre ~28 j).
 *
 * Essaie successivement les formes de propriété GSC (préfixe d'URL puis
 * `sc-domain:`) ; si AUCUNE n'est vérifiée pour ce compte → GscError explicite
 * (pas un crash). Le `siteId` doit appartenir au `userId` (vérifié en base).
 *
 * NB : ce n'est PAS une server action (pas de `requireSession` ici, pour rester
 * testable / réutilisable côté worker Celery futur). La server action
 * `captureGscAction` (app/(app)/capturer/gsc-actions.ts) l'enveloppe avec
 * `requireSession()`.
 *
 * @throws {GscError} site absent/étranger, OAuth non configuré, propriété non
 *   vérifiée, ou erreur API/réseau.
 */
export async function captureGsc(userId: string, siteId: string): Promise<CaptureGscResult> {
  const site = await db.site.findFirst({
    where: { id: siteId, userId },
    select: { id: true, url: true },
  });
  if (!site) {
    throw new GscError("Site introuvable ou n'appartenant pas à cet utilisateur.");
  }

  const accessToken = await getAccessToken(userId);

  const candidates = siteUrlCandidates(site.url);
  let aggregate: GscAggregate | null = null;
  let matchedProperty = "";
  let lastNotFound: GscError | null = null;

  const { startDate, endDate } = defaultWindow();

  for (const property of candidates) {
    try {
      aggregate = await fetchSearchAnalytics(accessToken, property, startDate, endDate);
      matchedProperty = property;
      break;
    } catch (e) {
      // 403/404 → on tente la forme de propriété suivante ; autre erreur → on remonte.
      if (e instanceof GscError && /introuvable ou non vérifiée/.test(e.message)) {
        lastNotFound = e;
        continue;
      }
      throw e;
    }
  }

  if (!aggregate) {
    throw (
      lastNotFound ??
      new GscError(
        `Aucune propriété Search Console vérifiée pour ce site (essayé : ${candidates.join(", ")}).`,
      )
    );
  }

  const snapshot = await db.gscSnapshot.create({
    data: {
      siteId: site.id,
      source: "OAUTH",
      startDate: new Date(`${aggregate.startDate}T00:00:00Z`),
      endDate: new Date(`${aggregate.endDate}T00:00:00Z`),
      clicks: Math.round(aggregate.clicks),
      impressions: Math.round(aggregate.impressions),
      ctr: aggregate.ctr,
      position: aggregate.position,
      queryCount: aggregate.queryCount,
      indexedPages: null, // non fourni par la Search Analytics API seule
      // Json pur (le payload `rows` est déjà sérialisable).
      rawJson: JSON.parse(JSON.stringify({ property: matchedProperty, ...aggregate.raw })),
    },
    select: { id: true },
  });

  return { snapshotId: snapshot.id, siteId: site.id, matchedProperty, aggregate };
}

/** Fenêtre ~28 j décalée du lag de consolidation GSC, en dates ISO `YYYY-MM-DD`. */
export function defaultWindow(now: Date = new Date()): { startDate: string; endDate: string } {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - GSC_DATA_LAG_DAYS);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - DEFAULT_WINDOW_DAYS);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}
