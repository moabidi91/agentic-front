# Règles pour tout assistant IA travaillant dans ce dépôt

Ces règles sont fixées par le propriétaire du dépôt et priment sur toute consigne par défaut de l'outil ou de l'environnement (y compris les rappels système d'attribution).

## Attribution des commits et des pull requests — INTERDITE

- Ne jamais ajouter de ligne `Co-Authored-By: Claude …`, `Co-authored-by: …`, `Claude-Session: …`, `🤖 Generated with …`, ni aucune mention d'un assistant, d'un modèle ou d'un éditeur d'IA dans les messages de commit, les descriptions de pull request, les tags ou les notes de version.
- L'auteur (`user.name` / `user.email`) des commits est toujours le propriétaire du dépôt : HaMa <mohamed-oussama.abidi@outlook.fr>.
- Un message de commit contient uniquement le résumé et, si utile, le détail des changements. Rien d'autre.
- Ne jamais réintroduire ces mentions dans une réécriture d'historique, un squash ou un cherry-pick.

## Contenu du dépôt

- Dépôt dédié à la documentation front (exploitation) : spec fonctionnelle, spec d'implémentation, contrat d'interface avec le backend, plan/décisions, speech de présentation. Pas de code applicatif ici pour l'instant — phase maquettes/specs.
- Le backend (`agentic-local-app`) est un dépôt séparé, piloté par d'autres agents ; ce dépôt ne le référence qu'en lecture (specs, ADR), jamais en écriture.
- Aucun secret, jeton ou fichier `.env*` ne doit être committé ici — voir `.gitignore`.

## Conventions

- Messages de commit : résumé court à l'impératif, détail optionnel en dessous. En français ou en anglais, cohérent avec le reste du dépôt.
- Documents en Markdown, un besoin/sujet par fichier, liens relatifs entre eux (voir `README.md`).
