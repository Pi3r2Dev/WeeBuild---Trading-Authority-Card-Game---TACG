import { getMyDeck, getPartners, getTopics } from "@/lib/data";
import { DEMO_USER_ID } from "@/lib/data/demo-user";
import { DonnerFlow } from "./DonnerFlow";

/**
 * Loader SERVER pour DonnerFlow.
 *
 * `mySites` vient de la DB (réel P1) ; `partners`/`topics` restent sur fixtures
 * (suggestions IA = boucle de jeu P3, sync — appelés sans `await`).
 */
export async function DonnerFlowLoader() {
  // TODO(4a): remplacer DEMO_USER_ID par (await requireSession()).user.id
  const mySites = await getMyDeck(DEMO_USER_ID);
  const partners = getPartners(); // P3 — fixtures
  const topics = getTopics(); // P3 — fixtures
  return <DonnerFlow mySites={mySites} partners={partners} topics={topics} />;
}
