import { getMe, getNavDeck } from "@/lib/data";
import { requireSession } from "@/lib/auth-session";
import { EcosystemeMap } from "./EcosystemeMap";

/**
 * Loader SERVER pour EcosystemeMap.
 *
 * Piège Next 15 : un fichier `"use client"` ne peut pas exporter de Server
 * Component → le fetch (Prisma) vit ICI (sans directive), les données
 * descendent en props vers le composant client.
 */
export async function EcosystemeMapLoader() {
  const userId = (await requireSession()).user.id;
  const [me, navDeck] = await Promise.all([getMe(userId), getNavDeck()]);
  return <EcosystemeMap me={me} navDeck={navDeck} />;
}
