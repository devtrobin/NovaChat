# Registre des risques et de la dette

Ce document distingue les risques avérés dans le code des améliorations
produit. Les priorités indiquent l’ordre recommandé, pas une estimation
calendaire.

## P0 — À traiter avant d’élargir les capacités locales

### Policy `device` restrictive, mais non sandboxée

Les contournements connus par pipes, opérateurs, substitutions, wrappers,
redirections, sous-commandes Git et options mutantes ont été fermés. La
matrice Device comporte 119 tests normaux. Une construction inconnue ou trop
complexe devient `ask-always`, ce qui interdit de la contourner avec une règle
permanente mémorisée.

Chaque décision porte désormais une catégorie explicite : lecture locale,
écriture workspace, réseau, installation/système, suppression/destruction ou
action non classifiable. Cette catégorie est affichée dans la demande de
permission.

Le flux de résolution distingue maintenant explicitement les trois décisions :

- `allow` s’exécute sans ouvrir de demande de permission ;
- `ask` réutilise une éventuelle règle exacte, sinon interroge l’utilisateur ;
- `ask-always` reste non mémorisable.

Les lectures Windows reconnues (`systeminfo` local, branches matérielles de
`reg query`, énumérations `pnputil`, `fsutil fsinfo` et commandes simples)
sont analysées avec leurs sous-commandes et options. Une lecture distante,
mutante ou non comprise n’est pas automatiquement autorisée.

Les commandes proposées par Device passent en plus par un profil agent avant
la permission. Il limite chaque inspection à trois segments et rejette les
commandes non classifiées, les wrappers de shell, les interfaces graphiques,
les consoles secondaires et les utilitaires interactifs connus (`diskpart`,
`wmic`, `msinfo32`, `dxdiag`, pagers, etc.). Un rejet ne peut donc ni ouvrir une
permission inutile ni démarrer le programme. Sous Windows, le séparateur
séquentiel `&` est analysé comme tel ; il n’est plus confondu avec l’exécution
en arrière-plan des shells POSIX.

Une lecture n’est pas toujours sans risque : fichiers de clés, `.env`,
backups de settings et environnement complet peuvent exposer un secret au
provider. Ces formes restent dans `ask`, même si elles n’écrivent rien.

La policy reste cependant un mécanisme UX de demande de permission :

- une commande acceptée ponctuellement s’exécute dans le shell complet ;
- l’analyse ne remplace pas une isolation OS ;
- le profil agent repose sur une liste de programmes interactifs connus et sur
  la classification de la policy ; il ne prouve pas qu’un outil CLI classifié
  ne deviendra jamais interactif selon ses arguments ;
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

### Orchestration bornée avec synthèse finale

La limite historique de quatre cycles pouvait consommer tout le budget en
planification et tentatives Device, puis remplacer des résultats utiles par un
message générique de « limite de sécurité ».

Le runtime possède désormais deux plafonds : huit cycles assistant et six
exécutions Device. Une commande répétée interrompt les délégations. Dans tous
les cas, un appel final avec les agents désactivés doit synthétiser les
résultats complets ou partiels déjà obtenus. Ces plafonds restent une
protection anti-boucle et de coût, pas une frontière de sécurité.

### Contextes Planner et Device versionnés

Le shell exact et les règles obligatoires sont injectés par le code. Les
préférences éditables ne peuvent donc plus laisser survivre seules d’anciennes
contraintes incompatibles. `contexte.json` porte une version de schéma ; les
anciennes valeurs par défaut sont remplacées et les personnalisations sont
préservées.

## P1 — Risques de données, sécurité et cohérence produit

### Couverture automatisée renforcée, E2E réel restant

Le socle Vitest couvre désormais la policy, les parsers OpenAI/Planner, le
stockage chat, les migrations, les commandes slash, les messages de tâche
agent, la concurrence agent, la politique de traces et le coffre de secrets.
Les 277 tests réussissent, dont 119 cas de policy Device. Ils couvrent aussi les
permissions asynchrones, la résolution concurrente, le registre d’arrêt, le
timeout OpenAI, la reprise d’une queue après erreur, la sécurité de la fenêtre,
la visibilité des messages et des composants React critiques rendus côté
serveur.

Risque restant : aucun test automatisé ne remplace un parcours Electron réel
avec une vraie clé OpenAI, ni la validation native macOS/Linux. Ces contrôles
restent dans la phase finale de distribution et dans la checklist manuelle de
`DEVELOPMENT.md`.

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

### Durcissement Electron — corrigé avec frontière future explicite

La fenêtre principale active explicitement `contextIsolation`, `sandbox` et
`webSecurity`, désactive Node et les webviews, applique une CSP et refuse les
nouvelles fenêtres ainsi que les navigations hors du document applicatif.

Limite volontaire : une future capacité de contrôle de fenêtres n’est pas
implémentée. Elle devra être exposée séparément par le main, avec permissions
et politique de navigation propres ; le renderer Nova ne doit pas recevoir un
accès générique à `BrowserWindow`.

### Sémantique de refus trompeuse — corrigée

Le bouton `Non` est maintenant ponctuel. Seule l’action distincte
`Toujours refuser` enregistre une règle `deny`, et les messages de résolution
indiquent explicitement la portée de la décision.

### Catalogue provider et runtime — corrigés

Les providers futurs restent visibles comme « à venir », mais leurs options
sont désactivées. `ActiveAIProviderId` ne contient qu’OpenAI ; le catalogue
planifié possède son propre type et la validation IPC refuse une activation
non implémentée. Leur implémentation reste une tâche de phase 7.

### Sauvegarde des settings et test réseau — corrigés

La sauvegarde valide les champs locaux puis persiste sans appeler OpenAI.
`agentsDirectory`, conversations et fichier settings sont obligatoires. Le
test de connexion reste une action distincte et utilise un `AbortSignal` avec
un délai maximal de dix secondes.

### TypeScript strict et erreurs asynchrones — corrigés

`strict` est actif, `allowJs` a été retiré et le code source ne contient pas de
`any` ajouté pour contourner le typage. Les contrôleurs renderer critiques
gèrent explicitement chargement, sauvegarde, arrêt et erreurs IPC. Les options
plus intrusives `noUncheckedIndexedAccess` et `exactOptionalPropertyTypes`
restent à évaluer lors d’un chantier typage dédié.

### Frontières des modules denses — corrigées

La validation IPC, les migrations, la résolution Planner, les pages agents et
les payloads OpenAI sont séparés par responsabilités métier avec des façades
stables. La cible de 100 lignes reste un signal de revue, pas une contrainte
qui justifierait des micro-modules artificiels.

### Migration `diagnostic-agent` — corrigée

La migration versionnée remplace l’ancien flag, déplace le dossier source dans
`.migration-backups`, puis le copie ou le fusionne avec `agent-planner`.
Permissions, historique et conversations sont dédupliqués. Une nouvelle
exécution ne rejoue pas les étapes déjà marquées.

### Visibilité des messages internes — corrigée avec compatibilité

`ChatMessage.visibility` exprime désormais `public` ou `internal`. Les
factories marquent explicitement les nouveaux messages et le renderer applique
une règle déterministe aux anciennes données sans champ : les permissions,
saisies, états compacts et `/cmd` utilisateur restent visibles ; les échanges
intermédiaires des agents restent internes. Le filtrage produit une vue sans
muter la conversation persistée.

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
