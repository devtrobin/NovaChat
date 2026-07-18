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
événements de conversation. Les 148 tests réussissent, dont 88 cas de policy
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

### Validation IPC insuffisante

Les types TypeScript ne valident rien à l’exécution. Les handlers acceptent des
IDs, chemins et objets issus du renderer sans schéma runtime. Les IDs de
conversation sont ensuite utilisés dans des chemins de fichiers.

Action recommandée : valider tous les payloads IPC, borner les chaînes,
normaliser les IDs et vérifier que les chemins résolus restent dans leur
racine.

### Durcissement Electron incomplet

`index.html` ne définit pas de Content Security Policy. La fenêtre ne rend pas
explicites les choix `contextIsolation`, `sandbox` et `nodeIntegration`, et
aucune règle de navigation/nouvelle fenêtre n’est installée.

Action recommandée : configuration explicite, CSP stricte et blocage des
navigations externes non approuvées.

### Sémantique de refus trompeuse

Le bouton de permission `Non` enregistre une règle `deny` permanente pour les
commandes classées `ask`. L’UI ne dit pas que le refus sera mémorisé.

Action recommandée : faire de `Non` un refus ponctuel ou renommer l’action et
ajouter une action distincte “Toujours refuser”.

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

### Exécution interactive fragile

- timeout global fixe de 15 secondes, y compris en attente de saisie ;
- détection de prompt par expressions régulières sur stdout/stderr ;
- absence de pseudo-terminal ;
- kill Windows potentiellement limité au processus shell et non à tout
  l’arbre enfant ;
- sortie accumulée sans plafond mémoire.

Action recommandée : état d’attente qui suspend le timeout, PTY si nécessaire,
kill d’arbre et limite de sortie.

## P2 — Maintenabilité et dette fonctionnelle

### Fichiers denses malgré les règles

Plusieurs fichiers dépassent encore largement l’objectif de 100 lignes :

- `ai.orchestrator.cycle.ts`.

Le seuil de `CODING_GUIDELINES.md` doit être compris comme une cible, pas comme
l’état actuel. Découper uniquement avec des frontières métier claires.

`device.policy.ts`, auparavant à plus de 600 lignes, a été découpé en une
façade publique et cinq modules cohérents : règles spécialisées, évaluation de
segment, chemins, tokens et contrat de décision.

`agent-orchestrator.service.ts`, auparavant à plus de 600 lignes, est désormais
une façade d’environ 110 lignes. Les phases Planner, Device, permission,
résolution de commande, messages et conversations directes vivent dans des
modules dédiés.

`agent-storage.service.ts`, auparavant proche de 500 lignes, est désormais une
façade minimale. Les chemins, la récupération d’historique, le workspace, les
records persistés et les écritures conversationnelles sont séparés.

`DeviceAgentPage.tsx`, auparavant à plus de 400 lignes, compose désormais un
hook contrôleur et quatre vues d’onglets dédiées.

### Types partagés couplés au renderer

`src/shared/*.types.ts` et le main importent
`src/renderer/types/chat.types.ts`. Le contrat transversal devrait vivre sous
`src/shared`.

### APIs et code orphelins

- handlers directs `nova:device:*` non exposés dans le preload ;
- API de conversations directes agents exposée mais sans UI ;
- ancien `src/renderer/services/chat.service.ts` mock non utilisé ;
- `settings.reset` exposé mais sans action UI ;
- état `streaming` et curseur présents sans streaming provider ;
- traces retournées lors de la génération de commande Device non rattachées au
  message ni à l’historique.

Décider pour chaque surface : terminer, tester et exposer, ou supprimer.

### Démarrage artificiellement lent

L’écran de boot contient plusieurs délais simulés et impose plus de quatre
secondes avant l’accès au workspace.

### Configuration Webpack partagée par mutation

`webpack.renderer.config.ts` pousse des règles dans le tableau importé depuis
`webpack.rules.ts`. Comme `mainConfig` et `rendererConfig` partagent cette
référence, l’ordre d’import influence les deux configurations.

### Documentation visuelle obsolète

`docs/screenshot.png` montre une version antérieure sans la section Agents
actuelle. Elle ne doit pas servir de référence fonctionnelle.

### Hygiène de distribution incomplète

`package.json` conserve une description placeholder, aucun script CI n’est
présent et le dépôt ne contient pas de fichier `LICENSE` malgré la déclaration
`MIT`.

### Résolutions npm transitives à surveiller

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
