"use server";

/**
 * Server action P3 — génère le contenu éditorial (angle + ancre + embedding) des
 * suggestions en placeholder d'une `MatchingSession`. Protégée par
 * `requireSession()` : la session doit appartenir au user connecté.
 *
 * Pas d'UI ici : point d'entrée serveur que l'UI matching (autre sous-tâche)
 * appellera après le matching, ou en bouton « générer les briefs ». La sortie
 * reste une PROPOSITION ÉDITABLE (status `GENERATED`) — aucune publication, la
 * validation humaine est une étape ultérieure (écran à venir).
 */

import { requireSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { generateForSession, type GenerateForSessionResult } from "./generate-for-session";

export interface GenerateSuggestionsSuccess {
  ok: true;
  result: GenerateForSessionResult;
}
export interface GenerateSuggestionsFailure {
  ok: false;
  error: string;
}
export type GenerateSuggestionsResult = GenerateSuggestionsSuccess | GenerateSuggestionsFailure;

/**
 * Génère les briefs éditoriaux d'une session de matching (doit appartenir au
 * user connecté).
 */
export async function generateSuggestionsForSession(
  sessionId: string,
): Promise<GenerateSuggestionsResult> {
  try {
    const userId = (await requireSession()).user.id;

    const session = await db.matchingSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    if (!session) return { ok: false, error: "Session de matching introuvable." };
    if (session.userId !== userId) {
      return { ok: false, error: "Accès refusé : cette session ne vous appartient pas." };
    }

    const result = await generateForSession(sessionId);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: `Échec de la génération éditoriale : ${(e as Error).message}` };
  }
}
