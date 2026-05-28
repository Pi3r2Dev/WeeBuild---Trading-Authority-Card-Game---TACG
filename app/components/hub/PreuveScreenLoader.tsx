import { getNavDeck } from "@/lib/data";
import { getProofViews } from "@/lib/links/read";
import { requireSession } from "@/lib/auth-session";
import { PreuveScreen } from "./PreuveScreen";

/** Loader SERVER pour PreuveScreen — liens publiés du donneur + leurs preuves (B4). */
export async function PreuveScreenLoader() {
  const userId = (await requireSession()).user.id;
  const [navDeck, proofs] = await Promise.all([getNavDeck(), getProofViews(userId)]);
  return <PreuveScreen navDeck={navDeck} proofs={proofs} />;
}
