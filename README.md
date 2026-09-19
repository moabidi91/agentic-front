# Front (exploitation) — dossier

Dossier dédié à la partie front "exploitation" d'`agentic-local-app` : une console locale pour discuter avec le modèle et superviser en temps réel ce que fait le backend. Développée à part, sans toucher au code backend (dépôt et ADR pilotés par les autres agents dans `agentic-local-app/`).

> Anciennement nommé `hexarq-hive/` — renommé car le nom et l'icône affichés par l'application ne sont plus figés (voir plus bas). Le contenu technique n'a pas changé de nature, seulement la référence à une identité fixe qui a été retirée.

Dépôt git dédié (public) : https://github.com/moabidi91/agentic-front

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

### Prérequis

- **Node.js** (18 ou plus récent recommandé — testé avec la v22). https://nodejs.org/
- Pour la **vraie application desktop** (fenêtre native via Tauri), en plus de Node.js :
  - **Rust + Cargo** — https://rustup.rs/
  - **Visual Studio Build Tools**, charge de travail *« Développement Desktop en C++ »* (nécessaire pour compiler la partie Rust sur Windows)
  - **WebView2 Runtime** — déjà présent sur la plupart des Windows 10/11 à jour ; sinon : https://developer.microsoft.com/microsoft-edge/webview2/

Sans Rust/Cargo, l'application fonctionne quand même, mais uniquement en **mode navigateur** (le site s'ouvre dans le navigateur par défaut, pas de fenêtre desktop).

### Lancer en local (Windows)

Double-clic sur **`start-local.bat`** à la racine du dépôt. Le script :
1. vérifie que Node.js est installé (sinon : message d'erreur + lien vers nodejs.org) ;
2. installe les dépendances (`npm install`) au premier lancement seulement ;
3. vérifie que Rust/Cargo est disponible :
   - **si oui** → lance directement `npm run tauri dev` : une vraie fenêtre desktop s'ouvre automatiquement une fois prête (à la toute première exécution, la compilation Rust peut prendre plusieurs minutes) ;
   - **si non** → explique quoi installer (voir Prérequis) et propose un choix : continuer en mode navigateur (`O`) ou quitter pour installer Rust d'abord (`N`).
4. en mode navigateur : démarre le serveur de dev dans sa propre fenêtre et ouvre `http://localhost:5183/` une fois prêt.

Pour arrêter : fermer la fenêtre de l'application (ou du serveur dev), ou Ctrl+C dedans.

### Autres OS (macOS / Linux)

`start-local.bat` est spécifique à Windows. Sur macOS/Linux, à la racine du dépôt : `npm install` puis `npm run tauri dev` (nécessite Rust/Cargo, voir Prérequis) — ou `npm run dev` pour le mode navigateur seul.

Packaging en exécutable installable (`tauri build`, un vrai `.exe`/`.msi` à distribuer) : pas encore fait — pour l'instant seul le mode développement (`tauri dev`) est câblé, à voir une fois le front validé.
