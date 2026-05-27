# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status: POC front-end foundation scaffolded (2026-05-26)

The repo now holds **both the design docs (`docs/`, French) and a Next.js 15 app foundation at the root**. The POC focus is a **visual + functional front-end** validating the card rendering; the **AI pipeline + tracing are explicitly deferred**.

- **Stack**: Next.js 15 (App Router) + React 19 + TypeScript; fonts via `next/font`; design tokens ported to `app/styles/tokens.css` (from `design_handoff_webuild_tag/tokens.css`); `motion` (transitions) + `zustand` (game state). **No Tailwind** — tokens.css + CSS Modules. No tests yet.
- **Commands**: `npm run dev` (Turbopack), `npm run build`, `npm run lint`. Verified building on Next 15.5.18.
- **Rendering approach (decided + A/B done 2026-05-26)**: **CSS-first** — the hi-fi design is fully achievable in CSS/React/SVG (foil = `conic-gradient` + `mix-blend-mode`, bloom N3, scanlines N1, flip = `rotateY`, pointer tilt/glare). The **R3F/Three.js A/B** (route `/rnd`, N4 holo shader Fresnel) confirmed it: **CSS wins on bundle (~0) / GPU / effort**; R3F gives *physically* angle-reactive iridescence → **reserved for hero moments only** (e.g. `/chateau` physics toy). **Hero N4 variant decided (2026-05-27) → Voie A** : DOM CSS content (pixel-perfect) + a glued WebGL fresnel foil plane ([HoloCard3D.tsx](app/components/r3f/HoloCard3D.tsx)), not the old content-redrawing `HoloCardR3F`. Detail: [docs/draft-cartes-couches-effets.md](docs/draft-cartes-couches-effets.md) §4. All R3F is **isolated to R&D routes** (`/rnd`, `/chateau`) via `dynamic(ssr:false)` → `three`/`@react-three/fiber`/`drei`/`@react-three/rapier`/`leva`/`r3f-perf` lazy-loaded, **not in the product bundle**.
- **3D / R3F learnings & pitfalls** (card orientation & angles, Λ-tent geometry, house-of-cards physics via fixed→dynamic, ContactShadows vs shadow maps, holo shader screen-blend, Next+R3F dev traps) → **[docs/draft-rendu-3d.md](docs/draft-rendu-3d.md)**. Read it before touching any 3D code.
- **UI source of truth** = `design_handoff_webuild_tag/` (hi-fi handoff: 9 hub screens, gabarit-D card × 4 levels × 4 states, 5 transitions, tokens.css). Gitignored from versioning but present locally; its own README has the full spec.

Start by reading, in this order:
- [docs/faq.md](docs/faq.md) — **canonical doctrine** (the *why/how/Google* in Q&A form). Source of truth for positioning; also the consistency guardrail the axis-B AI uses when generating content. Decided positions are authoritative; items tagged `🚧` are NOT settled.
- [readme.txt](readme.txt) — the original concept pitch (visual identity + 3D navigation).
- [docs/draft-gameplay-technique.md](docs/draft-gameplay-technique.md) — gameplay, product flow, data model, and the running list of resolved/open questions. The source of truth for **what the product is**.
- [docs/draft-vision-geo.md](docs/draft-vision-geo.md) — the **GEO north star** strategy (SEO→GEO convergence, what it redefines, the honest risks).
- [docs/draft-metrique-autorite.md](docs/draft-metrique-autorite.md) — **keystone**: the Authority Score (SEO+GEO) that drives level, rarity, stats, matching.
- [docs/draft-pipeline-ia.md](docs/draft-pipeline-ia.md) — the AI pipeline, grounded in the existing shared infrastructure.
- [docs/draft-charte-graphique.md](docs/draft-charte-graphique.md) — visual identity / design system.
- [docs/draft-rendu-3d.md](docs/draft-rendu-3d.md) — **3D / R3F technical notes** from the POC: card orientation & 3D angles, Λ-tent + A-pyramid geometry, Rapier house-of-cards physics, ContactShadows, holo shader, Next+R3F dev pitfalls. **Mandatory read before any 3D/Three.js work.**
- [docs/draft-infra-poc.md](docs/draft-infra-poc.md) — **SSH-verified live infra baseline** (2026-05-26): what the POC reuses as-is vs the real gaps (gemma4-vision backend down, Langfuse/monitoring not deployed, ~50 GB disk to prune). Trust this over `unified-infrastructure/docs/UNIFIED_INFRASTRUCTURE.md`, which has drifted.

The FAQ and the drafts must never contradict each other: when a `🚧` item is decided, update both.

The three drafts cross-link and each separates **Ce que l'on sait** (decided) from **Questions en cours** (open). Keep that structure; mark questions `[x]` when resolved (with a `*(cf. §…)*` pointer) and `[~]` when partially mitigated rather than deleting them.

## The product in one paragraph

*WeBuild — Trading Authority Game* is a web app that turns SEO backlink building into a Trading Card Game. Members sign in with Google, declare their websites; the platform captures + summarizes each site and generates a **card** whose visual rarity (Game Boy → SNES → PS2 → holographic, 4 levels) is **derived from the site's authority**. Members then build links with each other.

**Long-term north star = GEO** (Generative Engine Optimization): being cited in AI/LLM answers, not just ranking on Google. Framed as **SEO→GEO convergence, not "SEO is dead"**. This makes the editorial/no-dofollow stance a *feature* (GEO rewards mentions + citations over link juice), and reframes "authority" toward topical entity salience + citation share. The hard open problems are the **authority metric** and **attribution** (proving LLM citations). See [docs/draft-vision-geo.md](docs/draft-vision-geo.md).

## Decisions already locked (do not re-litigate without cause)

- **It is NOT a buy-links marketplace.** It is editorial link building between site owners.
- **Compliance axis = "B — éditorial partnerships"** (gameplay §2.5): links must be born from real content. An AI layer proposes (1) which partner cards/links to target, (2) article topics to produce, (3) contextualized anchor texts. Every suggestion is **human-validated** before publishing.
- **Exchange mechanic = donor / credits** (gameplay §2.6): you earn credits by donating an editorial link, spend them to get promoted to relevant editors. The flow is **one-directional** — donor ≠ direct recipient, no short loops. **Rejected**: 1:1 reciprocal exchange AND orchestrated/sealed chains (A→B→C). Chains may only exist as an *emergent* graph property, never as a proposed/sealed transaction. The neon accent color = the credit currency.
- **The card (level, rarity, stats) is always derived, never hand-entered.** Visual level encodes SEO value.
- **Authority metric = composite Authority Score** (see [docs/draft-metrique-autorite.md](docs/draft-metrique-autorite.md)): `AS = w_seo·S_seo + w_geo·S_geo`, weights drifting SEO→GEO over time. SEO source is **hybrid 3-tier** (on-page via Crawl4AI + **Google Search Console first-party** via OAuth scope / screenshot+gemma4-vision fallback + optional paid backlink API). GEO = pgvector topical-centrality proxy + sampled **Perplexity Sonar** citation-rate probing. Stats: **HP=trust, ATK=reach**. Connecting GSC also **proves site ownership**. The AS is a *game indicator, not a ranking promise*. Weights/thresholds still to calibrate.
- **Card image = user import (or auto) + 2-path restyle** (charte §8): the user may upload an image (else it's auto-derived from the site capture), then reprocessed either by **deterministic per-level filters** (WebGL, default, free) or a **generative remaster** (ComfyUI on GPU 0, opt-in) — and **always finished with the per-level filter pass**, which is what guarantees brand consistency. Moderation via gemma4-vision; store the generative seed.
- **Target stack = the shared `augmenter.pro` infrastructure** (sibling folders under `coolify_linux/`), reused rather than rebuilt. See "Target architecture" below.

## Hard constraints (these shape every implementation choice)

- **Anti-footprint is a design requirement, not a feature** (pipeline §4). The central paradox: industrializing AI suggestions risks recreating the exact link-network footprint Google detects. Every generation path must enforce diversity (anchor-type quotas, semantic dedup via pgvector, graph anti-cycle / anti-link-wheel, a platform-wide "score de naturalité") and keep a **mandatory human edit step**.
- **Google Spam Policies**: reciprocal link schemes are explicitly flagged. The product is defensible only while links stay editorial + relevant. **Never promise "guaranteed dofollow" / "DA boost"** in product or marketing copy — that reframing is what makes it manipulative.
- **The authority metric is the main open blocker.** Card level, rarity, HP/ATK stats, and the matching filter all depend on it. Source undecided: third-party API (Ahrefs/Moz/Majestic) vs. an in-house score computed from the capture.

## Target architecture (when code starts)

The app plugs into the existing shared infra (deployed via Coolify); see [docs/draft-pipeline-ia.md](docs/draft-pipeline-ia.md) §2 for the full mapping. Key reuse points:

- **Auth**: Better Auth + Google OAuth — already working in `app.augmenter.pro/backend`.
- **Capture/scraping**: self-hosted **Crawl4AI** (`crawl4ai.augmenter.pro`), wrapped by the NestJS `CrawlService` (circuit breaker, Redis cache, Firecrawl→cheerio fallback).
- **LLM gateway**: **LiteLLM** (`litellm:4000`). Models via semantic aliases — `fast4b` (cheap local classification/extraction), `groq-fast` (~100ms scoring, free), `gemma4-vision` (multimodal), `groq-qwen3-32b` (**French generation**), `gte-qwen2-local` (embeddings, 1536d).
- **Async work**: **Celery + Redis** (Python workers) using the existing tiered pattern (triage → tier1 → tier2 → tier3).
- **Datastore**: **PostgreSQL 16 + pgvector** (1536d) via **Prisma**; semantic matching reuses the RAG pattern (embed → pgvector search 3× over-fetch → cross-encoder rerank).
- **Front**: **Next.js 15** (React → compatible with React Three Fiber / Three.js for the 3D card rendering).
- **Observability**: **Langfuse** traces all LLM calls; Flower (Celery) and Bull Board (BullMQ) for queues.

The pipeline is: Auth → Capture (Crawl4AI) → Summarize/extract (Celery + LiteLLM) → Card (authority→level/stats/image) → Matching (pgvector + rerank + relevance/anti-cycle filters) → Editorial suggestions (FR generation, under anti-footprint constraint, human-validated).

## Working conventions (project + global)

- **User-facing content in French**; code identifiers in English.
- **File references** as markdown links `[name](path)`, not backticks (VSCode extension convention).
- **Dates** `YYYY-MM-DD` everywhere.
- **Never commit automatically** — propose, let the user run it.
- When new facts arrive, **update the relevant draft in place** (resolve questions, add new ones) rather than creating parallel notes; the drafts are the single source of truth during this phase.
