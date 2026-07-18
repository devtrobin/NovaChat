# Architecture

## Vue d’ensemble

NovaChat est une application desktop Electron composée de trois zones de
confiance :

```text
React renderer
    │  window.nova
    ▼
Electron preload
    │  IPC invoke / events
    ▼
Electron main
    ├── OpenAI Responses API
    ├── orchestration Planner / Device
    ├── shell local
    └── stockage JSON local
```

Le renderer ne doit posséder ni clé provider, ni accès Node, ni accès direct
au shell. Le preload expose un contrat limité. Le main porte les effets de
bord.

Le packaging active `asar` et plusieurs fuses Electron : désactivation de
`RunAsNode`, des options Node par variable d’environnement et des arguments
d’inspection, chiffrement des cookies, validation d’intégrité de l’ASAR et
chargement limité à l’ASAR.

## Points d’entrée

| Couche | Fichier | Responsabilité |
| --- | --- | --- |
| Electron main | `src/index.ts` | cycle de vie de l’app et enregistrement IPC |
| Fenêtre | `src/main/window/create-main-window.ts` | création de `BrowserWindow` |
| Preload | `src/preload.ts` | exposition de `window.nova` |
| Renderer | `src/renderer.tsx` | montage React et i18n |
| App React | `src/renderer/App.tsx` | boot puis workspace |
| Orchestrateur IA | `src/main/ai/ai.orchestrator.ts` | tour utilisateur complet |

## Renderer

### Arbre principal

```text
App
├── LoadingScreen
└── WorkspaceLayout
    ├── AppSidebar
    └── page active
        ├── ChatPage
        ├── AgentsPage
        │   ├── DeviceAgentPage
        │   └── PlannerAgentPage
        └── SettingsPage
            └── SettingsPanel
```

`WorkspaceLayout` est le contrôleur du shell :

- hydratation des conversations et settings ;
- section, conversation et agent actifs ;
- drafts et état d’envoi par conversation ;
- abonnement aux événements IA ;
- sauvegarde du chat après chaque changement d’état ;
- filtrage optionnel des messages internes.

La logique est répartie entre `WorkspaceLayout.service.ts` et les hooks
`useWorkspace*`.

`DeviceAgentPage.tsx` compose quatre vues d’onglets dédiées. Le chargement, le
polling et les mutations sont regroupés dans `useDeviceAgentPageController.ts`.

### État de conversation

Le renderer conserve l’état canonique affiché. Le main n’envoie que des
événements :

```text
append-messages
replace-message
remove-message
set-title
```

`chat.events.ts` applique ces événements de manière immuable. L’auto-sauvegarde
renvoie ensuite tout `PersistedChatState` au main.

### Rendu des messages

`MessageItem` route selon `from`, `to`, `status` et `commandId` :

- `MessageItemChat` : user, assistant, agent et délégations ;
- `MessageItemDevice` : commande, progression, input et résultat ;
- `MessageItemSystem` : état transitoire, erreur de configuration et
  permission.

## Main process

### Domaine `ai`

Le tour principal suit cette structure :

```text
runTurn
├── commande slash locale ? -> runSlashCommandTurn
├── /cmd <commande> ? -> runDirectCommandTurn
├── validation OpenAI
├── création du tour annulable
└── jusqu’à 4 cycles
    ├── generateOpenAIReply
    ├── réponse utilisateur -> fin
    └── handoff agent
        ├── agent-planner
        │   └── parse du plan puis éventuel device-agent
        └── device-agent
            └── génération/exécution de commande
```

Fichiers clés :

- `ai.orchestrator.ts` : boucle, limite et traitement du Planner ;
- `ai.orchestrator.cycle.ts` : routage d’une réponse assistant ;
- `ai.orchestrator.assistant-request.ts` : appel provider et abort controller ;
- `ai.orchestrator.handoff.ts` : résolution d’une délégation explicite ;
- `ai.orchestrator.planner-handoff.ts` : handoff Planner heuristique ;
- `ai.orchestrator.agent-cycle.ts` : exécution d’un agent et fusion des traces ;
- `ai.planner.ts` : parsing du format textuel du Planner ;
- `ai.turn-registry.ts` : tours, tâches, abort controllers, commandes et
  permissions en cours ;
- `ai.permission.service.ts` : attente et résolution d’une permission ;
- `ai.device-flow.ts` : adaptation d’une commande en messages Nova ;
- `openai.*` : payload, transport, parsing et erreurs provider.

Le transport utilise `fetch` et accepte un `AbortSignal` pour les tours. Le
test de connexion Settings n’a pas de timeout explicite.

### Domaine `agents`

Deux agents sont définis.

`agent-planner` :

- reçoit une demande de planification ;
- appelle OpenAI avec son contexte propre ;
- renvoie un texte structuré `STATUS`, `SUMMARY`, `AGENT`, `MODE`, etc. ;
- n’exécute aucune action ;
- ne peut recommander actuellement que `device-agent` ou `none`.

`device-agent` :

- accepte une commande exacte ou un objectif ;
- pour un objectif, appelle OpenAI afin de produire une commande ;
- évalue la policy de permission ;
- consulte les règles exactes mémorisées ;
- demande éventuellement une décision à l’utilisateur ;
- exécute la commande et résume le résultat.

`agent-orchestrator.service.ts` coordonne le cycle de vie commun. Les phases
sont séparées entre `agent-task.planner.ts`, `agent-task.device.ts`,
`agent-task.device-command.ts`, `agent-task.device-permission.ts`,
`agent-task.messages.ts` et les modules `ai.orchestrator.*`.
`agent-storage.service.ts` reste la façade publique du stockage agent. Les
responsabilités sont séparées entre `agent-storage.paths.ts`,
`agent-storage.recovery.ts`, `agent-storage.workspace.ts`,
`agent-storage.records.ts` et `agent-storage.conversations.ts`.

### Domaine `device`

```text
command string
  -> normalizeCommand
  -> assertCommandAllowed
  -> resolveShell
  -> spawn
  -> registry
  -> stdout/stderr progress
  -> timeout / input / kill
  -> DeviceCommandResult
```

Sur Windows : `cmd.exe /d /s /c`.

Sur macOS/Linux : `$SHELL -lc`, avec `/bin/zsh` en fallback.

Le registre est uniquement mémoire. Le timeout actif et la limite de sortie
sont configurables dans `deviceExecution`. Le timeout est suspendu pendant une
attente de saisie détectée, puis réarmé à la soumission. L’arrêt cible l’arbre
de processus (`taskkill /t /f` sous Windows, groupe détaché sous Unix).

La classification de permission de `device.policy.ts` intervient dans le flux
agent, avant `startDeviceCommand`. Cette façade s’appuie sur les modules
`device.policy.segment.ts`, `device.policy.command-rules.ts`,
`device.policy.paths.ts`, `device.policy.tokens.ts` et
`device.policy.types.ts`. Le parseur sépare les segments et redirections ;
toute syntaxe inconnue, dynamique ou complexe devient `ask-always` et ne peut
donc pas recevoir d’autorisation permanente. La policy ne s’applique pas à
`/cmd`, qui est une exécution explicitement demandée par l’utilisateur. Voir
[RISKS.md](RISKS.md) pour ses limites.

### Domaine `chat`

Le stockage est un arbre JSON éclaté. Le reader sait reconstruire une
conversation à partir de l’index et découvrir des dossiers orphelins. Le
writer synchronise l’arbre avec l’état reçu, y compris par suppressions
récursives.

Le chat principal sérialise ses sauvegardes avec une queue dans
`chat.handlers.ts`. Les espaces agents ne bénéficient pas encore de cette
protection.

Les handlers IPC valident leurs payloads à l’exécution avant le métier. Les
identifiants utilisables comme segments de chemin sont restreints, et les
constructeurs de chemins vérifient que la cible résolue reste dans la racine de
stockage configurée.

### Domaine `settings`

Le main calcule les chemins par défaut, fusionne les anciennes configurations,
lit le fichier de référence puis un éventuel fichier configuré et écrit les
deux à la sauvegarde.

Seul le bloc OpenAI est opérationnel. Les autres IDs provider servent à l’UI
preview et au contexte runtime des agents.

## Contrats transversaux

### Types

- `src/shared/chat.types.ts` : message, conversation, commande ;
- `src/shared/ai.types.ts` : requêtes et événements du tour ;
- `src/shared/agent.types.ts` : tâches et espace de travail agent ;
- `src/shared/settings.types.ts` : configuration.

Ces contrats sont indépendants des couches `main`, `preload` et `renderer`.

### Identité des agents

Les IDs actifs sont :

```text
agent-planner
device-agent
```

`diagnostic-agent` est un ancien nom partiellement pris en charge pour
compatibilité.

### Persistance et observabilité

Chaque message peut porter deux catégories de traces séparées :

- `lifecycleLog` : événements internes Nova ;
- `apiRequests` : payloads et réponses provider.

Ces traces ne sont pas envoyées dans le message Nova simplifié au provider,
mais elles sont persistées sur disque.

## Dépendances structurelles à préserver

- OpenAI et le shell restent dans le main.
- `window.nova` reste la seule surface renderer vers les effets de bord.
- L’orchestration multi-agent reste centralisée par Nova, pas distribuée entre
  agents autonomes.
- Le Planner recommande ; Nova décide et exécute.
- Le Device exécute une étape atomique puis rend la main.
- Les messages Nova restent la représentation commune des flux visibles.

## Zones à ne pas confondre

- `activeProvider` n’est pas encore un vrai routage multi-provider.
- `device.policy.ts` décide d’une demande de permission ; ce n’est pas un
  sandbox.
- Les conversations internes sont produites uniquement par les tâches
  orchestrées ; aucune API de conversation directe n’est exposée.
- Les messages `system` sont des états UI transitoires, pas un historique
  durable.
