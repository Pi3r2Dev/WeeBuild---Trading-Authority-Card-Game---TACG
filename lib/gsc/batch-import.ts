/**
 * Import batch GSC — file d'attente persistée + worker/cron.
 *
 * Flux :
 * 1. `listGscImportCandidates` — propriétés éligibles (owner, dédupliquées par domaine).
 * 2. `createGscImportBatch` — crée le lot + items PENDING.
 * 3. `processGscImportQueue` — worker/cron traite N items (Firecrawl + GSC + carte v2).
 */

import type { ElementKind } from "@/lib/domain";
import { computeAuthorityV2 } from "@/lib/authority/score-v2";
import { extractEditorial } from "@/lib/authority/extract";
import { getLatestGscInputForSite, siteRowToCaptured } from "@/lib/authority/gsc-input";
import { persistCapture } from "@/lib/capturer/persist-capture";
import { applyAuthorityToSite } from "@/lib/capturer/apply-authority";
import {
  delegatedImportEnabledFromEnv,
  isEligibleGscProperty,
  gscPermissionLabel,
  isOwnershipProofLevel,
  type GscSiteEntry,
} from "@/lib/gsc/property-permissions";
import {
  dedupeGscEntriesByDomain,
  domainFromGscProperty,
  gscPropertyToCaptureUrl,
} from "@/lib/gsc/property-url";
import { captureSite, CaptureError } from "@/lib/services/capture";
import {
  captureGsc,
  getAccessToken,
  GscError,
  listVerifiedSiteEntries,
} from "@/lib/services/gsc";
import { db } from "@/lib/db";

/** Erreur métier import batch — message FR pour l'UI. */
export class GscImportError extends Error {}

/** Nombre d'items traités par tick worker/cron (évite timeouts HTTP). */
export function itemsPerTickFromEnv(): number {
  const raw = process.env.WEBUILD_GSC_BATCH_ITEMS_PER_TICK;
  const n = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 1;
}

export interface GscImportCandidate {
  gscProperty: string;
  permissionLevel: string;
  domain: string;
  captureUrl: string;
  permissionLabel: string;
  /** Déjà présent dans la main du membre. */
  alreadyImported: boolean;
  /** Preuve ownership forte (siteOwner). */
  isOwner: boolean;
}

export interface GscImportBatchProgress {
  batchId: string;
  status: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  skippedItems: number;
  pendingItems: number;
  items: Array<{
    id: string;
    domain: string;
    gscProperty: string;
    status: string;
    error: string | null;
    siteId: string | null;
    cardId: string | null;
  }>;
}

export interface ProcessQueueResult {
  processed: number;
  batchIds: string[];
}

async function loadEligibleEntries(
  userId: string,
  allowDelegated?: boolean,
): Promise<GscSiteEntry[]> {
  const accessToken = await getAccessToken(userId);
  const all = await listVerifiedSiteEntries(accessToken);
  const delegated = allowDelegated ?? delegatedImportEnabledFromEnv();
  const eligible = all.filter((e) => isEligibleGscProperty(e, { allowDelegated: delegated }));
  return dedupeGscEntriesByDomain(eligible);
}

/**
 * Liste les propriétés GSC importables pour le membre connecté.
 */
export async function listGscImportCandidates(
  userId: string,
  options?: { allowDelegated?: boolean },
): Promise<GscImportCandidate[]> {
  let entries: GscSiteEntry[];
  try {
    entries = await loadEligibleEntries(userId, options?.allowDelegated);
  } catch (e) {
    if (e instanceof GscError) throw new GscImportError(e.message);
    throw e;
  }

  const existingDomains = new Set(
    (
      await db.site.findMany({
        where: { userId },
        select: { domain: true },
      })
    ).map((s) => s.domain),
  );

  return entries.map((entry) => {
    const domain = domainFromGscProperty(entry.siteUrl);
    return {
      gscProperty: entry.siteUrl,
      permissionLevel: entry.permissionLevel,
      domain,
      captureUrl: gscPropertyToCaptureUrl(entry.siteUrl),
      permissionLabel: gscPermissionLabel(entry.permissionLevel),
      alreadyImported: existingDomains.has(domain),
      isOwner: isOwnershipProofLevel(entry.permissionLevel),
    };
  });
}

/**
 * Crée un lot d'import pour les propriétés sélectionnées (ou toutes les éligibles).
 */
export async function createGscImportBatch(
  userId: string,
  selectedProperties: string[] | "all",
  options?: { allowDelegated?: boolean },
): Promise<{ batchId: string; totalItems: number; skippedAtCreation: number }> {
  const candidates = await listGscImportCandidates(userId, options);
  const byProperty = new Map(candidates.map((c) => [c.gscProperty, c]));

  const toImport =
    selectedProperties === "all"
      ? candidates.filter((c) => !c.alreadyImported)
      : selectedProperties
          .map((p) => byProperty.get(p))
          .filter((c): c is GscImportCandidate => c != null && !c.alreadyImported);

  if (toImport.length === 0) {
    throw new GscImportError(
      selectedProperties === "all"
        ? "Aucune nouvelle propriété à importer — toutes sont déjà dans votre main ou non éligibles."
        : "Aucune propriété sélectionnée n'est importable (déjà importée ou non éligible).",
    );
  }

  const allowDelegated = options?.allowDelegated ?? delegatedImportEnabledFromEnv();

  const batch = await db.gscImportBatch.create({
    data: {
      userId,
      status: "PENDING",
      allowDelegated,
      totalItems: toImport.length,
      items: {
        create: toImport.map((c) => ({
          gscProperty: c.gscProperty,
          permissionLevel: c.permissionLevel,
          domain: c.domain,
          captureUrl: c.captureUrl,
          status: "PENDING",
        })),
      },
    },
    select: { id: true },
  });

  const skippedAtCreation =
    selectedProperties === "all"
      ? candidates.filter((c) => c.alreadyImported).length
      : selectedProperties.filter((p) => {
          const c = byProperty.get(p);
          return c?.alreadyImported;
        }).length;

  return { batchId: batch.id, totalItems: toImport.length, skippedAtCreation };
}

async function finalizeBatchIfDone(batchId: string): Promise<void> {
  const batch = await db.gscImportBatch.findUnique({
    where: { id: batchId },
    include: {
      items: { select: { status: true } },
    },
  });
  if (!batch) return;

  const pending = batch.items.filter((i) => i.status === "PENDING" || i.status === "RUNNING").length;
  if (pending > 0) return;

  const completed = batch.items.filter((i) => i.status === "COMPLETED").length;
  const failed = batch.items.filter((i) => i.status === "FAILED").length;
  const skipped = batch.items.filter((i) => i.status === "SKIPPED").length;

  let status: "COMPLETED" | "PARTIAL" | "FAILED";
  if (completed === batch.totalItems) status = "COMPLETED";
  else if (completed > 0) status = "PARTIAL";
  else status = "FAILED";

  await db.gscImportBatch.update({
    where: { id: batchId },
    data: {
      status,
      completedItems: completed,
      failedItems: failed,
      skippedItems: skipped,
      finishedAt: new Date(),
    },
  });
}

/**
 * Traite une propriété GSC : Firecrawl → carte → snapshot GSC → score v2.
 */
export async function importSingleGscProperty(
  userId: string,
  item: { gscProperty: string; captureUrl: string; domain: string },
): Promise<{ siteId: string; cardId: string }> {
  const existing = await db.site.findFirst({
    where: { userId, domain: item.domain },
    include: { card: { select: { id: true } } },
  });
  if (existing?.card) {
    throw new GscImportError(`Le domaine « ${item.domain} » est déjà dans votre main.`);
  }

  const captured = await captureSite(item.captureUrl);
  const extract = await extractEditorial(captured);
  const authorityV1 = computeAuthorityV2(captured, null);

  const siteId = await persistCapture(userId, captured, authorityV1, extract);

  await captureGsc(userId, siteId, { matchedProperty: item.gscProperty });

  const siteRow = await db.site.findFirstOrThrow({
    where: { id: siteId },
    select: {
      id: true,
      url: true,
      domain: true,
      markdown: true,
      title: true,
      description: true,
      internalLinks: true,
      externalLinks: true,
      imageCount: true,
      https: true,
      element: true,
      thematique: true,
      card: {
        select: {
          id: true,
          element: true,
          thematique: true,
          anchor: true,
          summary: true,
        },
      },
    },
  });

  if (!siteRow.card) {
    throw new GscImportError("Carte absente après persistance — erreur interne.");
  }

  const gscInput = await getLatestGscInputForSite(siteId);
  const authority = computeAuthorityV2(siteRowToCaptured(siteRow), gscInput);

  await applyAuthorityToSite(siteId, userId, authority, {
    element: (siteRow.card.element ?? siteRow.element ?? "media") as ElementKind,
    thematique: siteRow.card.thematique,
    anchor: siteRow.card.anchor,
    summary: siteRow.card.summary,
    source: extract.source,
  });

  return { siteId, cardId: siteRow.card.id };
}

async function processOneItem(itemId: string): Promise<void> {
  const item = await db.gscImportBatchItem.findUnique({
    where: { id: itemId },
    include: { batch: { select: { userId: true, id: true, startedAt: true } } },
  });
  if (!item || item.status !== "PENDING") return;

  await db.gscImportBatch.update({
    where: { id: item.batchId },
    data: { status: "RUNNING", startedAt: item.batch.startedAt ?? new Date() },
  });

  await db.gscImportBatchItem.update({
    where: { id: itemId },
    data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    const { siteId, cardId } = await importSingleGscProperty(item.batch.userId, {
      gscProperty: item.gscProperty,
      captureUrl: item.captureUrl,
      domain: item.domain,
    });

    await db.gscImportBatchItem.update({
      where: { id: itemId },
      data: {
        status: "COMPLETED",
        siteId,
        cardId,
        finishedAt: new Date(),
        error: null,
      },
    });

    await db.gscImportBatch.update({
      where: { id: item.batchId },
      data: { completedItems: { increment: 1 } },
    });
  } catch (e) {
    const message =
      e instanceof CaptureError || e instanceof GscError || e instanceof GscImportError
        ? e.message
        : `Erreur inattendue : ${(e as Error).message}`;

    const isSkip = e instanceof GscImportError && message.includes("déjà dans votre main");

    await db.gscImportBatchItem.update({
      where: { id: itemId },
      data: {
        status: isSkip ? "SKIPPED" : "FAILED",
        error: message,
        finishedAt: new Date(),
      },
    });

    await db.gscImportBatch.update({
      where: { id: item.batchId },
      data: isSkip ? { skippedItems: { increment: 1 } } : { failedItems: { increment: 1 } },
    });
  }

  await finalizeBatchIfDone(item.batchId);
}

/**
 * Worker/cron — traite jusqu'à `limit` items PENDING (FIFO par batch).
 */
export async function processGscImportQueue(limit = itemsPerTickFromEnv()): Promise<ProcessQueueResult> {
  const pending = await db.gscImportBatchItem.findMany({
    where: { status: "PENDING", batch: { status: { in: ["PENDING", "RUNNING"] } } },
    orderBy: [{ batch: { createdAt: "asc" } }, { createdAt: "asc" }],
    take: limit,
    select: { id: true, batchId: true },
  });

  const batchIds = new Set<string>();

  for (const row of pending) {
    batchIds.add(row.batchId);
    await processOneItem(row.id);
  }

  return { processed: pending.length, batchIds: [...batchIds] };
}

/** Progression d'un lot pour polling UI. */
export async function getGscImportBatchProgress(
  userId: string,
  batchId: string,
): Promise<GscImportBatchProgress | null> {
  const batch = await db.gscImportBatch.findFirst({
    where: { id: batchId, userId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          domain: true,
          gscProperty: true,
          status: true,
          error: true,
          siteId: true,
          cardId: true,
        },
      },
    },
  });

  if (!batch) return null;

  const pendingItems = batch.items.filter((i) => i.status === "PENDING" || i.status === "RUNNING").length;

  return {
    batchId: batch.id,
    status: batch.status,
    totalItems: batch.totalItems,
    completedItems: batch.completedItems,
    failedItems: batch.failedItems,
    skippedItems: batch.skippedItems,
    pendingItems,
    items: batch.items,
  };
}

/** Lot actif (PENDING/RUNNING) le plus récent du membre, s'il existe. */
export async function getActiveGscImportBatch(userId: string): Promise<GscImportBatchProgress | null> {
  const batch = await db.gscImportBatch.findFirst({
    where: { userId, status: { in: ["PENDING", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!batch) return null;
  return getGscImportBatchProgress(userId, batch.id);
}
