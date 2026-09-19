# Contrat d'interface front ↔ backend — v1 (proposition)

Ce document liste, besoin par besoin, ce que le front attend de l'API du backend pour fonctionner. Rédigé côté front, sans toucher au code ni aux ADR du backend — une **proposition** à valider, amender ou refuser par l'équipe qui porte `agentic-local-app`. Voir [spec-fonctionnelle.md](spec-fonctionnelle.md) pour le comportement écran par écran que ces besoins servent, et `agentic-local-app/spec-v1.1.md` / `agentic-local-app/decisions.md` pour ce qui existe déjà.

Statut de chaque ligne :
- 🟢 **Existant** — couvert par la spec/API déjà livrée (à vérifier route par route, non revérifié ici).
- 🟡 **Besoin nouveau** — rien de connu côté backend, proposition à valider.
- ⚪ **Aucun besoin** — géré entièrement côté front.

## 1. Identité

🟡 **Besoin nouveau** — `GET /whoami`
- Réponse : `{ "user_id": "<utilisateur système>" }`
- Usage : pré-remplir le champ User ID (Sign in, étape 1), badge "Auto-detected", reste éditable.
- Repli si absent : champ vide, saisie manuelle obligatoire.

## 2. Modèles / transports disponibles

🟡 **Besoin nouveau** — `GET /models` (nom de route indicatif)
- Réponse attendue : liste d'objets `{ "id", "name", "provider", "codec", "requires_credentials": bool, "credential_fields"?: CredentialField[] }`.
- S'appuie sur le registre existant côté backend (ADR-020 `transport.provider`, ADR-021 `transport.codec`, déjà listable en CLI via `transport list` / `codec list`) — le besoin est l'équivalent exposé en HTTP, pas un nouveau concept.
- `requires_credentials` reste le champ minimal : aujourd'hui rien ne dit au front si un modèle a besoin d'un jeton ou gère sa propre authentification. `true` sans `credential_fields` est traité par le front comme un unique champ implicite "Access token" (secret) — comportement historique, toujours supporté pour les modèles qui n'ont pas encore de `credential_fields`.
- `credential_fields` (nouveau, optionnel) — généralise `requires_credentials` pour les modèles qui ont besoin de plus qu'un simple jeton (ex. un Chat ID en plus du token, pour un provider "templated"). Liste d'objets :
  - `key` (string) — identifiant du champ, utilisé tel quel comme clé dans le payload de connexion envoyé au backend (ex. `access_token`, `chat_id`).
  - `label` (string) — libellé affiché au-dessus du champ dans l'UI.
  - `placeholder` (string, optionnel).
  - `secret` (bool, optionnel, **défaut `true` si absent — fail closed**) — si `false`, le front peut retenir la valeur localement (fichier de préférences de connexion, jamais transmis au backend en dehors de l'appel de connexion) pour éviter à l'utilisateur de la ressaisir à chaque lancement de l'app ; si `true` (ou absent), la valeur n'est jamais persistée côté front et doit être ressaisie à chaque lancement.
- Le front construit le payload de connexion comme `credentials: { [key]: value, ... }` (un objet plat, une entrée par champ déclaré) plutôt qu'un unique `access_token` — à confirmer côté backend que c'est bien la forme attendue par la route de création de session une fois celle-ci écrite.
- Usage : liste de cartes sélectionnables (Sign in, étape 1) ; `requires_credentials` / `credential_fields` pilotent le rendu dynamique des champs de connexion (un par entrée déclarée, ou le champ Access token implicite en repli) — voir aussi implementation-spec.md §6 et §7quater.

## 3. Skills

🟡 **Besoin nouveau**
- Lecture (optionnelle) : `GET /skills` → liste de skills connues du poste/backend, pour un "Add skill" guidé plutôt qu'une saisie libre.
- Écriture : un champ `skills: [{ "name", "path" }]` sur la création de session, pour que le modèle en ait connaissance (référence de fichier accessible depuis `working_space`, ou contenu injecté en contexte — taille attendue des fichiers à trancher côté backend).
- Usage : champ Skills (Sign in, étape 2).

## 4. Niveau d'effort

🟡 **Besoin nouveau**
- Un champ optionnel `effort: "low" | "medium" | "high"` sur le `user_request` (ou sur la création de session, si l'intention est de s'appliquer à toute la conversation).
- Traduit côté backend en une consigne textuelle insérée dans le message envoyé au modèle (ex. "parallelize as much as reasonably possible within system limits"), et le cas échéant liée à `max_parallel_workers`.
- Le front transmet une intention, jamais un nombre de threads — la borne réelle reste une décision backend.
- Usage : contrôle Effort (Sign in, étape 2, réglages avancés).

## 5. Session — création, reprise, envoi de message

🟢 **Existant** (à vérifier route par route)
- Créer / reprendre une conversation, envoyer un `user_request`, lire l'état courant : couvert par l'API REST livrée en phase 10.
- Champs de session courante attendus en lecture, déjà spécifiés (spec v1.1 §4.1) : `conversation_id`, `status`, `session_budget` (`max_cycles`, `max_plans`, `max_total_duration_ms`), `current_cycle_id`, `current_plan_id`, `cycle_type`.
- Usage : Chat, Debug, et le panneau cycle/budget de l'écran State machine.

## 6. Interruption

🟢 **Existant** — mécanisme spécifié (spec v1.1 §2.9), déjà couvert par ADR-006.
- `user_interrupt` sur la conversation : possible depuis n'importe quel état actif (`ACTIVE`, `WAITING_MODEL_RESPONSE`, `RUNNING_PLAN`, `ROTATING`) → `INTERRUPTED` → `READY`. Tâches en cours : SIGTERM + `interrupt_drain_timeout_ms`. Tâches en attente : `SKIPPED`. Entièrement audité.
- Aucun besoin nouveau : le bouton Stop (Chat) appelle l'endpoint d'interruption existant.
- Usage : bouton Stop (Chat), Reset configuration (menu utilisateur — interrompt puis reset local).

## 7. Message envoyé pendant un traitement en cours

🟡 **Besoin nouveau** — non couvert par la machine à états actuelle.
- Aucun état ne prévoit "message en attente d'application" pendant `WAITING_MODEL_RESPONSE` / `RUNNING_PLAN` / `ROTATING`.
- Deux options proposées, à trancher côté backend :
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

🟡 **Besoin nouveau**
- Trois lectures : sessions (`id`, `state`, `created_at`, `updated_at`, `user_id`), events (`id`, `session_id`, `type`, `ts`, `payload`), audit log (`id`, `event_type`, `prev_hash`, `hash`, `ts`).
- Deux formes possibles : endpoints dédiés (`GET /admin/sessions`, `/admin/events`, `/admin/audit`), ou accès direct documenté au fichier sqlite (chemin, schéma) si l'app doit rester utilisable même serveur backend éteint — à trancher côté backend.
- Usage : écran Live database.

## 12. Vidage de la base

🟡 **Besoin nouveau** — action destructive, dev/démo.
- Proposition : `POST /admin/reset-database`, volontairement séparé du reste de l'API, gardé par une confirmation front obligatoire.
- Niveau de garde-fou (à discuter) : probablement à ne pas exposer tel quel en usage réel sans reconfirmation supplémentaire côté backend (flag de config, environnement dev uniquement, etc.).
- Usage : bouton "Clear database" (écran Live database).

## 13. Reprise sur 401

🟢 **Existant** — cohérent avec le contrat de transport (ADR-004).
- Le front rejoue le dernier appel en attente une fois un nouveau jeton fourni, sans perdre le fil de la conversation.
- Usage : pop-in 401.

## 14. `working_space`

🟡 **Besoin nouveau** — à rapprocher du chantier ADR-024 (scratch dir / `AGENTIC_SCRATCH_DIR`, pas encore écrit côté backend).
- Un dossier de travail temporaire, injecté dans le message utilisateur comme `working_space`, nettoyé automatiquement en fin de tâche.
- Ne pas coder cette partie front tant que le contrat n'est pas fixé des deux côtés.
- Usage : champ Working folder (Sign in, étape 2).

## 15. Branding (nom / icône)

⚪ **Aucun besoin backend pour la v1** — choix purement local à l'installation front, non persisté entre machines.
- Optionnel plus tard, seulement si un besoin de synchronisation multi-poste se confirme : `GET/PUT /me/preferences` ou équivalent.

## Résumé — ce qui bloque une v1 branchée

Par ordre de dépendance probable pour débloquer le plus d'écrans d'un coup :

1. **Identité + modèles + flag credentials** (§1, §2) — débloque Sign in en entier.
2. **Session / interruption / flux live / plan** (§5, §6, §8, §9) — déjà existants, à vérifier route par route en premier : c'est probablement ce qui débloque le plus vite Chat et Debug.
3. **Skills, effort, `working_space`** (§3, §4, §14) — trois petits contrats indépendants, aucun ne bloque les autres.
4. **Message pendant traitement** (§7) — décision de conception à prendre avant tout code front sur ce point précis.
5. **Live database** (§11, §12) — un écran isolé, aucune dépendance avec le reste.
