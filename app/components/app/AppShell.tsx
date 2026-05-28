import type { ReactNode } from "react";
import { AppNav } from "./AppNav";
import { RND_ENABLED } from "./flags";
import { DevNav } from "../DevNav";

/**
 * Coque produit responsive — remplace l'ancien `PhoneShell` (cadre iPhone).
 * SSR-safe : la bascule rail (desktop >900px) ↔ BottomNav (mobile ≤900px) est
 * 100% CSS (media queries dans globals.css), aucune détection JS.
 *
 *  - desktop : rail latéral gauche « console » (AppNav variant="rail") + un
 *    canvas de contenu fluide (max ~1100px) qui exploite la largeur.
 *  - mobile  : contenu plein écran (100dvh + safe-area) ; la BottomNav est
 *    rendue PAR l'écran lui-même (HubDashboard…), masquée en desktop par CSS.
 *
 * Le conteneur `.app-canvas-inner` est positionné/clippé pour que les écrans
 * (Body / drawers / BottomNav en position:absolute) s'y ancrent comme avant.
 *
 * `DevNav` (R&D) n'est rendue que derrière `NEXT_PUBLIC_ENABLE_RND` (mode dev).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell">
      <aside className="app-rail">
        <AppNav variant="rail" footer={RND_ENABLED ? <RailDevFooter /> : null} />
      </aside>
      <div className="app-canvas">
        <div className="app-canvas-inner">{children}</div>
      </div>
      {/* DevNav : flottante, dev only — invisible en prod (flag off). */}
      {RND_ENABLED && <DevNav />}
    </main>
  );
}

/** Pied de rail en mode dev : accès rapide aux routes R&D. */
function RailDevFooter() {
  return (
    <div
      style={{
        marginTop: "auto",
        padding: "12px 10px 4px",
        borderTop: "1px solid var(--hub-line)",
        fontFamily: "var(--font-pixel-display)",
        fontSize: 7,
        letterSpacing: 1.5,
        color: "var(--hub-fg-dim)",
      }}
    >
      DEV · R&amp;D ON
    </div>
  );
}
