# Draft — Métrique d'autorité (SEO + GEO)

> **Statut : DRAFT keystone** — pièce maîtresse : pilote niveau/rareté, stats HP/ATK et le filtre de matching. Décisions de fond prises le 2026-05-26 ; réglages à calibrer.
> Voir aussi : [draft-vision-geo.md](draft-vision-geo.md) · [draft-gameplay-technique.md](draft-gameplay-technique.md) · [draft-pipeline-ia.md](draft-pipeline-ia.md) · [faq.md](faq.md)

---

## 1. Principe

**Authority Score (AS)** composite, normalisé **0–100** :

```
AS = w_seo · S_seo  +  w_geo · S_geo
     w_seo élevé au lancement (≈0.7) → glisse vers le GEO avec le temps (≈0.4)
```

- **L'AS est un indicateur de jeu** (rareté, stats, matching), **pas une promesse de classement** — aligné sur la ligne rouge (cf. faq §3).
- Tout est **dérivé et recalculé** périodiquement, jamais saisi.

---

## 2. Sources de données *(décidé)*

**SEO = hybride à 3 tiers** · **GEO = proxy (tous) + sondage actif (échantillonné)**.

### Composante SEO
| Tier | Source | Coût | Robustesse |
|------|--------|------|-----------|
| 1 | **On-page / public** via Firecrawl : structure, schema.org, sitemap, fraîcheur, HTTPS, âge domaine | gratuit, toujours | moyenne (heuristique) |
| 2 | **Google Search Console first-party** : impressions, clics, CTR, position moyenne, requêtes, pages indexées | gratuit, vérifié | **forte (donnée de Google)** |
| 3 | **API tierce** (Ahrefs/Moz/Majestic/DataForSEO) : backlinks/DR | payant, **ponctuel** | forte (calibration / premium) |

**GSC — deux voies :**
- **Préférée — OAuth API** : scope `webmasters.readonly` (on a déjà Google OAuth via Better Auth). Donnée structurée, infalsifiable.
- **Fallback — screenshots** analysés par **gemma4-vision** (si le membre refuse le scope). ⚠️ forgeable → anti-fraude / poids plafonné.
- **Bonus** : connecter GSC **prouve la propriété du site** (résout la vérification d'ownership).

### Composante GEO
- **Proxy (gratuit, pour tous)** : centralité topique du contenu dans son cluster de niche (**pgvector** sur le corpus réseau) + volume de mentions dans le réseau + largeur des requêtes GSC.
- **Sondage actif (échantillonné)** : **Perplexity Sonar API** — requêtes topiques (générées depuis le résumé) lancées *sans* filtre de domaine ; on parse `search_results` / `citations` et on calcule un **taux de citation** = fraction de requêtes où le domaine du membre apparaît. *(Faisabilité vérifiée : Sonar renvoie `search_results[{title,url,snippet,date}]`.)* Échantillonné (ex. cartes haut niveau) pour **calibrer le proxy contre le réel**.

---

## 3. Sous-scores

- **S_seo** = blend pondéré de signaux normalisés. **Si GSC connecté → poids fort sur impressions/position réelles** ; sinon → on-page heuristiques (plus faible). Backlinks API = bonus.
- **S_geo** = proxy topique + (si échantillonné) taux de citation Sonar.

---

## 4. Stats de carte HP / ATK *(deux dimensions distinctes)*

| Stat | Sens | Alimentée par |
|------|------|---------------|
| **HP** | robustesse / établi / confiance | S_seo *trust* (âge, stabilité, position GSC) |
| **ATK** | portée / rayonnement / cité | S_geo + reach (trafic/impressions, taux de citation) |

→ **HP = à quel point tu es établi ; ATK = à quel point tu rayonnes.** Mappe naturellement sur les deux sous-scores.

---

## 5. Mapping AS → niveau & boucle de recalcul

- **Bandes calibrées sur 0–100, rare-en-haut** (piste : N1 0-40 / N2 40-65 / N3 65-85 / N4 85-100) — à calibrer *après* données réelles, sinon tout cluster en N1.
- **Job Celery périodique** recalcule l'AS → si le niveau change, re-rendu carte (chemin filtre = gratuit) + **notif au membre** (« ta carte a évolué ! » = engagement).
- **Historique d'AS** → alimente la **progression / méta-jeu**.

---

## 6. Anti-gaming & vérification de propriété

- **GSC OAuth = preuve de propriété + données infalsifiables** (le meilleur rempart).
- **Import batch (2026-05-28)** : seules les propriétés `siteOwner` sont proposées par défaut ; `siteRestrictedUser` / `siteUnverifiedUser` exclus ; `siteFullUser` (accès délégué « gestion ») réservé à un flag produit futur (`WEBUILD_GSC_ALLOW_DELEGATED`) pour gestionnaires multi-sites de confiance.
- **Screenshots GSC = forgeables** → vision + heuristiques anti-fraude, ou poids plafonné vs voie OAuth.
- **Mentions réseau = gameables** (le membre les influence) → anti-abus, plafonds.
- Rappel : la rareté a une valeur sociale → les membres voudront gonfler l'AS.

---

## 7. Implémentation (infra existante)

### POC P2 branché (2026-05-28) *(cf. [sessions/2026-05-28-p2-gsc-integration.md](sessions/2026-05-28-p2-gsc-integration.md))*

- **Score v1** (`metricVersion: v1-onpage`) : heuristiques Firecrawl — inchangé, utilisé sans snapshot GSC.
- **Score v2** (`metricVersion: v2-gsc`) : blend v1 + signaux GSC normalisés (`lib/authority/score-v2.ts`) — **poids non calibrés** 🚧.
- **Flux `/capturer`** : première capture → v1 ; si `GscSnapshot` déjà lié au domaine → v2 direct ; bouton **« Enrichir avec Google Search Console »** → `captureGscAction` + re-score v2 ; **import batch** (plusieurs propriétés owner) via file `GscImportBatch` + worker/cron.
- **Persistance** : `GscSnapshot` + `AuthoritySnapshot` ; carte mise à jour via `apply-authority`.
- **Tests unitaires** : agrégation GSC (`gsc.test.ts`), blend v2 (`score-v2.test.ts`).
- **Client GSC** (`lib/services/gsc.ts`) : totaux sans dimension, sélection multi-propriétés (GET `/sites` + max impressions), pièges API documentés en tête de module *(cf. [sessions/2026-05-28-p2-gsc-integration.md](sessions/2026-05-28-p2-gsc-integration.md))*.

- **Google OAuth** + scope `webmasters.readonly` (Better Auth) → pull GSC API.
- **gemma4-vision** → lecture des screenshots GSC (fallback).
- **Perplexity Sonar API** (nouveau secret) appelée depuis un **worker Celery**, échantillonnée, mise en cache.
- **pgvector** → proxy de centralité topique.
- **Job Celery périodique** → recalcul AS + re-niveau.
- **Langfuse** → trace des sondages/scores.

---

## 8. Questions en cours 🚧

- [ ] **Poids `w_seo`/`w_geo`** initiaux + courbe de glissement vers le GEO.
- [ ] **Seuils des bandes** de niveau (calibration post-données réelles).
- [ ] **Normalisation des signaux** : min-max absolu vs percentile réseau (impacte la stabilité du niveau).
- [ ] **Anti-fraude screenshots GSC** : comment détecter un faux ; faut-il carrément exiger l'OAuth ?
- [ ] **Coût Sonar** : budget, fréquence d'échantillonnage, quels segments sonder.
- [ ] **Re-niveau** : amortir les oscillations (hystérésis) pour éviter qu'une carte change de niveau trop souvent.
