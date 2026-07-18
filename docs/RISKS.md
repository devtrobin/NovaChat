# Registre des risques et de la dette

Ce document distingue les risques avérés dans le code des améliorations
produit. Les priorités indiquent l’ordre recommandé, pas une estimation
calendaire.

## P0 — À traiter avant d’élargir les capacités locales

### Policy `device` restrictive, mais non sandboxée

Les contournements connus par pipes, opérateurs, substitutions, wrappers,
redirections, sous-commandes Git et options mutantes ont été fermés. La
matrice Device comporte 88 tests normaux. Une construction inconnue ou trop
complexe devient `ask-always`, ce qui interdit de la contourner avec une règle
permanente mémorisée.

Chaque décision porte désormais une catégorie explicite : lecture locale,
écriture workspace, réseau, installation/système, suppression/destruction ou
action non classifiable. Cette catégorie est affichée dans la demande de
permission.

La policy reste cependant un mécanisme UX de demande de permission :

- une commande acceptée ponctuellement s’exécute dans le shell complet ;
- l’analyse ne remplace pas une isolation OS ;
- les contrôles de chemins sont lexicaux et ne constituent pas un confinement
  contre toutes les jonctions ou tous les liens symboliques ;
- `/cmd` reste une exécution explicite utilisateur qui contourne les
  permissions agent.

Actions restantes :

1. ~~séparer explicitement lecture, écriture workspace, réseau,
   installation/système et suppression ;~~ terminé ;
2. ~~conserver un refus non mémorisable pour toute syntaxe non comprise ;~~
   terminé et couvert par les régressions ;
3. durcir les chemins si la policy doit devenir une vraie frontière ;
4. ne jamais étendre l’allowlist sans tests sûrs et adversariaux.

## P1 — Risques de données, sécurité et cohérence produit

### Couverture de tests encore limitée

Le socle Vitest couvre désormais la policy, les parsers OpenAI/Planner, le
stockage chat, les migrations, les commandes slash, les messages de tâche
agent, la concurrence agent, la politique de traces et le coffre de secrets.
Les 191 tests réussissent, dont 88 cas de policy Device.

Il manque encore les composants React, l’orchestrateur complet, les
permissions asynchrones, le registre d’arrêt et les parcours end-to-end.

Action recommandée : couvrir maintenant les workflows asynchrones critiques.

### Écritures non atomiques et erreurs silencieuses — corrigé

Les JSON sont écrits par temporaire synchronisé puis renommage. La version
précédente valide est conservée en `.bak`, un primaire corrompu est archivé et
les erreurs sont journalisées sous `userData/logs/storage-errors.jsonl`.

Une récupération partielle enregistre un verrou en mémoire : l’auto-sauvegarde
et les écritures sur les racines qui se chevauchent sont refusées jusqu’à
l’acknowledgement explicite de la bannière. Ce mécanisme empêche l’écrasement
silencieux ; il ne transforme pas une synchronisation multi-fichiers en
transaction de base de données.

### Concurrence du stockage agent — corrigée

Les chargements-modifications-écritures des conversations, historiques,
permissions et contextes sont sérialisés par couple racine/agent. Une erreur
dans une opération ne bloque pas les suivantes et la queue est libérée après
la dernière opération.

### Emplacement par défaut en application packagée — corrigé

Les settings, conversations, agents, journaux et secrets par défaut résident
sous `app.getPath("userData")`. Au démarrage, une migration versionnée copie
les anciennes valeurs par défaut et réécrit uniquement ces chemins ; les
chemins personnalisés restent inchangés.

### Clé API et traces en clair — corrigé avec limites

La clé OpenAI est chiffrée via `electron.safeStorage` dans un fichier dédié et
n’est jamais renvoyée au renderer après sauvegarde. La migration supprime les
copies en clair des settings et de leurs backups seulement après écriture et
relecture vérifiées du secret. Le backend Linux `basic_text` est refusé.

Les traces API peuvent être désactivées, sont bornées en âge et en nombre
d’entrées par message, et masquent par défaut les champs et motifs de secrets.
La redaction est une défense ciblée : le contenu fonctionnel des prompts et
réponses peut toujours être sensible même s’il ne ressemble pas à un secret.

### Validation IPC insuffisante — corrigée

Les handlers reçoivent désormais des valeurs `unknown` et valident à
l’exécution objets, énumérations, identifiants, tailles, URLs et chemins. Les
chemins dérivés des conversations, messages et agents sont résolus avec un
contrôle d’appartenance à leur racine avant lecture, écriture ou suppression.

### Durcissement Electron incomplet

`index.html` ne définit pas de Content Security Policy. La fenêtre ne rend pas
explicites les choix `contextIsolation`, `sandbox` et `nodeIntegration`, et
aucune règle de navigation/nouvelle fenêtre n’est installée.

Action recommandée : configuration explicite, CSP stricte et blocage des
navigations externes non approuvées.

### Sémantique de refus trompeuse — corrigée

Le bouton `Non` est maintenant ponctuel. Seule l’action distincte
`Toujours refuser` enregistre une règle `deny`, et les messages de résolution
indiquent explicitement la portée de la décision.

### Providers preview incohérents

L’UI permet de sauvegarder Anthropic, Google, Mistral, Ollama ou LM Studio
comme provider actif sans configuration complète. `runTurn` utilise malgré
tout OpenAI.

Action recommandée : empêcher l’activation d’un provider non implémenté ou
introduire une vraie abstraction de provider.

### Sauvegarde des settings couplée au réseau

Quand OpenAI est le provider actif, toute validation du panneau Settings teste
d’abord la connexion OpenAI, même si seul un chemin local a changé. Une panne
réseau ou une clé absente empêche donc d’enregistrer les chemins. Le test de
connexion n’a pas de timeout explicite.

Le validateur exige le fichier settings et le dossier conversations, mais pas
`agentsDirectory`.

Action recommandée : validation par section, sauvegarde locale indépendante du
test provider, timeout/abort et validation de tous les chemins.

### Migration `diagnostic-agent` — corrigée

La migration versionnée remplace l’ancien flag, déplace le dossier source dans
`.migration-backups`, puis le copie ou le fusionne avec `agent-planner`.
Permissions, historique et conversations sont dédupliqués. Une nouvelle
exécution ne rejoue pas les étapes déjà marquées.

### Masquage des messages internes trop large

`hideInternalConversations` filtre tous les messages `device`, y compris le
résultat visible d’un `/cmd` lancé directement par l’utilisateur.

Action recommandée : distinguer messages internes d’agent et résultat
explicitement demandé par l’utilisateur.

### Saisie interactive encore heuristique

- détection de prompt par expressions régulières sur stdout/stderr ;
- absence de pseudo-terminal ;

Le timeout actif et la limite de sortie sont configurables et bornés. Le
timeout est suspendu pendant `waiting-input`, puis réarmé après soumission.
L’arrêt cible l’arbre avec `taskkill /t /f` sous Windows et le groupe de
processus détaché sous Unix. La sortie en mémoire conserve une fin bornée et
signale sa troncature.

Action restante : adopter un pseudo-terminal si le support d’applications
interactives générales devient un objectif produit.

## P2 — Maintenabilité et dette fonctionnelle — terminée

Les éléments explicitement recensés dans cette priorité sont clos sans ajout
de capacité produit.

### Fichiers denses — corrigé

`ai.orchestrator.cycle.ts` est passé de 306 à 100 lignes. L’appel
provider, la résolution des handoffs, l’heuristique Planner, l’exécution agent
et les transitions de cycle vivent dans des modules métier dédiés.

Les précédents découpages restent en place :

- `device.policy.ts` est une façade sur les règles, segments, chemins, tokens
  et types ;
- `agent-orchestrator.service.ts` délègue les phases Planner, Device,
  permission, commande et messages ;
- `agent-storage.service.ts` sépare chemins, récupération, workspace, records
  et conversations ;
- `DeviceAgentPage.tsx` compose un contrôleur et quatre vues d’onglets.

Le seuil de `CODING_GUIDELINES.md` reste une cible. Un nouveau découpage ne
doit être engagé qu’avec une frontière métier explicite.

### Types partagés — corrigé

Le contrat transversal de chat vit dans `src/shared/chat.types.ts`. Le main,
le preload et le renderer l’importent sans dépendance vers une couche
applicative.

### APIs, états et code orphelins — corrigé

- les handlers `nova:device:*` sans consommateur ont été retirés ;
- l’API, le service et le stockage de conversation agent directe sans UI ont
  été retirés ;
- l’ancien mock `renderer/services/chat.service.ts` a été supprimé ;
- `settings.reset`, le statut `streaming` et son curseur dormant ont été
  supprimés ;
- les traces de génération de commande Device sont fusionnées avec la
  délégation, attachées au message final et persistées dans la conversation
  agent.

### Démarrage artificiellement lent — corrigé

Le boot n’exécute plus que le ping IPC réel. Le workspace s’affiche
immédiatement après sa réussite ; le timeout et la nouvelle tentative restent
disponibles en cas d’erreur.

### Configuration Webpack partagée par mutation — corrigé

`mainConfig` et `rendererConfig` construisent chacun leur propre tableau à
partir des règles communes. Les règles spécifiques au renderer sont ajoutées
localement, sans mutation de la configuration main.

### Documentation visuelle obsolète — corrigé

La capture historique non représentative a été supprimée ainsi que ses
références.

### Hygiène de distribution — corrigé

`package.json` possède une description réelle et les scripts `check` et `ci`.
Le workflow `.github/workflows/ci.yml` valide le projet sous Windows et la
licence MIT déclarée est matérialisée par `LICENSE`.

### Résolutions npm transitives — surveillance continue

L’audit npm est revenu à zéro grâce aux mises à jour directes et à quatre
résolutions transitives : `tar`, `tmp`, `uuid` et `webpack-dev-server`.
Celles-ci compensent des contraintes amont d’Electron Forge 7 et peuvent
devenir inutiles ou incompatibles lors d’une prochaine mise à jour.

Action recommandée : à chaque mise à jour d’Electron Forge, tenter de retirer
les résolutions une par une, puis rejouer audit, tests, démarrage et packaging.

## Ce qui est sain aujourd’hui

- Les audits npm complet et production signalent 0 vulnérabilité.
- TypeScript `--noEmit` passe.
- ESLint passe.
- Le packaging Windows x64 passe.
- Les domaines main/renderer/preload sont identifiables.
- Le contrat événementiel du chat est simple.
- La persistance éclatée est atomique par fichier, sauvegardée et observable.
- Les données par défaut sont sous `userData` et les écritures agents sont
  sérialisées.
- La clé OpenAI stockée n’est ni présente dans les settings ni exposée au
  renderer.
- L’arrêt de tour regroupe abort provider, permission et commandes actives.
