# NovaChat

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

Seul OpenAI est réellement implémenté. Les autres providers visibles en mode
preview sont des placeholders.

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

Le bilan de phase 6.1, intégré le 19 septembre 2026, rapporte la réussite de
TypeScript, ESLint et des 281 tests Vitest répartis dans 41 fichiers. Ces
contrôles n’ont pas été rejoués pendant la revue documentaire du 21 septembre. Les anciens contournements connus de la policy AEL sont
couverts par des tests de régression normaux.

La qualification de 6.2.1 du 30 octobre 2026 valide Electron 44, Forge 8 et
Packager 20 : 285 tests dans 42 fichiers sous Node 22/24, typage, lint,
audits à zéro et harnais DOM/PDF packagé. Voir
[le rapport](docs/validation/ARI_RUNTIME_6_2_1.md).

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

La clé est chiffrée avec `electron.safeStorage` dans le coffre du système. Elle
n’est ni conservée dans `settings.json`, ni renvoyée au renderer.

## Stockage local

Les chemins par défaut sont placés sous le répertoire Electron `userData` :

```text
<userData>/settings.json
<userData>/conversations/
<userData>/agents/
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

Les chemins peuvent être personnalisés dans les paramètres. Les anciennes
données placées à la racine du dépôt ne sont plus la destination par défaut.

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

## Prochain développement

Le plan ARI validé comprend 17 tâches, avec HTTP contrôlé par Undici et rendu
Chromium soumis à ses preuves de confinement. La qualification de 6.2.1 est
terminée ; la prochaine tâche est 6.2.2, contrats et délégations, selon
[NEXT_STEPS.md](docs/NEXT_STEPS.md). ARI reste inactif et doit être validé avant ACA.
