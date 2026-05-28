/**
 * /login — page PUBLIQUE (hors matcher du middleware). Si une session existe
 * déjà, on renvoie au deck. Sinon on affiche le bouton Google Sign-In.
 * Style sobre, aligné sur les tokens (pas de Tailwind).
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { SITE_WORDMARK } from "@/lib/brand/site";
import { LoginButton } from "./LoginClient";

const ACCENT = "#8a2be2";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "radial-gradient(120% 120% at 50% 0%, rgba(138,43,226,0.18) 0%, var(--hub-bg-0) 55%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "var(--hub-bg-1)",
          border: "1px solid var(--hub-line)",
          borderRadius: 16,
          padding: "36px 28px 30px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-pixel-display)",
            fontSize: 10,
            letterSpacing: 2,
            color: ACCENT,
            textShadow: `0 0 12px ${ACCENT}88`,
          }}
        >
          {SITE_WORDMARK}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-hub)",
            fontSize: 22,
            fontWeight: 800,
            margin: "14px 0 6px",
            color: "var(--hub-fg)",
          }}
        >
          Trading Authority Game
        </h1>
        <p
          style={{
            color: "var(--hub-fg-soft)",
            fontSize: 13,
            lineHeight: 1.5,
            margin: "0 0 26px",
          }}
        >
          Connectez-vous avec Google pour déclarer vos sites et collectionner vos
          cartes d&apos;autorité.
        </p>

        <LoginButton />

        <p
          style={{
            color: "var(--hub-fg-soft)",
            fontSize: 10,
            lineHeight: 1.5,
            margin: "22px 0 0",
            opacity: 0.8,
          }}
        >
          L&apos;accès à Google Search Console (lecture seule) permet de mesurer
          l&apos;autorité de vos sites et de prouver que vous en êtes propriétaire.
        </p>
      </div>
    </main>
  );
}
