/**
 * Drapeaux de fonctionnalité — peau honnête P1.5 → P3 matching (2026-05-28).
 *
 * `GAME_LOOP_ENABLED` active l'économie de jeu CÂBLÉE :
 *   - crédits réels (SUM ledger, 0 si vide) ;
 *   - suggestions/partenaires depuis `EditorialSuggestion` (lib/matching) ;
 *   - flux Donner + tuiles Hub (plus de fixtures « fausses personnes »).
 *
 * Reste masqué / vide tant que non implémenté :
 *   - preuves (`LinkProof`, B4) → écran « bientôt » ou liste vide ;
 *   - promotions spendables (B5) → UI visible, pas encore persistée.
 *
 * Note D4 : les cartes/alliés seedés restent de la vraie donnée DB.
 */
export const GAME_LOOP_ENABLED = true;

/**
 * Pipeline de preuves (capture lien → sceau). B4 — ACTIF : `/preuves` liste les
 * liens publiés du donneur et permet la vérification Firecrawl manuelle
 * (détection → VERIFIED + frappe crédits, ou clawback). Le job périodique de
 * re-vérification automatique reste P4.
 */
export const PROOFS_PIPELINE_ENABLED = true;

/**
 * Routes R&D (`/rnd /ab/portrait /chateau-cartes /cards /transitions`) + `DevNav` :
 * `/chateau` (château 3D) est une route PRODUIT dans `(app)` — hors flag R&D.
 * visibles uniquement quand `NEXT_PUBLIC_ENABLE_RND === "true"` (cf. §9 D2).
 * Défaut off → 404 en prod, code conservé mais invisible.
 */
export const RND_ENABLED = process.env.NEXT_PUBLIC_ENABLE_RND === "true";
