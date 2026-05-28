import { getMyDeck, getPartners, getTopics } from "@/lib/data";
import { requireSession } from "@/lib/auth-session";
import { DonnerFlow } from "./DonnerFlow";

/**
 * Loader SERVER pour DonnerFlow.
 *
 * `mySites` = DB (P1) ; `partners`/`topics` = `EditorialSuggestion` (P3).
 * `sourceSiteId` optionnel via query `?site=` (post-capture / matching).
 */
export async function DonnerFlowLoader({ sourceSiteId }: { sourceSiteId?: string }) {
  const userId = (await requireSession()).user.id;
  const mySites = await getMyDeck(userId);
  const siteId =
    sourceSiteId && mySites.some((c) => c.siteId === sourceSiteId)
      ? sourceSiteId
      : undefined;
  const [partners, topics] = await Promise.all([
    getPartners(userId, siteId),
    getTopics(userId, siteId),
  ]);
  return (
    <DonnerFlow
      mySites={mySites}
      partners={partners}
      topics={topics}
      sourceSiteId={siteId ?? mySites[0]?.siteId}
    />
  );
}
