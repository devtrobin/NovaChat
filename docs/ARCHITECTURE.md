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
    ├── orchestration ACP / AEL
    ├── shell local
    └── stockage JSON local
```

Le renderer ne reçoit jamais une clé provider déjà stockée, ni accès Node, ni
accès direct au shell. Une nouvelle clé saisie dans le formulaire ne traverse
le preload que comme valeur de remplacement ponctuelle ; le main la chiffre,
puis renvoie uniquement `apiKeyConfigured`. Le preload expose un contrat
limité. Le main porte les effets de bord.

Le packaging active `asar` et plusieurs fuses Electron : désactivation de
`RunAsNode`, des options Node par variable d’environnement et des arguments
d’inspection, chiffrement des cookies, validation d’intégrité de l’ASAR et
chargement limité à l’ASAR.

### Fenêtres et navigations futures

La fenêtre principale fixe explicitement `contextIsolation`, `sandbox`,
`webSecurity`, `nodeIntegration: false` et `webviewTag: false`. Sa CSP limite
les ressources au document applicatif, `window.open` est refusé et les
navigations/redirections hors de l’URL d’entrée sont bloquées.

La CSP est posée comme en-tête de la réponse du document principal par le
process `main`, et non par une balise `<meta>`. La variante de développement
autorise uniquement `unsafe-eval` et les WebSockets nécessaires au runtime
Webpack ; la variante packagée les refuse.

Ce durcissement ne doit pas interdire une future capacité d’automatisation. Il
empêche seulement le renderer de naviguer ou d’ouvrir une fenêtre de façon non
sollicitée.

Si un agent doit un jour contrôler un navigateur ou une autre fenêtre :

- l’orchestration et les permissions restent dans le process `main` ;
- une API preload dédiée et minimale décrit les actions autorisées ;
- les fenêtres créées par cette capacité reçoivent leur propre politique de
  navigation, distincte de celle de la fenêtre NovaChat ;
- chaque ouverture ou navigation externe passe par une décision explicite,
  une allowlist ou une permission utilisateur ;
- le renderer principal ne récupère jamais un accès générique à
  `BrowserWindow`, au système ou à une session de navigation.

Bloquer aujourd’hui `window.open` et les navigations inattendues de la fenêtre
principale ne ferme donc pas cette évolution : cela évite seulement qu’une
future capacité sensible soit implicitement disponible dans tout le renderer.

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
        │   ├── AELAgentPage
        │   └── ACPAgentPage
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

`AELAgentPage.tsx` compose quatre vues d’onglets dédiées. AEL et ACP
partagent le chargement, le polling et les mutations via
`useAgentPageController.ts`; chaque page conserve ses vues déclaratives.

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
- `MessageItemAEL` : commande, progression, input et résultat ;
- `MessageItemSystem` : état transitoire, erreur de configuration et
  permission.

`ChatMessage.visibility` décide séparément si un message est `public` ou
`internal`. Le filtre n’altère pas l’état canonique. Une règle de compatibilité
fondée sur `from`/`to` couvre les anciennes données sans champ explicite.

## Main process

### Domaine `ai`

Le tour principal suit cette structure :

```text
runTurn
├── commande slash locale ? -> runSlashCommandTurn
├── /cmd <commande> ? -> runDirectCommandTurn
├── validation OpenAI
├── création du tour annulable
└── jusqu’à 8 cycles assistant et 6 exécutions AEL
    ├── generateOpenAIReply
    ├── réponse utilisateur -> fin
    └── handoff agent
        ├── agent-acp
        │   └── parse du plan puis éventuel agent-ael
        └── agent-ael
            └── génération/exécution de commande
    └── plafond atteint ou répétition
        └── cycle final sans agent pour synthétiser les résultats disponibles
```

Fichiers clés :

- `ai.orchestrator.ts` : boucle, limite et traitement d’ACP ;
- `ai.orchestrator.budget.ts` : budgets séparés et détection des commandes
  répétées ;
- `ai.orchestrator.finalization.ts` : synthèse finale réservée sans nouvelle
  délégation ;
- `ai.orchestrator.cycle.ts` : routage d’une réponse assistant ;
- `ai.orchestrator.assistant-request.ts` : appel provider et abort controller ;
- `ai.orchestrator.handoff.ts` : résolution d’une délégation explicite ;
- `ai.orchestrator.acp-handoff.ts` : handoff ACP heuristique ;
- `ai.orchestrator.agent-cycle.ts` : exécution d’un agent et fusion des traces ;
- `ai.acp.ts` : parsing du format textuel d’ACP ;
- `ai.turn-registry.ts` : tours, tâches, abort controllers, commandes et
  permissions en cours ;
- `ai.permission.service.ts` : attente et résolution d’une permission ;
- `ai.ael-flow.ts` : adaptation d’une commande en messages Nova ;
- `openai.*` : payload, transport, parsing et erreurs provider.

Le transport utilise `fetch` et accepte un `AbortSignal` pour les tours. Le
test de connexion Settings possède un timeout explicite de dix secondes.

### Domaine `agents`

Deux agents sont définis. Leurs IDs, acronymes, libellés, capacités et contextes
par défaut proviennent de `src/shared/system-agent.registry.ts`, partagé par le
main et le renderer.

`agent-acp` :

- reçoit une demande de planification ;
- appelle OpenAI avec son contexte propre ;
- renvoie un texte structuré `STATUS`, `SUMMARY`, `AGENT`, `MODE`, etc. ;
- n’exécute aucune action ;
- formule les demandes AEL comme objectifs en langage naturel, jamais comme
  commandes shell ;
- ne peut recommander actuellement que `agent-ael` ou `none`.

`agent-ael` :

- accepte une commande exacte ou un objectif ;
- pour un objectif, appelle OpenAI afin de produire une commande ;
- valide toute commande de tâche agent, exacte ou générée, avec le profil
  terminal non interactif ;
- évalue la policy de permission ;
- consulte les règles exactes mémorisées ;
- demande éventuellement une décision à l’utilisateur ;
- exécute la commande et résume le résultat.

Les règles techniques obligatoires ne résident plus uniquement dans le
`contexte.json` éditable. Le prompt interne impose le rôle, le shell exact et
le format de sortie ; le fichier utilisateur ne contient que les préférences
complémentaires. Son schéma est versionné et les anciennes valeurs par défaut
sont migrées sans remplacer les personnalisations.

`agent-orchestrator.service.ts` coordonne le cycle de vie commun. Les phases
sont séparées entre `agent-task.acp.ts`, `agent-task.ael.ts`,
`agent-task.ael-command.ts`, `agent-task.ael-permission.ts`,
`agent-task.messages.ts`, `agent-context.migration.ts` et les modules
`ai.orchestrator.*`.
`agent-storage.service.ts` reste la façade publique du stockage agent. Les
responsabilités sont séparées entre `agent-storage.paths.ts`,
`agent-storage.recovery.ts`, `agent-storage.workspace.ts`,
`agent-storage.records.ts` et `agent-storage.conversations.ts`.

### Domaine `ael`

```text
commande exacte ou générée d’une tâche AEL
  -> evaluateAELAgentCommandProfile
  -> résolution de permission
  -> startAELCommand
  -> normalizeCommand
  -> assertCommandAllowed
  -> resolveShell
  -> spawn
  -> registry
  -> stdout/stderr progress
  -> timeout / input / kill
  -> AELCommandResult
```

Sur Windows : `cmd.exe /d /s /c`, après passage interne de la page de code à
UTF-8. Le shell communiqué à Nova, ACP et AEL provient de la même
résolution que l’exécuteur.

Sur macOS/Linux : `$SHELL -lc`, avec `/bin/zsh` en fallback.

Le registre est uniquement mémoire. Le timeout actif et la limite de sortie
sont configurables dans `aelExecution`. Le timeout est suspendu pendant une
attente de saisie détectée, puis réarmé à la soumission. L’arrêt cible l’arbre
de processus (`taskkill /t /f` sous Windows, groupe détaché sous Unix).

La classification de permission de `ael.policy.ts` intervient dans le flux
agent, avant `startAELCommand`. Cette façade s’appuie sur les modules
`ael.policy.segment.ts`, `ael.policy.command-rules.ts`,
`ael.policy.paths.ts`, `ael.policy.read.ts`, `ael.policy.windows.ts`,
`ael.policy.tokens.ts` et
`ael.policy.types.ts`. Le parseur sépare les segments et redirections ;
toute syntaxe inconnue, dynamique ou complexe devient `ask-always` et ne peut
donc pas recevoir d’autorisation permanente. La policy ne s’applique pas à
`/cmd`, qui est une exécution explicitement demandée par l’utilisateur. Voir
[RISKS.md](RISKS.md) pour ses limites.

Avant cette classification, `ael.agent-command-profile.ts` applique à toutes
les commandes de tâche AEL, exactes ou générées, un profil plus étroit : au plus
trois segments, uniquement des commandes déjà classifiées par la policy, sans
wrapper de shell, interface graphique, console secondaire ou utilitaire
interactif. Une commande rejetée est renvoyée à Nova sans permission et sans
exécution. Ce profil ne s’applique pas à `/cmd`, qui exprime directement
l’intention de l’utilisateur.

Une décision `allow` s’exécute sans demande UI. Les lectures Windows
automatiques sont bornées par commande, sous-commande et options ; les formes
mutantes, distantes ou inconnues restent confirmées. Les lectures de fichiers
ou variables susceptibles de contenir des secrets restent également
permissionnées, même si elles ne modifient pas la machine.

### Domaine `chat`

Le stockage est un arbre JSON éclaté. Le reader sait reconstruire une
conversation à partir de l’index et découvrir des dossiers orphelins. Le
writer synchronise l’arbre avec l’état reçu, y compris par suppressions
récursives.

Le chat principal sérialise ses sauvegardes avec une queue dans
`chat.handlers.ts`. Les espaces agents sérialisent également toute opération
de lecture-modification-écriture par couple racine/agent.

Chaque JSON est écrit dans un fichier temporaire synchronisé puis renommé. La
dernière version valide est conservée en `.bak`. Une lecture corrompue tente ce
backup, archive le primaire et journalise l’anomalie. Si l’état reconstruit est
partiel, un registre de récupération bloque toute nouvelle écriture sur la
racine concernée jusqu’à acknowledgement explicite dans l’UI.

Les handlers IPC valident leurs payloads à l’exécution avant le métier. Les
identifiants utilisables comme segments de chemin sont restreints, et les
constructeurs de chemins vérifient que la cible résolue reste dans la racine de
stockage configurée.

### Domaine `settings`

Le main calcule les chemins par défaut, fusionne les anciennes configurations,
lit le fichier de référence puis un éventuel fichier configuré et écrit les
deux à la sauvegarde.

Les références par défaut résident sous `app.getPath("userData")`. Au
démarrage, `data-migration.service.ts` copie une seule fois les anciennes
conversations et la configuration générale placées près de l’exécutable. Les
chemins personnalisés sont préservés, mais les anciens settings et dossiers
d’agents ne sont pas importés dans les espaces canoniques ACP/AEL.

La clé OpenAI vit dans `userData/secrets/openai-api-key.json`, chiffrée par
`electron.safeStorage`. `settings.service.ts` sépare les settings publics des
settings runtime déchiffrés, accessibles uniquement au main. La migration du
secret vérifie la relecture avant de nettoyer les anciennes copies en clair.

Seul le bloc OpenAI est opérationnel. `ActiveAIProviderId` représente le
runtime actif et ne contient qu’OpenAI. Les autres IDs appartiennent au
catalogue planifié : ils restent visibles et documentés, mais sont désactivés
dans l’UI et refusés par la validation main jusqu’à disposer d’un transport et
d’une validation complets.

## Contrats transversaux

### Types

- `src/shared/chat.types.ts` : message, conversation, commande ;
- `src/shared/ai.types.ts` : requêtes et événements du tour ;
- `src/shared/agent.types.ts` : tâches et espace de travail agent ;
- `src/shared/system-agent.registry.ts` : IDs et métadonnées des agents système ;
- `src/shared/settings.types.ts` : configuration.

Ces contrats sont indépendants des couches `main`, `preload` et `renderer`.

### Identité des agents

Les IDs actifs sont :

```text
agent-acp
agent-ael
```

Ces identifiants sont canoniques et exclusifs pour les opérations d’agent, les
settings et les chemins de stockage. À la seule frontière des messages de chat,
les anciens identifiants connus et l’ancien rôle d’exécution locale dans
`from`/`to` sont convertis vers ACP/AEL afin qu’une conversation déjà chargée
puisse encore être poursuivie et sauvegardée. Toute autre valeur reste refusée.

### Persistance et observabilité

Chaque message peut porter deux catégories de traces séparées :

- `lifecycleLog` : événements internes Nova ;
- `apiRequests` : payloads et réponses provider.

Ces traces ne sont pas envoyées dans le message Nova simplifié au provider,
mais elles peuvent être persistées sur disque selon `apiTrace`. La policy
applique activation, rétention, plafond par message et redaction des secrets
avant chaque écriture, y compris dans les conversations agents.

## Dépendances structurelles à préserver

- OpenAI et le shell restent dans le main.
- `window.nova` reste la seule surface renderer vers les effets de bord.
- Toute future automatisation de fenêtres reste une capacité explicite et
  permissionnée du main, pas une exception globale accordée au renderer.
- L’orchestration multi-agent reste centralisée par Nova, pas distribuée entre
  agents autonomes.
- L’ACP recommande ; Nova décide et exécute.
- L’AEL exécute une étape atomique puis rend la main.
- Les messages Nova restent la représentation commune des flux visibles.

## Zones à ne pas confondre

- `activeProvider` ne peut actuellement valoir que `openai`; le catalogue
  planifié ne constitue pas un routage multi-provider.
- `ael.policy.ts` décide d’une demande de permission ; ce n’est pas un
  sandbox.
- Les conversations internes sont produites uniquement par les tâches
  orchestrées ; aucune API de conversation directe n’est exposée.
- Les messages `system` sont des états UI transitoires, pas un historique
  durable.

## Cible finalisée 6.2 — ARI, non implémentée

Le [compagnon ARI](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md) est
normatif pour cette extension. Le main pilote un runner curl à capacités fixes,
sans shell ni délégation AEL, les parseurs en utilityProcess, les adaptateurs
Outlook et les services globaux Credentials/Accès accordés. Le navigateur
système sert uniquement à OAuth interactif ; aucun navigateur ne scrape les pages.

La recherche privée ne passe pas par Google. Les accords et la provenance des
résultats privés sont contrôlés avant chaque appel provider, y compris dans
les tours ultérieurs du chat. Le renderer reçoit des projections expurgées par
preload, jamais un accès générique au réseau ou au coffre. Les providers futurs
ne sont pas activés par cette phase. Les conversations restent éclatées.

Outlook personnel et professionnel/scolaire sont obligatoires ; Gmail/Orange
facultatifs. Le [plan 6.2](NEXT_STEPS.md#phase-62--ari--agent-de-recherche-internet)
définit la qualification et les tests avant de déclarer cette cible livrée.
