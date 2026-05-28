/**
 * Stub prod pour `leva` — remplace le module réel via alias webpack (next.config.ts).
 * Retourne les valeurs par défaut du schéma sans panneau UI.
 */
export function useControls<T extends Record<string, number>>(
  _folder: string,
  schema: Record<string, { value: number }>,
): T {
  const out = {} as T;
  for (const [key, cfg] of Object.entries(schema)) {
    (out as Record<string, number>)[key] = cfg.value;
  }
  return out;
}
