import { CaptureClient } from "./CaptureClient";

/**
 * /capturer — première tranche verticale réelle : on colle une URL, Firecrawl
 * capture le site, LiteLLM en extrait le résumé/thématique, un score d'autorité
 * provisoire en dérive le niveau + les stats, et le composant <Card/> validé
 * affiche une vraie carte. C'est le *aha moment* de l'onboarding 0-carte.
 *
 * Rendu DANS l'AppShell (route group `(app)`) → pas de `<main>` ni de DevNav ici.
 */
export default function CapturerPage() {
  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "32px 20px max(48px, env(safe-area-inset-bottom))",
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Capturer un site → carte réelle</h1>
        <p style={{ color: "var(--hub-fg-soft)", margin: "6px 0 0", fontSize: 14, lineHeight: 1.5 }}>
          Firecrawl capture la page · LiteLLM en extrait le sens · le score d&apos;autorité (
          <span style={{ color: "var(--hub-accent-2)" }}>v1 on-page, indicatif</span>) dérive le niveau et les stats.
        </p>
      </header>
      <CaptureClient />
    </div>
  );
}
