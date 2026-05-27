/**
 * SOURCE UNIQUE niveau → rareté (D5).
 *
 * Le niveau visuel (Game Boy → SNES → PS2 → Holo) est *dérivé de l'autorité*
 * (jamais saisi) — cf. CLAUDE.md. Tout ce qui dépend du niveau côté TS vit ici :
 * libellé d'ère, couleur d'accent, fond de face. Le pendant CSS (variables par
 * `.lvl-N`) reste dans `app/styles/tokens.css` ; ce module est la source côté JS.
 *
 * Ajouter / recalibrer un niveau = éditer **uniquement** ce fichier.
 */

export type Level = 1 | 2 | 3 | 4;

export interface LevelMeta {
  /** Libellé d'ère affiché sur la carte. */
  label: string;
  /** Couleur d'accent JS (matériaux R3F, château…). */
  accent: string;
  /** Fond de face de carte (le Holo a un fond propre, les autres suivent le token). */
  faceBg: string;
}

export const LEVELS: Record<Level, LevelMeta> = {
  1: { label: "GAMEBOY", accent: "#9bbc0f", faceBg: "var(--c-card)" },
  2: { label: "SNES", accent: "#3b5bff", faceBg: "var(--c-card)" },
  3: { label: "PS2", accent: "#7dd3fc", faceBg: "var(--c-card)" },
  4: { label: "HOLO", accent: "#d946ef", faceBg: "#0a0a14" },
};

/** Libellés d'ère par niveau (dérivé de LEVELS). */
export const ERA_LABEL: Record<Level, string> = {
  1: LEVELS[1].label,
  2: LEVELS[2].label,
  3: LEVELS[3].label,
  4: LEVELS[4].label,
};

/** Accents ordonnés N1→N4 (consommé en liste cyclique par le château). */
export const LEVEL_COLORS: string[] = [LEVELS[1].accent, LEVELS[2].accent, LEVELS[3].accent, LEVELS[4].accent];
