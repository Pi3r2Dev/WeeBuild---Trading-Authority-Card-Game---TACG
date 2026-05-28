/** Clé localStorage — bandeau acronyme TACG sur l'accueil (masquable). */
export const TACG_BANNER_STORAGE_KEY = "webuild_tacg_banner_dismissed";

export const TACG_BANNER_DISMISSED_VALUE = "1";

/** Événement custom pour resynchroniser les composants client après fermeture. */
export const TACG_BANNER_STORAGE_EVENT = "webuild:tacg-banner-storage";

/** Libellé complet porté par l'acronyme TACG. */
export const TACG_FULL_NAME = "Trading Authority Card Game";

/**
 * Indique si l'utilisateur a déjà masqué le bandeau TACG.
 * Côté serveur / SSR → false (affiché jusqu'à lecture client).
 */
export function isTacgBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TACG_BANNER_STORAGE_KEY) === TACG_BANNER_DISMISSED_VALUE;
}

/** Persiste la fermeture du bandeau et notifie les abonnés React. */
export function dismissTacgBanner(): void {
  localStorage.setItem(TACG_BANNER_STORAGE_KEY, TACG_BANNER_DISMISSED_VALUE);
  window.dispatchEvent(new Event(TACG_BANNER_STORAGE_EVENT));
}

/** Abonnement `useSyncExternalStore` — même onglet + sync multi-onglets. */
export function subscribeTacgBannerStorage(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener(TACG_BANNER_STORAGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(TACG_BANNER_STORAGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
