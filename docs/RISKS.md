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
stockage chat, les commandes slash, les messages de tâche agent et les
événements de conversation. Les 174 tests réussissent, dont 88 cas de policy
Device.

Il manque encore les composants React, l’orchestrateur complet, les
permissions asynchrones, le registre d’arrêt et les parcours end-to-end.

Action recommandée : couvrir maintenant les workflows asynchrones critiques.

### Écritures non atomiques et erreurs silencieuses

`readJsonFile` et la lecture des settings absorbent toute erreur et retournent
`null`. Les writes utilisent directement `writeFile`, sans fichier temporaire
ni renommage atomique.

Une coupure pendant une écriture peut produire un JSON invalide. Au prochain
chargement, un message illisible peut disparaître de l’état puis être supprimé
du disque lors de l’auto-sauvegarde du renderer.

Action recommandée : writes atomiques, journal d’erreur visible, sauvegarde de
secours et refus de réécrire automatiquement un état partiellement récupéré.

### Concurrence du stockage agent

La sauvegarde du chat principal possède une queue. Les écritures des
conversations et de l’historique agents n’en ont pas. Deux tâches concurrentes
sur un même agent peuvent charger le même état puis écraser mutuellement une
entrée.

Action recommandée : queue par espace agent ou couche transactionnelle
commune.

### Emplacement par défaut en application packagée

`settings.service.ts` utilise le dossier de l’exécutable lorsque l’application
est packagée. Ce dossier n’est pas un emplacement de données utilisateur
portable et peut être non inscriptible ou invalidé par une mise à jour.

Action recommandée : migrer les données vers `app.getPath("userData")`, avec
une stratégie explicite de migration depuis les chemins actuels.

### Clé API et traces en clair

La clé OpenAI est stockée en clair dans `settings.json`. Les requêtes et
réponses provider complètes sont persistées dans `apis.json`.

Action recommandée : coffre de secrets OS pour la clé, politique de rétention
et option de désactivation/redaction des traces.

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

### Migration `diagnostic-agent` incomplète

Le code convertit l’ancien flag et les réponses vers `agent-planner`, mais ne
migre ni ne masque complètement l’ancienne clé de settings, ni le dossier de
données `diagnostic-agent`.

Action recommandée : migration idempotente avec sauvegarde et journal.

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
- La persistance éclatée facilite l’inspection manuelle.
- L’arrêt de tour regroupe abort provider, permission et commandes actives.
