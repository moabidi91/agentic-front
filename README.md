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

Le code de l'application (React + TypeScript + Vite + Tauri) vit dans ce dépôt : `src/`, `src-tauri/`, `index.html`, etc. Elle tourne par défaut contre un `MockApiClient` (backend simulé en mémoire), donc testable seule, sans backend réel — et contre le vrai backend dès que `VITE_API_BASE_URL` est renseignée (voir [Brancher le front sur le vrai backend](#brancher-le-front-sur-le-vrai-backend)). Aucun écran ne change entre les deux : ils ne parlent qu'à l'interface `ApiClient`.

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

### Brancher le front sur le vrai backend

Une seule variable décide de l'implémentation d'`ApiClient` que l'application utilise (`src/api/context.tsx`) :

| `VITE_API_BASE_URL` | Client utilisé |
|---|---|
| absente ou vide | `MockApiClient` — maquette en mémoire, aucun serveur nécessaire |
| une URL | `HttpApiClient` (`src/api/http.ts`) — l'API locale d'`agentic-local-app` à cette adresse |

Vite ne lit que les variables préfixées `VITE_`. Elle peut être passée sur la ligne de commande, ou écrite dans un fichier `.env.local` à la racine — **jamais committé**, `.gitignore` couvre déjà `.env*`.

**La maquette en mémoire imite deux règles du vrai backend**, pour que les écrans restent démontrables sans serveur :

| Règle | Comment la déclencher dans la maquette |
|---|---|
| un modèle par processus (les autres cartes sont désactivées) | `?model=<id>` sur l'URL de chargement choisit le profil servi (`local-fake` par défaut, puis `generic-http`, `templated-acme`) ; en changer demande de recharger la page, comme un redémarrage demanderait de relancer l'application |
| un 401 met la session en pause | se connecter avec `expired` comme jeton d'accès : le premier message met la session en pause, le bandeau et la pop-in s'affichent, et n'importe quelle autre valeur la fait repartir |

**Terminal 1 — le modèle** (le transport livré pointe sur `127.0.0.1:9000`) :

```bash
uv run agentic-app mock-server --host 127.0.0.1 --port 9000
```

**Terminal 2 — l'API locale**, depuis le dépôt `agentic-local-app` :

```bash
uv run agentic-app serve            # http://127.0.0.1:8765/api/v1 par défaut
```

**Terminal 3 — le front**, depuis ce dépôt :

```bash
VITE_API_BASE_URL=http://127.0.0.1:8765/api/v1 npm run dev
```

Sous Windows (PowerShell) : `$env:VITE_API_BASE_URL="http://127.0.0.1:8765/api/v1"; npm run dev`.

**Rien à régler côté backend pour l'origine** — le serveur de développement Vite est épinglé sur le port de `vite.config.ts` (1420 aujourd'hui, `strictPort`), et `http://localhost:1420` **comme** `http://127.0.0.1:1420` sont désormais dans les `cors_origins` livrés par défaut (les deux orthographes de la boucle locale ne sont pas la même origine pour un navigateur). La fenêtre Tauri (`tauri://localhost`) est autorisée elle aussi. Un `config.toml` plus ancien, ou un port changé, redemande évidemment d'ajouter l'origine à la main.

Ce que le client fait au moment de la connexion, dans cet ordre : `GET /models` (refus immédiat si le modèle choisi n'est pas le profil actif — un modèle par processus ; le sélecteur affiche d'ailleurs les autres profils désactivés), `POST /credentials` avec la carte `credentials` du formulaire (appel **sauté** si elle est vide), puis `POST /sessions` avec `user_id`, `working_space`, `skills` et `effort`, et enfin `GET /sessions/{id}/snapshot`. Aucune valeur d'identifiant n'est journalisée, conservée sur le client, ni reprise dans un message d'erreur.

**Aucun message d'ouverture n'est fabriqué.** `POST /sessions` ne porte ni `goal` ni `user_message` : la session naît `READY`, rien n'est posté au modèle, aucun cycle ni plan du budget n'est consommé, et la trace d'audit ne contient pas de tour utilisateur inventé. C'est le premier message réellement tapé dans Chat qui ouvre le premier cycle et devient le `goal` de la session.

**Si le modèle répond 401**, le backend met la session en pause au lieu de la faire échouer : Chat affiche un bandeau qui dit quelle opération a été refusée, avec quel code et depuis quand, et la pop-in d'identifiants s'ouvre avec les champs que le modèle déclare. Le bouton d'envoi devient le geste de reprise — il poste `POST /credentials` puis `POST /sessions/{id}/resume`, et la conversation repart où elle s'était arrêtée. Le bouton Stop reste disponible. Un jeton encore invalide remet simplement en pause.

### Scripts de vérification (`smoke*.mjs`)

Des scripts Node autonomes, un par sujet, une ligne par vérification, code de sortie non nul dès qu'une tombe.

| Script | Ce qu'il vérifie | Ce dont il a besoin |
|---|---|---|
| `smoke.mjs`, `smoke-guide.mjs`, `smoke-prompts.mjs`, `smoke-persist*.mjs` | les écrans, pilotés dans un vrai navigateur (Playwright) | `npm run dev` en marche |
| `smoke-http.mjs` | le client HTTP réel (`src/api/http.ts`) contre un backend qui tourne | l'API locale d'`agentic-local-app` en marche |

```bash
node smoke-http.mjs                                   # http://127.0.0.1:8765/api/v1
node smoke-http.mjs http://127.0.0.1:9100/api/v1      # si l'API écoute ailleurs
```

Il ne démarre rien et n'ouvre aucun navigateur : il importe `src/api/http.ts` directement (Node ≥ 22.18 retire les types tout seul) et appelle le client comme le feraient les écrans. Ce qu'il parcourt : identité, catalogue de modèles (dont le drapeau `active`) et absence de secret dans sa charge, les deux refus de `POST /credentials`, le refus d'un modèle non actif, la connexion avec et sans identifiants (dont l'ordre réel des appels), **une session ouverte sans message d'ouverture** (aucun `user_request`, aucun cycle consommé, timeline réduite à `session.created`), **l'accord de `user_id`** entre `GET /whoami`, le corps de `POST /sessions` et la ligne d'historique, le premier message qui ouvre le premier cycle, les états de session rendus par l'historique, `409 SESSION_BUSY`, le flux SSE et le désabonnement, l'interruption, la conversation, les trois vues d'administration, le garde-fou du vidage de base, **le parcours complet pause → identifiants → reprise** et l'annulation par `AbortSignal`.

Le parcours de pause a besoin d'un modèle qui réponde vraiment 401. Démarrer le modèle simulé avec un scénario portant `"token": "smoke-http-sentinel-value-do-not-print"` (la sentinelle que le script poste) et laisser la variable de jeton du serveur vide : le script provoque alors un vrai `RUNNING → PAUSED`, lit `GET /sessions/{id}/pause`, vérifie qu'une reprise avec un jeton toujours mauvais remet en pause, puis reprend pour de bon. Sans un tel modèle, ces vérifications sont **sautées** et le disent.

**Il n'affiche jamais de valeur d'identifiant** : la seule qu'il envoie est une sentinelle locale, et sa dernière vérification relit toute sa propre sortie pour confirmer qu'elle n'y apparaît pas. Il n'appelle `POST /admin/reset-database` que pour vérifier que le garde-fou refuse (`api.allow_destructive_admin = false`) ; si le réglage est ouvert, la vérification est sautée et le dit, sans rien effacer.
