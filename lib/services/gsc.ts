/**
 * Client Google Search Console (P2 — SEO Tier 2, cf. draft-metrique-autorite.md §2).
 *
 * ## Flux
 *
 * `getAccessToken(userId)` (refresh→access OAuth Better Auth, scope `webmasters.readonly`)
 * → `listVerifiedSites` (GET /sites — propriétés vérifiées du compte)
 * → `resolveGscPropertyCandidates` (filtre celles qui couvrent l'URL capturée)
 * → `fetchPropertyTotals` (POST searchAnalytics/query **sans dimension** — totaux site-wide)
 * → `fetchExtendedPropertyMetrics` (totaux + query/page counts + sitemaps)
 * → `pickBestGscProperty` (retient la propriété à plus forte couverture)
 * → `captureGsc` (insère un `GscSnapshot` source=OAUTH).
 *
 * ## Pièges API découverts en POC (2026-05-28)
 *
 * 1. **Ne JAMAIS sommer des rows `dimensions: ["query"]`** pour obtenir les clics totaux.
 *    L'API ne renvoie qu'un top-N (max 25 000 rows/page) ; le total dashboard GSC exige
 *    une requête **sans dimension** (1 row = totaux site-wide). Bug initial : 23 clics
 *    affichés vs 179 dans l'UI GSC (somme tronquée + mauvaise propriété).
 *
 * 2. **Plusieurs propriétés peuvent coexister** pour un même site (préfixe URL étroit,
 *    variante www/apex, `sc-domain:`). L'API exige la forme **exacte** de la propriété.
 *    Ne pas s'arrêter à la première qui répond : comparer les totaux et garder celle
 *    avec le **plus d'impressions** (couverture la plus large).
 *
 * 3. **Préfixe URL ≠ propriété domaine** : `https://www.exemple.com/` ne couvre pas
 *    automatiquement `sc-domain:exemple.com` (sous-domaines, variante sans www). On
 *    liste les propriétés vérifiées via GET /sites puis on filtre avec
 *    {@link propertyCoversUrl}.
 *
 * 4. **Fenêtre temporelle** : l'UI GSC « 28 jours » inclut les jours récents (partiels).
 *    Notre fenêtre ~28 j exclut les `GSC_DATA_LAG_DAYS` derniers jours (données non
 *    consolidées). Léger écart attendu vs le dashboard, pas un bug.
 *
 * 5. **Type de recherche** : on force `type: "web"` (aligné filtre « Web » du dashboard).
 *
 * 6. **Pagination query/page** : coûteuse (N appels API) — exécutée **une seule fois**
 *    sur la propriété retenue. `pageCount` = URLs avec impressions (28 j) ;
 *    `indexedPages` = API Sitemaps (`contents[].indexed`, proxy « pages valides/indexées »).
 *
 * 7. **Capture on-page vs site-wide** : Firecrawl ne scrape qu'une URL — les signaux
 *    v1 (liens externes/internes) restent homepage ; GSC apporte la vue site entier.
 *
 * Le fallback SCREENSHOT (gemma4-vision) est HORS PÉRIMÈTRE ici (`GscSource.SCREENSHOT`
 * prévu en schéma Prisma, non implémenté).
 *
 * Module SERVEUR uniquement — jamais importé côté client.
 */

import { db } from "@/lib/db";
import { fetchSitemapStats, type SitemapStats } from "@/lib/services/gsc-sitemaps";

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
export const GSC_DATA_LAG_DAYS = 3;

const TOKEN_TIMEOUT_MS = 15_000;
const QUERY_TIMEOUT_MS = 30_000;
/** Plafond API Search Analytics par page (max officiel = 25 000). */
const GSC_ROW_LIMIT = 25_000;

// ── Types API Search Analytics ────────────────────────────────────────────────

/** Une row renvoyée par POST searchAnalytics/query. */
export interface SearchAnalyticsRow {
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

interface SearchAnalyticsQueryBody {
  startDate: string;
  endDate: string;
  type?: "web";
  dimensions?: string[];
  rowLimit?: number;
  startRow?: number;
}

interface SiteEntry {
  siteUrl?: string;
  permissionLevel?: string;
}

interface SitesListResponse {
  siteEntry?: SiteEntry[];
}

/** Entrée GET /sites avec niveau de permission (ownership / délégué). */
export interface GscSiteEntry {
  siteUrl: string;
  permissionLevel: string;
}

/** Agrégats d'une fenêtre Search Analytics sur une propriété GSC. */
export interface GscAggregate {
  clicks: number;
  impressions: number;
  /** Click-through rate (0–1), tel que renvoyé par l'API sur la row sans dimension. */
  ctr: number;
  /** Position moyenne (1 = top), telle que renvoyée par l'API sur la row sans dimension. */
  position: number;
  /** Requêtes distinctes avec impressions (dimension `query`, pagination). */
  queryCount: number;
  /** URLs distinctes avec impressions (dimension `page`, pagination, 28 j). */
  pageCount: number;
  /** Pages indexées selon GSC (API Sitemaps, somme `indexed` type web). */
  indexedPages: number | null;
  /** Pages soumises via sitemap (API Sitemaps, somme `submitted` type web). */
  sitemapSubmittedPages: number | null;
  /** Fenêtre couverte (date-only, ISO `YYYY-MM-DD`). */
  startDate: string;
  endDate: string;
  /** Payload brut — audit et recalcul sans re-fetch. */
  raw: {
    totalsRow: SearchAnalyticsRow | null;
    queryCount: number;
    pageCount: number;
    pageCountCapped?: boolean;
    sitemap: SitemapStats | null;
  };
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
 * @throws {GscError} pas de compte Google, pas de refresh token, ou refus Google.
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

// ── Propriétés GSC (matching) ─────────────────────────────────────────────────

/** Normalise un hostname (insensible à la casse, sans préfixe www). */
export function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

/**
 * True si une propriété GSC peut couvrir le trafic de l'URL capturée.
 *
 * - `sc-domain:exemple.com` → apex + tous les sous-domaines.
 * - Préfixe URL → même hôte (www/apex assoupli) ET chemin sous le préfixe.
 */
export function propertyCoversUrl(gscProperty: string, siteUrl: string): boolean {
  try {
    const site = new URL(siteUrl);

    if (gscProperty.startsWith("sc-domain:")) {
      const domain = gscProperty.slice("sc-domain:".length).toLowerCase();
      const host = site.hostname.toLowerCase();
      return host === domain || host.endsWith(`.${domain}`);
    }

    const prop = new URL(gscProperty);
    if (normalizeHost(prop.hostname) !== normalizeHost(site.hostname)) {
      return false;
    }

    const propPath = prop.pathname.endsWith("/") ? prop.pathname : `${prop.pathname}/`;
    if (propPath === "/") return true;

    const sitePath = site.pathname.endsWith("/") ? site.pathname : `${site.pathname}/`;
    return sitePath.startsWith(propPath);
  } catch {
    return false;
  }
}

/**
 * Candidats heuristiques de propriété GSC pour une URL (forme exacte exigée par l'API).
 *
 * Génère : préfixe d'origine, variante www↔apex, `sc-domain:` (sans www).
 * Utilisé en repli si GET /sites échoue, et pour compléter la liste vérifiée.
 */
export function siteUrlCandidates(url: string): string[] {
  const candidates: string[] = [];
  try {
    const u = new URL(url);
    const origin = `${u.protocol}//${u.host}`;
    candidates.push(`${origin}/`);

    const hostNoWww = u.host.replace(/^www\./i, "");
    const apexHost = u.host.replace(/^www\./i, "");
    const wwwHost = u.host.startsWith("www.") ? u.host : `www.${u.host}`;

    if (apexHost !== u.host) {
      candidates.push(`${u.protocol}//${apexHost}/`);
    }
    if (wwwHost !== u.host) {
      candidates.push(`${u.protocol}//${wwwHost}/`);
    }

    candidates.push(`sc-domain:${hostNoWww}`);
  } catch {
    candidates.push(url);
  }
  return [...new Set(candidates)];
}

/**
 * Fusionne propriétés vérifiées (GET /sites) filtrées + heuristiques, ordre préservé.
 *
 * Les propriétés vérifiées qui couvrent l'URL passent en premier (source de vérité
 * côté compte Google) ; les heuristiques complètent au cas où la liste serait incomplète.
 */
export function resolveGscPropertyCandidates(verifiedSites: string[], siteUrl: string): string[] {
  const fromVerified = verifiedSites.filter((p) => propertyCoversUrl(p, siteUrl));
  const heuristic = siteUrlCandidates(siteUrl);
  const merged = [...fromVerified];
  for (const h of heuristic) {
    if (!merged.includes(h)) merged.push(h);
  }
  return merged;
}

/**
 * Choisit la propriété GSC la plus représentative parmi celles qui ont répondu.
 *
 * Critère : max impressions (couverture), puis max clics en cas d'égalité.
 * Évite de retenir un préfixe URL étroit (ex. `/blog/`) alors que `sc-domain:`
 * couvre tout le trafic.
 */
export function pickBestGscProperty<
  T extends { property: string; aggregate: Pick<GscAggregate, "impressions" | "clicks"> },
>(attempts: T[]): T | null {
  if (attempts.length === 0) return null;
  return attempts.reduce((best, cur) => {
    if (cur.aggregate.impressions !== best.aggregate.impressions) {
      return cur.aggregate.impressions > best.aggregate.impressions ? cur : best;
    }
    return cur.aggregate.clicks > best.aggregate.clicks ? cur : best;
  });
}

// ── Search Analytics API ───────────────────────────────────────────────────────

/** ISO date-only (`YYYY-MM-DD`) en UTC — format attendu par l'API GSC. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * POST searchAnalytics/query — couche basse (totaux sans dimension, pagination query…).
 *
 * @throws {GscError} site non vérifié (403/404), ou erreur API.
 */
async function postSearchAnalyticsQuery(
  accessToken: string,
  siteUrl: string,
  body: SearchAnalyticsQueryBody,
): Promise<SearchAnalyticsResponse> {
  const endpoint = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "web", ...body }),
    },
    QUERY_TIMEOUT_MS,
    "Search Console",
  );

  if (res.status === 403 || res.status === 404) {
    throw new GscError(
      `Propriété « ${siteUrl} » introuvable ou non vérifiée dans ta Search Console (${res.status}). ` +
        "Ajoute et vérifie ce site dans GSC avec le même compte Google, puis réessaie.",
    );
  }

  const json = (await res.json().catch(() => ({}))) as SearchAnalyticsResponse;
  if (!res.ok) {
    throw new GscError(`Search Console a répondu ${res.status}${json.error?.message ? ` : ${json.error.message}` : ""}.`);
  }

  return json;
}

/**
 * Liste les propriétés GSC accessibles au token avec leur niveau de permission.
 *
 * Retourne un tableau vide si l'appel échoue.
 */
export async function listVerifiedSiteEntries(accessToken: string): Promise<GscSiteEntry[]> {
  try {
    const res = await fetchWithTimeout(
      `${GSC_API_BASE}/sites`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      QUERY_TIMEOUT_MS,
      "Search Console (liste des propriétés)",
    );
    if (!res.ok) return [];

    const json = (await res.json()) as SitesListResponse;
    return (json.siteEntry ?? [])
      .filter((e): e is SiteEntry & { siteUrl: string } => Boolean(e.siteUrl))
      .map((e) => ({
        siteUrl: e.siteUrl,
        permissionLevel: e.permissionLevel ?? "siteUnverifiedUser",
      }));
  } catch {
    return [];
  }
}

/**
 * Liste les propriétés GSC vérifiées accessibles au token (GET /webmasters/v3/sites).
 *
 * Filtre `siteUnverifiedUser`. Retourne un tableau vide si l'appel échoue
 * (repli sur {@link siteUrlCandidates} dans {@link captureGsc}).
 *
 * @deprecated Préférer {@link listVerifiedSiteEntries} + filtre ownership en amont.
 */
export async function listVerifiedSites(accessToken: string): Promise<string[]> {
  const entries = await listVerifiedSiteEntries(accessToken);
  return entries
    .filter((e) => e.permissionLevel !== "siteUnverifiedUser")
    .map((e) => e.siteUrl);
}

/** Totaux site-wide (1 row, sans dimension) — aligné carte « Nombre total de clics » GSC. */
async function fetchPropertyTotals(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<SearchAnalyticsRow | undefined> {
  const json = await postSearchAnalyticsQuery(accessToken, siteUrl, { startDate, endDate });
  return json.rows?.[0];
}

/**
 * Compte les lignes distinctes pour une dimension Search Analytics (`query`, `page`…).
 *
 * @returns `{ count, capped }` — `capped=true` si plafond API (25k rows/page).
 */
async function fetchDistinctDimensionCount(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimension: "query" | "page",
): Promise<{ count: number; capped: boolean }> {
  let count = 0;
  let startRow = 0;
  let capped = false;

  while (true) {
    const json = await postSearchAnalyticsQuery(accessToken, siteUrl, {
      startDate,
      endDate,
      dimensions: [dimension],
      rowLimit: GSC_ROW_LIMIT,
      startRow,
    });
    const batch = json.rows ?? [];
    if (batch.length === 0) break;
    count += batch.length;
    if (batch.length < GSC_ROW_LIMIT) break;
    capped = true;
    startRow += batch.length;
  }

  return { count, capped };
}

/** Métriques étendues sur une propriété retenue (totaux + dimensions + sitemaps). */
async function fetchExtendedPropertyMetrics(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  totalsRow?: SearchAnalyticsRow,
): Promise<GscAggregate> {
  const totals = totalsRow ?? (await fetchPropertyTotals(accessToken, siteUrl, startDate, endDate));
  const metrics = metricsFromTotalsRow(totals);

  const [queries, pages, sitemap] = await Promise.all([
    fetchDistinctDimensionCount(accessToken, siteUrl, startDate, endDate, "query"),
    fetchDistinctDimensionCount(accessToken, siteUrl, startDate, endDate, "page"),
    fetchSitemapStats(accessToken, siteUrl, (url, init) =>
      fetchWithTimeout(String(url), init ?? {}, QUERY_TIMEOUT_MS, "Search Console (sitemaps)"),
    ).catch(() => null),
  ]);

  return {
    ...metrics,
    queryCount: queries.count,
    pageCount: pages.count,
    indexedPages: sitemap?.indexedPages ?? null,
    sitemapSubmittedPages: sitemap?.submittedPages ?? null,
    startDate,
    endDate,
    raw: {
      totalsRow: totals ?? null,
      queryCount: queries.count,
      pageCount: pages.count,
      pageCountCapped: pages.capped || undefined,
      sitemap,
    },
  };
}

/** Extrait les métriques principales d'une row totaux (sans dimension). */
export function metricsFromTotalsRow(
  totalsRow: SearchAnalyticsRow | undefined,
): Pick<GscAggregate, "clicks" | "impressions" | "ctr" | "position"> {
  return {
    clicks: totalsRow?.clicks ?? 0,
    impressions: totalsRow?.impressions ?? 0,
    ctr: totalsRow?.ctr ?? 0,
    position: totalsRow?.position ?? 0,
  };
}

/**
 * Interroge une propriété GSC : totaux (sans dimension) + queryCount paginé.
 *
 * Préférer {@link captureGsc} en prod (sélection multi-propriétés optimisée).
 *
 * @throws {GscError} site non vérifié, ou erreur API.
 */
export async function fetchSearchAnalytics(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<GscAggregate> {
  return fetchExtendedPropertyMetrics(accessToken, siteUrl, startDate, endDate);
}

/**
 * Agrège des rows Search Analytics (dimension `query`) — **utilitaire pur**.
 *
 * ⚠️ Ne pas utiliser pour les totaux site-wide : une liste de rows query est
 * tronquée par `rowLimit` et ne reproduit pas le dashboard GSC. Conservé pour
 * tests, recalculs futurs sur payload paginé, ou fallback screenshot.
 *
 * - clicks/impressions = sommes des rows
 * - ctr/position = moyennes pondérées par impressions
 */
export function aggregateRows(
  rows: SearchAnalyticsRow[],
): Pick<GscAggregate, "clicks" | "impressions" | "ctr" | "position" | "queryCount"> {
  let clicks = 0;
  let impressions = 0;
  let weightedCtr = 0;
  let weightedPos = 0;
  let posSum = 0;

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

// ── Orchestration + persistance ───────────────────────────────────────────────

export interface CaptureGscResult {
  snapshotId: string;
  siteId: string;
  /** Forme exacte de la propriété GSC retenue (préfixe URL ou `sc-domain:`). */
  matchedProperty: string;
  aggregate: GscAggregate;
}

export interface CaptureGscOptions {
  /** Propriété GSC déjà connue (import batch) — évite la sonde multi-candidats. */
  matchedProperty?: string;
}

/**
 * Orchestre la capture GSC : token → propriétés → totaux → meilleure propriété →
 * queryCount → `GscSnapshot` (source=OAUTH, fenêtre ~28 j − lag).
 *
 * @throws {GscError} site absent, OAuth absent, aucune propriété vérifiée, erreur API.
 */
export async function captureGsc(
  userId: string,
  siteId: string,
  options?: CaptureGscOptions,
): Promise<CaptureGscResult> {
  const site = await db.site.findFirst({
    where: { id: siteId, userId },
    select: { id: true, url: true },
  });
  if (!site) {
    throw new GscError("Site introuvable ou n'appartenant pas à cet utilisateur.");
  }

  const accessToken = await getAccessToken(userId);
  const { startDate, endDate } = defaultWindow();

  if (options?.matchedProperty) {
    const matchedProperty = options.matchedProperty;
    const aggregate = await fetchExtendedPropertyMetrics(
      accessToken,
      matchedProperty,
      startDate,
      endDate,
    );
    return persistGscSnapshot(site.id, matchedProperty, aggregate);
  }

  const verifiedSites = await listVerifiedSites(accessToken);
  const properties = resolveGscPropertyCandidates(verifiedSites, site.url);

  // Phase 1 — totaux uniquement (1 appel API / candidat, pas de pagination query).
  const attempts: Array<{
    property: string;
    totalsRow: SearchAnalyticsRow | undefined;
    aggregate: Pick<GscAggregate, "impressions" | "clicks">;
  }> = [];
  let lastNotFound: GscError | null = null;

  for (const property of properties) {
    try {
      const totalsRow = await fetchPropertyTotals(accessToken, property, startDate, endDate);
      const metrics = metricsFromTotalsRow(totalsRow);
      attempts.push({
        property,
        totalsRow,
        aggregate: { impressions: metrics.impressions, clicks: metrics.clicks },
      });
    } catch (e) {
      if (e instanceof GscError && /introuvable ou non vérifiée/.test(e.message)) {
        lastNotFound = e;
        continue;
      }
      throw e;
    }
  }

  const best = pickBestGscProperty(attempts);
  if (!best) {
    throw (
      lastNotFound ??
      new GscError(
        `Aucune propriété Search Console vérifiée pour ce site (essayé : ${properties.join(", ")}).`,
      )
    );
  }

  const matchedProperty = best.property;
  const aggregate = await fetchExtendedPropertyMetrics(
    accessToken,
    matchedProperty,
    startDate,
    endDate,
    best.totalsRow,
  );

  return persistGscSnapshot(site.id, matchedProperty, aggregate);
}

async function persistGscSnapshot(
  siteId: string,
  matchedProperty: string,
  aggregate: GscAggregate,
): Promise<CaptureGscResult> {
  const snapshot = await db.gscSnapshot.create({
    data: {
      siteId,
      source: "OAUTH",
      startDate: new Date(`${aggregate.startDate}T00:00:00Z`),
      endDate: new Date(`${aggregate.endDate}T00:00:00Z`),
      clicks: Math.round(aggregate.clicks),
      impressions: Math.round(aggregate.impressions),
      ctr: aggregate.ctr,
      position: aggregate.position,
      queryCount: aggregate.queryCount,
      pageCount: aggregate.pageCount,
      indexedPages: aggregate.indexedPages,
      sitemapSubmittedPages: aggregate.sitemapSubmittedPages,
      rawJson: JSON.parse(JSON.stringify({ property: matchedProperty, ...aggregate.raw })),
    },
    select: { id: true },
  });

  return { snapshotId: snapshot.id, siteId, matchedProperty, aggregate };
}

/**
 * Fenêtre ~28 j décalée du lag de consolidation GSC, en dates ISO `YYYY-MM-DD`.
 *
 * Ex. pour `now = 2026-05-28` : `[2026-04-27, 2026-05-25]` (28 jours entre
 * start et end, end = today − 3 j).
 */
export function defaultWindow(now: Date = new Date()): { startDate: string; endDate: string } {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - GSC_DATA_LAG_DAYS);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - DEFAULT_WINDOW_DAYS);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}
