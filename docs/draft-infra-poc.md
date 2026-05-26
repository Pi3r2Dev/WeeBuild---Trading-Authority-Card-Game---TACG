# Draft — Infrastructure du POC (état réel vérifié)

> **Statut : DRAFT — baseline d'infra vérifiée en SSH.** Photographie de l'infra partagée `augmenter.pro` telle qu'elle tourne *réellement*, au regard de ce dont le POC *WeBuild — Trading Authority Game* a besoin.
> Méthode : `ssh coolify` (→ `root@192.168.1.13`, LAN), commandes **strictement lecture seule** (aucune mutation).
> Vérifié le : **2026-05-26**. Serveur : `piairBig` (uptime 8 j).
> Voir aussi : [draft-pipeline-ia.md](draft-pipeline-ia.md) (mapping cible) · [draft-metrique-autorite.md](draft-metrique-autorite.md) · [draft-charte-graphique.md](draft-charte-graphique.md) · [CLAUDE.md](../CLAUDE.md)
> Source de vérité parallèle (mais **en partie périmée**, cf. §6) : `unified-infrastructure/docs/UNIFIED_INFRASTRUCTURE.md`.

---

## 1. Serveur — matériel réel *(vérifié)*

| Ressource | Réel (2026-05-26) | Note |
|-----------|-------------------|------|
| CPU | Intel Celeron G4930 (2c/2t) | **goulot** — load average ~5 sur 2 cœurs = saturé en continu |
| RAM | 11 Gi physiques, **~2,3 Gi dispo** | + 29 Gi de swap (dont 8 Gi utilisés) + zram 5,8 Gi saturé |
| Disque | 229 Go SSD, **96 % plein (~11 Go libres)** | voir §6 — bloquant pour un nouveau déploiement |
| GPU | 5 cartes, 42 Go VRAM | **GPU 0, 2, 3 quasi libres** aujourd'hui (cf. §5) |
| Accès | SSH **par clé uniquement** (`PasswordAuthentication no`) | durci après 2 intrusions crypto-miner en avril 2026 |
| Orchestration | Coolify (UI `:8000`, proxy Traefik `:80/:443`) | 28 conteneurs actifs |

> ⚠️ **Contexte sécurité** : le serveur a été compromis 2× (avril 2026, crypto-miners sous `root` puis via un conteneur Docker UID 1000 `piair`). Conséquence pour le POC : toute exposition de port doit rester sur `127.0.0.1` ou derrière le proxy Coolify ; pas de service d'accès distant tiers.

---

## 2. Ce que le POC réutilise — services live *(vérifié conteneur par conteneur)*

Légende : ✅ tourne et utilisable tel quel · ⚠️ tourne mais réserve · ❌ référencé par le projet mais **non déployé**.

| Brique POC (cf. CLAUDE.md) | Service réel | État | Détail vérifié |
|----------------------------|--------------|------|----------------|
| Datastore + vecteurs | `shared_postgres` (PG16) | ✅ | `127.0.0.1:5432`, réseau `coolify`. Extension **`vector` 0.8.1** (DB `augmenter`), **0.8.2 + PostGIS 3.6.2** (DB `ouquequoi`). |
| Pooling | `pgbouncer` | ✅ | `127.0.0.1:6432`, transaction pooling. |
| Cache / broker | `shared_redis` | ✅ | `127.0.0.1:6379`, multi-DB indexée par projet. |
| Passerelle LLM | `litellm` | ✅ | `0.0.0.0:4000`, healthy. Alias live = ceux de CLAUDE.md (cf. §3). |
| Capture / scraping | `crawl4ai` | ✅ | port `11235`, **v0.5.1-d1**, `/health` = ok. |
| Rerank matching | `bge_reranker` | ✅ | `:8001`, **BAAI/bge-reranker-v2-m3** fp16, max input 8192 tok. = l'étage cross-encoder du matching WeBuild. |
| Embeddings | `ollama@embed` (systemd) | ✅ | port `11438`, **gte-qwen2-1.5b → 1536 dims (mesuré)**. ⇒ colonne `vector(1536)`. |
| LLM local rapide | `ollama@fast4b` (systemd) | ✅ | port `11434`, `qwen3.5:4b`. |
| OAuth proxy | `nango` | ✅ | présent (utile pour les scopes Google / GSC). |
| Vision (modération image, OCR screenshot GSC) | `gemma4_server` | ❌ | **aucun conteneur ; backend de l'alias `gemma4-vision` injoignable** (cf. §5). |
| Observabilité LLM | Langfuse | ❌ | **non déployé** (ni actif, ni arrêté). DB `langfuse` existe encore. |
| Monitoring files | Flower / Bull Board | ❌ | **non déployés**. |
| Remaster génératif image | ComfyUI | ❌ | non déployé — mais GPU 0 libre (cf. §5, charte §8). |

**Conteneurs voisins observés** (hors périmètre WeBuild, utiles à connaître) : pile `augmenter.pro` (backend, frontend, worker, scoring-worker, curation-worker, crewai-worker, postiz), projet **`ouquequoi`** (backend+worker), **`scalper-dashboard`** + DB `scalper_vix`, `temporal` (+ es + pg), `whisper_server`, `registry`.

---

## 3. Modèles LLM — alias *réels* de la passerelle *(vérifié dans la config live)*

Les alias référencés par [CLAUDE.md](../CLAUDE.md) **correspondent exactement à la config en production** (contrairement à `UNIFIED_INFRASTRUCTURE.md` §3.3 qui est périmé — il liste encore `qwen3-heavy`/`a3b-multimodal`).

| Alias (LiteLLM) | Backend réel | Usage POC | État |
|-----------------|--------------|-----------|------|
| `fast4b` *(= `default`)* | `ollama/qwen3.5:4b` @ `:11434` | classification / extraction bon marché | ✅ |
| `groq-fast` *(= `fast`)* | `groq/llama-3.1-8b-instant` | scoring ~100 ms, gratuit | ✅ |
| `groq-qwen3-32b` | `groq/qwen/qwen3-32b` | **génération FR** (suggestions éditoriales) | ✅ |
| `gte-qwen2-local` *(= `embedding`)* | `ollama/gte-qwen2-1.5b` @ `:11438` | **embeddings 1536d** (matching pgvector) | ✅ |
| `gemma4-vision` *(= `vision`/`reasoning`)* | `openai/gemma-4-26b-a4b` @ `gemma4_server:8080` | modération image + lecture screenshot GSC | ⚠️ **backend down** |
| `groq-analysis`, `groq-llama4-scout`, `gpt-4o`, `gpt-4o-mini`, `text-embedding-3-small` | Groq / OpenAI | fallbacks payants | ✅ |

> Conséquence : tout chemin WeBuild qui appelle `gemma4-vision` (modération de l'image de carte — charte §8 ; OCR du screenshot Search Console — métrique §2) **n'a pas de backend vivant aujourd'hui**. À traiter avant le POC (relancer `gemma4_server`, ou router `vision` vers un fallback type `gpt-4o`/`groq-llama4-scout`).

---

## 4. Mapping pipeline WeBuild → services live

Le pipeline cible (CLAUDE.md : Auth → Capture → Résumé → Carte → Matching → Suggestions) se branche ainsi sur l'existant **vérifié** :

```
Auth (Google OAuth + scope GSC)   → Better Auth + nango ✅        (à confirmer côté app)
Capture site                       → crawl4ai:11235 ✅
Résumé / extraction                → litellm fast4b / groq-fast ✅  (workers Celery + shared_redis ✅)
Authority Score (SEO+GEO)          → GSC API + crawl4ai ✅ ; proxy GEO = pgvector ✅ ; Sonar = API externe (à câbler)
Carte : image                      → import user ✅ ; filtre par niveau (WebGL, front) ; remaster = ComfyUI ❌ (GPU 0 libre)
Carte : modération image           → gemma4-vision ⚠️ (down)
Matching                           → embed gte-qwen2 (1536d) ✅ → pgvector ✅ → rerank bge-reranker-v2-m3 ✅
Suggestions éditoriales FR         → groq-qwen3-32b ✅ (sous contrainte anti-footprint, validation humaine)
Observabilité                      → Langfuse ❌ (non déployé)
```

**Verdict** : le cœur du pipeline (capture, embeddings 1536d, pgvector, rerank, génération FR) est **opérationnel et réutilisable tel quel**. Les manques sont périphériques mais réels : **vision (gemma4)**, **observabilité (Langfuse)**, **remaster image (ComfyUI)**.

---

## 5. GPU — disponibilité réelle *(vérifié `nvidia-smi`)*

| Index live | Carte | VRAM utilisée | Dispo pour le POC ? |
|-----------|-------|---------------|---------------------|
| 0 | RTX 3070 (8 Go) | **9 MiB** | ✅ **libre** — cible idéale ComfyUI (charte §8) |
| 1 | RTX 3070 (8 Go) | 5485 MiB | occupé (fast4b / modèle résident) |
| 2 | RTX 3080 (10 Go) | **1 MiB** | ✅ libre |
| 3 | RTX 3080 (10 Go) | **1 MiB** | ✅ libre |
| 4 | RTX 3070 (8 Go) | 6610 MiB | occupé (embed + whisper) |

> ⚠️ Les **index GPU ne sont pas stables** entre reboots (les cartes/VRAM diffèrent de `UNIFIED_INFRASTRUCTURE.md`). Toujours raisonner en **UUID GPU**, jamais en index. Il y a aujourd'hui ~26 Go de VRAM libre (GPU 0+2+3) → marge confortable pour ComfyUI **et** pour relancer `gemma4_server`.

---

## 6. Écarts vs documentation & blockers

1. **Disque à 96 % — mais ~50 Go récupérables.** `/var/lib/docker` = 121 Go ; images Docker = 51 Go dont **45 Go reclaimable (87 %)** + 4,8 Go de build cache. Le « blocage disque » historique est surtout du déchet. **Prérequis #1 du déploiement POC** : un `docker image prune` / `docker builder prune` (à faire valider — c'est une mutation, hors périmètre lecture seule de cette analyse).
2. **`UNIFIED_INFRASTRUCTURE.md` est partiellement périmé** : alias LiteLLM (§3.3), modèle 27B `a3b-multimodal`/`llama-server:11440` (plus actif), et il décrit Langfuse/monitoring comme déployés alors qu'ils ne le sont pas. La **config LiteLLM live** et **ce draft** font foi pour le POC.
3. **`gemma4-vision` sans backend** (cf. §3) — à relancer ou re-router avant d'avoir besoin de la vision.
4. **Observabilité absente** : pas de Langfuse, Flower, Bull Board. À redéployer si on veut tracer le pipeline IA WeBuild dès le POC.
5. **`renov_bati` / `coach_credit` non déployés** ; nouveaux venus non documentés ailleurs : `ouquequoi`, `scalper-dashboard`.

---

## 7. Intégration — comment WeBuild se branche *(à acter)*

- **Réseau** : les services partagés écoutent sur `127.0.0.1` (host) **et** sont sur le réseau Docker `coolify` (25 conteneurs). Les conteneurs WeBuild devront **rejoindre le réseau `coolify`** et adresser les services **par nom** (`shared_postgres:5432`, `shared_redis:6379`, `litellm:4000`, `crawl4ai:11235`, `bge_reranker:8001`), pas via les ports host.
- **Base de données** : créer une DB dédiée `webuild` dans `shared_postgres` (pattern par projet : `augmenter`, `ouquequoi`, …) + entrée PgBouncer + `CREATE EXTENSION vector;`. Embeddings en `vector(1536)`, index HNSW `vector_cosine_ops` (pattern existant).
- **Redis** : réserver un index DB libre (0–9 déjà partiellement attribués — à confirmer le prochain libre).
- **LLM** : viser à terme une *virtual key* `sk-webuild` côté LiteLLM (le tracking par projet n'est pas encore configuré ; aujourd'hui master key / Ollama direct).
- **GPU** : ComfyUI sur GPU 0 (libre), via UUID.

---

## 8. Questions en cours 🚧

- [ ] **Nettoyage disque** : qui lance le `prune` (≈50 Go) et quand ? Prérequis dur au déploiement.
- [ ] **`gemma4-vision`** : relancer `gemma4_server` (GPU 0/2/3 dispo) ou re-router l'alias `vision` vers un fallback ? Impacte modération image + OCR GSC.
- [ ] **Observabilité** : redéployer Langfuse pour le POC, ou s'en passer au début ?
- [ ] **Index Redis** : confirmer le prochain index DB libre pour WeBuild.
- [ ] **Capacité** : le Celeron 2c/2t est déjà saturé (load ~5). Ajouter les workers WeBuild = contention. Cadrer la concurrence (ou attendre l'upgrade i7 évoqué mais non confirmé).
- [ ] **Auth/GSC** : vérifier côté `app.augmenter.pro/backend` que Better Auth + scope `webmasters.readonly` sont réellement câblés (non vérifié en SSH ici — c'est du code applicatif).
