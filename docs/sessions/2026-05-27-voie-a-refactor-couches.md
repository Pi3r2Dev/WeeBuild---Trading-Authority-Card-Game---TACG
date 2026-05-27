---
date: 2026-05-27
slug: voie-a-refactor-couches
status: open
mode: solo
parent_plan: docs/draft-metrique-autorite.md
related_sessions: [2026-05-26-product-concept-foundations]
tags: [front, r3f, refactor, architecture]
---

# Carte holo « Voie A » décidée + prototypée, et front refactoré en couches (domaine / données)

## Status
green — tout vérifié au navigateur (0 erreur console) et `tsc --noEmit` vert. Reste **non committé** (D1 + D3) ; la priorité produit bascule ensuite sur la métrique d'autorité.

## Done in this session
- **Voie A (carte holo N4) décidée + prototypée** : contenu DOM CSS pixel-parfait + plan de foil WebGL fresnel collé (calage `perspective(1400) ↔ fov`, mêmes angles lissés DOM↔mesh, blend `screen`). Validée sur `/rnd` (3ᵉ colonne « Voie A ⭐ »). Décision actée dans CLAUDE.md + draft-rendu-3d.md + draft-cartes-couches-effets.md.
- **Doc de compositing** créé : [draft-cartes-couches-effets.md](../draft-cartes-couches-effets.md) (registre couches/Z/blend/anim CSS↔R3F).
- **Lot 1 refactor** : D6 (Voie A actée) · `status: CardState` typé + données normalisées + `STATE_LABEL` (affichage FR préservé) · **D5** source unique des niveaux dans `lib/levels`.
- **D1** : domaine sorti dans `lib/domain` (card + entities), `card/types.ts` réduit à un shim de compat (0 consommateur touché).
- **D3** : frontière données `lib/data` (fixtures consolidées + accesseurs `getMe/getMyDeck/getNavDeck/…`) ; **10 écrans repointés** ; `demo.ts` + `hub/data.ts` supprimés.

## Files touched
- **Committé (89c43b0)** : `lib/levels/index.ts`, `app/components/r3f/HoloCard3D.tsx`, `docs/draft-cartes-couches-effets.md`, + Card/CardBack/CardCastle/types/demo/data/rnd, CLAUDE.md, draft-rendu-3d.md (Lot 1 + Voie A).
- **Non committé (D1+D3)** :
  - `lib/domain/{card,entities,index}.ts` — domaine pur (nouveau)
  - `lib/data/{fixtures,index}.ts` — frontière + mock consolidé (nouveau)
  - `app/components/card/types.ts` — réduit à un shim `export * from "@/lib/domain/card"`
  - `app/{rnd,cards}/page.tsx`, `hub/{HubDashboard,DonnerFlow,EcosystemeMap,EtreDecouvert,PreuveScreen,HubWidgets}.tsx`, `transitions/{CardFlight,WaxSealTransition}.tsx` — repointés vers `@/lib/data` / `@/lib/domain`
  - `app/components/card/demo.ts`, `app/components/hub/data.ts` — **supprimés**

## Git state
- Branch: `main` (upstream: aucun)
- Diverge from main: `+0` / `-0` (on est sur main)
- Uncommitted: 12 fichiers modifiés, 2 supprimés (`demo.ts`, `hub/data.ts`), 5 nouveaux (`lib/domain/*`, `lib/data/*`)
- Last commit: `95d88c3` Update .claude/settings.json (D1+D3 pas encore committés ; `89c43b0` = Voie A + Lot 1)

## Test status
- Snapshot: `green`
- Source: `tsc --noEmit` (exit 0). Pas de suite de tests dans le POC.

## Next concrete step
1. **Committer D1+D3** (voir suggestion ci-dessous) — le palier modularité est atteint et vérifié.
2. **Calibrer la métrique d'autorité** (priorité produit) : `AS = w_seo·S_seo + w_geo·S_geo` — définir les poids initiaux (drift SEO→GEO), les seuils niveau→rareté (N1→N4), et le mapping vers HP=trust / ATK=reach. Source : [draft-metrique-autorite.md](../draft-metrique-autorite.md). Décision liée aussi suivie par la session [2026-05-26-product-concept-foundations](2026-05-26-product-concept-foundations.md).

## Open decisions
- **Carve `Card` (domaine) vs `CardView` (TCG: price/edition)** : délibérément reporté — la ligne de partage dépend de la métrique d'autorité (ce qui est « dérivé »). À trancher une fois la métrique calibrée.
- **D2 (zustand)** : reporté — aucune mutation cross-écran aujourd'hui (`ME.credits` lu seul). À introduire avec une vraie boucle (dépenser crédits / acquérir carte).
- **D4 (features/ vs ui/)** : reporté — purement ergonomique, faible priorité.

## Blockers
- Aucun blocker technique. La métrique d'autorité est une **question produit ouverte** (pas un blocage de ce code) — voir Hard constraints de CLAUDE.md (« the authority metric is the main open blocker »).

## How to resume
1. Lire ce doc + [draft-metrique-autorite.md](../draft-metrique-autorite.md) (keystone) et le bloc « Decisions already locked » de [CLAUDE.md](../../CLAUDE.md).
2. D'abord committer D1+D3 (arbre propre avant nouveau chantier).
3. Vérifier la cohérence avec [draft-gameplay-technique.md](../draft-gameplay-technique.md) (HP=trust / ATK=reach) et [draft-vision-geo.md](../draft-vision-geo.md) (drift SEO→GEO).
4. Le nouveau domaine `lib/domain` est l'endroit naturel pour un futur type `Authority` / `Score`.
