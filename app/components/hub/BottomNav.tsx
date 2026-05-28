"use client";

import { AppNav } from "../app/AppNav";

/**
 * Barre d'onglets — désormais un alias de `AppNav variant="bottom"` (la nav
 * produit unifiée vit dans app/components/app/AppNav.tsx). Conservée car les
 * écrans (HubDashboard, DonnerFlow, PreuveScreen…) la rendent en interne.
 *
 * Sur desktop, `AppShell` masque ce rendu (classe `.app-screen-bottomnav` →
 * `display:none` ≥900px) et affiche le rail latéral à la place. SSR-safe :
 * la bascule est purement CSS (media query), pas de détection JS.
 */
export function BottomNav() {
  return (
    <div className="app-screen-bottomnav">
      <AppNav variant="bottom" />
    </div>
  );
}
