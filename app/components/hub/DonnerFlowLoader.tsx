import { getMyDeck, getPartners, getTopics } from "@/lib/data";
import { requireSession } from "@/lib/auth-session";
import { DonnerFlow } from "./DonnerFlow";

/**
 * Loader SERVER pour DonnerFlow.
 *
 * `mySites` vient de la DB (réel P1) ; `partners`/`topics` restent sur fixtures
 * (suggestions IA = boucle de jeu P3, sync — appelés sans `await`).
 */
export async function DonnerFlowLoader() {
  const userId = (await requireSession()).user.id;
  const mySites = await getMyDeck(userId);
  const partners = getPartners(); // P3 — fixtures
  const topics = getTopics(); // P3 — fixtures
  return <DonnerFlow mySites={mySites} partners={partners} topics={topics} />;
}
