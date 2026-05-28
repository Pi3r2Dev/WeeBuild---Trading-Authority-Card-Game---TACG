import { ACCENT_VIOLET } from "./constants";

/**
 * État « bientôt » honnête (peau P1.5, cf. plan §5) — remplace les écrans/
 * sections qui reposent sur la boucle de jeu P3 (matching, crédits, sceaux)
 * tant qu'elle n'est pas construite. Pas de fausses personnes ni de faux chiffres.
 */
export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        marginTop: 18,
        padding: "26px 20px",
        background:
          "radial-gradient(120% 100% at 50% 0%, rgba(138,43,226,0.14) 0%, rgba(255,255,255,0.02) 60%)",
        border: "1px dashed rgba(138,43,226,0.45)",
        borderRadius: 14,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-pixel-display)",
          fontSize: 9,
          letterSpacing: 2,
          color: ACCENT_VIOLET,
          textShadow: `0 0 12px ${ACCENT_VIOLET}66`,
        }}
      >
        BIENTÔT
      </span>
      <h2 style={{ fontFamily: "var(--font-hub)", fontSize: 17, fontWeight: 800, margin: 0, color: "var(--hub-fg)", lineHeight: 1.3 }}>
        {title}
      </h2>
      <p style={{ fontSize: 13, color: "var(--hub-fg-soft)", lineHeight: 1.5, margin: 0, maxWidth: 360 }}>{body}</p>
    </div>
  );
}
