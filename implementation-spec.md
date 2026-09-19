# Spec d'implémentation front (v1)

Objectif : décrire précisément ce qu'il y a à coder côté front pour pouvoir, ensuite, le brancher sur le vrai backend `agentic-local-app`. Ce document décrit le *front* ; il ne modifie rien côté backend. Les points qui supposent quelque chose côté backend qui n'existe pas encore sont marqués **[besoin backend]**.

Référence visuelle : le canvas de maquettes (voir [frontend-plan.md](frontend-plan.md)). Ce document formalise en spec ce que la maquette montre.

## 1. Périmètre v1

- Une app installée localement (Tauri), qui parle à un serveur `agentic-local-app` tournant sur la même machine (`agentic-app serve`).
- Deux modes d'usage : Chat (simple) et Debug (supervision + historique), plus deux écrans de référence/admin (machine à états, base live) accessibles depuis le menu utilisateur.
- Pas de multi-poste, pas de compte distant : l'app suppose un unique utilisateur local par installation.
- Nom et icône affichés par l'app sont choisis par l'utilisateur final au premier lancement (écran Welcome), pas figés dans le code — voir §3 et §7bis.

## 2. Stack et structure

- TypeScript + React + Vite pour le code applicatif.
- Tauri pour l'empaquetage desktop (accès natif : sélecteur de dossier, nom d'utilisateur OS, process du serveur backend).
- Pas de state manager externe imposé à ce stade (le state est assez simple pour `useReducer` / contexte React) ; à revoir si la vue Debug live s'avère plus lourde que prévu.
- Un thème clair/sombre commuté globalement (déclinaisons de couleurs déjà figées dans la maquette, à porter en design tokens CSS).
- Le nom et l'icône choisis (§7bis) doivent être disponibles globalement (contexte React `BrandingProvider` ou équivalent), au même niveau que le thème — tous les écrans en dépendent pour leur barre d'en-tête.
- **Menu utilisateur** : un composant `UserMenu` partagé (avatar + dropdown), monté dans la coque commune des écrans post-connexion (Chat/Debug/History/StateMachine/LiveDatabase), avec ses liens vers Welcome (identité), Main (modèle), StateMachine, LiveDatabase, et l'action Reset configuration (avec confirmation) — un seul composant, pas une réimplémentation par écran.

## 3. Écrans → composants

| Écran maquette | Composant front | Rôle |
|---|---|---|
| `Welcome.dc.html` | `WelcomeScreen` | Choix du nom, du label et de l'icône de l'app, avec aperçu en direct — premier écran, avant toute authentification |
| `Main.dc.html` | `SignInScreen` (étape 1) | Identité, sélection modèle, credentials |
| `Setup.dc.html` | `SignInScreen` (étape 2) | Dossier de travail, skills, réglages avancés (budget, comportement, effort) |
| `Connecting.dc.html` | `ConnectingScreen` | Progression de connexion réelle ; guide première connexion (6 cartes) |
| `Chat.dc.html` | `ChatScreen` | Fil de conversation simple, sidebar sessions, contrôle de session (stop / envoi pendant traitement) |
| `Debug.dc.html` | `DebugScreen` | État live : conversation / plan (liste ou diagramme) / tâches / flux protocolaire |
| `History.dc.html` | `HistoryScreen` | Timeline lisible des événements d'une session |
| `EventDetail.dc.html` | `EventDetailDrawer` | Détail d'un événement (message in / message out) |
| `Modal401.dc.html` | `TokenExpiredModal` | Ressaisie des identifiants d'une session mise en pause sur 401, puis reprise |
| `StateMachine.dc.html` | `StateMachineScreen` | Référence des machines à états réelles (conversation/plan/tâche/fenêtre de contexte) + info de cycle et budget de session courants |
| `LiveDatabase.dc.html` | `LiveDatabaseScreen` | Inspection en lecture seule de la base locale (sessions/events/audit) + action de vidage |

`SignInScreen` couvre les deux écrans de la maquette (`Main.dc.html` puis `Setup.dc.html`) comme un flux à deux étapes d'un même composant logique (wizard interne avec son propre state, pas deux routes indépendantes) — évite de dupliquer la validation et le state partagé (modèle choisi, credentials) entre les deux pas.

`ChatScreen` et `DebugScreen` partagent la même session active et le même layout de coque (barre du haut, sidebar sessions) ; seul le panneau central change — implémenter comme deux vues d'une même route plutôt que deux pages indépendantes, pour que le switch Chat/Debug soit instantané (pas de rechargement). `StateMachineScreen` et `LiveDatabaseScreen` partagent la même coque de tête (barre + `UserMenu`) mais ne font pas partie de cette route active — ce sont des pages autonomes atteintes depuis le menu utilisateur, pas depuis la sidebar de sessions.

Dans `DebugScreen`, le panneau plan a deux présentations d'un même état (liste / diagramme, toggle en haut du panneau) — un seul composant `PlanView` avec un sous-composant `PlanTaskList` ou `PlanTaskGraph` selon le mode, pas deux vues indépendantes qui re-fetchent chacune leurs données.

`WelcomeScreen` ne s'affiche qu'une fois (première exécution de l'app sur le poste, ou tant qu'aucun nom/icône n'a été choisi) — voir §7bis pour la persistance.

## 4. État applicatif (vue d'ensemble)

- **Branding** : nom principal choisi (`appName`, défaut `"Console"`), petit label (`appLabel`, défaut `"OPS"`), icône choisie (`iconId`, une valeur parmi celles listées en §7bis, défaut `"pulse"`). Global à toute l'app, lu par la barre d'en-tête et le panneau de connexion.
- **Session courante** : `conversation_id`, état (NEW/ACTIVE/WAITING_MODEL_RESPONSE/RUNNING_PLAN/ROTATING/WAITING_USER/INTERRUPTED/READY/COMPLETED/FAILED/CLOSED — les 11 états réels, voir §7ter), `cycle_id`, `cycle_type` (discovery/execution/clarification/resume), `plan_id` courant, budget (`max_cycles`, `max_plans`, `max_total_duration_ms`) et consommation actuelle.
- **Contrôle de session pendant le traitement (nouveau)** : sur `ChatScreen`, un état dérivé (`isProcessing` / `isCompleted` / `isInterrupted`) piloté par l'état réel de la conversation — pas un état front inventé en parallèle. Un message tapé pendant `isProcessing` est accepté par l'UI et placé dans une file locale en attendant confirmation du backend qu'il est pris en compte (voir §5, **[besoin backend]** sur la sémantique exacte).
- **Menu utilisateur (nouveau)** : `userMenuOpen` (bool, local à la coque commune) et `resetConfirmOpen` (bool, local à la même coque) — état d'UI pur, pas de lien avec le backend au-delà de l'action Reset elle-même (qui interrompt la session en cours puis efface la config locale).
- **Connexion** : identité (`user_id`), modèle sélectionné (id + `requires_credentials`), jeton (en mémoire uniquement, jamais persisté en clair sur disque), dossier de travail (`working_space`), skills sélectionnées (liste de références), niveau d'effort (`low` / `medium` / `high`).
- **Flux live** (vue Debug) : dernier snapshot `ExecutionTracker` + flux d'événements incrémental (voir §5). Pour la vue diagramme, le plan courant (liste de tâches avec `task_id`, résumé, statut, `depends_on`) suffit — pas de données supplémentaires par rapport à la vue liste, juste une autre disposition.
- **Historique** : liste des sessions connues localement (pour la sidebar et le sélecteur "Other sessions"), chacune avec son statut final et sa date.
- **Base live (nouveau)** : table sélectionnée (`sessions` / `events` / `audit`), état `cleared` (bool, reflète si la base vient d'être vidée) — alimenté par les endpoints de lecture du §5, pas de state dupliqué côté front au-delà du cache habituel de la requête en cours.
- **UI** : thème (clair/sombre), état "first run" (guide déjà vu ou non / Welcome déjà passé ou non), panneau Advanced settings ouvert/fermé, mode du panneau plan (liste / diagramme).

## 5. Surface API attendue du backend

Le backend expose déjà une API REST/SSE (phase 10, livrée) ainsi que des routes liées à `user_response` (`GET /sessions/{sid}/responses`, `/reply` — ADR-022). Le détail exact des routes n'a pas été revérifié route par route pour cette spec : **avant de coder l'intégration, comparer cette liste à la liste réelle des routes du serveur** (probablement listable via le serveur lui-même ou sa documentation OpenAPI si elle existe).

Ce dont le front a besoin, fonctionnellement — voir [contrat-interface.md](contrat-interface.md) pour la forme précise de chaque besoin (requête/réponse) :

- **Identité** : un endpoint qui renvoie l'utilisateur du système hôte (pour pré-remplir "User ID") — **[besoin backend]** pas encore livré, proposition `GET /whoami`.
- **Modèles disponibles** : un endpoint qui liste les transports/modèles configurés (id, nom, provider, codec) — pour alimenter le sélecteur de modèle. Le registre existe côté backend (ADR-020 `transport list`, en CLI) ; il faut l'équivalent exposé en HTTP pour le front. **[besoin backend]**
- **Flag credentials par modèle** : sur cette même réponse, un booléen (proposition `requires_credentials`) par modèle — pour savoir si le front doit afficher le champ Access token. **[besoin backend]**, voir [frontend-plan.md](frontend-plan.md) pour le détail de la demande.
- **Skills disponibles et sélection** : le front doit pouvoir (a) éventuellement lister des skills connues du poste ou du backend pour proposer un "Add skill" guidé plutôt qu'une saisie libre, et (b) transmettre la sélection au backend au moment de la création de session, pour que le modèle en ait connaissance. **[besoin backend]** — aucun contrat n'existe aujourd'hui pour référencer des fichiers de skills dans le protocole. Proposition à discuter : un champ `skills: [{name, path}]` sur la création de session, que le backend rend disponible au modèle (référence de fichier accessible depuis `working_space`, ou contenu injecté en contexte — à trancher côté backend selon la taille attendue des fichiers).
- **Niveau d'effort** : le front doit transmettre un niveau (`low` / `medium` / `high`) qui se traduit, côté backend, en une consigne textuelle insérée dans le message envoyé au modèle (ex. "Important information regarding this request: parallelize as much as reasonably possible within system limits"). **[besoin backend]** — proposition : un champ optionnel `effort` sur le `user_request` (ou sur la création de session, s'il doit s'appliquer à toute la conversation), que le `ProtocolAdapter` traduit en note ajoutée au payload. Implique aussi de calculer une borne réelle ("system limits") côté backend — probablement liée à `max_parallel_workers`, pas encore relié à une détection de ressources machine à ce jour.
- **Session** : créer/reprendre une conversation, envoyer un `user_request`, lire l'état courant — couvert par l'API existante (à vérifier route par route).
- **Interruption** : le mécanisme lui-même (`user_interrupt`, ANY_ACTIVE_STATE → INTERRUPTED → READY, drain des tâches en cours avec SIGTERM + `interrupt_drain_timeout_ms`, tâches en attente marquées SKIPPED, tout audité) est déjà spécifié côté backend (spec v1.1 §2.9) — le bouton Stop de `ChatScreen` n'a donc **pas** de besoin backend nouveau, juste à appeler l'endpoint d'interruption existant (à vérifier route par route, cf. remarque en tête de section).
- **Message envoyé pendant un traitement en cours (nouveau)** : en revanche, accepter un nouveau `user_request` **pendant** que la conversation est dans un état actif (`WAITING_MODEL_RESPONSE` / `RUNNING_PLAN` / `ROTATING`) et le mettre en file pour application à la fin du cycle courant n'a pas de contrat connu aujourd'hui — la machine à états (§7ter) ne prévoit pas d'état "message en attente d'application". **[besoin backend]** — deux options à trancher avec l'équipe backend : (a) une file d'attente légère côté backend qui applique le message dès que la conversation repasse par `WAITING_USER`/`READY` ; (b) le front interrompt lui-même la session automatiquement (`user_interrupt`) puis envoie le nouveau message une fois `READY` atteint, ce qui reste dans le contrat déjà spécifié mais perd le travail en cours au lieu de le laisser terminer. La maquette (`Chat.dc.html`) montre l'intention côté UI (indice "queued — applied once the current cycle finishes, unless you interrupt") sans présumer laquelle des deux sera retenue.
- **Flux live** : un flux SSE pour l'onglet Debug, déjà prévu par ADR-018 ("flux live SSE, lecture rapide de l'état"). Le front s'y abonne pour la vue Debug ; à défaut de SSE disponible tout de suite, un polling court (ex. 1s) sur un endpoint de snapshot (`ExecutionTracker`) est un repli acceptable pour un premier brancher.
- **Plan (pour la vue diagramme comme pour la liste)** : chaque tâche d'un `execution_plan`/`discovery_plan` inclut déjà `depends_on` (spec §12.2) — pas de besoin backend supplémentaire ici, le front construit le graphe à partir de ces données existantes plus le statut courant de chaque tâche (`ExecutionTracker`).
- **Historique / audit** : lecture des événements d'une session passée, pour `HistoryScreen` et `EventDetailDrawer` — un événement doit inclure au minimum : type, horodatage, message in (s'il y en a un), message out (s'il y en a un), et le lien vers l'entrée d'audit correspondante (hash-chaînée).
- **Inspection live de la base (nouveau)** : `LiveDatabaseScreen` a besoin de trois lectures — liste des sessions (id, état, dates, `user_id`), liste des events (id, session_id, type, horodatage, payload), et le journal d'audit (id, event_type, `prev_hash`, `hash`, horodatage) avec de quoi vérifier la chaîne. **[besoin backend]** — soit des endpoints de lecture dédiés (`GET /admin/sessions`, `/admin/events`, `/admin/audit`), soit un accès direct au fichier sqlite documenté (chemin, schéma) si le front peut se permettre une lecture directe en local (à trancher selon si l'app doit rester utilisable même serveur backend éteint).
- **Vidage de la base (nouveau)** : action destructive demandée en maquette (`Clear database`, avec confirmation qui prévient explicitement que ça inclut les sessions en cours). **[besoin backend]** — proposition : un endpoint volontairement séparé du reste de l'API normale (ex. `POST /admin/reset-database`), gardé derrière une confirmation front obligatoire, qui référence explicitement que c'est une opération de dev/démo (à ne probablement pas exposer telle quelle en usage "production" local sans reconfirmation supplémentaire — à discuter avec l'équipe backend sur le niveau de garde-fou voulu).
- **Reprise sur 401** : **livré autrement, et mieux** (ADR-025). Ce n'est pas le front qui rejoue : quand le modèle répond 401, le backend met la session en pause (`PAUSED`) en gardant conversation, cycle, message en attente et plans. Le front le voit dans l'instantané, lit `GET /sessions/{sid}/pause` pour la raison, affiche un bandeau non bloquant, et reprend par `POST /credentials` puis `POST /sessions/{sid}/resume` (`TokenExpiredModal`, champs pilotés par les `credentialFields` du modèle). L'API locale n'est pas authentifiée et ne renvoie jamais 401 elle-même.
- **`working_space`** : pas de contrat backend connu à ce jour pour un dossier de travail temporaire injecté dans le message utilisateur — à rapprocher du chantier ADR-024 (scratch dir / `AGENTIC_SCRATCH_DIR`) qui est encore à écrire côté backend. **[besoin backend]**, ne pas coder cette partie front tant que le contrat n'est pas fixé de part et d'autre.
- **Branding (nom/icône)** : aucun besoin backend pour la v1 — c'est un choix purement local à l'installation front. Optionnel, pour plus tard : si on veut que ce choix survive à une réinstallation ou se synchronise entre plusieurs postes du même utilisateur, il faudrait un petit endpoint de préférence utilisateur côté backend (`GET/PUT /me/preferences` ou équivalent) — **pas demandé pour la v1**, à ne considérer que si le besoin se confirme.

## 6. Comportement du sélecteur de modèle (détail)

1. Au chargement de l'écran Sign in (étape 1), le front appelle la liste des modèles disponibles (§5).
2. Aucun modèle n'est présélectionné — l'utilisateur choisit explicitement (cf. maquette : liste de cartes sélectionnables avec un badge "Token required" / "No credentials") — sauf reprise automatique d'une configuration déjà enregistrée localement (voir §7quater).
3. Dès qu'un modèle est sélectionné, le front résout la liste de champs de connexion à afficher (généralise l'ancien comportement, qui ne connaissait qu'un jeton) :
   - si le modèle déclare `credential_fields` (contrat-interface.md §2) → un champ par entrée de la liste, dans l'ordre donné ; type de saisie dérivé de `secret` (`password` si `secret` absent ou `true`, `text` si `secret: false`) ;
   - sinon, si `requires_credentials: true` → repli historique : un unique champ implicite "Access token" (secret) ;
   - sinon (`requires_credentials: false` et pas de `credential_fields`) → aucun champ, note explicative affichée à la place ("This model manages its own authentication").
   - "Continue" reste désactivé tant que tous les champs requis par le modèle sélectionné n'ont pas une valeur non vide.
4. Le choix du modèle, ainsi que les valeurs saisies pour chaque champ déclaré (`credentials: { [key]: value, ... }`, voir contrat-interface.md §2), sont transmis à l'établissement de session (quel provider/codec activer côté backend, plus les informations complémentaires éventuelles comme un Chat ID).

## 7. Skills et niveau d'effort (détail)

- **Skills** : champ optionnel sur l'étape 2 du Sign in (`Setup.dc.html`), à côté de `working_space`. L'utilisateur ajoute/retire des skills (chips avec suppression). Dans la maquette, "Add skill" pioche dans une liste fixe pour démontrer l'interaction ; en vrai, ce sera soit un sélecteur de fichier(s) natif (Tauri), soit une liste proposée par le backend (§5), à trancher selon la réponse du backend sur comment il veut recevoir cette information. Champ vide par défaut accepté (aucune skill n'est obligatoire).
- **Effort** : contrôle à 3 niveaux (Low / Med / High) dans les réglages avancés (étape 2), valeur par défaut `medium`. Valeur transmise à la création de session ou à chaque `user_request` selon ce que décide le backend (§5). Le front ne calcule aucune limite système lui-même — il transmet une intention, pas un nombre de threads : c'est au backend de traduire ça en une consigne et, le cas échéant, en une borne réelle (`max_parallel_workers`).

## 7bis. Branding configurable (nom + icône)

- **Où** : `WelcomeScreen`, premier écran de l'app, avant `SignInScreen`.
- **Déroulé** : bref état de chargement (le temps de récupérer d'éventuels réglages locaux existants), puis un message d'accueil direct ("We've retrieved your information. Let's start by choosing the name and icon that suit you."), puis le formulaire de choix.
- **Champs** : `appName` (texte libre, ex. presets rapides "Console" / "Atlas" / "Nexus" / "Forge" / "Relay" en plus de la saisie libre), `appLabel` (texte court, presets "OPS" / "HUB" / "CORE" / "EDGE" / "NODE"), `iconId` (un parmi un jeu fixe d'icônes vectorielles embarquées dans le front — voir la maquette pour les six proposées : `pulse` neutre par défaut, `hex`, `orbit`, `monogram`, `honeycomb`, `facet`).
- **Aperçu en direct** : à chaque changement de `appName` / `appLabel` / `iconId`, l'aperçu (mock du panneau de connexion + mock de la barre d'en-tête) se remet à jour immédiatement, sans étape de validation intermédiaire — implémenter en état contrôlé React classique (pas de debounce nécessaire, le rendu est trivial).
- **Persistance (à trancher avant l'implémentation réelle)** : la maquette ne persiste rien (état perdu au rechargement, chaque écran a ses propres valeurs par défaut). Pour la vraie app, au minimum stocker localement (fichier de config Tauri, `localStorage`, ou équivalent) pour que le choix survive aux relances. Pas de besoin backend pour la v1 (voir §5) — à revisiter seulement si un besoin de synchronisation multi-poste apparaît.
- **Portée** : une fois choisi, `appName`/`appLabel`/`iconId` remplacent tout texte ou icône de marque, partout dans l'app (barre d'en-tête sur Chat/Debug/History/Event detail/401/StateMachine/LiveDatabase, panneau de connexion sur Sign in et Connecting). Aucun nom de produit ne doit être codé en dur dans un composant — toujours lire ces trois valeurs depuis le contexte de branding (§2).
- **Accès permanent** : en plus du premier lancement, `WelcomeScreen` reste accessible à tout moment via `UserMenu` → "App identity — name & icon", pour changer d'avis après coup sans passer par un reset complet.

## 7ter. Référence machine à états & cycle (nouveau)

- **Où** : `StateMachineScreen`, accessible uniquement depuis `UserMenu` (pas dans le flux principal) — écran de documentation vivante, sans action mutante côté backend (purement lecture/affichage).
- **Contenu** : quatre onglets, un par machine à états réelle du backend (spec v1.1 §5.1–5.4) :
  - **Conversation** (11 états : NEW, ACTIVE, WAITING_MODEL_RESPONSE, RUNNING_PLAN, ROTATING, WAITING_USER, INTERRUPTED, READY, COMPLETED, FAILED, CLOSED) — chemin nominal affiché comme une frise, puis les branches (boucle de cycle, rotation de contexte, reprise après COMPLETED, interruption depuis n'importe quel état actif, échec depuis n'importe quel état) en cartes séparées, plus la table de transitions complète.
  - **Plan** (7 états : PENDING, RUNNING, COMPLETED, STOPPED_ON_FAILURE, SHORT_CIRCUITED_ON_SUCCESS, INTERRUPTED, FAILED).
  - **Task** (9 états : PENDING, WAITING_DEPENDENCY, RUNNING, COMPLETED, FAILED, TIMED_OUT, SKIPPED, CANCELLED, INTERRUPTED).
  - **Context window** (3 états : HEALTHY, WARNING, SATURATED) — avec la séquence de rotation déclenchée par SATURATED (résumé structuré → nouvelle conversation → `context_resume_request`/`ack`).
- **Panneau latéral (toujours visible, indépendant de l'onglet actif)** : infos du cycle courant (`cycle_id`, `cycle_type`, statut, `retry_count`, `started_at`) et budget de session (`max_cycles`, `max_plans`, `max_total_duration_ms`) avec barres de consommation.
- **Données** : dans la maquette, tout est statique/exemple. En vrai, le panneau latéral (cycle + budget) doit être alimenté par les champs déjà exposés pour la session courante (spec v1.1 §4.1, `session_budget`, `current_cycle_id`, etc.) — **pas de besoin backend nouveau**, juste du câblage sur des champs déjà prévus. Les onglets machine à états eux-mêmes n'affichent aucune donnée live : c'est un contenu de référence embarqué dans le front (texte + structure fixes), à maintenir en cohérence avec la spec backend si elle évolue.

## 7quater. Persistance locale de la configuration de connexion (nouveau)

- **Objectif** : éviter à un utilisateur qui relance l'app de tout resaisir (identité, modèle, dossier de travail, skills, effort, dossier de prompts) à chaque lancement — sauf action explicite "Reset configuration" (`UserMenu` → Danger zone). "Logout" (reconnexion rapide) ne touche pas à cette configuration enregistrée.
- **Où** : entièrement front, aucun contrat backend — un fichier local géré par le front (Tauri : plugin Store, fichier `settings.json` dans le dossier de données de l'app ; navigateur/dev : `localStorage`).
- **Ce qui est enregistré** : `userId`, `modelId`, `workingSpace`, `skills`, `effort`, `promptsFolderPath`, et `credentials` — mais pour ce dernier, **seulement les champs qu'un modèle a explicitement marqués `secret: false`** dans `credential_fields` (contrat-interface.md §2). Un champ sans `secret` déclaré, ou avec `secret: true`, n'est **jamais** écrit dans ce fichier quelle que soit sa valeur — y compris l'Access token implicite (repli `requires_credentials: true` sans `credential_fields`), qui reste donc toujours considéré secret et toujours ressaisi à chaque lancement.
- **Au lancement** : le front relit ce fichier une fois au montage de l'écran Sign in ; s'il contient une configuration, il pré-remplit l'écran (modèle présélectionné, champs non-secrets déjà remplis) et ne saute automatiquement à l'étape 2 puis à la connexion que **si tous les champs requis par le modèle restauré sont déjà renseignés** — donc jamais pour un modèle qui a au moins un champ secret : l'utilisateur doit toujours le ressaisir une fois, avec tout le reste déjà prérempli autour.
- **Garde-fou anti-soumission accidentelle** : l'automatisation (saut d'étape, soumission automatique) se déclenche uniquement sur la base de ce qui a été effectivement relu du fichier au montage de l'écran — jamais sur la saisie en direct de l'utilisateur dans un champ encore visible, pour qu'une complétion manuelle d'un champ secret ne déclenche jamais une soumission surprise du formulaire.

## 8. Gestion des erreurs

- **401** en cours de session → la session passe `PAUSED` côté backend : bandeau dans Chat, `TokenExpiredModal` avec les champs déclarés par le modèle, et le **bouton d'envoi** comme geste de reprise (`POST /credentials` puis `POST /resume`). Pas de perte de contexte ; un jeton encore mauvais remet en pause, ce qui est un nouvel essai, pas une panne.
- **Perte de connexion au serveur local** (le process backend n'écoute plus) → à définir : bannière persistante + tentative de reconnexion, plutôt qu'un écran bloquant (l'app doit rester utilisable pour consulter l'historique déjà chargé en local, si c'est réalisable).
- **Erreur de protocole côté modèle** (ADR-023, en cours de spec côté backend) → à représenter dans la vue Debug une fois le contrat backend stabilisé ; hors périmètre v1 tant qu'ADR-023 n'est pas écrit.

## 9. Empaquetage et lancement

Voir [frontend-plan.md](frontend-plan.md) §"Empaquetage / lancement" — script `.bat` unique démarrant serveur + app desktop, deux approches possibles (process séparés ou sidecar Tauri), pas encore tranché.

## 10. Hors périmètre v1

- Multi-utilisateur / multi-poste.
- Édition des ADR ou du protocole côté backend (jamais fait depuis le front).
- Authentification autre que jeton porteur simple (SSO, OAuth…) — pas mentionné dans la spec backend à ce jour.
- Notifications système, raccourcis clavier avancés.
- Édition ou création de fichiers de skills depuis l'app (v1 : sélection seulement, pas d'éditeur).
- Synchronisation multi-poste du choix de branding (nom/icône) — local uniquement pour la v1.
- Édition de la base depuis `LiveDatabaseScreen` — lecture seule + vidage complet uniquement, pas d'édition ligne à ligne (voir §5 : "writes only ever come from the backend", rappelé dans la maquette elle-même).
