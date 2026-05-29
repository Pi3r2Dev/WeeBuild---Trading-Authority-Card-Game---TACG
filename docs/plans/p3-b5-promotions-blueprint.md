# Blueprint P3 — B5 : Promotions persistées

> Produit par `feature-dev:code-architect` le 2026-05-28, persisté par l'orchestrateur (`/flow orchestrate` de la session [poc-to-production-roadmap](../sessions/2026-05-27-poc-to-production-roadmap.md)). Un agent `general-purpose` peut implémenter directement depuis ce document sans relire le reste du repo.
>
> **Décisions verrouillées par le user (2026-05-28)** : Q-P3-2 = solde négatif **bloque les promotions seulement** (pénalité AS = P4) ; Q-P3-5 = visibilité via **filtre/jointure SQL `Promotion` ACTIVE** (pas de flag dénormalisé `Site.isPromoted`).

---

## 1. Vérification schéma — 0 migration requise

Le schéma Prisma (`prisma/schema.prisma` lignes 631–657) contient déjà intégralement le modèle `Promotion` avec tous les champs B5 :

| Champ | Type | Présent |
|-------|------|---------|
| `id` | `String @id @default(uuid())` | oui |
| `userId` | `String` + relation `User` | oui |
| `siteId` | `String?` (FK nullable vers `Site`) | oui |
| `status` | `PromotionStatus @default(ACTIVE)` | oui |
| `targetLevel` | `Int?` | oui |
| `targetElement` | `String?` | oui |
| `targetThematique` | `String?` | oui |
| `creditsSpent` | `Int` | oui |
| `startsAt` | `DateTime @default(now())` | oui |
| `expiresAt` | `DateTime?` | oui |
| `ledgerEntries` | relation inverse `CreditLedgerEntry[]` | oui |
| Index `[status, expiresAt]` | — | oui |
| Index `[targetElement]` | — | oui |

L'enum `PromotionStatus` (`ACTIVE / EXPIRED / CANCELLED`, lignes 446–449) est présent. L'enum `CreditTxReason` contient `PROMOTION_SPEND` et `PROMOTION_REFUND` (lignes 438–443). La FK inverse `Promotion.ledgerEntries → CreditLedgerEntry.promotionId` (lignes 480–483) est câblée.

**Conclusion : 0 migration. B5 = code applicatif pur.**

Lacune mineure : `Promotion.siteId` est nullable mais sans relation Prisma nommée `site Site?` (`@relation`). En Prisma 7 le champ FK seul est acceptable et ne génère pas de migration. Pour naviguer `promotion.site` il faudrait ajouter la relation + une migration no-op → **recommandation : NE PAS l'ajouter** (garder 0 migration), récupérer le site via requête séparée.

---

## 2. Patterns et conventions observés (références exactes)

- **Séparation policy / transitions / write / read** : `lib/links/anchor-policy.ts` (pur, isomorphe), `lib/links/transitions.ts` (pur, testable sans DB), `lib/links/write.ts` (orchestration Prisma, transaction), `lib/links/read.ts` (accesseurs DB serveur).
- **Types de frontière** : `lib/links/types.ts` — DTOs ISO-string, aucun import Prisma, union littérale des enums.
- **Server actions** : `app/(app)/donner/link-actions.ts` — `"use server"`, `requireSession()`, délègue à `lib/`, `revalidatePath`, retour `ActionResult`.
- **Solde crédits** : `lib/credits/balance.ts:27-33` — `getCreditBalance(userId)` = `db.creditLedgerEntry.aggregate({ _sum: { amount: true } })`. Réutiliser tel quel.
- **Transaction atomique** : `lib/links/write.ts:24` — `db.$transaction(async (tx) => {...})`, gardes de statut DANS la transaction.
- **Loader server → Client Component** : `app/components/hub/DonnerFlowLoader.tsx`. Le barrel `lib/data/index.ts` tire Prisma → non importable depuis un Client Component.
- **Feature flags** : `app/components/app/flags.ts` — `GAME_LOOP_ENABLED` = vrai, `PROOFS_PIPELINE_ENABLED` = vrai. B5 n'a pas besoin d'un nouveau flag.
- **Nav items** : `app/components/app/AppNav.tsx:9-16` — 6 items fixes. Route `/promotions` accessible depuis CTA Hub ou directement (item nav optionnel).
- **Tables snake_case, colonnes camelCase** (tracker l.164) — `"siteId"`, `"userId"`, `"expiresAt"` dans tout SQL brut.

---

## 3. Architecture décidée

### 3.1 Expiration lazy à la lecture (pas de cron)

**Décision : lazy via SQL, jamais via le flag `status` seul.** Toute requête qui consomme une promotion active filtre sur `status = 'ACTIVE' AND (expiresAt IS NULL OR expiresAt > NOW())`. Le champ `status` devient un indicateur de cohérence différée, pas la source de vérité. Avantages : élimine le cron P4 ; garde la porte ouverte au cron P4 (batch-flip `EXPIRED` sans rien casser) ; cohérent avec Q-P3-2 (blocage solde = seul garde-fou actif P3).

Hook P4 : commentaire `// TODO(P4): job périodique batch-update status=EXPIRED WHERE expiresAt < now() AND status='ACTIVE'` dans `lib/promotions/read.ts`.

### 3.2 Structure des modules

```
lib/promotions/
  policy.ts       # pur, isomorphe — calcul C_dépense, constantes nommées, validation input
  transitions.ts  # pur, testable — décisions de statut (decideLaunchPromotion)
  write.ts        # serveur — transaction atomique (launchPromotion)
  read.ts         # serveur — accesseurs DB (getMyPromotions, getMyActivePromotions)
  types.ts        # DTOs ISO-string, aucun import Prisma

app/(app)/promotions/
  page.tsx                  # Server Component — Loader
  PromotionLaunchLoader.tsx # Server Component — charge solde + sites + promos actives
  promotion-actions.ts      # "use server" — launchPromotionAction
  PromotionLaunchClient.tsx # "use client" — formulaire cible + aperçu coût + confirmation
```

Injection matching dans `lib/matching/match.ts` — une seule modification (filtre SQL dans le `$queryRaw` candidats).

---

## 4. Détail des modules

### 4.1 `lib/promotions/types.ts` — CRÉER

```typescript
export type PromotionStatusLiteral = "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface PromotionView {
  id: string;
  siteId: string | null;
  siteDomain: string | null;      // résolu par le Loader
  status: PromotionStatusLiteral;
  targetLevel: number | null;
  targetElement: string | null;
  targetThematique: string | null;
  creditsSpent: number;
  startsAt: string;               // ISO
  expiresAt: string | null;       // ISO
  isEffectivelyActive: boolean;   // expiresAt IS NULL || expiresAt > now
  createdAt: string;
}

export interface LaunchPromotionInput {
  siteId: string;
  targetLevel?: number;
  targetElement?: string;
  targetThematique?: string;
  durationDays: number;           // 1 | 3 | 7 | 14 | 30
}

export type ActionResult<T = void> = ({ ok: true } & T) | { ok: false; error: string };
```

### 4.2 `lib/promotions/policy.ts` — CRÉER (pur isomorphe, zéro import)

```typescript
// Unité de base — à calibrer selon le rendement moyen d'un LINK_VERIFIED (TODO P2).
export const PROMO_BASE_COST = 20;           // crédits

export const PROMO_LEVEL_FACTOR: Record<number, number> = { 1: 0.5, 2: 0.75, 3: 1.0, 4: 1.5 };
export const PROMO_LEVEL_FACTOR_DEFAULT = 1.0;

export const PROMO_DURATION_FACTORS: Record<number, number> = { 1: 1.0, 3: 2.5, 7: 5.0, 14: 8.0, 30: 15.0 };

export const PROMO_ALLOWED_DURATIONS = [1, 3, 7, 14, 30] as const;
export type PromoDuration = (typeof PROMO_ALLOWED_DURATIONS)[number];

export function computePromoCost(params: { targetLevel?: number; durationDays: PromoDuration }): number {
  const lf = params.targetLevel
    ? (PROMO_LEVEL_FACTOR[params.targetLevel] ?? PROMO_LEVEL_FACTOR_DEFAULT)
    : PROMO_LEVEL_FACTOR_DEFAULT;
  const df = PROMO_DURATION_FACTORS[params.durationDays];
  return Math.round(PROMO_BASE_COST * lf * df);
}

export interface PromoValidationResult { ok: boolean; error?: string; cost?: number; }

export function validatePromoInput(
  input: { siteId: string; durationDays: number; targetLevel?: number },
  currentBalance: number,
): PromoValidationResult {
  if (!input.siteId) return { ok: false, error: "Sélectionne un site à promouvoir." };
  if (!(PROMO_ALLOWED_DURATIONS as readonly number[]).includes(input.durationDays)) {
    return { ok: false, error: "Durée invalide. Choisis parmi 1, 3, 7, 14 ou 30 jours." };
  }
  if (input.targetLevel !== undefined && (input.targetLevel < 1 || input.targetLevel > 4)) {
    return { ok: false, error: "Niveau cible invalide (1–4)." };
  }
  const cost = computePromoCost({ targetLevel: input.targetLevel, durationDays: input.durationDays as PromoDuration });
  // Q-P3-2 : solde insuffisant → bloque la promotion (seule garde active en P3).
  if (currentBalance < cost) {
    return { ok: false, error: `Solde insuffisant : tu as ${currentBalance} ◇ mais cette promotion coûte ${cost} ◇. Donne des liens pour gagner des crédits.` };
  }
  return { ok: true, cost };
}
```

### 4.3 `lib/promotions/transitions.ts` — CRÉER (pur testable)

```typescript
import { validatePromoInput } from "./policy";
import type { LaunchPromotionInput } from "./types";

export interface LaunchPromoContext { ownerUserId: string; currentBalance: number; }

export type LaunchPromoDecision =
  | { kind: "error"; error: string }
  | { kind: "launch"; cost: number; expiresAt: Date };

export function decideLaunchPromotion(
  ctx: LaunchPromoContext,
  input: LaunchPromotionInput & { userId: string },
): LaunchPromoDecision {
  if (ctx.ownerUserId !== input.userId) return { kind: "error", error: "Ce site ne t'appartient pas." };
  const validation = validatePromoInput(
    { siteId: input.siteId, durationDays: input.durationDays, targetLevel: input.targetLevel },
    ctx.currentBalance,
  );
  if (!validation.ok) return { kind: "error", error: validation.error! };
  const cost = validation.cost!;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.durationDays);
  return { kind: "launch", cost, expiresAt };
}
```

### 4.4 `lib/promotions/write.ts` — CRÉER (transaction atomique + double-check solde)

```typescript
import { db } from "@/lib/db";
import { getCreditBalance } from "@/lib/credits/balance";
import { decideLaunchPromotion } from "./transitions";
import type { LaunchPromotionInput, ActionResult, PromotionView } from "./types";
import { toPromotionView } from "./read";

export async function launchPromotion(
  input: LaunchPromotionInput & { userId: string },
): Promise<ActionResult<{ promotion: PromotionView }>> {
  const site = await db.site.findUnique({ where: { id: input.siteId }, select: { userId: true, domain: true } });
  if (!site) return { ok: false, error: "Site introuvable." };

  const currentBalance = await getCreditBalance(input.userId);
  const decision = decideLaunchPromotion({ ownerUserId: site.userId, currentBalance }, input);
  if (decision.kind === "error") return { ok: false, error: decision.error };

  return db.$transaction(async (tx) => {
    const agg = await tx.creditLedgerEntry.aggregate({ where: { userId: input.userId }, _sum: { amount: true } });
    const balanceInTx = agg._sum.amount ?? 0;
    if (balanceInTx < decision.cost) {
      return { ok: false, error: `Solde insuffisant au moment de la confirmation (${balanceInTx} ◇ disponibles, ${decision.cost} ◇ requis).` };
    }
    const promotion = await tx.promotion.create({
      data: {
        userId: input.userId, siteId: input.siteId, status: "ACTIVE",
        targetLevel: input.targetLevel ?? null, targetElement: input.targetElement ?? null,
        targetThematique: input.targetThematique ?? null, creditsSpent: decision.cost,
        startsAt: new Date(), expiresAt: decision.expiresAt,
      },
    });
    await tx.creditLedgerEntry.create({
      data: { userId: input.userId, amount: -decision.cost, reason: "PROMOTION_SPEND", promotionId: promotion.id },
    });
    return { ok: true, promotion: toPromotionView(promotion, site.domain) };
  });
}
```

### 4.5 `lib/promotions/read.ts` — CRÉER

Mapper pur `toPromotionView` + `getMyActivePromotions` + `getMyPromotions`. La relation `Promotion → Site` n'étant pas déclarée, résoudre les domains via une requête séparée `db.site.findMany({ where: { id: { in: siteIds } } })` (pattern `lib/links/read.ts`).

```typescript
import { db } from "@/lib/db";
import type { PromotionView } from "./types";

export function toPromotionView(
  p: { id: string; siteId: string | null; status: string; targetLevel: number | null;
       targetElement: string | null; targetThematique: string | null; creditsSpent: number;
       startsAt: Date; expiresAt: Date | null; createdAt: Date },
  siteDomain: string | null = null,
): PromotionView {
  const now = new Date();
  const isEffectivelyActive = p.status === "ACTIVE" && (p.expiresAt === null || p.expiresAt > now);
  return {
    id: p.id, siteId: p.siteId, siteDomain, status: p.status as PromotionView["status"],
    targetLevel: p.targetLevel, targetElement: p.targetElement, targetThematique: p.targetThematique,
    creditsSpent: p.creditsSpent, startsAt: p.startsAt.toISOString(),
    expiresAt: p.expiresAt?.toISOString() ?? null, isEffectivelyActive, createdAt: p.createdAt.toISOString(),
  };
}

const PROMO_SELECT = {
  id: true, siteId: true, status: true, targetLevel: true, targetElement: true,
  targetThematique: true, creditsSpent: true, startsAt: true, expiresAt: true, createdAt: true,
} as const;

async function resolveDomains(rows: { siteId: string | null }[]) {
  const siteIds = [...new Set(rows.map((r) => r.siteId).filter(Boolean))] as string[];
  const sites = siteIds.length
    ? await db.site.findMany({ where: { id: { in: siteIds } }, select: { id: true, domain: true } })
    : [];
  return new Map(sites.map((s) => [s.id, s.domain]));
}

/** Promotions effectivement actives. TODO(P4): job batch-update status=EXPIRED WHERE expiresAt<now() AND status='ACTIVE'. */
export async function getMyActivePromotions(userId: string): Promise<PromotionView[]> {
  const rows = await db.promotion.findMany({
    where: { userId, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: PROMO_SELECT, orderBy: { createdAt: "desc" },
  });
  const domainMap = await resolveDomains(rows);
  return rows.map((r) => toPromotionView(r, r.siteId ? (domainMap.get(r.siteId) ?? null) : null));
}

export async function getMyPromotions(userId: string, limit = 20): Promise<PromotionView[]> {
  const rows = await db.promotion.findMany({
    where: { userId }, select: PROMO_SELECT, orderBy: { createdAt: "desc" }, take: limit,
  });
  const domainMap = await resolveDomains(rows);
  return rows.map((r) => toPromotionView(r, r.siteId ? (domainMap.get(r.siteId) ?? null) : null));
}
```

### 4.6 Injection matching — `lib/matching/match.ts` — MODIFIER

**Emplacement** : requête `$queryRaw` de la section "2) pgvector search" (`match.ts:137-147`). La visibilité = **ORDER BY secondaire** : à égalité de score cosine, les sites avec une promotion ACTIVE ciblant le profil remontent. Choix conservateur : ne fausse pas le score de pertinence, influe seulement sur le classement à égalité et l'over-fetch.

Remplacer la requête existante par (colonnes `promotion` quotées en camelCase) :

```sql
SELECT s.id, s.domain, s.element, s.thematique, s.title, s.description,
       c.level AS level,
       (s.embedding <=> ${pgVec}::vector) AS distance,
       CASE WHEN EXISTS (
         SELECT 1 FROM promotion p
         WHERE p."siteId" = s.id
           AND p.status = 'ACTIVE'
           AND (p."expiresAt" IS NULL OR p."expiresAt" > NOW())
           AND (p."targetLevel" IS NULL OR p."targetLevel" = c.level)
           AND (p."targetElement" IS NULL OR p."targetElement" = s.element)
       ) THEN 1 ELSE 0 END AS is_promoted
FROM site s
LEFT JOIN card c ON c."siteId" = s.id
WHERE s.id <> ${siteId}
  AND s.embedding IS NOT NULL
ORDER BY is_promoted DESC,
         s.embedding <=> ${pgVec}::vector
LIMIT ${overFetch}
```

Étendre `CandidateRow` (`match.ts:73-84`) avec `is_promoted: number` (0/1). Champ exposable dans la trace `MatchOutcome` pour observabilité, sinon ignorable côté produit.

**`expiresAt > NOW()` dans le SQL** (pas confiance dans `status`) : cf. §3.1, source de vérité effective. **`targetThematique`** non filtré (nécessiterait la thématique du site source en param) → stocké pour affinage P4.

### 4.7 → 4.11 UI

- `app/(app)/promotions/page.tsx` : Server Component rendant `<PromotionLaunchLoader />`.
- `PromotionLaunchLoader.tsx` (server) : `requireSession` → `Promise.all([getCreditBalance, getMyDeck, getMyPromotions])` → précalcule une grille de coûts (isomorphe) → passe au client.
- `PromotionLaunchClient.tsx` (client) : 4 états — (1) sélection site/niveau/élément/durée ; (2) aperçu coût live via `computePromoCost` + garde `balance < cost` → bouton `disabled` + message ; (3) confirmation → `launchPromotionAction` ; (4) historique `myPromotions`. Réutiliser `CreditsBadge`/`ScreenHeader`/`SectionLabel`/`Body` de `app/components/hub/primitives.tsx`. **Solde insuffisant** → état bloqué + lien `/donner`.
- `promotion-actions.ts` : `"use server"` `launchPromotionAction` → `requireSession` → `launchPromotion` → `revalidatePath("/promotions")` + `revalidatePath("/")`.
- `HubDashboard.tsx` : CTA contextuel sous le bloc progression (l.103–104), conditionnel `GAME_LOOP_ENABLED && ME.credits > 0`, lien `/promotions`. Ne pas modifier la nav (6 items déjà). Item nav optionnel laissé à l'implémenteur.

---

## 5. Séquence de build

1. **types** (`lib/promotions/types.ts`) — sans dépendance.
2. **policy** (`policy.ts` + `policy.test.ts`) — dépend types. Tester `computePromoCost` (level 1/4, durée 1/30), `validatePromoInput` (solde exact/insuffisant/nul, durée invalide, siteId vide).
3. **transitions** (`transitions.ts` + `transitions.test.ts`) — dépend policy+types. Tester appartenance, solde, expiresAt, kind="launch".
4. **read** (`read.ts`) — dépend types+Prisma.
5. **write** (`write.ts`) — dépend transitions+read+`lib/credits/balance.ts`.
6. **matching** (`match.ts`) — étendre `CandidateRow` + requête `$queryRaw`. `tsc --noEmit` après.
7. **server action** (`promotion-actions.ts`) — dépend write.
8. **Loader** (`PromotionLaunchLoader.tsx`) — dépend read+lib/data+balance.
9. **Client** (`PromotionLaunchClient.tsx`) — dépend types+policy(iso)+actions.
10. **page** (`page.tsx`) — dépend Loader.
11. **Hub CTA** (`HubDashboard.tsx`) — dépend page route.
12. **Vérif** : `tsc --noEmit` + `next build` (route `/promotions` en +) + scénario manuel.

---

## 6. Acceptance

**Technique** : `tsc --noEmit` 0 erreur ; `next build` vert, route `/promotions` présente (SSR, pas de `dynamic`).

**Scénario manuel (compte avec crédits)** :
1. Solde positif (lien vérifié en B4, ou entrée `BONUS` ledger via seed/Prisma Studio).
2. `/promotions` → écran s'affiche, solde correct (`CreditsBadge`).
3. Sélectionner site + durée 1j → aperçu coût (ex. 10 ◇ pour N3×1j).
4. « Lancer la promotion » → success + refresh.
5. DB : `SELECT * FROM promotion ORDER BY "createdAt" DESC LIMIT 1` → `status='ACTIVE'`, `expiresAt ≈ now+1j`.
6. Ledger : `SELECT * FROM credit_ledger_entry WHERE reason='PROMOTION_SPEND' ORDER BY "createdAt" DESC LIMIT 1` → `amount=-cost`, `promotionId` non-null.
7. Hub `/` → `CreditsBadge` décrémenté.
8. Matching : déclencher depuis `/donner` ou `/capturer` → `findPartners` tourne avec le nouveau ORDER BY → le site promu remonte en premier.

**Scénario solde insuffisant** : compte à 0 ◇ → bouton `disabled` + message ; forcer l'action (cURL/DevTools) → `{ ok: false, error: "Solde insuffisant…" }`.

---

## 7. Pièges à respecter

- Colonnes camelCase quotées en SQL brut : `"siteId"`, `"userId"`, `"expiresAt"`, `"targetLevel"`, `"targetElement"`.
- `lib/promotions/read.ts`/`write.ts` tirent Prisma → jamais importés depuis un Client Component (props sérialisées via Loader).
- Prisma 7, client dans `lib/generated/prisma` (pas `@prisma/client`). `type { Prisma }` depuis `@/lib/generated/prisma/client` si besoin.
- `lib/promotions/policy.ts` **isomorphe** (zéro import) → utilisable côté client pour l'aperçu coût.
- Relation `Promotion → Site` non déclarée → pas de `promotion.site` ; résolution domains par requête séparée.
- Double-check solde dans `$transaction` (SUM via `tx.creditLedgerEntry.aggregate`) contre la race double-clic — pattern `lib/links/verify.ts:139`.

---

## 8. Out of scope (ne pas implémenter)

- **Pénalité AS sur solde négatif** (P4) — Q-P3-2 : le solde négatif n'arrive pas en P3 (lancement bloqué). Hook `// TODO(P4)` dans `write.ts`/`balance.ts`.
- **Cron d'expiration** (P4) — `UPDATE promotion SET status='EXPIRED' WHERE expiresAt<now() AND status='ACTIVE'`. Hook `// TODO(P4)` dans `read.ts`.
- **Calibrage des chiffres de coût** (P2, data-gated) — constantes = défauts raisonnables.
- **GEO / mention sans lien** — hors P3.
- **Annulation/remboursement** (`PROMOTION_REFUND` existe en enum mais logique non implémentée en P3). Seul le lancement est dans le scope.
- **`targetThematique` dans le filtre matching** — stocké, filtrage différé P4.

---

## 9. Fichiers

**Créer** : `lib/promotions/{types,policy,policy.test,transitions,transitions.test,read,write}.ts` ; `app/(app)/promotions/{page.tsx,PromotionLaunchLoader.tsx,PromotionLaunchClient.tsx,promotion-actions.ts}`.

**Modifier** : `lib/matching/match.ts` (requête `$queryRaw` + `CandidateRow`) ; `app/components/hub/HubDashboard.tsx` (CTA contextuel).

**Référence (lecture seule)** : `lib/credits/balance.ts` (`getCreditBalance`) ; `lib/links/write.ts` (transaction+double-check) ; `lib/links/anchor-policy.ts` (module pur) ; `app/components/hub/primitives.tsx` (`CreditsBadge`…) ; `prisma/schema.prisma` l.631–657 (`Promotion`).
