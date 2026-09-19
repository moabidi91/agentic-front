# Contrat d'interface front ↔ backend — v1 (proposition)

Ce document liste, besoin par besoin, ce que le front attend de l'API du backend pour fonctionner. Rédigé côté front, sans toucher au code ni aux ADR du backend — une **proposition** à valider, amender ou refuser par l'équipe qui porte `agentic-local-app`. Voir [spec-fonctionnelle.md](spec-fonctionnelle.md) pour le comportement écran par écran que ces besoins servent, et `agentic-local-app/spec-v1.1.md` / `agentic-local-app/decisions.md` pour ce qui existe déjà.

Statut de chaque ligne :
- 🟢 **Existant** — couvert par la spec/API déjà livrée (à vérifier route par route, non revérifié ici).
- 🟡 **Besoin nouveau** — rien de connu côté backend, proposition à valider.
- ⚪ **Aucun besoin** — géré entièrement côté front.

## 1. Identité

🟢 **Existant** — `GET /whoami` livré (ADR-024 §5), et plus riche que demandé : il rend aussi `source` (comment l'identifiant a été trouvé) et `host`. `WhoAmI` côté front ne porte que `userId` et jette les deux autres — c'est le front qui a du retard ici, pas le backend.
- Réponse : `{ "user_id": "<utilisateur système>" }`
- Usage : pré-remplir le champ User ID (Sign in, étape 1), badge "Auto-detected", reste éditable.
- Repli si absent : champ vide, saisie manuelle obligatoire.

## 2. Modèles / transports disponibles

🟢 **Existant** — `GET /models` livré (ADR-024 §3, ADR-027 §2), `credential_fields` compris.
- Réponse attendue : liste d'objets `{ "id", "name", "provider", "codec", "requires_credentials": bool, "credential_fields"?: CredentialField[] }`.
- Livré : `{ "active": "<profil actif>", "models": [{ "name", "display_name", "description", "provider", "codec", "requires_credentials", "credential_fields", "active" }] }`, profil actif en tête. `credential_fields` est **toujours présent**, éventuellement vide, dans l'ordre de déclaration du profil, avec exactement `key` / `label` / `placeholder` / `secret` — la variable d'environnement derrière un champ ne traverse pas la route. Le repli implicite « `requires_credentials` nu = un champ `access_token` secret » est écrit des deux côtés, à l'identique.
- S'appuie sur le registre existant côté backend (ADR-020 `transport.provider`, ADR-021 `transport.codec`, déjà listable en CLI via `transport list` / `codec list`) — le besoin est l'équivalent exposé en HTTP, pas un nouveau concept.
- `requires_credentials` reste le champ minimal : aujourd'hui rien ne dit au front si un modèle a besoin d'un jeton ou gère sa propre authentification. `true` sans `credential_fields` est traité par le front comme un unique champ implicite "Access token" (secret) — comportement historique, toujours supporté pour les modèles qui n'ont pas encore de `credential_fields`.
- `credential_fields` (nouveau, optionnel) — généralise `requires_credentials` pour les modèles qui ont besoin de plus qu'un simple jeton (ex. un Chat ID en plus du token, pour un provider "templated"). Liste d'objets :
  - `key` (string) — identifiant du champ, utilisé tel quel comme clé dans le payload de connexion envoyé au backend (ex. `access_token`, `chat_id`).
  - `label` (string) — libellé affiché au-dessus du champ dans l'UI.
  - `placeholder` (string, optionnel).
  - `secret` (bool, optionnel, **défaut `true` si absent — fail closed**) — si `false`, le front peut retenir la valeur localement (fichier de préférences de connexion, jamais transmis au backend en dehors de l'appel de connexion) pour éviter à l'utilisateur de la ressaisir à chaque lancement de l'app ; si `true` (ou absent), la valeur n'est jamais persistée côté front et doit être ressaisie à chaque lancement.
- Le front construit le payload de connexion comme `credentials: { [key]: value, ... }` (un objet plat, une entrée par champ déclaré) plutôt qu'un unique `access_token` — **confirmé** (ADR-027 §3), à une correction près : cette carte part sur une route à part, `POST /credentials` → `{"credentials": {...}}` → `204`, **avant** la création de session, et jamais dans le corps de `POST /sessions` (qui est journalisé et audité, lui). Refus : `400 CREDENTIALS_EMPTY`, `400 CREDENTIAL_FIELD_UNKNOWN`, `409 CREDENTIALS_NOT_CONFIGURED` — ils nomment une `key`, jamais une valeur.
- `active` (bool, par profil) — le seul profil que ce processus sert (ADR-024 §2 : un modèle par processus, en changer = relancer l'application). **Consommé par le front** : `ModelOption.active` est rendu par `HttpApiClient` et par la maquette en mémoire, et l'écran de connexion affiche les autres cartes **désactivées**, avec la raison écrite, au lieu de laisser l'utilisateur découvrir le refus au dernier clic. Un catalogue qui ne porte pas le drapeau laisse toutes les cartes sélectionnables.
- Usage : liste de cartes sélectionnables (Sign in, étape 1) ; `requires_credentials` / `credential_fields` pilotent le rendu dynamique des champs de connexion (un par entrée déclarée, ou le champ Access token implicite en repli) — voir aussi implementation-spec.md §6 et §7quater.

## 3. Skills

🟢 **Lecture existante** / 🟡 **écriture livrée en forme réduite** (ADR-027 §4).
- 🟢 Lecture (optionnelle) : `GET /skills` → liste de skills connues du poste/backend, pour un "Add skill" guidé plutôt qu'une saisie libre. **Livré** : `{"skills": [{"name", "path"}]}`, les `*.md` trouvés sous `[skills] root`, triés par nom, 3 niveaux de profondeur, 200 entrées au plus. La route ne rend jamais d'erreur : racine vide, absente ou illisible ⇒ `200` et liste vide, le champ dégrade en saisie libre.
- 🟡 Écriture : un champ `skills: [{ "name", "path" }]` sur la création de session, pour que le modèle en ait connaissance (référence de fichier accessible depuis `working_space`, ou contenu injecté en contexte — taille attendue des fichiers à trancher côté backend). **Livré en forme réduite** : `POST /sessions` accepte `skills` comme une simple liste de chaînes (nom ou chemin), et ces chaînes sont **tracées, pas appliquées** — elles voyagent dans la charge de l'événement `session.created` et s'arrêtent là. Aucun fichier n'est ouvert, **le modèle ne reçoit rien de plus**. Le besoin, lui, reste entier : c'est l'ADR suivant (référence de fichier contre contenu injecté).
- Usage : champ Skills (Sign in, étape 2).

## 4. Niveau d'effort

🟡 **Besoin nouveau — champ accepté, effet toujours absent** (ADR-027 §4).
- Un champ optionnel `effort: "low" | "medium" | "high"` sur le `user_request` (ou sur la création de session, si l'intention est de s'appliquer à toute la conversation). **Livré** sur la création de session : `POST /sessions` accepte `effort`, et refuse toute autre valeur en `400 EFFORT_INVALID` avec la liste attendue.
- Traduit côté backend en une consigne textuelle insérée dans le message envoyé au modèle (ex. "parallelize as much as reasonably possible within system limits"), et le cas échéant liée à `max_parallel_workers`. **Pas livré** : comme les skills, la valeur est tracée dans `session.created` et rien n'en est dérivé — le modèle reçoit exactement ce qu'il recevait avant. Le contrôle Effort de l'écran de connexion est donc, à ce jour, sans effet observable.
- Le front transmet une intention, jamais un nombre de threads — la borne réelle reste une décision backend.
- Usage : contrôle Effort (Sign in, étape 2, réglages avancés).

## 5. Session — création, reprise, envoi de message

🟢 **Existant et branché** — vérifié route par route (`smoke-http.mjs`).
- Créer / reprendre une conversation, envoyer un `user_request`, lire l'état courant : couvert par l'API REST livrée en phase 10.
- **Ouverture sans message** (ADR-028 §1) : `POST /sessions` n'exige plus `goal` ni `user_message`. Sans eux la session naît `READY`, sans conversation, sans cycle, **rien n'est posté au modèle** ; c'est le premier `POST /sessions/{sid}/messages` qui ouvre le premier cycle et devient le `goal`. Les deux champs restent une paire : en envoyer un seul est refusé (`400 GOAL_REQUIRED` / `400 USER_MESSAGE_REQUIRED`). Le front n'en envoie donc **aucun** — l'écran de connexion demande un utilisateur, un modèle, des identifiants, un dossier, des skills et un effort, jamais une phrase.
- **`user_id` voyage** (ADR-028 §2) : `POST /sessions` prend l'identifiant du formulaire ; omis, la session porterait exactement ce que rend `GET /whoami`, qui est déjà ce que le champ pré-remplit. L'écran d'historique et l'écran de connexion nomment donc le même utilisateur.
- Champs de session courante attendus en lecture, déjà spécifiés (spec v1.1 §4.1) : `conversation_id`, `status`, `session_budget` (`max_cycles`, `max_plans`, `max_total_duration_ms`), `current_cycle_id`, `current_plan_id`, `cycle_type`.
- Usage : Chat, Debug, et le panneau cycle/budget de l'écran State machine.

## 6. Interruption

🟢 **Existant** — mécanisme spécifié (spec v1.1 §2.9), déjà couvert par ADR-006.
- `user_interrupt` sur la conversation : possible depuis n'importe quel état actif (`ACTIVE`, `WAITING_MODEL_RESPONSE`, `RUNNING_PLAN`, `ROTATING`) → `INTERRUPTED` → `READY`. Tâches en cours : SIGTERM + `interrupt_drain_timeout_ms`. Tâches en attente : `SKIPPED`. Entièrement audité.
- Aucun besoin nouveau : le bouton Stop (Chat) appelle l'endpoint d'interruption existant.
- Usage : bouton Stop (Chat), Reset configuration (menu utilisateur — interrompt puis reset local).

## 7. Message envoyé pendant un traitement en cours

🟡 **Besoin nouveau** — non couvert par la machine à états actuelle. **Tranché côté backend, mais autrement** : ni (a) ni (b), un **refus explicite**. Tant que la boucle tient la session, `POST /sessions/{sid}/messages` répond `409 SESSION_BUSY` ; le bouton d'envoi reste bloqué, le bouton Stop reste vivant. `ChatMessage.queued` du front ne correspond donc à aucun comportement et n'est jamais rempli.
- Aucun état ne prévoit "message en attente d'application" pendant `WAITING_MODEL_RESPONSE` / `RUNNING_PLAN` / `ROTATING`.
- Deux options avaient été proposées ; **ni l'une ni l'autre n'a été retenue**, elles restent ici pour mémoire :
  - **(a) File d'attente** : le backend accepte le `user_request` pendant un cycle actif et l'applique dès que la conversation repasse par `WAITING_USER`/`READY` — le cycle en cours va à son terme.
  - **(b) Interruption automatique** : le front déclenche lui-même `user_interrupt` (besoin 6, déjà existant) puis envoie le message une fois `READY` atteint — reste dans le contrat déjà spécifié, mais perd le travail en cours au lieu de le laisser finir.
- Usage : composeur actif pendant le traitement (Chat) — l'indice affiché à l'utilisateur dépend de l'option retenue.

## 8. Flux live (vue Debug)

🟢 **Existant** — prévu par ADR-018 (flux SSE, lecture rapide de l'état).
- Le front s'y abonne pour Debug. À défaut de SSE disponible tout de suite : polling court (≈1s) sur un endpoint de snapshot (`ExecutionTracker`) en repli.
- Usage : Debug (état conversation/plan/tâches en direct).

## 9. Plan — liste et graphe de dépendances

🟢 **Existant** — aucun besoin nouveau.
- Chaque tâche d'un `execution_plan`/`discovery_plan` inclut déjà `depends_on` (spec §12.2) et son statut (`ExecutionTracker`).
- Le front construit le graphe à partir de ces données existantes — c'est une deuxième présentation, pas une deuxième source de données.
- Usage : toggle List/Diagram (Debug).

## 10. Historique et détail d'événement

🟢 **Existant**, à confirmer sur la forme exacte.
- Lecture des événements d'une session passée. Un événement doit inclure au minimum : `type`, horodatage, message in (s'il y en a un), message out (s'il y en a un), lien vers l'entrée d'audit correspondante (hash-chaînée).
- Usage : History, Event detail.

## 11. Inspection live de la base (lecture)

🟢 **Existant** — les trois endpoints dédiés sont livrés et paginés (`{items, limit, offset, next_offset}`).
- Trois lectures : sessions (`id`, `state`, `created_at`, `updated_at`, `user_id`), events (`id`, `session_id`, `type`, `ts`, `payload`), audit log (`id`, `event_type`, `prev_hash`, `hash`, `ts`).
- Deux formes possibles : endpoints dédiés (`GET /admin/sessions`, `/admin/events`, `/admin/audit`), ou accès direct documenté au fichier sqlite (chemin, schéma) si l'app doit rester utilisable même serveur backend éteint — **tranché : les trois endpoints**, l'accès direct au fichier n'a pas été retenu.
- Réserve sur l'audit : la chaîne de hachage est **par session** (chacune repart de 64 zéros) et `GET /admin/audit` mélange les sessions. `AuditEntry` du front ne porte ni `session_id` ni `sequence` : en l'état, l'écran ne peut pas revérifier la chaîne lui-même. Une route le fait, elle : `GET /sessions/{sid}/audit/verify`.
- Usage : écran Live database.

## 12. Vidage de la base

🟢 **Existant** — action destructive, dev/démo.
- Proposition : `POST /admin/reset-database`, volontairement séparé du reste de l'API, gardé par une confirmation front obligatoire. **Livré tel quel.**
- Niveau de garde-fou (à discuter) : probablement à ne pas exposer tel quel en usage réel sans reconfirmation supplémentaire côté backend (flag de config, environnement dev uniquement, etc.). **Tranché : fermé par défaut** — `api.allow_destructive_admin = false` dans `config.toml`, et la route répond `403 ADMIN_DISABLED` sans rien toucher. Le front garde sa confirmation et doit présenter ce refus comme un problème de configuration du poste, pas comme un bug.
- Usage : bouton "Clear database" (écran Live database).

## 13. Reprise sur 401

🟢 **Existant, tranché autrement et branché** — ADR-025 (`agentic-local-app`).
- Ce n'est pas le front qui rejoue : quand le **modèle** répond 401 à un appel de la boucle, le backend fait passer la session `RUNNING → PAUSED` et garde tout — conversation, cycle, message en attente, plans et tâches. L'API locale, elle, n'est pas authentifiée et ne renverra jamais 401 au front.
- Le front l'apprend par `SessionSnapshot.status === 'PAUSED'` (événement `session.paused` ou instantané), lit le détail dans `GET /sessions/{sid}/pause` (`reason`, `error_code`, `error_type`, `operation`, `since`) et l'écrit en toutes lettres.
- La reprise est **un geste en deux appels, dans cet ordre** : `POST /credentials` puis `POST /sessions/{sid}/resume`. Reprendre avec un jeton toujours mauvais remet en pause, indéfiniment : c'est un nouvel essai, pas une panne. Ce qui borne, c'est le budget de session.
- Côté écran : un bandeau non bloquant dans Chat, la pastille de phase qui dit « Paused », le composeur qui reste ouvert en saisie, et **le bouton d'envoi qui devient le geste de reprise** — il rouvre la pop-in d'identifiants au lieu d'envoyer. Le bouton Stop reste vivant. Les champs de la pop-in sont ceux que le modèle déclare (`credentialFields`), les mêmes qu'à la connexion ; aucune valeur saisie n'est journalisée, persistée ni ré-affichée.
- Usage : bandeau de pause + pop-in d'identifiants (Chat).

## 14. `working_space`

🟢 **Existant** — ADR-026 : `working_space`, champ facultatif de `POST /sessions`, validé avant toute création (`400 WORKING_SPACE_INVALID` si le dossier ne convient pas).
- Un dossier de travail temporaire, injecté dans le message utilisateur comme `working_space`, nettoyé automatiquement en fin de tâche. **Deux nuances livrées** : (1) le dossier n'est pas injecté dans le message, il est exporté aux commandes de la session par les variables `AGENTIC_WORKING_SPACE` et `AGENTIC_SCRATCH_DIR` ; (2) un dossier **désigné par l'utilisateur** n'est jamais supprimé ni archivé — seuls les dossiers que l'application a créés elle-même suivent la politique de nettoyage (`[scratch] policy`).
- Ne pas coder cette partie front tant que le contrat n'est pas fixé des deux côtés. **Le contrat est fixé** : `HttpApiClient.signIn()` envoie `working_space` quand le champ Working folder est renseigné.
- Usage : champ Working folder (Sign in, étape 2).

## 15. Branding (nom / icône)

⚪ **Aucun besoin backend pour la v1** — choix purement local à l'installation front, non persisté entre machines.
- Optionnel plus tard, seulement si un besoin de synchronisation multi-poste se confirme : `GET/PUT /me/preferences` ou équivalent.

## Résumé — où en est la v1 branchée

Ce n'est plus une liste de blocages. Le front **appelle réellement le backend** : `ApiProvider` (`src/api/context.tsx`) construit un `HttpApiClient` (`src/api/http.ts`) dès que `VITE_API_BASE_URL` est renseignée, et retombe sur la maquette en mémoire sinon. Ce qui suit est relevé contre un serveur qui tourne — `node smoke-http.mjs` (58 vérifications, 0 échec, 1 sautée) et un passage navigateur Welcome → Sign in → Chat —, pas d'une lecture de specs.

### Câblé et vérifié

| Besoin | Ce qui marche, bout en bout |
|---|---|
| §1 Identité | `GET /whoami` pré-remplit le champ User ID et le badge « Auto-detected » |
| §2 Modèles | catalogue, `requires_credentials`, `credential_fields` champ par champ, et `active` : les profils que ce processus ne sert pas sont **désactivés** dans le sélecteur, avec la raison écrite |
| §5 Session | ouverture **sans message** (`READY`, rien posté au modèle, aucun cycle consommé), `user_id` envoyé, premier message = premier cycle, instantané et budget lus |
| §6 Interruption | Stop accepté dans tous les états, pause comprise ; la route ne rend la main qu'une fois `READY` atteint |
| §7 Envoi pendant un traitement | bouton d'envoi bloqué pendant que la boucle tient la session, `409 SESSION_BUSY` en ceinture |
| §8 Flux live | SSE avec reprise sur `last_event_id`, désabonnement propre, repli par polling inutile |
| §9 Plan et graphe | `depends_on` et statuts dans l'instantané |
| §10 Historique | sessions et timeline auditée, corps de messages joints côté client |
| §11 Inspection de la base | les trois vues `/admin`, paginées |
| §12 Vidage de la base | confirmation front + `403 ADMIN_DISABLED` tant que le garde-fou est fermé |
| §13 Reprise sur 401 | pause backend détectée, raison affichée, `POST /credentials` + `POST /resume` déclenchés par le bouton d'envoi ; un jeton encore mauvais remet en pause, et c'est présenté comme un nouvel essai |
| §14 `working_space` | envoyé à la création, validé avant que quoi que ce soit ne soit créé |
| §15 Branding | purement local, aucun besoin backend |

### Accepté par le backend, sans effet à ce jour

- **§3 Skills** — `GET /skills` alimente le choix guidé, et `POST /sessions` accepte la liste ; elle est **tracée dans l'événement `session.created` et rien de plus**. Aucun fichier n'est ouvert, le modèle ne reçoit rien de plus (ADR-027, point ouvert 1).
- **§4 Effort** — accepté et validé (`400 EFFORT_INVALID` hors des trois niveaux), tracé au même endroit, et rien n'en est dérivé. Le contrôle Effort est donc, à ce jour, sans effet observable.

Les deux champs partent quand même : le jour où le backend les applique, il n'y a rien à rebrancher côté front. Mais il ne faut pas les présenter en démo comme agissants.

### Ce qui manque encore

Côté front, quatre écarts ouverts, aucun bloquant :

- **G-1** — `WhoAmI` ne garde que `userId` ; `GET /whoami` rend aussi `source` et `host`, donc le badge « Auto-detected » est affiché sans savoir d'où vient le nom. `HttpApiClient.whoAmIVerbose()` rend les trois en attendant.
- **G-5** — `SignInConfig.sessionBudget` est partiel ; la route exige les trois limites, toutes `> 0`. Le client n'envoie le budget que s'il les a toutes, et l'omet sinon (les défauts du poste s'appliquent). Il faudrait un type de requête distinct.
- **G-8** — `ChatMessage.queued` ne correspond à rien : il n'y a pas de file (§7). Champ à retirer ou à documenter comme réservé.
- **G-11** — `ApiClient` n'a pas de lecture d'historique du fil, donc `subscribeMessages` doit rejouer les tours déjà stockés ; et `ChatMessage` n'a pas de champ pour `message_type`, donc `planSummary` reste vide. Il faudrait `listMessages()` et un champ `kind`.

Côté backend, trois écarts connus, chacun un aller-retour de plus et rien de cassé : `POST .../messages` et `POST .../interrupt` rendent autre chose qu'un instantané (**G-7**), le flux live ne porte pas le corps des messages (**G-9**), l'audit non plus (**G-10**).

Une réserve d'affichage, enfin : la chaîne d'audit est **par session** (chacune repart de 64 zéros) et `GET /admin/audit` mélange les sessions, alors que `AuditEntry` ne porte ni `session_id` ni `sequence` — l'écran Live database ne peut donc pas revérifier la chaîne lui-même (§11).
