# Développement et exploitation locale

## Prérequis

- Node.js 20, 22 ou 24+ conformément au moteur déclaré par Vitest 4.
- npm.
- Une clé API et un modèle OpenAI pour les tours IA.
- Une connexion réseau lors du premier packaging si Electron Forge doit
  télécharger un binaire Electron.

Le dépôt contient `package-lock.json`. Pour une installation reproductible,
préférer :

```powershell
npm.cmd ci
```

Sous macOS ou Linux, la forme habituelle est `npm ci`.

## Commandes

| But | Commande |
| --- | --- |
| Démarrer en développement | `npm.cmd start` |
| Lancer les tests une fois | `npm.cmd test` |
| Lancer les tests en watch | `npm.cmd run test:watch` |
| Vérifier TypeScript | `npm.cmd exec tsc -- --noEmit` |
| Linter | `npm.cmd run lint` |
| Tests + TypeScript + lint | `npm.cmd run check` |
| Validation CI avec packaging | `npm.cmd run ci` |
| Créer un dossier applicatif | `npm.cmd run package` |
| Créer un installateur/une archive | `npm.cmd run make` |
| Publier via Forge | `npm.cmd run publish` |

`npm start` fonctionne dans `cmd.exe`. Sur la machine auditée, PowerShell
interdit `npm.ps1`; `npm.cmd` est donc nécessaire.

## État de validation au 18 juillet 2026

- `npm.cmd exec tsc -- --noEmit` : réussi.
- `npm.cmd test` : 191 réussites.
- `npm.cmd run lint` : réussi.
- `npm.cmd run package` : réussi pour `win32-x64`.
- `npm.cmd run ci` : réussi.
- `npm.cmd run make` : non exécuté.

Le packaging produit actuellement `out/nova-chat-win32-x64/`. `out/` est
ignoré par Git.

## Tests

Vitest 4 exécute 23 fichiers sous `src/` :

- policy de permissions Device ;
- parser des réponses OpenAI ;
- parser du format Planner ;
- sérialisation du stockage chat ;
- round-trip du stockage sur un dossier temporaire ;
- application des événements de conversation.
- parsing et réponses des commandes slash locales.
- validation runtime des payloads IPC ;
- confinement des chemins de stockage ;
- limites de sortie, timeout interactif et stratégie de kill Device.
- formatage des résultats agent et détection des commandes Device.
- initialisation, permissions, conversations et historique du stockage agent.
- formatage des statuts et sorties de la page Device.
- résolution des handoffs explicites et heuristiques.
- fusion des traces de délégation et de génération Device.
- écritures JSON atomiques, backups et détection de récupération partielle ;
- sérialisation des opérations concurrentes d’un même agent ;
- migrations `userData` et `diagnostic-agent` ;
- rétention et redaction des traces API ;
- chiffrement, remplacement, suppression et migration de la clé OpenAI.

La matrice Device comporte 88 cas normaux. Elle couvre commandes de lecture,
écritures bornées, séparateurs shell, substitutions, wrappers, redirections,
sous-commandes Git et options mutantes. Toute nouvelle règle de policy doit
ajouter ses cas sûrs et adversariaux dans cette matrice.

Les composants React ne sont pas encore testés. Vérifier manuellement au
minimum :

1. démarrage et passage de l’écran de chargement ;
2. création, renommage, recherche et suppression d’une conversation ;
3. sauvegarde puis rechargement des conversations ;
4. test et sauvegarde de la configuration OpenAI ;
5. réponse OpenAI directe ;
6. délégation au Planner puis au Device ;
7. permission autorisée une fois, permanente et refusée ;
8. `/cmd`, saisie interactive, arrêt d’un tour et kill d’une commande ;
9. activation/désactivation des deux agents ;
10. affichage de l’activité et de l’historique des agents.

## Démarrage de l’application

`src/renderer/App.tsx` affiche d’abord `LoadingScreen`. Le flux réalise
uniquement un ping IPC avec timeout de trois secondes. En cas de succès, le
workspace est affiché immédiatement ; en cas d’échec, l’écran conserve le
détail et une action de nouvelle tentative.

## Configuration locale

En développement comme en application packagée, les valeurs par défaut
pointent sous `app.getPath("userData")` :

```text
settings.json
conversations.json
conversations/
agents/
logs/storage-errors.jsonl
secrets/openai-api-key.json
```

Au premier démarrage après mise à jour, NovaChat copie les anciennes données
placées à la racine de l’application si la destination n’existe pas, puis
réécrit uniquement les anciens chemins par défaut. Les chemins personnalisés
restent inchangés. L’état des migrations est enregistré dans
`migration-state.json`.

`settings.json` ne contient plus la clé API. Celle-ci est chiffrée par
`electron.safeStorage` dans le fichier de secret dédié ; le backend Linux
`basic_text` est refusé. Une ancienne installation peut encore contenir une
clé en clair tant que sa migration n’a pas réussi : ne jamais afficher,
journaliser ou committer les anciens settings/backups.

## Debug par domaine

| Symptôme | Premier point d’entrée |
| --- | --- |
| Démarrage Electron | `src/index.ts`, `src/main/window/` |
| Hydratation ou sauvegarde UI | `src/renderer/components/WorkspaceLayout/` |
| Événements de conversation | `src/renderer/services/chat/chat.events.ts` |
| Appel OpenAI / parsing | `src/main/ai/openai.*` |
| Boucle assistant/agents | `src/main/ai/ai.orchestrator*` |
| Planner | `src/main/ai/ai.planner.ts`, `src/main/agents/` |
| Commande locale | `src/main/device/`, `src/main/ai/ai.device-flow*` |
| Permission | `src/main/ai/ai.permission.service.ts`, `src/main/device/device.policy.ts` |
| Persistance chat | `src/main/chat/` |
| Persistance agent | `src/main/agents/agent-storage.service.ts` |
| Settings | `src/main/settings/`, `src/renderer/components/SettingsPanel/` |
| Migrations | `src/main/migrations/`, `src/main/credentials/` |
| Reprise et journal stockage | `src/main/storage/`, `src/main/chat/chat-storage.io.ts` |

## Discipline de changement

- Ne pas modifier les données ignorées locales pour “nettoyer” le dépôt.
- Vérifier `git status --short` avant et après le chantier.
- Un changement du schéma de message nécessite une mise à jour coordonnée de
  `shared/chat.types.ts`, `preload`, `main`, `renderer` et du stockage.
- Un changement d’IPC nécessite une mise à jour simultanée du handler, du
  preload et de `renderer/global.d.ts`.
- Un changement du canal `device` doit inclure des tests de policy avant toute
  extension fonctionnelle.
