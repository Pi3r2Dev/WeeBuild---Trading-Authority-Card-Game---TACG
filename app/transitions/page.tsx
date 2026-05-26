import type { ReactNode } from "react";
import { DevNav } from "../components/DevNav";
import { CardFlight } from "../components/transitions/CardFlight";
import { CreditRain } from "../components/transitions/CreditRain";
import { WaxSealTransition } from "../components/transitions/WaxSealTransition";

export default function TransitionsPage() {
  return (
    <main style={{ minHeight: "100dvh", padding: "56px 16px 64px", maxWidth: 1400, margin: "0 auto" }}>
      <DevNav />
      <header style={{ marginBottom: 28, textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Transitions chorégraphiées</h1>
        <p style={{ color: "var(--hub-fg-soft)", margin: "6px 0 0", fontSize: 14 }}>
          Auto-loop · bouton <span style={{ color: "var(--hub-accent)" }}>Rejouer</span> sur chaque écran
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "center", alignItems: "flex-start" }}>
        <Vignette title="Vol de carte" sub="Écosystème → Donner, le long d'une traîne">
          <CardFlight />
        </Vignette>
        <Vignette title="Sceau de cire" sub="La carte se replie et frappe l'écran">
          <WaxSealTransition />
        </Vignette>
        <Vignette title="Pluie de crédits" sub="Le gain tombe dans le solde">
          <CreditRain />
        </Vignette>
      </div>
    </main>
  );
}

function Vignette({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-pixel-display)", fontSize: 9, color: "var(--hub-fg)", letterSpacing: 1.5 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--hub-fg-soft)", marginTop: 4, maxWidth: 360 }}>{sub}</div>
      </div>
      {children}
    </div>
  );
}
