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

## Dernier bilan de validation enregistré

Bilan associé à la phase 6.1 intégrée le 19 septembre 2026. La date exacte des
exécutions n’est pas établie par cette revue documentaire du 21 septembre ;
les résultats ci-dessous sont rapportés, pas nouvellement vérifiés.

- `npm.cmd ci` : installation exacte depuis `package-lock.json` réussie.
- `npm.cmd exec tsc -- --noEmit` : réussi.
- `npm.cmd test` : 281 réussites.
- `npm.cmd run lint` : réussi.
- `npm.cmd run package` : réussi pour `win32-x64`.
- `npm.cmd run check` : réussi.
- `npm.cmd audit` et `npm.cmd audit --omit=dev` : 0 vulnérabilité dans le bilan
  historique, à remesurer lors de la prochaine validation technique.
- `npm.cmd run make` : non exécuté et volontairement reporté à la toute
  dernière phase de validation de distribution.

Le packaging produit actuellement `out/nova-chat-win32-x64/`. `out/` est
ignoré par Git.

La création d’installateurs, leur lancement réel et la validation native
Windows/macOS/Linux constituent la dernière tâche absolue de la roadmap. Ne
pas les confondre avec le packaging courant utilisé comme contrôle technique
pendant le développement.

## Tests

Vitest 4 exécute 41 fichiers sous `src/` :

- policy de permissions AEL ;
- parser des réponses OpenAI ;
- parser du format ACP ;
- sérialisation du stockage chat ;
- round-trip du stockage sur un dossier temporaire ;
- application des événements de conversation.
- parsing et réponses des commandes slash locales.
- validation runtime des payloads IPC ;
- confinement des chemins de stockage ;
- limites de sortie, timeout interactif et stratégie de kill AEL.
- formatage des résultats agent et détection des commandes AEL.
- initialisation, permissions, conversations et historique du stockage agent.
- formatage des statuts et sorties de la page AEL.
- résolution des handoffs explicites et heuristiques.
- fusion des traces de délégation et de génération AEL.
- écritures JSON atomiques, backups et détection de récupération partielle ;
- sérialisation des opérations concurrentes d’un même agent ;
- migration `userData` et registre canonique ACP/AEL ;
- rétention et redaction des traces API ;
- chiffrement, remplacement, suppression et migration de la clé OpenAI.
- sécurité et politique de navigation de la fenêtre principale ;
- visibilité publique/interne des messages et compatibilité des anciens
  messages ;
- permissions asynchrones, résolution unique et annulation complète d’un tour ;
- timeout du test OpenAI et construction des payloads assistant/agents ;
- reprise des queues de sauvegarde après une opération rejetée ;
- rendu statique de composants React critiques des settings et d’ACP.

La matrice AEL comporte 119 cas normaux. Elle couvre commandes de lecture,
écritures bornées, séparateurs shell, substitutions, wrappers, redirections,
sous-commandes Git et options mutantes. Toute nouvelle règle de policy doit
ajouter ses cas sûrs et adversariaux dans cette matrice.

Les composants React critiques possèdent un premier filet de rendu statique.
Cela ne remplace pas les parcours Electron. Vérifier manuellement au minimum :

1. démarrage et passage de l’écran de chargement ;
2. création, renommage, recherche et suppression d’une conversation ;
3. sauvegarde puis rechargement des conversations ;
4. test et sauvegarde de la configuration OpenAI ;
5. réponse OpenAI directe ;
6. délégation à l’ACP puis à l’AEL ;
7. permission autorisée une fois, permanente et refusée ;
8. `/cmd`, saisie interactive, arrêt d’un tour et kill d’une commande ;
9. activation/désactivation des deux agents ;
10. affichage de l’activité et de l’historique des agents.

## Démarrage de l’application

`src/renderer/App.tsx` affiche d’abord `LoadingScreen`. Le flux réalise
uniquement un ping IPC avec timeout de trois secondes. En cas de succès, le
workspace est affiché immédiatement ; en cas d’échec, l’écran conserve le
détail et une action de nouvelle tentative.

En développement, la CSP est envoyée par le `main` avec `unsafe-eval` et
`ws:` limités au runtime Webpack/HMR. La version packagée conserve
`script-src 'self'` et `connect-src 'self'`. Ne pas remettre la CSP dans une
balise `<meta>` : plusieurs politiques se cumulent et la plus stricte
bloquerait de nouveau le client Webpack.

Les messages DevTools `Autofill.enable wasn't found` et
`Autofill.setAddresses wasn't found` proviennent du frontend Chromium des
DevTools. Ils n’indiquent pas un échec du renderer ou d’un IPC NovaChat et
disparaissent lorsque les DevTools sont fermés.

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
| ACP | `src/main/ai/ai.acp.ts`, `src/main/agents/` |
| Commande locale | `src/main/ael/`, `src/main/ai/ai.ael-flow*` |
| Permission | `src/main/ai/ai.permission.service.ts`, `src/main/ael/ael.policy.ts` |
| Persistance chat | `src/main/chat/` |
| Persistance agent | `src/main/agents/agent-storage.service.ts` |
| Settings | `src/main/settings/`, `src/renderer/components/SettingsPanel/` |
| Migrations | `src/main/migrations/`, `src/main/credentials/` |
| Reprise et journal stockage | `src/main/storage/`, `src/main/chat/chat-storage.io.ts` |

## Discipline de changement

- Ne pas modifier les données ignorées locales pour “nettoyer” le dépôt.
- Vérifier `git status --short` avant et après le chantier.
- Vérifier périodiquement l’installation depuis le lockfile avec `npm.cmd ci`
  dans un environnement propre ; aucun test ne doit dépendre des données
  locales `settings.json`, `conversations/` ou `agents/`.
- Un changement du schéma de message nécessite une mise à jour coordonnée de
  `shared/chat.types.ts`, `preload`, `main`, `renderer` et du stockage.
- Un changement d’IPC nécessite une mise à jour simultanée du handler, du
  preload et de `renderer/global.d.ts`.
- Un changement du canal `ael` doit inclure des tests de policy avant toute
  extension fonctionnelle.
- Une mise à jour d’Electron Forge doit tenter de retirer un par un les
  overrides `tar`, `tmp`, `uuid` et `webpack-dev-server`, puis rejouer audits,
  tests, démarrage et packaging.

## Préparation du développement ARI 6.2

Les cahiers ARI sont finalisés et le [plan ordonné](NEXT_STEPS.md#phase-62--ari--agent-de-recherche-internet)
commence par la qualification curl/CA/npm, sans prétendre qu’ils sont déjà
installés. Conserver la distinction entre contrôles historiques du socle et
résultats ARI futurs. La validation obligatoire cible Windows x64 ; les tests
natifs macOS/Linux ne sont pas déduits de ce résultat.

6.2.6 demande un enregistrement Microsoft client public acceptant comptes
personnels et organisations, son redirect loopback et des permissions déléguées
minimales. 6.2.11 demande un compte de test de chaque type, sans secrets dans les
fixtures ou le dépôt. Les tests CI utilisent des transports/fixtures simulés.
Les vérifications du package sont distinctes de `make` et des installateurs,
qui restent réservés à la dernière phase.
