# Modèle de données et contrat IPC

## Messages Nova

Le type central est `ChatMessage` dans `src/shared/chat.types.ts`. Il constitue
le contrat commun importé par `main`, `preload` et `renderer`.

Champs obligatoires :

| Champ | Rôle |
| --- | --- |
| `id` | UUID ou identifiant stable du message |
| `from` | `user`, `assistant`, `agent`, `ael` ou `system` |
| `to` | `user`, `assistant`, `agent` ou `ael` |
| `content` | contenu principal ou commande |
| `createdAt` | date ISO |

Champs structurants optionnels :

- `agentId` : `agent-acp` ou `agent-ael` dans les flux actuels ;
- `status` : état UI/exécution (`pending`, `running`, `waiting-input`,
  `success`, `partial-success`, `error`, etc.) ;
- `result` : résultat détaillé, souvent repliable ;
- `commandId` et champs `input*` : commande locale interactive ;
- `fileWritePreview` : chemin réel, contenu exact, taille UTF-8 et SHA-256
  pour une permission de création ; cet aperçu n'autorise aucune écriture ;
- `actions` / `actionType` : actions système, notamment permissions ;
- `visibility` : `public` ou `internal`, contrat d’affichage indépendant de
  l’expéditeur et du destinataire ;
- `lifecycleLog` : journal métier ;
- `apiRequests` : requêtes et réponses provider brutes.

Les messages `system` sont transitoires : le renderer les filtre avant
persistance et au chargement. Pour les anciens messages sans `visibility`, le
renderer applique une règle déterministe : messages agent et échanges vers
assistant internes, messages utilisateur, réponses finales, permissions,
saisies et AEL vers utilisateur publics.

## Création de fichiers AEL

Le contrat provider de création de fichier est distinct d'une commande :

```json
{"from":"assistant","to":"agent","agentId":"agent-ael","action":"write-file","target":{"directory":"desktop","name":"coucou.py"},"content":"print(\"coucou\")\n","overwrite":false}
```

`directory` accepte `desktop` et `workspace`, résolus par le main. Le nom
est un seul composant, sans chemin absolu, traversée, flux NTFS ni nom de
périphérique Windows. Le contenu reste inchangé et limité à 128 Kio UTF-8.
Les champs inconnus et `overwrite:true` sont refusés. L'historique agent
porte `operation: "write-file"` ; les anciennes entrées shell restent valides.
La taille et l'empreinte d'un aperçu entrant sont validées à la frontière IPC.

## Conversations

Une `Conversation` contient :

- `id`, `title`, `createdAt`, `updatedAt` ;
- `draft` ;
- `lastReadAt` pour les indicateurs de non-lu ;
- `origin` pour distinguer conversation principale et conversation interne ;
- `messages`.

`PersistedChatState` contient la liste et `activeConversationId`.

La validation IPC normalise les anciens identifiants d’agent connus lorsqu’ils
apparaissent dans `ChatMessage.agentId`, ainsi que l’ancien rôle d’exécution
locale dans `from` et `to`. Cette compatibilité bornée protège la lecture, la
poursuite et la sauvegarde des conversations existantes ; elle ne s’applique ni
aux opérations d’agent, ni aux settings, ni aux chemins de stockage. Après
validation, l’état sauvegardé contient les identifiants et rôles canoniques
ACP/AEL. Une valeur inconnue reste invalide. Ce traitement s’applique aux
messages reçus dans `chat.save` et `ai.runTurn` ; le parser ne vérifie pas
qu’ils existaient auparavant sur disque. Il ne fournit pas d’alias aux
opérations d’agent.

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
  agent-acp/
    contexte.json
    permissions.json
    historique.json
    conversations/
      conversations.json
      ...
  agent-ael/
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

Les seuls IDs acceptés pour un espace agent sont définis par
`src/shared/system-agent.registry.ts`. Les anciens espaces de développement ne
sont ni migrés ni sauvegardés ; ACP et AEL repartent dans leurs dossiers
canoniques. La normalisation des messages historiques décrite plus haut ne
réactive pas ces espaces.

## Settings

`AppSettings` contient :

```text
activeProvider
agents.agent-acp.enabled
agents.agent-ael.enabled
apiTrace.enabled
apiTrace.retentionDays
apiTrace.maxEntriesPerMessage
apiTrace.redactSensitiveData
aelExecution.maxOutputCharacters
aelExecution.timeoutMs
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

Le contrat public ne contient aucun canal AEL direct ni API de conversation
agent sans interface. Toute exécution locale passe par le flux `ai` dans le
main et par les contrôles de permission associés.

## Traces et volumétrie

Les appels de l’assistant principal et des agents textuels peuvent attacher le
payload de requête et la réponse à `apis.json`. Les traces de génération de
commande AEL sont fusionnées avec celles de la délégation et rattachées au
message final. Le test de connexion ne persiste aucune trace.

Avant écriture, `apiTrace` peut supprimer toutes les traces, retirer celles
plus anciennes que `retentionDays`, garder au plus
`maxEntriesPerMessage` entrées et masquer champs sensibles, Bearer tokens et
clés de forme `sk-*`. Ces règles s’appliquent au chat principal et aux agents.

Les résultats réinjectés au provider sont tronqués à 4 000 caractères. La
sortie de commande conservée en mémoire est également plafonnée par
`aelExecution.maxOutputCharacters`. Les prompts et réponses fonctionnels
restent potentiellement sensibles même après la redaction ciblée des secrets.

## Extension cible 6.2 — contrats ARI, non implémentés

Les schémas v1 requête/résultat/source/affirmation/budgets sont définis par le
[compagnon technique ARI](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md).
L’intention est séparée de l’enveloppe construite par le main : identités,
rattachement parent/enfant et budgets ne proviennent pas du renderer ou du
modèle. Leur implémentation relève de 6.2.2 dans le plan de 17 tâches.

Le registre Credentials global conserve une projection expurgée, des références
opaques et des ACL strictes. Les secrets et snapshots de sessions restent
chiffrés et privés au main ; le courtier vérifie le demandeur effectif, les
profils de lecture et la génération de révocation. Ces composants relèvent de
6.2.9/6.2.10 et ne sont pas fournis par la qualification du runtime de 6.2.1.

Les tâches ARI seront stockées séparément avec écritures atomiques, reprise
explicite et rétention de 90 jours ou 1 000 tâches finales. Corps bruts,
credentials, cookies et URL signées sont exclus des traces. Les citations
publiques sont autonomes et restent lisibles après purge de la tâche ; les
conversations et messages restent éclatés. Les détails sont implémentés en
6.2.13, sans remplacement du stockage existant.

## Extension cible phase 7 — providers, non implémentée

Les contrats proposés sont centralisés dans
[PROVIDERS_PLAN.md](Providers/PROVIDERS_PLAN.md). Ils séparent requête/résultat
de transport et messages Nova ; `from`, `to`, `agentId` et actions structurées
restent l'autorité du routage main après validation. Les configurations et
credentials ne proviennent jamais du texte généré par le modèle.

La cible conserve `settings.activeProvider`, `settings.openai` et le coffre
OpenAI. Un champ optionnel `settings.providers` versionné ajouterait les
configurations `mistral` et `ollama`, sans y stocker de clé en clair ou chiffrée.
La projection publique indique la présence du secret ; son remplacement et
son effacement sont des opérations main séparées. La validation actuelle ne
prend pas en charge ce schéma futur. Ne pas copier les fragments proposés
sur les settings actuels ; voir [la stratégie de migration](Providers/MIGRATION_GUIDE.md).
