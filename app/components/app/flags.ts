/**
 * Drapeaux de fonctionnalité — peau honnête P1.5 (cf.
 * docs/plans/p1-5-productization-transition.md §5, §9 D5).
 *
 * `GAME_LOOP_ENABLED` masque toute l'économie de jeu NON CONSTRUITE (P3) :
 * crédits, niveau « Donneur », barre de progression, et la section
 * « SUGGESTIONS DE L'IA » (fausses personnes). On MASQUE, on ne supprime pas :
 * passer à `true` rebranche les fixtures telles quelles le jour de P3.
 *
 * Note D4 : ce flag ne touche PAS les cartes/alliés seedés (vraie donnée DB,
 * pas une fixture factice) — l'écosystème et la main restent affichés.
 */
export const GAME_LOOP_ENABLED = false;

/**
 * Routes R&D (`/rnd /chateau-cartes /cards /transitions`) + `DevNav` :
 * `/chateau` (château 3D) est une route PRODUIT dans `(app)` — hors flag R&D.
 * visibles uniquement quand `NEXT_PUBLIC_ENABLE_RND === "true"` (cf. §9 D2).
 * Défaut off → 404 en prod, code conservé mais invisible.
 */
export const RND_ENABLED = process.env.NEXT_PUBLIC_ENABLE_RND === "true";
