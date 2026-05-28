"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ACCENT_VIOLET } from "./constants";
import { triggerMatching } from "@/lib/matching/actions";

export interface MatchingTriggerProps {
  siteId: string;
  /** Libellé du bouton (défaut : « Trouver des partenaires »). */
  label?: string;
  /** Rediriger vers `/donner?site=` après succès. */
  redirectToDonner?: boolean;
  /** Style pleine largeur (CTA capture). */
  fullWidth?: boolean;
}

/**
 * CTA client — lance `triggerMatching` (+ génération éditoriale) puis refresh
 * ou redirection vers le flux Donner.
 */
export function MatchingTrigger({
  siteId,
  label = "Trouver des partenaires",
  redirectToDonner = false,
  fullWidth = false,
}: MatchingTriggerProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function run() {
    setError(null);
    setSuccess(null);
    start(async () => {
      const res = await triggerMatching(siteId, { generate: true });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(
        res.suggestionsCreated > 0
          ? `${res.suggestionsCreated} partenaire${res.suggestionsCreated > 1 ? "s" : ""} suggéré${res.suggestionsCreated > 1 ? "s" : ""}.`
          : "Aucun partenaire trouvé pour ce site (filtres anti-cycle ou peu de voisins).",
      );
      if (redirectToDonner) {
        router.push(`/donner?site=${encodeURIComponent(siteId)}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: fullWidth ? "100%" : undefined }}>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        style={{
          width: fullWidth ? "100%" : undefined,
          padding: "12px 18px",
          background: pending ? "rgba(138,43,226,0.25)" : "rgba(138,43,226,0.15)",
          border: `1px solid ${ACCENT_VIOLET}88`,
          color: ACCENT_VIOLET,
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 13,
          cursor: pending ? "default" : "pointer",
          textAlign: "left",
        }}
      >
        {pending ? "Matching IA en cours…" : `↗ ${label}`}
      </button>
      {error && (
        <p style={{ margin: 0, fontSize: 12, color: "#fca5a5", lineHeight: 1.45 }}>{error}</p>
      )}
      {success && !redirectToDonner && (
        <p style={{ margin: 0, fontSize: 12, color: "#86efac", lineHeight: 1.45 }}>{success}</p>
      )}
    </div>
  );
}
