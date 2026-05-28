---
id: ADR-002
title: Créer un client Google OAuth dédié à WeBuild (avec scope GSC)
date: 2026-05-27
status: Acceptée
deciders: [legrand.work]
modules: [auth, infra]
---

# ADR-002 : Créer un client Google OAuth dédié à WeBuild (avec scope GSC)

## Contexte
La Phase 1 ajoute l'authentification via Better Auth + Google OAuth (pattern réutilisé de `app.augmenter.pro/backend`). Le projet a besoin d'un client Google OAuth (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`) avec son redirect URI `…/api/auth/callback/google`.

Particularité WeBuild : on demande dès l'OAuth le scope **`https://www.googleapis.com/auth/webmasters.readonly`** (Google Search Console). Ce scope sert deux objectifs (cf. [CLAUDE.md](../../CLAUDE.md), « Decisions already locked ») : alimenter la métrique d'autorité en données SEO first-party (Phase 2) **et** prouver l'ownership du site. C'est un scope **sensible** (accès aux données Search Console de l'utilisateur), qui implique un écran de consentement spécifique et potentiellement une vérification Google.

`app.augmenter.pro` possède déjà un client OAuth Google dans le même projet GCP. WeBuild pourrait soit réutiliser ce client, soit en créer un dédié.

## Options considérées
### Option A — Nouveau client OAuth GCP dédié à WeBuild
**Pour** : isolation des secrets et des consentements par produit ; le scope GSC sensible reste cantonné à WeBuild ; écran de consentement, branding et quotas propres ; révocation/rotation sans impacter augmenter.pro.
**Contre** : un client GCP de plus à gérer ; redéclarer les scopes.
**Coût** : création client GCP + redirect URI + déclaration scope `webmasters.readonly`.

### Option B — Réutiliser le client OAuth d'augmenter.pro
**Pour** : plus rapide, un seul client pour l'écosystème.
**Contre** : mélange les consentements et le branding de deux produits ; ajouter le scope GSC sensible élargit les permissions du client partagé (et donc d'augmenter.pro) ; couplage des rotations de secret ; surface de risque mutualisée.
**Coût** : ajout d'un redirect URI + élargissement de scope sur un client existant.

## Décision
**On retient l'option A — nouveau client GCP dédié.** Critère décisif : le scope GSC est sensible et propre à WeBuild ; l'introduire sur un client partagé étendrait les permissions (et le risque) d'un produit tiers (augmenter.pro) sans bénéfice. L'isolation par produit est la posture saine pour des consentements OAuth distincts.

## Conséquences
### Positives
- Secrets, consentements, quotas et branding isolés par produit.
- Scope GSC sensible cantonné à WeBuild.
- Rotation/révocation indépendante.

### Négatives (assumées)
- Un client GCP supplémentaire à maintenir.

### Risques résiduels et mitigations
- **Risque** : le scope `webmasters.readonly` déclenche une vérification Google (délai de mise en prod). / **Mitigation** : déclarer le scope tôt ; tester avec des utilisateurs « test » du projet GCP en attendant la validation.
- **Risque** : tokens GSC (`accessToken`/`refreshToken`) stockés en DB (table `Account` Better Auth). / **Mitigation** : champs non exposés publiquement ; non utilisés en P1 (exploités en P2) ; envisager chiffrement au repos.

## Plan d'implémentation
- [ ] Créer un client OAuth dans la console GCP (type « Web application »).
- [ ] Redirect URI : `https://weebuildtacg.augmenter.pro/api/auth/callback/google` (+ `http://localhost:3000/api/auth/callback/google` pour le dev). **Domaine prod décidé (2026-05-28) : `weebuildtacg.augmenter.pro`** (requiert un enregistrement DNS A → IP serveur Coolify).
- [ ] Déclarer le scope `webmasters.readonly` dans l'écran de consentement OAuth.
- [ ] Renseigner `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` dans `.env.local` et Coolify.
- [ ] Configurer `socialProviders.google.scope` dans `lib/auth.ts`.

## Validation post-implémentation
Flux OAuth complet → session Better Auth créée → `Account.scope` contient `webmasters.readonly` → redirect deck. Condition de rollback : aucune (purement additif) ; si la validation Google du scope sensible bloque, démarrer sans le scope GSC et l'ajouter en Phase 2.

## Références
- [docs/plans/p1-prod-foundation-blueprint.md](../plans/p1-prod-foundation-blueprint.md) — Q2 + bloc auth
- [CLAUDE.md](../../CLAUDE.md) — « Connecting GSC also proves site ownership »
- [docs/draft-metrique-autorite.md](../draft-metrique-autorite.md) — usage GSC first-party
