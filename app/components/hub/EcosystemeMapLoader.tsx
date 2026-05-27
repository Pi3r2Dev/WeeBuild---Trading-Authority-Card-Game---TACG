import { getMe, getNavDeck } from "@/lib/data";
import { DEMO_USER_ID } from "@/lib/data/demo-user";
import { EcosystemeMap } from "./EcosystemeMap";

/**
 * Loader SERVER pour EcosystemeMap.
 *
 * Piège Next 15 : un fichier `"use client"` ne peut pas exporter de Server
 * Component → le fetch (Prisma) vit ICI (sans directive), les données
 * descendent en props vers le composant client.
 */
export async function EcosystemeMapLoader() {
  // TODO(4a): remplacer DEMO_USER_ID par (await requireSession()).user.id
  const [me, navDeck] = await Promise.all([getMe(DEMO_USER_ID), getNavDeck()]);
  return <EcosystemeMap me={me} navDeck={navDeck} />;
}
