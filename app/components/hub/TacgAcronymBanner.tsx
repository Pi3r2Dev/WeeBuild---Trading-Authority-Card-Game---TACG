"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ACCENT_VIOLET } from "./constants";
import { icons } from "./icons";
import {
  TACG_FULL_NAME,
  dismissTacgBanner,
  isTacgBannerDismissed,
  subscribeTacgBannerStorage,
} from "@/lib/hub/tacg-banner";

/**
 * Bandeau d'accueil masquable : rappelle que TACG = Trading Authority Card Game.
 * Persistance localStorage — ne réapparaît pas après fermeture volontaire.
 */
export function TacgAcronymBanner() {
  const dismissed = useSyncExternalStore(
    subscribeTacgBannerStorage,
    isTacgBannerDismissed,
    () => false,
  );

  const handleDismiss = useCallback(() => {
    dismissTacgBanner();
  }, []);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Acronyme TACG"
      data-testid="tacg-acronym-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
        marginBottom: 2,
        padding: "8px 10px 8px 12px",
        background: "rgba(138,43,226,0.10)",
        border: "1px solid rgba(138,43,226,0.35)",
        borderRadius: 8,
        fontFamily: "var(--font-hub)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-pixel-display)",
          fontSize: 9,
          letterSpacing: 1.5,
          color: ACCENT_VIOLET,
          textShadow: `0 0 10px ${ACCENT_VIOLET}88`,
          flexShrink: 0,
        }}
      >
        TACG
      </span>
      <span style={{ fontSize: 11, color: "var(--hub-fg-soft)", flexShrink: 0 }}>=</span>
      <span style={{ fontSize: 12, color: "var(--hub-fg)", lineHeight: 1.35, flex: 1 }}>
        {TACG_FULL_NAME}
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Masquer l'acronyme TACG"
        data-testid="tacg-acronym-banner-dismiss"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          padding: 0,
          border: "none",
          borderRadius: 6,
          background: "transparent",
          color: "var(--hub-fg-soft)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {icons.close(14)}
      </button>
    </div>
  );
}
