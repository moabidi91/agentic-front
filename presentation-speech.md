# Speech de présentation

Script à utiliser en support d'une démo live du canvas (mode Play, écrans liés : Welcome → Sign in → Connecting → Chat → Debug → History → Event detail → 401). Structure volontairement générale → détail : on commence par ce que c'est et pourquoi, puis on descend écran par écran.

---

## 1. Accroche (30 secondes)

> "Ce qu'on va voir, c'est la console qu'on va utiliser pour piloter et surveiller notre backend d'orchestration de modèle. Aujourd'hui, ce backend tourne, il est testé, il est solide — mais on ne peut lui parler que par API ou en CLI. Cette application, c'est l'interface qui manque : un endroit où on peut discuter avec le modèle normalement, et un endroit où on peut voir, en direct, exactement ce qu'il est en train de faire."

**[Montrer : rien encore, ou l'écran Welcome si le canvas est déjà ouvert]**

## 2. Le rôle de l'application, en une phrase

> "Deux publics, deux écrans : quelqu'un qui veut juste poser une question et avoir une réponse utilise la vue Chat. Quelqu'un qui doit comprendre pourquoi une tâche a échoué, ou vérifier ce que le modèle a réellement exécuté, bascule en vue Debug — et voit tout, en temps réel."

## 3. Pourquoi ça compte

> "Le backend est déterministe et audité par conception : chaque action du modèle passe par un protocole strict, chaque événement est journalisé et chaîné par hash. Ça, c'est une garantie technique. Ce qui manquait, c'était de la rendre *visible* — sans avoir à lire des logs bruts ou interroger l'API à la main. C'est exactement ce que fait cette interface."

## 4. Welcome — avant même de se connecter

**[Montrer : Welcome.dc.html]**

> "Premier détail volontaire : l'application n'impose ni nom ni logo. Au tout premier lancement, une fois l'environnement local détecté, on demande à l'utilisateur de choisir lui-même comment l'app doit s'appeler et quelle icône l'accompagne — avec un aperçu qui se met à jour en direct, exactement comme ça sera affiché ensuite. Ce n'est pas un gadget : ça veut dire que cette console peut être déployée sous n'importe quelle identité, sans toucher au code, ce qui compte dès qu'on veut la déployer pour plusieurs équipes ou clients sans la lier à un nom de projet interne."

## 5. Sign in — l'entrée dans l'app

**[Montrer : Main.dc.html]**

> "Ensuite, l'écran de connexion. Deux choses à renseigner au minimum : qui on est — pré-rempli automatiquement depuis la session Windows — et le modèle qu'on veut utiliser, choisi dans une liste alimentée par le backend selon ce qui est configuré. Le champ d'authentification s'affiche ou disparaît selon le modèle choisi : certains transports gèrent leurs propres identifiants, d'autres non — on ne demande le jeton que quand il est réellement nécessaire. On peut aussi pointer vers un dossier de travail : c'est le projet sur lequel le modèle va intervenir, monté comme un espace temporaire et nettoyé automatiquement à la fin. Le reste — budget de session, comportement de fin de session, niveau d'effort — est optionnel, replié par défaut."

## 6. Connecting — la connexion elle-même

**[Montrer : Connecting.dc.html]**

> "Après Sign in, on ne saute pas directement à l'écran de chat : on montre ce qui se passe vraiment — validation du jeton, création de la session, premier échange avec le modèle. La toute première fois qu'on se connecte, on en profite pour montrer un guide rapide, en quatre cartes, qu'on peut parcourir à son rythme. Les fois suivantes, plus besoin : l'écran reste minimal, juste le temps de la connexion."

## 7. Chat — l'usage courant

**[Montrer : Chat.dc.html]**

> "C'est l'écran que la plupart des gens vont utiliser au quotidien : on écrit, le modèle répond, avec un résumé du plan qu'il a exécuté et un lien vers le détail si on veut creuser. Une fois la réponse finale reçue, l'app pose explicitement la question : on continue sur la même session, ou on en ouvre une nouvelle ? Dans tous les cas, l'application elle-même ne s'arrête jamais."

## 8. Debug — la supervision en direct

**[Montrer : Debug.dc.html]**

> "C'est le cœur de la proposition. En un clic, on bascule sur une vue complète et en temps réel : l'état de la conversation, le plan en cours d'exécution — en liste ou en diagramme de dépendances, au choix — avec chaque tâche et son statut, et le flux protocolaire brut à droite — chaque appel, chaque audit. Si une tâche échoue, c'est visible immédiatement, avec le détail de l'erreur."

## 9. History et Event detail — comprendre après coup

**[Montrer : History.dc.html puis EventDetail.dc.html]**

> "Tout ce qui s'est passé reste consultable. La vue History raconte la session en langage clair — 'plan reçu', 'tâche échouée', 'réponse finale reçue' — et chaque ligne s'ouvre sur le détail brut : le message envoyé au modèle, sa réponse, le contexte d'exécution. C'est ce qui permet de diagnostiquer un blocage sans avoir à fouiller une base de données à la main."

## 10. Le filet de sécurité — 401

**[Montrer : Modal401.dc.html]**

> "Dernier point : si le jeton expire en cours de route, l'app ne perd pas le fil. Une pop-in demande un nouveau jeton, et la conversation reprend exactement où elle en était."

## 11. Conclusion

> "En résumé : une identité que chacun peut faire sienne dès le premier lancement, une interface simple pour l'usage courant, une vision complète et honnête pour le diagnostic, et jamais de zone d'ombre sur ce que fait le modèle. C'est encore une maquette à ce stade — l'implémentation et le branchement avec le backend sont les prochaines étapes."

---

*Support : maquette interactive (canvas Claude), écrans liés en mode Play — voir [frontend-plan.md](frontend-plan.md) pour le lien.*
