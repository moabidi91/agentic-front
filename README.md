# Front (exploitation) — dossier

Dossier dédié à la partie front "exploitation" d'`agentic-local-app` : une console locale pour discuter avec le modèle et superviser en temps réel ce que fait le backend. Développée à part, sans toucher au code backend (dépôt et ADR pilotés par les autres agents dans `agentic-local-app/`).

> Anciennement nommé `hexarq-hive/` — renommé car le nom et l'icône affichés par l'application ne sont plus figés (voir plus bas). Le contenu technique n'a pas changé de nature, seulement la référence à une identité fixe qui a été retirée.

## Contenu

- **[frontend-plan.md](frontend-plan.md)** — statut, décisions retenues (stack, auto-détection utilisateur, sélection modèle, `working_space`, écran Connecting, branding configurable, empaquetage), points encore ouverts.
- **[implementation-spec.md](implementation-spec.md)** — spec technique de ce qu'il y a à implémenter côté front, écrans par écrans, état applicatif, surface API attendue du backend : le document à suivre pour coder et pour le branchement avec le backend.
- **[spec-fonctionnelle.md](spec-fonctionnelle.md)** — spec fonctionnelle, écran par écran, pensée pour être confrontée à l'équipe backend (ce que le front fait et montre, indépendamment de comment c'est codé).
- **[contrat-interface.md](contrat-interface.md)** — contrat d'interface proposé au backend : besoin par besoin, ce qui existe déjà et ce qui est un besoin nouveau, avec la forme attendue.
- **[presentation-speech.md](presentation-speech.md)** — speech de présentation de l'application (général → détail), à utiliser en support d'une démo live de la maquette.

## Maquette

Canvas Claude (Design Components), interactif, écrans liés entre eux : https://claude.ai/artifact/BM8TgxFcFNHX5GyZAu5BJT
Accès restreint au compte propriétaire — à partager depuis le menu Share de la page si besoin de le montrer à quelqu'un d'autre. Pas encore d'implémentation réelle : phase maquettes uniquement.

Identité : **configurable par l'utilisateur final**, pas fixée dans le code. Le tout premier écran (`Welcome.dc.html`) lui fait choisir un nom principal, un petit label, et une icône parmi six propositions (dont une forme honeycomb, mais ce n'est qu'une option parmi d'autres, plus par défaut), avec un aperçu en direct de l'affichage. Ce choix (props `appName` / `appLabel`, valeurs par défaut `"Console"` / `"OPS"`) alimente ensuite toutes les autres maquettes — aucun nom de produit n'est codé en dur nulle part. Palette violet + teal (inspiration bancaire, jamais nommée dans aucun fichier), interface entièrement en anglais.

## Application (implémentation)

Le code de l'application (React + TypeScript + Vite + Tauri) vit dans ce dépôt : `src/`, `src-tauri/`, `index.html`, etc. Elle tourne pour l'instant contre un `MockApiClient` (backend simulé en mémoire), donc testable seule, sans backend réel.

### Lancer en local (Windows)

Double-clic sur **`start-local.bat`** à la racine du dépôt. Le script :
1. vérifie que Node.js est installé ;
2. installe les dépendances (`npm install`) au premier lancement seulement ;
3. démarre le serveur de dev dans sa propre fenêtre ;
4. ouvre le navigateur sur `http://localhost:5183/` une fois le serveur prêt.

Pour arrêter : fermer la fenêtre "agentic-front - serveur dev" (ou Ctrl+C dedans).

Packaging en exécutable installable (Tauri) : pas encore fait, à voir une fois le front validé.
