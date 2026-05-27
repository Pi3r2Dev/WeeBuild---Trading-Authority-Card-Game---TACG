import { getMyDeck, getNavDeck, getProofs } from "@/lib/data";
import { DEMO_USER_ID } from "@/lib/data/demo-user";
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
  // TODO(4a): remplacer DEMO_USER_ID par (await requireSession()).user.id
  const [mySites, navDeck] = await Promise.all([getMyDeck(DEMO_USER_ID), getNavDeck()]);
  const proofs = getProofs(); // P3 — fixtures
  return <PreuveScreen mySites={mySites} navDeck={navDeck} proofs={proofs} />;
}
