# Workflows

## 1. Démarrage

```text
Electron ready
  -> createMainWindow
  -> renderer React
  -> LoadingScreen
  -> nova:ping
  -> WorkspaceLayout
  -> chat.load + settings.load
  -> abonnement nova:ai:event
```

Le boot exécute uniquement le ping IPC réel, avec un timeout de trois secondes
et une action de reprise en cas d’erreur. Après hydratation, toute modification
des conversations déclenche une sauvegarde complète.

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
2. le main charge les settings ;
3. Nova crée le message user et un message système de progression ;
4. la conversation complète est transformée en JSON pour OpenAI ;
5. OpenAI doit renvoyer un objet Nova minifié ;
6. le parser accepte une réponse user ou un handoff agent/device ;
7. les traces API sont attachées au message user et au message final ;
8. le renderer applique les événements puis auto-sauvegarde.

Le titre devient les 36 premiers caractères du premier prompt visible.

## 3. Handoff vers le Planner

Le Planner peut être demandé par la réponse OpenAI :

```json
{"from":"assistant","to":"agent","agentId":"agent-planner","content":"..."}
```

Un handoff peut aussi être forcé au premier cycle si :

- Planner est activé ;
- le prompt dépasse 140 caractères ou contient un signal heuristique
  (`analyse`, `debug`, `plan`, `refactor`, etc.) ;
- aucun résultat agent/device n’est déjà présent dans le tour ;
- la réponse assistant ne mentionne pas déjà le Planner.

Le Planner reçoit son contexte, la plateforme, le shell, la demande et le
prompt utilisateur. Il renvoie un format textuel :

```text
STATUS: ready|needs-info|blocked
SUMMARY: ...
AGENT: device-agent|none
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
- `device-agent` : délégation de `REQUEST`.

Une signature des étapes déjà exécutées empêche la répétition exacte dans un
tour.

## 4. Handoff vers le Device

Le Device reçoit l’un des deux formats :

- commande exacte, mode `command` ;
- objectif, généralement préfixé `GOAL:`, mode `goal`.

Pour un objectif, `generateDeviceAgentCommand` effectue un appel OpenAI dédié
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

Après exécution, le Device crée :

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

`startDeviceCommand` :

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
10. produit `DeviceCommandResult`.

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
  -> executeDeviceCommand
  -> résultat device -> user
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
3. lire l’index s’il existe ;
4. découvrir aussi les dossiers non indexés ;
5. reconstruire et trier les messages ;
6. fallback vers une conversation d’accueil.

Sauvegarde :

1. filtrer les messages système ;
2. mettre la sauvegarde dans la queue du handler ;
3. synchroniser le dossier de référence ;
4. écrire l’index de référence à la racine ;
5. synchroniser le dossier configuré s’il diffère.

## 10. Persistance et vues agent

`loadWorkspace(agentId)` crée les fichiers manquants et renvoie :

- contexte ;
- permissions ;
- conversations internes ;
- historique.

Les pages Planner et Device interrogent les tâches actives chaque seconde et
se rafraîchissent aussi après un événement IA.

La vue globale `AgentsActivityView` agrège les deux workspaces, conserve les 24
entrées récentes et permet l’arrêt d’une tâche.

## 11. Conversations internes agent

Les tâches Planner et Device créent automatiquement une conversation interne
d’origine `assistant`. Elle sert à :

- conserver les demandes et résultats successifs d’un même tour ;
- rattacher les traces provider aux messages de l’agent ;
- reconstruire le contexte d’une étape après un handoff.

Ces conversations sont pilotées par l’orchestrateur et restent en lecture
seule côté renderer. Aucun canal IPC de conversation directe n’est exposé.

## 12. Settings

Chargement :

1. defaults ;
2. fichier de référence ;
3. merge et compatibilité `diagnostic-agent` ;
4. éventuel fichier configuré.

Sauvegarde UI :

1. validation des chemins conversations/settings ;
2. si provider actif OpenAI, test réseau obligatoire ;
3. écriture du fichier de référence et de l’éventuel fichier secondaire.

Le chemin `agentsDirectory` n’est pas validé comme non vide aujourd’hui.

## 13. Navigation et messages non lus

- `AppSidebar` pilote les sections et catégories.
- Sélectionner une conversation la marque comme lue.
- Atteindre le bas du scroll la marque aussi comme lue.
- Une conversation affiche un loader si elle contient un message système
  `running`.
- `hideInternalConversations` filtre les délégations, messages agent et tous
  les messages device dans la vue active, sans modifier le stockage.
