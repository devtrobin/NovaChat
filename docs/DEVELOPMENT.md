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
| Créer un dossier applicatif | `npm.cmd run package` |
| Créer un installateur/une archive | `npm.cmd run make` |
| Publier via Forge | `npm.cmd run publish` |

`npm start` fonctionne dans `cmd.exe`. Sur la machine auditée, PowerShell
interdit `npm.ps1`; `npm.cmd` est donc nécessaire.

## État de validation au 18 juillet 2026

- `npm.cmd exec tsc -- --noEmit` : réussi.
- `npm.cmd test` : 97 réussites.
- `npm.cmd run lint` : réussi.
- `npm.cmd run package` : réussi pour `win32-x64`.
- `npm.cmd run make` : non exécuté.

Le packaging produit actuellement `out/nova-chat-win32-x64/`. `out/` est
ignoré par Git.

## Tests

Vitest 4 exécute six fichiers sous `src/` :

- policy de permissions Device ;
- parser des réponses OpenAI ;
- parser du format Planner ;
- sérialisation du stockage chat ;
- round-trip du stockage sur un dossier temporaire ;
- application des événements de conversation.

La matrice Device comporte 74 cas normaux. Elle couvre commandes de lecture,
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

`src/renderer/App.tsx` affiche d’abord `LoadingScreen`. Le flux réalise :

1. un délai de 100 ms ;
2. un ping IPC avec timeout de 3 s ;
3. un faux chargement de bibliothèques de 500 ms ;
4. un délai de finalisation de 1 s ;
5. un écran de bienvenue pendant 2 s puis une transition de 1 s.

Le délai minimal de démarrage visible est donc artificiellement supérieur à
quatre secondes. Ce comportement est produit par
`src/renderer/components/LoadingScreen/`.

## Configuration locale

En développement, les valeurs par défaut pointent vers la racine du dépôt :

```text
settings.json
conversations.json
conversations/
agents/
```

Le code ne s’appuie pas sur `app.getPath("userData")`. En application
packagée, la racine par défaut est le dossier contenant l’exécutable
(`path.dirname(process.execPath)`). Cette contrainte doit être revue avant de
considérer le packaging multi-OS comme prêt pour la production.

`settings.json` contient la clé API OpenAI en clair. Il est ignoré par Git,
mais doit rester traité comme un secret.

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

## Discipline de changement

- Ne pas modifier les données ignorées locales pour “nettoyer” le dépôt.
- Vérifier `git status --short` avant et après le chantier.
- Un changement du schéma de message nécessite une mise à jour coordonnée de
  `renderer/types/chat.types.ts`, `shared`, `preload`, `main` et du stockage.
- Un changement d’IPC nécessite une mise à jour simultanée du handler, du
  preload et de `renderer/global.d.ts`.
- Un changement du canal `device` doit inclure des tests de policy avant toute
  extension fonctionnelle.
