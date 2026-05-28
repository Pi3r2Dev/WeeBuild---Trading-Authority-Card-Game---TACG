"use client";

/**
 * Bouton « Se connecter avec Google » (client) — déclenche l'OAuth Better Auth.
 * `callbackURL: "/"` ramène au deck après le callback Google réussi.
 * Le scope GSC (`webmasters.readonly`) est porté par la config serveur (lib/auth.ts).
 */

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const ACCENT = "#8a2be2";

export function LoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setPending(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      // En cas de succès le navigateur est redirigé vers Google ; on ne revient
      // pas ici. Si on y revient, c'est qu'aucune redirection n'a eu lieu.
    } catch {
      setError("La connexion a échoué. Réessayez.");
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={pending}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          height: 50,
          width: "100%",
          background: "#fff",
          color: "#1f2230",
          border: "none",
          borderRadius: 10,
          fontFamily: "var(--font-hub)",
          fontSize: 15,
          fontWeight: 700,
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
          boxShadow: `0 0 22px ${ACCENT}55`,
          transition: "opacity .15s ease",
        }}
      >
        <GoogleGlyph />
        {pending ? "Connexion…" : "Se connecter avec Google"}
      </button>
      {error && (
        <p style={{ color: "#fda4af", fontSize: 12, margin: 0, textAlign: "center" }}>{error}</p>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
