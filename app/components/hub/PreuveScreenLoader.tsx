import { getMyDeck, getNavDeck, getProofs } from "@/lib/data";
import { requireSession } from "@/lib/auth-session";
import { PreuveScreen } from "./PreuveScreen";

/** Loader SERVER pour PreuveScreen. */
export async function PreuveScreenLoader() {
  const userId = (await requireSession()).user.id;
  const [mySites, navDeck, proofs] = await Promise.all([
    getMyDeck(userId),
    getNavDeck(),
    getProofs(),
  ]);
  return <PreuveScreen mySites={mySites} navDeck={navDeck} proofs={proofs} />;
}
