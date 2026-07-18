# Modèle de données et contrat IPC

## Messages Nova

Le type central est `ChatMessage` dans `src/shared/chat.types.ts`. Il constitue
le contrat commun importé par `main`, `preload` et `renderer`.

Champs obligatoires :

| Champ | Rôle |
| --- | --- |
| `id` | UUID ou identifiant stable du message |
| `from` | `user`, `assistant`, `agent`, `device` ou `system` |
| `to` | `user`, `assistant`, `agent` ou `device` |
| `content` | contenu principal ou commande |
| `createdAt` | date ISO |

Champs structurants optionnels :

- `agentId` : `agent-planner` ou `device-agent` dans les flux actuels ;
- `status` : état UI/exécution (`pending`, `running`, `waiting-input`,
  `success`, `partial-success`, `error`, etc.) ;
- `result` : résultat détaillé, souvent repliable ;
- `commandId` et champs `input*` : commande locale interactive ;
- `actions` / `actionType` : actions système, notamment permissions ;
- `lifecycleLog` : journal métier ;
- `apiRequests` : requêtes et réponses provider brutes.

Les messages `system` sont transitoires : le renderer les filtre avant
persistance et au chargement.

## Conversations

Une `Conversation` contient :

- `id`, `title`, `createdAt`, `updatedAt` ;
- `draft` ;
- `lastReadAt` pour les indicateurs de non-lu ;
- `origin` pour distinguer conversation principale et conversation interne ;
- `messages`.

`PersistedChatState` contient la liste et `activeConversationId`.

## Stockage des conversations principales

Le dossier configuré par `localFiles.conversationsDirectory` suit cette
structure :

```text
conversations/
  conversations.json
  <conversation-id>/
    <timestamp>__<message-id>/
      message.json
      log.json
      apis.json
```

L’index contient les métadonnées de conversation et l’ordre des IDs de
messages. Le contenu, le journal et les traces API sont volontairement
séparés.

Le writer réécrit l’arbre complet à chaque sauvegarde et supprime les dossiers
absents de l’état fourni. Les sauvegardes du chat principal sont sérialisées
par une queue dans `chat.handlers.ts`.

Un second index de référence est aussi écrit à la racine de l’application :
`conversations.json`.

## Stockage des agents

Sous `localFiles.agentsDirectory` :

```text
agents/
  agent-planner/
    contexte.json
    permissions.json
    historique.json
    conversations/
      conversations.json
      ...
  device-agent/
    contexte.json
    permissions.json
    historique.json
    conversations/
      conversations.json
      ...
```

- `contexte.json` contient `name`, `description`, `instructions`.
- `permissions.json` contient des règles exactes par chaîne de commande.
- `historique.json` contient les résultats et les liens vers conversation
  source, message déclencheur et conversation interne.
- `conversations/` réutilise le même stockage éclaté que le chat principal.

Une compatibilité partielle existe avec l’ancien identifiant
`diagnostic-agent` : le flag `enabled` et les réponses provider sont
normalisés vers `agent-planner`, mais le dossier de données historique n’est
pas migré automatiquement.

## Settings

`AppSettings` contient :

```text
activeProvider
agents.agent-planner.enabled
agents.device-agent.enabled
deviceExecution.maxOutputCharacters
deviceExecution.timeoutMs
hideInternalConversations
localFiles.settingsPath
localFiles.conversationsDirectory
localFiles.agentsDirectory
openai.apiKey
openai.baseUrl
openai.model
previewMode
```

Seul OpenAI est implémenté. `activeProvider` peut néanmoins contenir les
valeurs de providers affichés en preview ; le tour IA continue actuellement
d’utiliser `settings.openai`.

Le fichier de référence est toujours lu en premier. S’il indique un
`localFiles.settingsPath` différent, ce second fichier devient la
configuration active. Lors d’une sauvegarde, Nova écrit le fichier de
référence puis le fichier configuré.

## API preload / IPC

Le contrat public du renderer est `window.nova`, exposé par
`src/preload.ts`.

| Domaine | Opérations |
| --- | --- |
| `ping` | test de disponibilité du main |
| `chat` | `load`, `save` |
| `settings` | `load`, `save`, `test` |
| `ai` | `runTurn`, `stopTurn`, événements, permission, stdin, kill |
| `agents` | workspace, contexte, permissions, tâches actives |

Les événements `nova:ai:event` sont :

- `append-messages` ;
- `replace-message` ;
- `remove-message` ;
- `set-title`.

Le renderer les applique dans
`src/renderer/services/chat/chat.events.ts`.

Les handlers valident chaque argument IPC à l’exécution : forme des objets,
types, énumérations, longueurs, volume sérialisé, identifiants et chemins
absolus. Les chemins construits à partir d’identifiants sont en plus confinés à
leur racine de stockage.

Le contrat public ne contient aucun canal Device direct ni API de conversation
agent sans interface. Toute exécution locale passe par le flux `ai` dans le
main et par les contrôles de permission associés.

## Traces et volumétrie

Les appels de l’assistant principal et des agents textuels attachent le
payload de requête et la réponse complète à `apis.json`. Les traces de
génération de commande Device sont fusionnées avec celles de la délégation,
rattachées au message final et persistées dans la conversation agent. Le test
de connexion ne persiste aucune trace.

Les résultats envoyés au provider sont tronqués à 4 000 caractères, mais les
traces locales persistées ne le sont pas. Les sorties de commande ne sont pas
plafonnées non plus.

Cette observabilité est utile pour le debug, mais elle peut faire croître
rapidement le stockage et conserver des données sensibles présentes dans les
conversations ou les réponses provider.
