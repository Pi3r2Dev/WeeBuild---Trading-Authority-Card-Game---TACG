/** Schéma minimal compatible avec l'API `useControls` de leva. */
export type DevControlSchema = Record<
  string,
  { value: number; min?: number; max?: number; step?: number }
>;

/**
 * Wrapper autour de `leva.useControls` : panneau live en dev, defaults figés en prod.
 * En prod le module `leva` est remplacé par un stub via alias webpack (next.config.ts).
 */
export function useDevControls<T extends Record<string, number>>(
  folder: string,
  schema: DevControlSchema,
): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useControls } = require("leva") as typeof import("leva");
  return useControls(folder, schema) as T;
}
