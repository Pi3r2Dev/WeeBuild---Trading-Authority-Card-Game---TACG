/**
 * Seed P1 — peuple Postgres à partir des fixtures (lib/data/fixtures.ts) pour
 * que la sous-tâche 4b (couche données → DB) soit testable SANS l'auth (4a).
 *
 * Stratégie :
 *   - 1 utilisateur de démo (DEMO_USER_ID, id stable) qui possède sa « main »
 *     (les MY_SITES des fixtures) → `getMyDeck(DEMO_USER_ID)` les retournera.
 *   - les sites alliés (NAV_DECK) sont rattachés à des utilisateurs « owner »
 *     synthétiques (un par propriétaire distinct) → un `getNavDeck()` global
 *     (prisma.card.findMany()) les renvoie, et la main du démo reste propre.
 *
 * Chaque carte fixture → Site + Card (1-1) + un AuthoritySnapshot initial.
 * Idempotent : tout passe par des `upsert` sur des clés stables.
 *
 * ⚠ Prisma 7 : on importe le client généré via lib/db.ts (singleton + adapter
 * pg), JAMAIS `@prisma/client`. La connexion vit dans DATABASE_URL (.env.local,
 * chargé par tsx via --env-file OU déjà présent ; cf. prisma.config.ts pour
 * Migrate). On charge .env.local explicitement ici pour `tsx prisma/seed.ts`.
 */

import { config as loadEnv } from "dotenv";
// ⚠ ESM hoiste les `import` statiques AVANT tout code → on charge l'env, puis on
// importe `lib/db` DYNAMIQUEMENT (il instancie le client au chargement et exige
// DATABASE_URL). Les imports purs (fixtures/types) restent statiques.
loadEnv({ path: ".env.local" });
loadEnv();

import { DEMO_USER_ID, DEMO_USER_EMAIL } from "../lib/data/demo-user";
import { MY_SITES, NAV_DECK } from "../lib/data/fixtures";
import type { CardData, NavCard } from "../lib/domain";
import type { db as Db } from "../lib/db";

// Le client n'est PAS importé statiquement (il s'instancie au chargement et
// exige DATABASE_URL, déjà chargé ci-dessus). Import dynamique dans `main()`.
type Database = typeof Db;
let db: Database;

/** Slug stable d'id utilisateur à partir d'un nom de propriétaire. */
function ownerUserId(owner: string): string {
  return "seed-owner-" + owner.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Insère/maj un site + sa carte + un snapshot initial, pour un userId donné. */
async function upsertCard(userId: string, card: CardData | NavCard): Promise<void> {
  const url = card.url.startsWith("http") ? card.url : `https://${card.url}`;
  const site = await db.site.upsert({
    where: { userId_domain: { userId, domain: card.domain } },
    update: {
      url,
      status: "READY",
      title: card.domain,
      description: card.summary,
      element: card.element,
      thematique: card.thematique,
    },
    create: {
      userId,
      url,
      domain: card.domain,
      status: "READY",
      title: card.domain,
      description: card.summary,
      element: card.element,
      thematique: card.thematique,
    },
  });

  await db.card.upsert({
    where: { siteId: site.id },
    update: {
      userId,
      level: card.level,
      hp: card.hp,
      atk: card.atk,
      tf: card.tf,
      cf: card.cf,
      dr: card.dr,
      anchor: card.anchor,
      element: card.element,
      thematique: card.thematique,
      summary: card.summary,
      linkType: card.linkType,
      status: card.status,
      price: card.price,
      edition: card.edition,
      editionTotal: card.editionTotal,
    },
    create: {
      siteId: site.id,
      userId,
      level: card.level,
      hp: card.hp,
      atk: card.atk,
      tf: card.tf,
      cf: card.cf,
      dr: card.dr,
      anchor: card.anchor,
      element: card.element,
      thematique: card.thematique,
      summary: card.summary,
      linkType: card.linkType,
      status: card.status,
      price: card.price,
      edition: card.edition,
      editionTotal: card.editionTotal,
    },
  });

  // Snapshot insert-only : on n'en crée qu'un si le site n'en a pas (idempotence).
  const existing = await db.authoritySnapshot.count({ where: { siteId: site.id } });
  if (existing === 0) {
    await db.authoritySnapshot.create({
      data: {
        siteId: site.id,
        score: estimateScore(card),
        level: card.level,
        hp: card.hp,
        atk: card.atk,
        tf: card.tf,
        cf: card.cf,
        dr: card.dr,
        metricVersion: "v1-onpage",
        signalsJson: {
          seed: true,
          element: card.element,
          thematique: card.thematique,
          note: "snapshot de seed (dérivé des fixtures, pas d'une vraie capture)",
        },
      },
    });
  }
}

/** Score approximatif depuis les stats fixtures (pas de capture réelle au seed). */
function estimateScore(card: CardData): number {
  return Math.round((card.hp + card.atk + card.tf + card.cf + card.dr) / 5);
}

async function main(): Promise<void> {
  // Import dynamique APRÈS le chargement de l'env (DATABASE_URL requis par lib/db).
  db = (await import("../lib/db")).db;

  // 1) Utilisateur de démo (propriétaire de la « main »).
  await db.user.upsert({
    where: { id: DEMO_USER_ID },
    update: { email: DEMO_USER_EMAIL, name: "Alex M." },
    create: { id: DEMO_USER_ID, email: DEMO_USER_EMAIL, name: "Alex M.", emailVerified: true },
  });

  // 2) Sa main (MY_SITES).
  for (const card of MY_SITES) {
    await upsertCard(DEMO_USER_ID, card);
  }

  // 3) Sites alliés (NAV_DECK) → un utilisateur owner synthétique par propriétaire.
  const owners = new Map<string, NavCard[]>();
  for (const nav of NAV_DECK) {
    const list = owners.get(nav.owner) ?? [];
    list.push(nav);
    owners.set(nav.owner, list);
  }
  for (const [owner, cards] of owners) {
    const id = ownerUserId(owner);
    await db.user.upsert({
      where: { id },
      update: { name: owner },
      create: { id, email: `${id}@webuild.local`, name: owner, emailVerified: true },
    });
    for (const card of cards) {
      await upsertCard(id, card);
    }
  }

  const [users, sites, cards] = await Promise.all([db.user.count(), db.site.count(), db.card.count()]);
  console.log(`Seed OK — users=${users} sites=${sites} cards=${cards}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
