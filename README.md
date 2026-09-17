# NovaChat

> La documentation utilise les noms cibles ACP/AEL. Le renommage du code et
> la remise à zéro sans compatibilité sont prévus en phase 6.1, après
> finalisation de la documentation. Voir
> [la décision de transition](docs/decisions/005-acp-ael-breaking-reset.md).

NovaChat est une application desktop Electron + React qui combine un chat
persistant, l’API OpenAI Responses, un agent de planification et un agent
d’exécution locale.

## État actuel

Fonctionnalités branchées :

- conversations locales, drafts, non-lus, recherche et renommage ;
- configuration OpenAI locale ;
- assistant principal Nova ;
- `agent-acp` pour proposer la prochaine étape atomique ;
- `agent-ael` pour concevoir ou exécuter une commande ;
- workflow de permission `Oui`, `Oui permanent`, `Non` ;
- commandes locales `/help`, `/status`, `/agents` et `/settings` sans appel
  provider ;
- `/cmd <commande>` pour une commande explicitement lancée par l’utilisateur ;
- progression, saisie interactive et arrêt de commande/tour ;
- contextes, permissions, conversations et historiques agents sur disque ;
- vue d’activité globale des agents.

Seul OpenAI est réellement implémenté. Les autres providers du catalogue
sont indiqués « à venir » et ne peuvent pas être activés.

Important : le canal `ael` est fonctionnel mais sa policy actuelle n’est
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
npm.cmd run ci
```

Le bilan de `docs/PROJECT_STATE.md` rapporte 277 tests réussis et un packaging
Windows x64 validé. Ces résultats historiques ne valident pas encore la phase
6.1 et devront être rejoués lors de son implémentation. Les anciens contournements connus de la policy
AEL sont maintenant couverts par des tests de régression normaux.

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

La clé est chiffrée dans le coffre système via `electron.safeStorage`. Elle
n’est ni persistée dans `settings.json` ni renvoyée au renderer.

## Stockage local

En développement comme en application packagée, les chemins par défaut
résident sous `app.getPath("userData")` :

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

La phase 6.1 prévoit une suppression de l’ancienne base NovaChat, y compris
ses copies et backups, puis une configuration neuve sans migration. Le reset
sera unique et ne concernera que les fichiers appartenant à NovaChat. Les
nouvelles données garderont ces protections et leur persistance. Ce chantier
attend la finalisation de la documentation.

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
- [règles de codage](docs/CODING_GUIDELINES.md) ;
- [risques](docs/RISKS.md) ;
- [prochaines étapes](docs/NEXT_STEPS.md) ;
- [changelog](docs/CHANGELOG.md) ;
- [handoff express](docs/HANDOFF.md).

NovaChat est distribué sous [licence MIT](LICENSE).
