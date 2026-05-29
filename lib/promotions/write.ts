/**
 * Écritures DB du lancement d'une promotion (B5) — orchestration Prisma.
 *
 * Module SERVEUR. Couche fine : charge le site (appartenance + domaine), délègue
 * la DÉCISION à `transitions.ts` (pur, testé), applique le résultat dans une
 * transaction atomique. La promotion + le débit ledger (`PROMOTION_SPEND`) sont
 * écrits ensemble ; un double-check de solde DANS la transaction protège du
 * double-clic concurrent (pattern `lib/links/verify.ts`). Cf. blueprint §4.4.
 *
 * Q-P3-2 : le solde insuffisant BLOQUE le lancement (aucune pénalité AS — P4).
 */

import { db } from "@/lib/db";
import { getCreditBalance } from "@/lib/credits/balance";
import { decideLaunchPromotion } from "./transitions";
import { toPromotionView } from "./read";
import type { ActionResult, LaunchPromotionInput, PromotionView } from "./types";

/**
 * Lance une promotion : débite `creditsSpent` du ledger et crée la `Promotion`
 * ACTIVE. Atomique. Renvoie la vue de la promotion créée (domaine résolu).
 */
export async function launchPromotion(
  input: LaunchPromotionInput & { userId: string },
): Promise<ActionResult<{ promotion: PromotionView }>> {
  const site = await db.site.findUnique({
    where: { id: input.siteId },
    select: { userId: true, domain: true },
  });
  if (!site) return { ok: false, error: "Site introuvable." };

  const currentBalance = await getCreditBalance(input.userId);
  const decision = decideLaunchPromotion({ ownerUserId: site.userId, currentBalance }, input);
  if (decision.kind === "error") return { ok: false, error: decision.error };

  return db.$transaction(async (tx) => {
    // Double-check du solde dans la transaction (anti double-clic concurrent).
    const agg = await tx.creditLedgerEntry.aggregate({
      where: { userId: input.userId },
      _sum: { amount: true },
    });
    const balanceInTx = agg._sum.amount ?? 0;
    if (balanceInTx < decision.cost) {
      // TODO(P4): pas de pénalité AS sur solde négatif ici (Q-P3-2) — le solde
      // négatif n'arrive pas en P3 puisque le lancement est bloqué en amont.
      return {
        ok: false,
        error: `Solde insuffisant au moment de la confirmation (${balanceInTx} ◇ disponibles, ${decision.cost} ◇ requis).`,
      };
    }

    const now = new Date();
    const promotion = await tx.promotion.create({
      data: {
        userId: input.userId,
        siteId: input.siteId,
        status: "ACTIVE",
        targetLevel: input.targetLevel ?? null,
        targetElement: input.targetElement ?? null,
        targetThematique: input.targetThematique ?? null,
        creditsSpent: decision.cost,
        startsAt: now,
        expiresAt: decision.expiresAt,
      },
      select: {
        id: true,
        siteId: true,
        status: true,
        targetLevel: true,
        targetElement: true,
        targetThematique: true,
        creditsSpent: true,
        startsAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    await tx.creditLedgerEntry.create({
      data: {
        userId: input.userId,
        amount: -decision.cost,
        reason: "PROMOTION_SPEND",
        promotionId: promotion.id,
      },
    });

    return { ok: true, promotion: toPromotionView(promotion, site.domain) };
  });
}
