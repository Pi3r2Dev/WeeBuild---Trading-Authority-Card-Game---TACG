# `lib/services` — clients d'infra (capture, LLM)

Clients **serveur uniquement** (server actions / API) vers l'infra partagée `augmenter.pro`.
Ils ne sont jamais importés côté client (ils lisent `process.env` et appellent des services internes).

## Capture web

Moteur unique (Firecrawl) derrière un point d'entrée applicatif :

| Fichier | Rôle |
|---|---|
| [firecrawl.ts](firecrawl.ts) | **Moteur de crawl** — Firecrawl self-hosted v3 (rendu JS). Client réutilisable `scrape()` / `healthcheck()`. |
| [capture.ts](capture.ts) | **Point d'entrée** — `captureSite(url)` ; `captureSiteWithVisuals(url)` (+ extract + ingest blob). |
| [ssrf.ts](ssrf.ts) | Garde **SSRF** — résout le DNS de l'URL cible et refuse les IP privées/loopback/link-local. |
| [capture-types.ts](capture-types.ts) | Types + helpers partagés (`CapturedSite`, `CaptureError`, parsing liens/images du HTML). |

> Crawl4AI (ancien fallback) a été retiré : son domaine public est hors service et son conteneur n'est
> pas joignable. Firecrawl est désormais le seul moteur de crawl.

### Usage

```ts
import { scrape } from "@/lib/services/firecrawl";

// Client crawl réutilisable (markdown propre + html + metadata) :
const { markdown, html, metadata } = await scrape("https://exemple.fr", {
  formats: ["markdown", "html"], // défaut
  onlyMainContent: true,          // défaut
  waitFor: 8000,                  // ms d'attente JS pour les SPA (optionnel)
  timeoutMs: 45000,               // défaut
});

// Ou le point d'entrée applicatif :
import { captureSite } from "@/lib/services/capture";
const site = await captureSite("https://exemple.fr"); // CapturedSite
```

`scrape()` sérialise les appels (1 à la fois) et fait **1 retry avec backoff** sur erreur transitoire
(réseau / 5xx) — doux pour la box 4 Go. Il jette `FirecrawlError` (non configuré, HTTP non-2xx,
`success:false`, markdown vide, timeout) ou `SsrfError` (URL cible interne). La garde SSRF s'applique
**avant** tout appel.

### Variables d'environnement (cf. [`.env.local.example`](../../.env.local.example))

| Variable | Requis | Note |
|---|---|---|
| `FIRECRAWL_API_URL` | oui | Pas de défaut. Non défini → la capture échoue (aucun fallback). |
| `FIRECRAWL_API_KEY` | non | Self-hosted sans auth ; en-tête `Authorization` envoyé seulement si défini. |
| `WEBUILD_VISUAL_STORAGE` | non | `local` (défaut) ou `memory` (tests). Backend blob logo/hero/screenshot. |
| `WEBUILD_VISUAL_STORAGE_PATH` | non | Racine FS local (défaut : `./storage/visual`). |
| `WEBUILD_VISUAL_PUBLIC_BASE` | non | Préfixe URL publique (défaut : `/api/assets/visual`). |

> Ingestion visuelle : cf. [lib/capture/](../capture/) et [draft-personnalisation-carte.md](../../docs/draft-personnalisation-carte.md) §5.5.

### Réseau — accès à Firecrawl

Firecrawl écoute sur **`10.10.0.1:3002`** via WireGuard, joignable **uniquement depuis les conteneurs
du host Coolify**. Smoke test à lancer **depuis l'environnement de déploiement cible** :

```bash
curl -s -m 10 -o /dev/null -w '%{http_code}\n' http://10.10.0.1:3002/          # attendu: 200
curl -s -m 30 -X POST http://10.10.0.1:3002/v1/scrape \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com","formats":["markdown"],"onlyMainContent":true}'  # success:true + markdown
```

- **App Coolify sur ce host** → `FIRECRAWL_API_URL=http://10.10.0.1:3002` (déjà routé).
- **Dev local** → `10.10.0.1` injoignable directement : ouvrir un tunnel SSH puis pointer dessus.
  ```bash
  ssh -N -L 3002:10.10.0.1:3002 coolify   # laisser tourner
  # .env.local : FIRECRAWL_API_URL=http://localhost:3002
  ```

⚠️ **Hors périmètre du crawl** : données Google My Business / Maps (avis, note, horaires) — non
crawlables (CAPTCHA/consent Google) → passer par la **Google Places API**.

## LLM

[litellm.ts](litellm.ts) — passerelle LiteLLM (`chat` / `chatJson`). `isConfigured()` = false sans
`LITELLM_API_KEY` → l'appelant prévoit un fallback (cf. [authority/extract.ts](../authority/extract.ts)).

## Tests

`npm test` (Vitest). `fetch` et `node:dns` sont mockés — aucun appel réseau réel.
Couverts : `scrape` (succès / `success:false` / 4xx / markdown vide / timeout+retry / en-tête clé) et
la garde SSRF (IP privées, loopback, link-local, IPv6, multi-A, schéma, DNS vide).
