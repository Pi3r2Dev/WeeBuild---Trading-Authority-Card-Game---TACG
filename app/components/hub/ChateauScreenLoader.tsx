import { getMyDeck } from "@/lib/data";
import { requireSession } from "@/lib/auth-session";
import { ChateauScreen } from "./ChateauScreen";

/**
 * Loader serveur — main réelle du joueur pour le bake DOM→texture du château.
 */
export async function ChateauScreenLoader() {
  const userId = (await requireSession()).user.id;
  const mySites = await getMyDeck(userId);
  return <ChateauScreen mySites={mySites} usingDemoDeck={mySites.length === 0} />;
}
