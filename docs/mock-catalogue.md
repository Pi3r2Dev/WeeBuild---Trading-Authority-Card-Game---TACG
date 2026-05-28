# Catalogue mock — sites « Pokémon »

> **Statut** : décidé pour le POC front (2026-05-28). Source code : [lib/data/mock-catalog.ts](../lib/data/mock-catalog.ts).

## Objectif

Alimenter le site en phase démo avec des cartes **reconnaissables** (sites FR connus) tout en transmettant le ton TCG : chaque domaine affiché est un **jeu de mots** façon nom de créature, pas le vrai hostname.

Le champ `summary` commence par `Inspi. {site réel}` pour garder le lien conceptuel sans prétendre à un partenariat.

## Matrice 4 × 4

| Niveau | Santé / cuisine | Tech | Finance | Média |
|--------|-----------------|------|---------|-------|
| **N1** Game Boy | Marmitont (Marmiton) | Korbenito (Korben) | MoneyVoxygen (MoneyVox) | Vingt-Minuton (20 Minutes) |
| **N2** SNES | Cuisine-AZarb (Cuisine AZ) | Numeramon (Numerama) | Boursaurama (Boursorama) | Citron-Pressé (Presse-citron) |
| **N3** PS2 | Doctissimogo (Doctissimo) | Journa-Geekachu (Journal du Geek) | Echozoum (Les Échos) | Limonade (Le Monde) |
| **N4** Holo | Passport-Santeon (Passeport Santé) | StackOverflou (Stack Overflow) | Forbeshadow (Forbes) | Wikimons (Wikipédia) |

## Main joueur démo (Alex M.)

| Domaine parodique | Niveau | Thème |
|-------------------|--------|-------|
| crockorico.fr | N1 | Cuisine perso |
| stackoweb.fr | N2 | Blog dev / SEO |
| boursicofeu.fr | N1 | Finance débutant |

## Consommation

| Export | Fichier | Usage |
|--------|---------|--------|
| `buildDemoCards()` | [fixtures.ts](../lib/data/fixtures.ts) | `/cards`, `/rnd`, château |
| `buildNavDeck()` | idem | Carte écosystème, seed Prisma |
| `buildMySites()` | idem | Main hub / capturer démo |

Tests : `lib/data/mock-catalog.test.ts` (matrice complète, stats par niveau).

## Évolution

Quand la capture Firecrawl + AS remplacent les mocks, ce catalogue reste utile comme **jeu de référence** pour tests E2E et démos hors-ligne ; ne pas confondre avec des domaines réels indexables.
