# Spec fonctionnelle du front — v1

Document de confrontation : ce que le front fait et montre, écran par écran, indépendamment de comment c'est codé. Objectif : que l'équipe backend puisse la lire et dire "ça, ça marche avec ce qu'on a" / "ça, il nous manque quelque chose". Le détail technique (composants, state, endpoints) est dans [implementation-spec.md](implementation-spec.md) ; la liste précise de ce qu'il faut côté API est dans [contrat-interface.md](contrat-interface.md). Les décisions et leur historique sont dans [frontend-plan.md](frontend-plan.md).

Maquette interactive à jour : https://claude.ai/artifact/BM8TgxFcFNHX5GyZAu5BJT (accès restreint au compte propriétaire).

## 1. Objectif et périmètre

Une application installée localement (poste de l'utilisateur), qui parle à un serveur `agentic-local-app` tournant sur la même machine. Elle sert deux besoins :

- **Utiliser** le backend — poser une question, obtenir une réponse, sans avoir à connaître le protocole.
- **Superviser / diagnostiquer** le backend — voir exactement ce qu'il fait, tâche par tâche, en temps réel, et comprendre après coup pourquoi quelque chose a échoué.

Un seul utilisateur local par installation. Pas de multi-poste, pas de compte distant pour la v1.

## 2. Les deux utilisateurs

| | Chat | Debug |
|---|---|---|
| Besoin | Poser une question, avoir une réponse | Comprendre ce qui s'exécute, ou pourquoi ça a échoué |
| Ce qu'il voit | Un fil de conversation, un résumé de plan | L'état complet : conversation / plan / tâches / flux protocolaire brut |
| Fréquence | Au quotidien | Ponctuel, au moment d'un problème |

Les deux vues partagent la même session active — passer de l'une à l'autre ne recharge rien, ne perd rien.

## 3. Parcours utilisateur

```
Welcome  →  Sign in (étape 1)  →  Sign in (étape 2)  →  Connecting  →  Chat ↔ Debug ↔ History → Event detail
  (0)          (1)                     (1b)                (2)              (3)    (4)    (5)        (6)

À tout moment depuis Chat / Debug / History / State machine / Live database :
  → menu utilisateur → Welcome | Sign in | State machine | Live database | Reset configuration

Événement transverse, à tout moment en session :
  → jeton expiré → session mise en pause → bandeau + pop-in d'identifiants → reprise, aucune perte de contexte
```

Le parcours n'est linéaire qu'à la première connexion. Ensuite, l'utilisateur entre directement sur Chat (dernière session) et navigue librement entre les écrans via la barre du haut et le menu utilisateur.

## 4. Écran par écran

### 0 — Welcome
Premier écran, avant toute authentification. Récupère un état local existant s'il y en a un (chargement bref), sinon propose de choisir : un nom d'application, un petit label, une icône (6 propositions). Aperçu en direct du rendu réel (panneau de connexion + barre d'en-tête). Aucune valeur n'est imposée ; des valeurs par défaut existent (`Console` / `OPS`) si l'utilisateur ne personnalise rien. Un bouton continue vers Sign in.

*Rejouable* depuis le menu utilisateur (`App identity — name & icon`), à tout moment.

### 1 — Sign in, étape 1 : identité, modèle, credentials
- **User ID** : pré-rempli automatiquement depuis l'utilisateur du système, éditable. Devient l'identifiant de conversation.
- **Modèle** : liste de cartes sélectionnables, aucune présélection. Chaque carte indique si un jeton est nécessaire ou non.
- **Access token** : n'apparaît que si le modèle choisi le nécessite. Sinon, une note explicative ("This model manages its own authentication") le remplace.
- Lien retour vers Welcome. Bouton "Continue" vers l'étape 2.

### 1b — Sign in, étape 2 : espace de travail et réglages
- **Working folder** : dossier de travail optionnel, sur lequel le modèle va intervenir.
- **Skills** : liste optionnelle de fichiers de compétences mis à disposition du modèle (ajout/suppression).
- **Réglages avancés** : budget de session, comportement de fin de session, niveau d'effort (Low / Med / High).
- Lien retour vers l'étape 1. Bouton "Sign in" — soumission finale, lance la connexion.

*Pourquoi deux étapes* : un seul écran portait tous ces champs et débordait verticalement selon la configuration. Scindé pour que chaque étape tienne, et se lise comme une seule décision à la fois.

### 2 — Connecting
Affiche la séquence réelle de connexion : validation du jeton → création de session → premier appel au modèle. Pas un simple spinner générique.

- **Première authentification** : un guide de 6 cartes, navigable (flèches, puces, avance automatique) : ce qu'est l'application, les deux vues (Chat/Debug), pourquoi la traçabilité compte, les états possibles d'une conversation en un coup d'œil, les fonctionnalités de contrôle (interruption, diagramme de plan, audit chaîné, identité personnalisable).
- **Connexions suivantes** : état minimal, spinner + checklist, pas de guide.

### 3 — Chat
Fil de conversation simple. Le modèle répond avec un résumé de plan en langage clair et un lien vers le détail (vue Debug) si besoin.

**Contrôle pendant le traitement** (nouveau) :
- Un indicateur d'état cliquable montre la phase courante (traitement / terminé / interrompu).
- **Stop** : interrompt la session en cours à tout instant pendant le traitement.
- **Envoi pendant le traitement** : le composeur reste actif ; un message envoyé pendant que la session traite est accepté, avec un indice explicite qu'il sera pris en compte à la fin du cycle en cours, sauf interruption volontaire.

**Fin de session** : un choix explicite ("Continue chatting" / "New session"), jamais un arrêt automatique de l'application elle-même.

### 4 — Debug
Vue complète et live : état de la conversation, plan en cours (liste ou graphe de dépendances, au choix, mêmes données), chaque tâche et son statut, flux protocolaire et audit bruts côte à côte. Une tâche en échec est visible immédiatement, avec l'erreur.

### 5 — History
Timeline en langage clair d'une session passée ("plan reçu", "tâche échouée", "réponse finale reçue"). Filtrable/consultable sans avoir à interroger la base à la main.

### 6 — Event detail
Détail brut d'un événement de la timeline : message envoyé au modèle, sa réponse, le contexte d'exécution.

### 401 — Jeton expiré
Quand le modèle refuse un appel en 401, la session est **mise en pause** côté backend : rien n'est perdu — conversation, cycle, message en attente et plans restent tels quels. Chat l'affiche en bandeau (quelle opération a été refusée, avec quel code, depuis quand), la pastille de phase dit « Paused », et une pop-in demande les identifiants que le modèle déclare. C'est le **bouton d'envoi** qui la rouvre si elle a été fermée : envoyer, ici, veut dire reprendre. La conversation continue exactement où elle en était. Un jeton encore invalide remet simplement en pause — un nouvel essai, pas une panne.

### — State machine reference (menu utilisateur)
Écran de documentation vivante, sans action mutante. Montre les quatre machines à états réelles du backend (conversation — 11 états —, plan, tâche, fenêtre de contexte) avec leurs transitions exactes, et un panneau fixe donnant le cycle courant (`cycle_id`, `cycle_type`, statut) et le budget de session (`max_cycles`, `max_plans`, `max_total_duration_ms`) avec sa consommation. Construit à partir de la spec backend (`spec-v1.1.md` §5.1–5.4, §4.1) — pas une simplification inventée.

### — Live database (menu utilisateur)
Lecture seule des trois tables locales : sessions, events, audit log (avec vérification de la chaîne de hash affichée). Une action **Clear database**, gardée par une confirmation qui prévient explicitement que même les sessions en cours seraient supprimées — irréversible, pensée pour le dev/la démo.

### — Menu utilisateur (transverse)
Accessible depuis l'avatar sur Chat / Debug / History / State machine / Live database. Regroupe : identité & icône (Welcome), modèle & transport (Sign in étape 1), la référence machine à états, la base live, et — séparé, en rouge — **Reset configuration** (avec confirmation), qui interrompt la session en cours puis renvoie vers Welcome.

## 5. États affichés (résumé)

Le front n'invente aucun état : il reflète ceux du backend (spec v1.1 §5).

- **Conversation** : `NEW → ACTIVE → WAITING_MODEL_RESPONSE → RUNNING_PLAN → …` avec les branches `ROTATING`, `WAITING_USER`, `INTERRUPTED → READY`, `COMPLETED → CLOSED`, et `FAILED` depuis n'importe quel état. Détail complet sur l'écran State machine.
- **Plan** : `PENDING → RUNNING → {COMPLETED, STOPPED_ON_FAILURE, SHORT_CIRCUITED_ON_SUCCESS, INTERRUPTED, FAILED}`.
- **Tâche** : `PENDING → [WAITING_DEPENDENCY] → RUNNING → {COMPLETED, FAILED, TIMED_OUT, CANCELLED, INTERRUPTED, SKIPPED}`.
- **Fenêtre de contexte** : `HEALTHY → WARNING → SATURATED` (déclenche une rotation, retour à `HEALTHY`).

Le carrousel de première connexion (écran 2) en montre une version volontairement simplifiée (5 états sur le chemin nominal) à but pédagogique ; l'écran State machine est la référence complète.

## 6. Ce qui est purement local vs ce qui dépend du backend

**Purement local, aucun besoin backend pour la v1** : le choix de branding (nom/icône), le thème clair/sombre, l'état "guide déjà vu", le mode du panneau plan (liste/diagramme — construit à partir de données déjà exposées).

**Dépend du backend** : tout le reste — voir [contrat-interface.md](contrat-interface.md) pour le détail précis, requête par requête, avec ce qui existe déjà et ce qui est un besoin nouveau.

## 7. Hors périmètre v1

Multi-utilisateur / multi-poste ; édition du protocole ou des ADR depuis le front ; authentification autre que jeton porteur simple ; édition de fichiers de skills depuis l'app (sélection seulement) ; édition de la base depuis Live database (lecture + vidage complet uniquement) ; synchronisation multi-poste du branding.
