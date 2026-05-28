import { getMyDeck, getNavDeck, getProofs } from "@/lib/data";
import { requireSession } from "@/lib/auth-session";
import { PreuveScreen } from "./PreuveScreen";

/**
 * Loader SERVER pour PreuveScreen.
 *
 * `mySites`/`navDeck` viennent de la DB (réel P1) ; `proofs` reste sur fixtures
 * (sceaux = boucle de jeu P3, sync).
 *
 * ⚠ SEAM P3 connue : les fixtures `proofs` référencent leur cible par id de
 * fixture (« jdg »…), alors que `navDeck` issu de la DB porte des UUID Prisma →
 * le matching `proof.target === navCard.id` ne trouvera pas la carte tant que la
 * boucle de preuves (P3) ne sera pas, elle aussi, branchée sur la DB. Attendu
 * en P1 (les sceaux ne sont pas le périmètre 4b).
 */
export async function PreuveScreenLoader() {
  const userId = (await requireSession()).user.id;
  const [mySites, navDeck] = await Promise.all([getMyDeck(userId), getNavDeck()]);
  const proofs = getProofs(); // P3 — fixtures
  return <PreuveScreen mySites={mySites} navDeck={navDeck} proofs={proofs} />;
}
