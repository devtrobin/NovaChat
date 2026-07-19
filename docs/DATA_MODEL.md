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
- `visibility` : `public` ou `internal`, contrat d’affichage indépendant de
  l’expéditeur et du destinataire ;
- `lifecycleLog` : journal métier ;
- `apiRequests` : requêtes et réponses provider brutes.

Les messages `system` sont transitoires : le renderer les filtre avant
persistance et au chargement. Pour les anciens messages sans `visibility`, le
renderer applique une règle déterministe : messages agent et échanges vers
assistant internes, messages utilisateur, réponses finales, permissions,
saisies et Device vers utilisateur publics.

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

Chaque JSON est remplacé atomiquement et son dernier contenu valide est
conservé dans `<fichier>.bak`. Un primaire invalide est copié sous un nom
`.corrupt-<date>.bak`, puis le reader tente le backup. Les erreurs sont
journalisées dans `userData/logs/storage-errors.jsonl`.

Un état récupéré avec un fichier invalide ou une donnée indexée manquante
contient un `StorageRecoveryNotice`. Les écritures sur la racine sont alors
bloquées jusqu’à acknowledgement par `chat.acknowledgeRecovery`, afin que
l’auto-sauvegarde ne supprime pas silencieusement les données non chargées.

Un second index de référence est aussi écrit sous `userData` :
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

Toutes les opérations d’un même agent sont sérialisées par racine et ID afin
d’éviter deux cycles lecture-modification-écriture concurrents.

L’ancien identifiant `diagnostic-agent` est migré une seule fois. Son dossier
est déplacé dans `agents/.migration-backups/`, puis copié ou fusionné dans
`agent-planner` avec déduplication des permissions, historiques et
conversations.

## Settings

`AppSettings` contient :

```text
activeProvider
agents.agent-planner.enabled
agents.device-agent.enabled
apiTrace.enabled
apiTrace.retentionDays
apiTrace.maxEntriesPerMessage
apiTrace.redactSensitiveData
deviceExecution.maxOutputCharacters
deviceExecution.timeoutMs
hideInternalConversations
localFiles.settingsPath
localFiles.conversationsDirectory
localFiles.agentsDirectory
openai.apiKeyConfigured
openai.apiKeyUpdate (transitoire, jamais écrit)
openai.baseUrl
openai.model
previewMode
```

Seul OpenAI est implémenté et `activeProvider` est typé par
`ActiveAIProviderId`, actuellement limité à `openai`. Les valeurs Anthropic,
Google, Mistral, Ollama et LM Studio appartiennent à
`PlannedAIProviderId` : elles sont affichées comme « à venir », mais ne peuvent
pas traverser la validation IPC comme provider actif.

Le fichier de référence est toujours lu en premier. S’il indique un
`localFiles.settingsPath` différent, ce second fichier devient la
configuration active. Lors d’une sauvegarde, Nova écrit le fichier de
référence puis le fichier configuré.

Les valeurs par défaut de settings, conversations et agents sont sous
`app.getPath("userData")`. La clé OpenAI est stockée séparément dans
`userData/secrets/openai-api-key.json`, chiffrée par `electron.safeStorage`.
Le renderer ne reçoit que `apiKeyConfigured`; `OpenAIRuntimeSettings.apiKey`
n’existe que dans le main, après déchiffrement.

## API preload / IPC

Le contrat public du renderer est `window.nova`, exposé par
`src/preload.ts`.

| Domaine | Opérations |
| --- | --- |
| `ping` | test de disponibilité du main |
| `chat` | `load`, `save`, `acknowledgeRecovery` |
| `settings` | `load`, `save`, `test`, `clearOpenAIApiKey` |
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

Les appels de l’assistant principal et des agents textuels peuvent attacher le
payload de requête et la réponse à `apis.json`. Les traces de génération de
commande Device sont fusionnées avec celles de la délégation et rattachées au
message final. Le test de connexion ne persiste aucune trace.

Avant écriture, `apiTrace` peut supprimer toutes les traces, retirer celles
plus anciennes que `retentionDays`, garder au plus
`maxEntriesPerMessage` entrées et masquer champs sensibles, Bearer tokens et
clés de forme `sk-*`. Ces règles s’appliquent au chat principal et aux agents.

Les résultats réinjectés au provider sont tronqués à 4 000 caractères. La
sortie de commande conservée en mémoire est également plafonnée par
`deviceExecution.maxOutputCharacters`. Les prompts et réponses fonctionnels
restent potentiellement sensibles même après la redaction ciblée des secrets.
