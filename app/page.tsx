import { Card } from "./components/card/Card";
import { DEMO_CARDS } from "./components/card/demo";
import type { CardState } from "./components/card/types";

const STATES: { state: CardState; label: string }[] = [
  { state: "dispo", label: "Disponible" },
  { state: "en-echange", label: "En échange" },
  { state: "acquise", label: "Acquise" },
  { state: "verrouillee", label: "Verrouillée" },
];

const PIXEL_LABEL = {
  fontFamily: "var(--font-pixel-display)",
  fontSize: 9,
  letterSpacing: 2,
  color: "var(--hub-fg-soft)",
} as const;

export default function Home() {
  // N2 sert de cobaye pour la démo des 4 états.
  const sample = DEMO_CARDS[1];

  return (
    <main style={{ minHeight: "100dvh", padding: "32px 16px 80px", maxWidth: 1180, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Gabarit D — Badge tactique</h1>
        <p style={{ color: "var(--hub-fg-soft)", margin: "6px 0 0", fontSize: 14 }}>
          Port CSS-first du handoff · 4 niveaux × 4 états ·{" "}
          <span style={{ color: "var(--hub-accent-2)" }}>clique une carte pour la retourner</span>
        </p>
      </header>

      <section style={{ marginBottom: 48 }}>
        <div style={{ ...PIXEL_LABEL, marginBottom: 16 }}>4 NIVEAUX</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "center" }}>
          {DEMO_CARDS.map(({ level, data }) => (
            <Card key={data.id} data={data} level={level} state="dispo" />
          ))}
        </div>
      </section>

      <section>
        <div style={{ ...PIXEL_LABEL, marginBottom: 16 }}>4 ÉTATS · NIVEAU 2</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "center" }}>
          {STATES.map(({ state, label }) => (
            <div key={state} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <Card data={sample.data} level={2} state={state} interactive={false} />
              <span style={{ color: "var(--hub-fg-soft)", fontSize: 12 }}>{label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
