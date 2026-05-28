/**
 * Activité récente — agrégat ledger + liens (P3, lecture seule).
 */

import { db } from "@/lib/db";
import type { Activity } from "@/lib/domain";
import type { CreditTxReason } from "@/lib/generated/prisma/enums";

const REASON_LABEL: Partial<Record<CreditTxReason, { kind: Activity["kind"]; template: string }>> = {
  LINK_VERIFIED: { kind: "earn", template: "Lien vérifié" },
  PROMOTION_SPEND: { kind: "spend", template: "Promotion lancée" },
  PROMOTION_REFUND: { kind: "earn", template: "Remboursement promotion" },
  LINK_CLAWBACK: { kind: "spend", template: "Clawback lien rompu" },
  BONUS: { kind: "earn", template: "Bonus" },
  ADJUSTMENT: { kind: "earn", template: "Ajustement" },
};

function formatRelative(iso: Date): string {
  const diffMs = Date.now() - iso.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return mins <= 1 ? "à l'instant" : `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "hier" : `il y a ${days} j`;
}

/**
 * Flux d'activité crédits depuis le ledger (vide si aucun mouvement).
 */
export async function fetchRecentActivity(userId: string, limit = 8): Promise<Activity[]> {
  const entries = await db.creditLedgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      editorialLink: {
        select: { beneficiarySite: { select: { domain: true } } },
      },
    },
  });

  return entries.map((e) => {
    const meta = REASON_LABEL[e.reason];
    const domain = e.editorialLink?.beneficiarySite?.domain;
    const sign = e.amount >= 0 ? "+" : "−";
    const delta = `${sign}${Math.abs(e.amount)} ◇`;
    const text = domain ? `${meta?.template ?? e.reason} · ${domain}` : (meta?.template ?? e.reason);
    const kind = meta?.kind ?? (e.amount >= 0 ? "earn" : "spend");
    return { kind, delta, text, when: formatRelative(e.createdAt) };
  });
}
