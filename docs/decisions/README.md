# Architectural Decision Records (ADR)

Décisions d'architecture du projet *WeBuild — Trading Authority Game*, formalisées via `/adr`.

## Quand créer un ADR
Une décision qui affecte ≥ 2 modules/composants, coûteuse à revenir, ou dont le « pourquoi » risque d'être perdu. Sinon : commit message + commentaire dans le code suffit.

## Statuts
`Proposée` → `Acceptée` → (`Dépréciée` | `Remplacée par ADR-NNN`).

## Workflow
1. Copier [template.md](template.md) en `NNN-slug.md` (NNN = numéro incrémental).
2. Remplir contexte / options / décision / conséquences.
3. Ajouter une ligne à [INDEX.md](INDEX.md).
4. Quand une décision en remplace une autre, marquer `superseded_by` / `supersedes` des deux côtés.

Les ADR ne doivent jamais contredire les drafts (`docs/`) ni `CLAUDE.md` : quand une décision est actée, mettre à jour la source concernée.
