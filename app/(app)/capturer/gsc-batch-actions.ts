"use server";

/**
 * Server actions — import batch Google Search Console (déclaration multi-sites).
 *
 * - `listGscImportCandidatesAction` : propriétés éligibles (owner, dédupliquées).
 * - `startGscImportBatchAction` : crée le lot + lance le 1er tick worker.
 * - `getGscImportBatchStatusAction` : polling progression UI.
 */

import {
  createGscImportBatch,
  getActiveGscImportBatch,
  getGscImportBatchProgress,
  GscImportError,
  listGscImportCandidates,
  processGscImportQueue,
  type GscImportBatchProgress,
  type GscImportCandidate,
} from "@/lib/gsc/batch-import";
import { delegatedImportEnabledFromEnv } from "@/lib/gsc/property-permissions";
import { requireSession } from "@/lib/auth-session";

export interface ListGscCandidatesSuccess {
  ok: true;
  candidates: GscImportCandidate[];
  allowDelegatedEnv: boolean;
}

export interface GscBatchFailure {
  ok: false;
  error: string;
}

export type ListGscCandidatesResult = ListGscCandidatesSuccess | GscBatchFailure;

/** Liste les propriétés GSC importables pour le membre connecté. */
export async function listGscImportCandidatesAction(): Promise<ListGscCandidatesResult> {
  try {
    const userId = (await requireSession()).user.id;
    const candidates = await listGscImportCandidates(userId);
    return { ok: true, candidates, allowDelegatedEnv: delegatedImportEnabledFromEnv() };
  } catch (e) {
    if (e instanceof GscImportError) return { ok: false, error: e.message };
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}

export interface StartGscBatchSuccess {
  ok: true;
  batchId: string;
  totalItems: number;
  skippedAtCreation: number;
  progress: GscImportBatchProgress;
}

export type StartGscBatchResult = StartGscBatchSuccess | GscBatchFailure;

/**
 * Crée un lot d'import et traite immédiatement le 1er item (best-effort).
 * Les ticks suivants passent par cron ou `worker:gsc-import`.
 */
export async function startGscImportBatchAction(
  selectedProperties: string[] | "all",
): Promise<StartGscBatchResult> {
  try {
    const userId = (await requireSession()).user.id;

    const active = await getActiveGscImportBatch(userId);
    if (active) {
      return {
        ok: false,
        error: "Un import Search Console est déjà en cours. Attends qu'il se termine ou consulte sa progression.",
      };
    }

    const { batchId, totalItems, skippedAtCreation } = await createGscImportBatch(
      userId,
      selectedProperties,
    );

    await processGscImportQueue();

    const progress = await getGscImportBatchProgress(userId, batchId);
    if (!progress) {
      return { ok: false, error: "Lot créé mais introuvable — erreur interne." };
    }

    return { ok: true, batchId, totalItems, skippedAtCreation, progress };
  } catch (e) {
    if (e instanceof GscImportError) return { ok: false, error: e.message };
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}

export interface BatchStatusSuccess {
  ok: true;
  progress: GscImportBatchProgress;
}

export type BatchStatusResult = BatchStatusSuccess | GscBatchFailure;

/** Progression d'un lot (polling UI). */
export async function getGscImportBatchStatusAction(batchId: string): Promise<BatchStatusResult> {
  try {
    const userId = (await requireSession()).user.id;
    const progress = await getGscImportBatchProgress(userId, batchId);
    if (!progress) return { ok: false, error: "Lot introuvable." };
    return { ok: true, progress };
  } catch (e) {
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}

/** Lot actif du membre, s'il existe. */
export async function getActiveGscImportBatchAction(): Promise<
  { ok: true; progress: GscImportBatchProgress | null } | GscBatchFailure
> {
  try {
    const userId = (await requireSession()).user.id;
    const progress = await getActiveGscImportBatch(userId);
    return { ok: true, progress };
  } catch (e) {
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}

/** Tick worker déclenché depuis l'UI (complète le cron en dev). */
export async function tickGscImportQueueAction(): Promise<
  { ok: true; processed: number } | GscBatchFailure
> {
  try {
    await requireSession();
    const { processed } = await processGscImportQueue();
    return { ok: true, processed };
  } catch (e) {
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}
