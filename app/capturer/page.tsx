import { DevNav } from "../components/DevNav";
import { CaptureClient } from "./CaptureClient";

/**
 * /capturer — première tranche verticale réelle : on colle une URL, Crawl4AI
 * capture le site, LiteLLM en extrait le résumé/thématique, un score d'autorité
 * provisoire en dérive le niveau + les stats, et le composant <Card/> validé
 * affiche une vraie carte. Pas d'auth (POC) — cf. CLAUDE.md.
 */
export default function CapturerPage() {
  return (
    <main style={{ minHeight: "100dvh", padding: "56px 20px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <DevNav />
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Capturer un site → carte réelle</h1>
        <p style={{ color: "var(--hub-fg-soft)", margin: "6px 0 0", fontSize: 14, lineHeight: 1.5 }}>
          Crawl4AI capture la page · LiteLLM en extrait le sens · le score d&apos;autorité (
          <span style={{ color: "var(--hub-accent-2)" }}>v1 on-page, indicatif</span>) dérive le niveau et les stats.
        </p>
      </header>
      <CaptureClient />
    </main>
  );
}
