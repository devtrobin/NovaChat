# Workflows

## 1. Démarrage

```text
Electron ready
  -> migration des données vers userData
  -> migration/chiffrement de la clé OpenAI
  -> createMainWindow
  -> renderer React
  -> LoadingScreen
  -> nova:ping
  -> WorkspaceLayout
  -> chat.load + settings.load
  -> abonnement nova:ai:event
```

Avant de créer la fenêtre, le main exécute les migrations versionnées des
données et du secret. Une erreur affiche une boîte de dialogue et reste
journalisable/récupérable ; aucune copie en clair de la clé n’est supprimée
tant que le coffre n’a pas été relu avec succès.

Le boot renderer exécute uniquement le ping IPC réel, avec un timeout de trois
secondes et une action de reprise en cas d’erreur. Après hydratation, toute
modification des conversations déclenche une sauvegarde complète si aucune
récupération de stockage n’est en attente.

Fichiers :

- `src/index.ts`
- `src/renderer/App.tsx`
- `src/renderer/components/LoadingScreen/`
- `src/renderer/components/WorkspaceLayout/useWorkspaceHydration.ts`

## 2. Message utilisateur vers réponse directe

```text
ChatInput
  -> onSendMessage
  -> window.nova.ai.runTurn
  -> nova:ai:run-turn
  -> runTurn
  -> generateOpenAIReply
  -> ProviderResponse(to=user)
  -> append-messages
```

Étapes :

1. le draft est vidé et la conversation passe en état d’envoi ;
2. le main charge les settings et déchiffre la clé uniquement dans son
   contexte runtime ;
3. Nova crée le message user et un message système de progression ;
4. la conversation complète est transformée en JSON pour OpenAI ;
5. OpenAI doit renvoyer un objet Nova minifié ;
6. le parser accepte une réponse user ou un handoff agent/ael ;
7. les traces API sont attachées au message user et au message final ;
8. le renderer applique les événements puis auto-sauvegarde.

Le titre devient les 36 premiers caractères du premier prompt visible.

## 3. Handoff vers l’ACP

L’ACP peut être demandé par la réponse OpenAI :

```json
{"from":"assistant","to":"agent","agentId":"agent-acp","content":"..."}
```

Un handoff peut aussi être forcé au premier cycle si :

- ACP est activé ;
- le prompt dépasse 140 caractères ou contient un signal heuristique
  (`analyse`, `debug`, `plan`, `refactor`, etc.) ;
- aucun résultat agent/ael n’est déjà présent dans le tour ;
- la réponse assistant ne mentionne pas déjà l’ACP.

L’ACP reçoit son contexte, la plateforme, le shell, la demande et le
prompt utilisateur. Il renvoie un format textuel :

```text
STATUS: ready|needs-info|blocked
SUMMARY: ...
AGENT: agent-ael|none
MODE: goal|command|analysis|none
GOAL: ...
REQUEST: ...
SUCCESS: ...
MISSING:
- ...
COMPLETED:
- ...
DEBUG: ...
```

Nova parse le plan :

- invalide : réponse d’erreur explicative à l’utilisateur ;
- `needs-info` : question/résumé à l’utilisateur ;
- `blocked` : message de blocage ;
- `none` : réponse avec le résumé ;
- `agent-ael` : délégation de `REQUEST`.

Une signature des étapes déjà exécutées empêche la répétition exacte dans un
tour.

## 4. Handoff vers l’AEL

L’AEL reçoit l’un des deux formats :

- commande exacte, mode `command` ;
- objectif, généralement préfixé `GOAL:`, mode `goal`.

Pour un objectif, `generateAELAgentCommand` effectue un appel OpenAI dédié
et exige uniquement une commande shell en texte brut.

La commande passe ensuite dans :

```text
evaluateCommandPermissionPolicy
  ├── allow -> exécution
  ├── ask -> règle exacte mémorisée ?
  │   ├── allow -> exécution
  │   ├── deny -> refus
  │   └── absente -> demande utilisateur
  └── ask-always -> demande utilisateur systématique
```

Chaque résultat contient aussi une catégorie de risque : `read-local`,
`workspace-write`, `network`, `system`, `destructive` ou `unclassified`. La
catégorie la plus risquée des segments shell est conservée et présentée dans
la demande de permission. `destructive` et `unclassified` restent toujours
non mémorisables.

Après exécution, l’AEL crée :

- un message de commande/progression visible ;
- un message agent de synthèse vers l’assistant ;
- une conversation interne assistant/agent ;
- une entrée d’historique.

Nova réinjecte le résultat dans `turnMessages` et relance un cycle assistant
pour produire la réponse finale.

## 5. Permission utilisateur

Le main ajoute un message système avec :

- `Oui` → `allow`, ponctuel ;
- `Oui permanent` → `allow-always`, mémorisé seulement pour une commande
  classée `ask` ;
- `Non` → `deny`.

La promesse du tour reste en attente jusqu’à la décision. Une seule permission
peut être active par conversation principale.

Pour une commande classée `ask`, `Non` refuse uniquement l’exécution courante.
`Toujours refuser` est la seule action qui enregistre une règle permanente.

Les commandes `ask-always` redemandent toujours une permission, même si une
règle existe.

## 6. Exécution locale

`startAELCommand` :

1. normalise la commande ;
2. rejette seulement vide/NUL ;
3. choisit le shell ;
4. spawn le processus avec stdin/stdout/stderr en pipes ;
5. enregistre la commande en mémoire ;
6. accumule une fin bornée de stdout et stderr ;
7. émet la progression ;
8. applique le timeout actif configuré et le suspend pendant une attente de
   saisie ;
9. arrête récursivement l’arbre de processus sur kill ou timeout ;
10. produit `AELCommandResult`.

Une sortie terminant par `password:`, `mot de passe:`, `passphrase:`, `?` ou
`:` peut passer le message en `waiting-input`. Le renderer renvoie alors la
valeur via `submitCommandInput`.
Le timeout est alors réarmé. La détection reste heuristique et ne remplace pas
un pseudo-terminal pour une application interactive générale.

## 7. Commandes slash locales et `/cmd`

Les commandes suivantes sont résolues localement, avant la validation de la
configuration OpenAI :

```text
/help [commande]
/status
/agents
/settings
```

`/aide`, `/commands`, `/?`, `/etat` et `/parametres` sont des alias. Une
commande slash inconnue produit une aide locale au lieu d’être envoyée au
provider. `/settings` affiche l’action existante permettant d’ouvrir les
paramètres.

Un prompt correspondant à `/cmd <commande>` ne fait aucun appel OpenAI et ne
passe pas par les permissions de l’agent.

```text
user /cmd
  -> runDirectCommandTurn
  -> executeAELCommand
  -> résultat ael -> user
```

La commande reste soumise au contrôle minimal de `assertCommandAllowed`.

## 8. Arrêt d’un tour ou d’une tâche

`ai.turn-registry.ts` associe à un tour :

- conversation principale ;
- tâches agent ;
- abort controllers provider ;
- commandes locales ;
- demande de permission ;
- conversations agents internes.

Un arrêt depuis le chat ou la vue activité :

1. marque le tour arrêté ;
2. abort les requêtes provider ;
3. résout la permission en `cancel` ;
4. tue toutes les commandes connues ;
5. propage `TurnStoppedError` ;
6. ajoute un message système d’interruption.

Le registre est en mémoire : un redémarrage ne restaure pas un tour.

## 9. Persistance du chat principal

Chargement :

1. lire le dossier configuré ;
2. fallback vers le dossier de référence ;
3. lire chaque JSON, avec tentative du `.bak` si le primaire est invalide ;
4. archiver les fichiers corrompus et journaliser les anomalies ;
5. découvrir aussi les dossiers non indexés ;
6. détecter toute donnée indexée mais absente ou illisible ;
7. reconstruire et trier les messages ;
8. si l’état est partiel, afficher une bannière et verrouiller la racine ;
9. fallback vers une conversation d’accueil en l’absence de données.

Sauvegarde :

1. filtrer les messages système ;
2. mettre la sauvegarde dans la queue du handler ;
3. refuser l’écriture si une récupération n’a pas été acknowledged ;
4. appliquer rétention, plafond et redaction aux traces API ;
5. synchroniser le dossier de référence par écritures atomiques ;
6. écrire l’index de référence sous `userData` ;
7. synchroniser le dossier configuré s’il diffère.

L’acknowledgement retire le verrou après inspection utilisateur ; il ne
reconstitue pas les données illisibles.

## 10. Persistance et vues agent

`loadWorkspace(agentId)` crée les fichiers manquants et renvoie :

- contexte ;
- permissions ;
- conversations internes ;
- historique.

Les opérations sont mises dans une queue par racine/agent. La lecture de
l’état, sa modification et les écritures associées forment ainsi une section
critique qui évite les écrasements entre tâches concurrentes.

Une récupération partielle produit la même bannière que le chat principal et
bloque les mutations du workspace concerné jusqu’à acknowledgement.

Les pages ACP et AEL interrogent les tâches actives chaque seconde et
se rafraîchissent aussi après un événement IA.

La vue globale `AgentsActivityView` agrège les deux workspaces, conserve les 24
entrées récentes et permet l’arrêt d’une tâche.

## 11. Conversations internes agent

Les tâches ACP et AEL créent automatiquement une conversation interne
d’origine `assistant`. Elle sert à :

- conserver les demandes et résultats successifs d’un même tour ;
- rattacher les traces provider aux messages de l’agent ;
- reconstruire le contexte d’une étape après un handoff.

Ces conversations sont pilotées par l’orchestrateur et restent en lecture
seule côté renderer. Aucun canal IPC de conversation directe n’est exposé.

## 12. Settings

Chargement :

1. defaults sous `app.getPath("userData")` ;
2. fichier de référence ;
3. merge et compatibilité de schéma ;
4. éventuel fichier configuré ;
5. calcul de `apiKeyConfigured` depuis le coffre, sans exposer la clé.

Sauvegarde UI :

1. validation des chemins agents/conversations/settings et des limites locales ;
2. sauvegarde indépendante du réseau ; le test OpenAI est une action séparée,
   annulée automatiquement après dix secondes ;
3. si une nouvelle clé a été saisie, chiffrement et relecture de vérification ;
4. suppression de la valeur transitoire ;
5. écriture atomique du fichier de référence et de l’éventuel fichier
   secondaire ;
6. retour au renderer des settings publics sans secret.

Une action séparée supprime la clé du coffre. Au premier démarrage après mise à
jour, la migration recherche aussi l’ancienne clé dans les settings de
référence et personnalisés, la sécurise, puis nettoie les primaires et backups
en clair.

## 13. Navigation et messages non lus

- `AppSidebar` pilote les sections et catégories.
- Sélectionner une conversation la marque comme lue.
- Atteindre le bas du scroll la marque aussi comme lue.
- Une conversation affiche un loader si elle contient un message système
  `running`.
- `hideInternalConversations` filtre les messages dont la visibilité résolue
  vaut `internal`, sans modifier le stockage. Les permissions, saisies,
  progressions publiques et résultats d’un `/cmd` utilisateur restent visibles.

## 14. Cible ARI 6.2 — recherche publique et privée, non implémentée

Contrat de référence : [spécification technique ARI](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md).

Recherche publique : Nova reçoit une demande, le main crée l’enveloppe,
examine l’URL directe éventuelle puis Google si nécessaire, contrôle les
candidats, extrait le texte et retourne sources/faits/limites. Aucun script de
page n’est exécuté. Les sites demandant un compte deviennent des tentatives
structurées et peuvent produire un brouillon inactif ; les alternatives
publiques sont poursuivies.

Recherche privée : choisir le compte Outlook, vérifier les accords, connecter
par OAuth si nécessaire, interroger Graph via curl puis soumettre les seuls
extraits utiles au provider autorisé. Aucun passage par Google. Le résultat
et ses dérivés conservent la provenance privée jusque dans la conversation.

Une demande issue d’ACP/AEL passe par Nova/main, met le parent en attente puis
le reprend une seule fois. L’identité du véritable demandeur est préservée.
Arrêter le tour ou révoquer un accès annule les opérations concernées ; aucune
reprise automatique après redémarrage. Les interfaces Credentials et Accès
accordés rendent les droits persistants consultables et révocables.
