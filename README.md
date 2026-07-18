# NovaChat

NovaChat est une application desktop Electron + React qui combine un chat
persistant, l’API OpenAI Responses, un agent de planification et un agent
d’exécution locale.

## État actuel

Fonctionnalités branchées :

- conversations locales, drafts, non-lus, recherche et renommage ;
- configuration OpenAI locale ;
- assistant principal Nova ;
- `agent-planner` pour proposer la prochaine étape atomique ;
- `device-agent` pour concevoir ou exécuter une commande ;
- workflow de permission `Oui`, `Oui permanent`, `Non` ;
- commandes locales `/help`, `/status`, `/agents` et `/settings` sans appel
  provider ;
- `/cmd <commande>` pour une commande explicitement lancée par l’utilisateur ;
- progression, saisie interactive et arrêt de commande/tour ;
- contextes, permissions, conversations et historiques agents sur disque ;
- vue d’activité globale des agents.

Seul OpenAI est réellement implémenté. Les autres providers visibles en mode
preview sont des placeholders.

Important : le canal `device` est fonctionnel mais sa policy actuelle n’est
pas une frontière de sécurité complète. Lire
[docs/RISKS.md](docs/RISKS.md) avant de l’étendre.

## Stack

- Electron 39
- React 19
- TypeScript 5.9
- Electron Forge 7
- Webpack
- i18next

## Installation et lancement

```powershell
npm.cmd ci
npm.cmd start
```

Sous macOS/Linux ou dans `cmd.exe`, `npm ci` et `npm start` conviennent. La
forme `npm.cmd` évite le blocage de `npm.ps1` sur certains PowerShell.

## Validation

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd test
npm.cmd run lint
npm.cmd run package
```

Au 18 juillet 2026, ces commandes passent sur Windows x64. La suite Vitest
exécute 112 cas, tous réussis. Les anciens contournements connus de la policy
Device sont maintenant couverts par des tests de régression normaux.

## Configuration OpenAI

Dans `Paramètres > OpenAI` :

1. renseigner la clé API ;
2. renseigner un modèle compatible avec la Responses API ;
3. conserver ou adapter la Base URL ;
4. tester la connexion ;
5. valider.

Base URL standard :

```text
https://api.openai.com/v1
```

La clé est actuellement stockée en clair dans `settings.json`, fichier ignoré
par Git.

## Stockage local

En développement, les chemins par défaut sont à la racine du dépôt :

```text
settings.json
conversations.json
conversations/
agents/
```

Les conversations sont éclatées par conversation et message. Chaque message
possède :

```text
message.json
log.json
apis.json
```

Chaque agent possède :

```text
contexte.json
permissions.json
historique.json
conversations/
```

En application packagée, le code actuel utilise par défaut le dossier
contenant l’exécutable, et non le répertoire standard `userData`. Ce point
fait partie des chantiers prioritaires.

## Architecture courte

```text
React renderer
  -> preload window.nova
  -> Electron main
      -> OpenAI
      -> agents
      -> shell local
      -> stockage JSON
```

Le renderer n’appelle jamais directement OpenAI ni le shell.

## Base de connaissance

La documentation de reprise commence dans
[docs/README.md](docs/README.md).

Lecture recommandée :

- [état du projet](docs/PROJECT_STATE.md) ;
- [architecture](docs/ARCHITECTURE.md) ;
- [workflows](docs/WORKFLOWS.md) ;
- [données et IPC](docs/DATA_MODEL.md) ;
- [développement](docs/DEVELOPMENT.md) ;
- [risques](docs/RISKS.md) ;
- [prochaines étapes](docs/NEXT_STEPS.md) ;
- [handoff express](docs/HANDOFF.md).

`docs/screenshot.png` est une capture historique et ne représente plus tous
les écrans Agents actuels.
