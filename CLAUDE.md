# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status: design phase, no code yet

This repo currently holds **concept and design documents only** — there is no application code, build system, or tests. Do not invent build/lint/test commands; there are none until implementation starts. The work so far is product/architecture definition captured in `docs/` (all in French, the user-facing language for this project).

Start by reading, in this order:
- [docs/faq.md](docs/faq.md) — **canonical doctrine** (the *why/how/Google* in Q&A form). Source of truth for positioning; also the consistency guardrail the axis-B AI uses when generating content. Decided positions are authoritative; items tagged `🚧` are NOT settled.
- [readme.txt](readme.txt) — the original concept pitch (visual identity + 3D navigation).
- [docs/draft-gameplay-technique.md](docs/draft-gameplay-technique.md) — gameplay, product flow, data model, and the running list of resolved/open questions. The source of truth for **what the product is**.
- [docs/draft-vision-geo.md](docs/draft-vision-geo.md) — the **GEO north star** strategy (SEO→GEO convergence, what it redefines, the honest risks).
- [docs/draft-pipeline-ia.md](docs/draft-pipeline-ia.md) — the AI pipeline, grounded in the existing shared infrastructure.
- [docs/draft-charte-graphique.md](docs/draft-charte-graphique.md) — visual identity / design system.

The FAQ and the drafts must never contradict each other: when a `🚧` item is decided, update both.

The three drafts cross-link and each separates **Ce que l'on sait** (decided) from **Questions en cours** (open). Keep that structure; mark questions `[x]` when resolved (with a `*(cf. §…)*` pointer) and `[~]` when partially mitigated rather than deleting them.

## The product in one paragraph

*WeBuild — Trading Authority Game* is a web app that turns SEO backlink building into a Trading Card Game. Members sign in with Google, declare their websites; the platform captures + summarizes each site and generates a **card** whose visual rarity (Game Boy → SNES → PS2 → holographic, 4 levels) is **derived from the site's authority**. Members then build links with each other.

**Long-term north star = GEO** (Generative Engine Optimization): being cited in AI/LLM answers, not just ranking on Google. Framed as **SEO→GEO convergence, not "SEO is dead"**. This makes the editorial/no-dofollow stance a *feature* (GEO rewards mentions + citations over link juice), and reframes "authority" toward topical entity salience + citation share. The hard open problems are the **authority metric** and **attribution** (proving LLM citations). See [docs/draft-vision-geo.md](docs/draft-vision-geo.md).

## Decisions already locked (do not re-litigate without cause)

- **It is NOT a buy-links marketplace.** It is editorial link building between site owners.
- **Compliance axis = "B — éditorial partnerships"** (gameplay §2.5): links must be born from real content. An AI layer proposes (1) which partner cards/links to target, (2) article topics to produce, (3) contextualized anchor texts. Every suggestion is **human-validated** before publishing.
- **Exchange mechanic = donor / credits** (gameplay §2.6): you earn credits by donating an editorial link, spend them to get promoted to relevant editors. The flow is **one-directional** — donor ≠ direct recipient, no short loops. **Rejected**: 1:1 reciprocal exchange AND orchestrated/sealed chains (A→B→C). Chains may only exist as an *emergent* graph property, never as a proposed/sealed transaction. The neon accent color = the credit currency.
- **The card (level, rarity, stats, image) is always derived, never hand-entered.** Visual level encodes SEO value.
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
