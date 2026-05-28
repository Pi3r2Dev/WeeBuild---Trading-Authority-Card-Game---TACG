import type { ReactNode } from "react";
import { AppShell } from "@/app/components/app/AppShell";

/**
 * Layout partagé des routes PRODUIT (`/`, `/chateau`, `/ecosysteme`, `/donner`,
 * `/decouvrir`, `/preuves`, `/capturer`). Wrappe chaque page dans l'`AppShell`
 * responsive (rail desktop / BottomNav mobile) — l'ancien `PhoneShell` (cadre
 * iPhone) est retiré du produit. Route group `(app)` → ne change pas les URLs.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
