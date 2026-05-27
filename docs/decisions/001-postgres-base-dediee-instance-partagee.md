---
id: ADR-001
title: Héberger WeBuild sur une base dédiée de l'instance Postgres partagée
date: 2026-05-27
status: Acceptée
deciders: [legrand.work]
modules: [persistence, infra]
---

# ADR-001 : Héberger WeBuild sur une base dédiée de l'instance Postgres partagée

## Contexte
La Phase 1 (socle production) introduit la persistance : Prisma + Postgres 16 + pgvector (1536d) pour `User / Site / Card / AuthoritySnapshot`, avec un champ embedding prévu pour le matching P3. Il faut décider **où vit Postgres**. L'écosystème `coolify_linux` héberge déjà une instance Postgres partagée (`shared_postgres-…`) utilisée par plusieurs apps (`augmenter`, `ouquequoi`, `litellm`, `langfuse`, …).

Une reconnaissance SSH read-only (2026-05-27) a établi : instance **PG 16.13** Up 9j healthy, **pgvector 0.8.2 disponible**, **11 bases existantes** (pattern 1-DB-par-projet déjà établi), **aucune collision** avec `webuild_db`, **33/100 connexions** utilisées (PgBouncer présent). Réserve : **disque host à 95 % (12 Go libres)** — le `~50 Go reclaimable` Docker (cf. [draft-infra-poc.md](../draft-infra-poc.md) §6) n'a pas encore été élagué. Le serveur est modeste (Celeron 2c, ~2,3 Gi RAM libre).

## Options considérées
### Option A — Base dédiée `webuild_db` sur l'instance partagée
**Pour** : pattern déjà établi (chaque projet = 1 DB) ; pgvector 0.8.2 + PG16 alignés au besoin ; zéro coût RAM/infra supplémentaire ; PgBouncer réutilisable ; ~67 slots de connexion libres.
**Contre** : isolation par base seulement (pas par instance) ; contention I/O partagée ; mot de passe `POSTGRES_PASSWORD` partagé en clair dans l'env du conteneur.
**Coût** : `CREATE DATABASE` + `CREATE EXTENSION vector` + entrée PgBouncer. Minutes.

### Option B — Instance Postgres dédiée (nouveau service Coolify)
**Pour** : isolation infra complète.
**Contre** : +1 service à opérer ; consommation RAM sur un serveur déjà saturé (~2,3 Gi libre) ; pgvector à réinstaller ; pooling à reconfigurer.
**Coût** : provisioning Coolify + config + supervision continue.

## Décision
**On retient l'option A — base dédiée `webuild_db` sur l'instance partagée.** Critère décisif : le serveur est trop contraint en RAM pour justifier une instance séparée, et le pattern 1-DB-par-projet est déjà la norme éprouvée de l'écosystème ; l'isolation par base suffit au POC. La réserve disque est un problème **transverse à toute l'app** (volume d'embeddings à venir), pas un argument contre la mutualisation — elle se traite par un prune en prérequis.

## Conséquences
### Positives
- Démarrage immédiat, aucun coût infra.
- pgvector 1536d + PG16 disponibles sans installation.
- PgBouncer mutualisé.

### Négatives (assumées)
- Contention I/O potentielle avec les autres apps de l'instance.
- Secret Postgres partagé entre apps.

### Risques résiduels et mitigations
- **Risque** : disque host saturé (95 %) bloque l'écriture d'embeddings. / **Mitigation** : prune Docker (`docker image prune -f && docker builder prune -f`, ~50 Go) **avant** tout chargement, en prérequis dur.
- **Risque** : un superuser partagé (`augmenter`) donne trop de droits à l'app. / **Mitigation** : créer un rôle applicatif dédié non-superuser pour WeBuild.
- **Risque** : croissance des embeddings impacte les voisins. / **Mitigation** : surveiller la taille de `webuild_db` ; migrer vers instance dédiée si l'empreinte devient significative (point de réévaluation).

## Plan d'implémentation
- [ ] Prune disque Coolify (prérequis dur).
- [ ] `CREATE DATABASE webuild_db;` puis, connecté à `webuild_db`, `CREATE EXTENSION vector;`.
- [ ] Créer un rôle applicatif dédié non-superuser (optionnel mais recommandé).
- [ ] Ajouter une entrée PgBouncer pour `webuild_db`.
- [ ] `DATABASE_URL` dans `.env.local` (dev via tunnel) et Coolify (prod).

## Validation post-implémentation
`prisma migrate deploy` passe ; une capture écrit `Site/Card/AuthoritySnapshot` ; `getMyDeck()` relit la donnée. Condition de rollback / réévaluation : si la contention I/O dégrade les apps voisines ou si `webuild_db` dépasse une empreinte disque significative → migrer vers instance dédiée (Option B).

## Références
- [docs/plans/p1-prod-foundation-blueprint.md](../plans/p1-prod-foundation-blueprint.md) — Q1
- [docs/draft-infra-poc.md](../draft-infra-poc.md) — baseline infra, §6 disque
- [docs/sessions/2026-05-27-poc-to-production-roadmap.md](../sessions/2026-05-27-poc-to-production-roadmap.md) — recon SSH (sous-tâche #R)
