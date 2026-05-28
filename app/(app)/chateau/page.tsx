import { ChateauScreenLoader } from "@/app/components/hub/ChateauScreenLoader";

/**
 * Château de cartes 3D — route produit (AppShell : rail desktop / BottomNav mobile).
 * Le bundle Three/Rapier est chargé côté client uniquement (dynamic ssr:false).
 */
export default function ChateauPage() {
  return <ChateauScreenLoader />;
}
