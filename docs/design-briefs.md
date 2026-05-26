# Briefs de design — à passer à « Claude design »

> Prompts prêts à l'emploi pour la production du design. Issus de la session 2026-05-26.
> Voir aussi : [draft-charte-graphique.md](draft-charte-graphique.md) (charte détaillée) · [faq.md](faq.md) (doctrine).

---

## A. Brief FONCTIONNEL (mécanique / flux)

> À utiliser pour concevoir les écrans/flux. Reflète les derniers arbitrages produit.

```
Brief FONCTIONNEL pour le design de « WeBuild — Trading Authority Game ».
Ne traite pas l'esthétique ici : conçois les écrans/flux qui reflètent ces
derniers arbitrages de mécanique.

PRODUIT : web app qui transforme le link-building SEO en jeu de cartes. Le
membre se connecte avec Google, déclare ses sites ; chaque site = une carte
dont la rareté = son autorité.

MÉCANIQUE = DONATEUR / CRÉDITS  (on a ÉCARTÉ le 1:1 réciproque ET la chaîne orchestrée)
  - Donner un lien éditorial pertinent → gagner des CRÉDITS (la monnaie = l'accent néon).
  - Dépenser des crédits → être mis en avant par l'IA auprès d'éditeurs susceptibles de te citer.
  - Flux NON réciproque : donneur ≠ receveur direct, jamais de boucle courte.
  - => PAS d'écran « sceller un échange » ni « sceller une chaîne ». Le don est unilatéral.

COUCHE IA (le cœur) : à partir du résumé du site, l'IA propose
  (1) quels partenaires cibler, (2) des sujets d'articles à produire,
  (3) des textes/ancres contextualisés.
  Toute suggestion passe par une VALIDATION / ÉDITION HUMAINE avant publication.

CONTRAT MORAL : la preuve qu'un lien existe = CAPTURE de la page publiée
  (screenshot + détection du lien OU de la mention de marque — pivot GEO).
  Prévoir l'écran « preuve / vérification ».

LIGNE ROUGE (ton produit, ne jamais promettre) : pas de « dofollow garanti »,
  pas de « DA boosté ». On vend de la DÉCOUVERTE éditoriale + de l'aide à
  produire du contenu, pas du jus de lien.

ÉCRANS À COUVRIR (priorité) :
  1. Hub / dashboard : mes sites (mes cartes), mon solde de crédits, suggestions IA reçues.
  2. Donner un lien : partenaire suggéré → l'IA propose sujet + texte → j'édite → je publie → je gagne des crédits.
  3. Être découvert : dépenser des crédits pour être mis en avant.
  4. Preuve / contrat moral : statut de vérification d'un lien donné.

À NE PAS DESSINER (modèles abandonnés) : marketplace d'achat de liens,
  échange réciproque face-à-face, chaîne A→B→C scellée.
```

---

## B. Brief VISUEL (charte graphique)

> À utiliser pour la charte/identité visuelle et le gabarit de carte.

```
Tu es designer pour « WeBuild — Trading Authority Game », une web app qui
transforme le SEO (échange de backlinks) en jeu de cartes à collectionner.
Crée la charte graphique.

CONCEPT CENTRAL : la rareté visuelle d'une carte encode la valeur SEO d'un
site, à travers l'histoire du jeu vidéo. Plus le site fait autorité, plus la
carte « remonte le temps techno ».

4 NIVEAUX DE CARTE :
  1. Game Boy   — pixel mono vert olive (#0f380f→#9bbc0f), scanlines LCD
  2. Super NES  — pixel 16-bit vibrant (cobalt/rouge/jaune), Mode 7
  3. PlayStation 2 — 3D low-poly, couleurs délavées + bloom bleuté, objet 3D central
  4. Rare/Holo  — foil holographique (gradient #ff007f→#7f00ff→#00ffff), glitch, particules

HUB (interface globale) : dark mode gaming sobre — fond #0B0C10, texte gris
#808A9A + blanc, accent néon (violet #8A2BE2 OU vert cyber #39FF14). Les cartes
sont les SEULES vraies touches de couleur ; le hub reste un écrin neutre.

TYPO : Inter / Space Grotesk (hub) · Press Start 2P / VT323 (cartes N1-2) ·
Orbitron (cartes N3-4).

CONTRAINTE N°1 — GABARIT UNIQUE : quel que soit le niveau (1→4), les infos sont
TOUJOURS au même endroit, pour que l'utilisateur se repère instantanément. Seul
l'habillage change, jamais la position des données. Zones à placer :
  - nom du site
  - score d'autorité (affiché en HP / ATK, pas un chiffre brut)
  - image centrale
  - ancre du lien
  - gemme « type de lien » en haut (rubis = DoFollow / saphir = NoFollow)
  - picto « élément/niche » (⚡ Tech · 💎 Finance · 🌱 Santé)

LIVRABLE, dans cet ordre :
  1. Le gabarit unique de carte (LE plus important) — annoté, zones d'info.
  2. Les 4 skins de niveau appliqués sur ce même gabarit.
  3. La coquille du hub (dark) qui met les cartes en valeur.

À ÉVITER : l'esthétique IA générique. Vise du rétro-gaming authentique et
premium, avec une vraie cohérence de marque malgré les 4 époques.
```
