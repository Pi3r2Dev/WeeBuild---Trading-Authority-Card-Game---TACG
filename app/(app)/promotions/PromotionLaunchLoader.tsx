import { requireSession } from "@/lib/auth-session";
import { getCreditBalance } from "@/lib/credits/balance";
import { getMyDeck } from "@/lib/data";
import { getMyPromotions } from "@/lib/promotions/read";
import { PromotionLaunchClient } from "./PromotionLaunchClient";

/**
 * Loader SERVER pour l'écran de lancement de promotion (B5).
 *
 * Charge le solde réel (ledger), le deck du user (sites promouvables) et son
 * historique de promotions. L'aperçu de coût est recalculé live côté client via
 * `computePromoCost` (policy isomorphe). Les modules read/write tirent Prisma →
 * jamais importés depuis le Client.
 */
export async function PromotionLaunchLoader() {
  const userId = (await requireSession()).user.id;
  const [balance, deck, myPromotions] = await Promise.all([
    getCreditBalance(userId),
    getMyDeck(userId),
    getMyPromotions(userId),
  ]);

  const sites = deck.map((c) => ({
    siteId: c.siteId,
    domain: c.domain,
    level: c.level,
    element: c.element,
  }));

  return <PromotionLaunchClient balance={balance} sites={sites} myPromotions={myPromotions} />;
}
