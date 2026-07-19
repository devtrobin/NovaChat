# Prochaines étapes

## Principe

Le système d’agents existe déjà. La priorité n’est plus de le créer, mais de
fiabiliser les capacités qu’il possède avant de l’élargir.

## Objectif principal atteint

Mettre le projet au propre avant toute nouvelle fonctionnalité :

- environnement reproductible et dépôt sans artefact parasite ;
- aucun bug connu sur les parcours existants ;
- frontières main/preload/renderer explicites et testées ;
- types et erreurs exploitables ;
- modules lisibles, sans refonte globale ni découpage artificiel ;
- CI, audits et packaging verts.

La phase 4 a été clôturée le 19 juillet 2026 sans ajout de provider, agent ou
workflow utilisateur. Le socle peut maintenant recevoir les capacités de la
phase 6, une par une, après décision explicite et avec le même niveau de
validation.

## Phase 1 — Filet de sécurité — terminée

- Vitest ajouté avec `npm test` et `npm run test:watch`.
- Policy Device testée avec cas sûrs et cas adversariaux.
- Parsers OpenAI et Planner testés.
- Sérialisation, round-trip du stockage et reducers d’événements testés.
- La suite actuelle compte 211 tests réussis, dont 88 cas de policy Device.

La phase 2 est terminée. Les anciens
`it.fails` sont désormais des tests de régression normaux.

## Phase 2 — Sécuriser Device — terminée

1. ~~Refuser par défaut les commandes non analysables.~~ Terminé :
   elles sont classées `ask-always`.
2. Traiter pipes, substitutions, sous-commandes, redirections et options
   mutantes. La matrice actuelle est couverte ; maintenir cette règle à chaque
   extension.
3. ~~Séparer explicitement :~~ Terminé, chaque décision porte une catégorie
   affichée dans la demande de permission :
   - lecture locale ;
   - écriture limitée au workspace ;
   - accès réseau ;
   - installation/système ;
   - suppression/destruction.
4. ~~Corriger la sémantique `Non` vs refus permanent.~~ Terminé : `Non` est
   ponctuel et `Toujours refuser` est la seule action de refus mémorisée.
5. ~~Valider les payloads IPC et les chemins.~~ Terminé : tous les arguments
   IPC sont validés à l’exécution et les chemins dérivés restent confinés à
   leur racine configurée.
6. ~~Ajouter limites de sortie, timeout configurable, kill d’arbre et stratégie
   d’input interactive.~~ Terminé : sortie bornée, limites persistées dans les
   settings, timeout actif suspendu pendant la saisie, puis réarmé, et arrêt
   récursif de l’arbre de processus.

Critère de sortie : aucun contournement connu de la matrice de tests et une UX
de permission non ambiguë.

## Phase 3 — Fiabiliser les données — terminée

1. ~~Écritures JSON atomiques.~~ Chaque fichier JSON est écrit dans un
   temporaire synchronisé, puis renommé.
2. ~~Backups et journalisation des erreurs de lecture.~~ La dernière version
   valide est conservée en `.bak`, les fichiers corrompus sont archivés et les
   anomalies sont ajoutées à `logs/storage-errors.jsonl` sous `userData`.
3. ~~Détection d’état partiellement récupéré avant auto-sauvegarde.~~ Un état
   incomplet affiche une bannière et bloque les écritures concernées jusqu’à
   acknowledgement explicite.
4. ~~Queue ou verrou par espace agent.~~ Les opérations sont sérialisées par
   racine de stockage et par agent.
5. ~~Migration vers `app.getPath("userData")`.~~ Les nouveaux chemins par
   défaut utilisent `userData` et les anciens emplacements sont copiés une
   seule fois sans remplacer les chemins personnalisés.
6. ~~Migration idempotente de `diagnostic-agent` vers `agent-planner`.~~ Les
   settings et dossiers sont migrés ou fusionnés, avec l’original déplacé dans
   `.migration-backups`.
7. ~~Politique de rétention/redaction de `apis.json`.~~ Activation, durée,
   plafond par message et masquage des secrets sont configurables et appliqués
   aux conversations principales comme aux conversations agents.
8. ~~Stockage sécurisé de la clé API.~~ La clé est chiffrée par
   `electron.safeStorage`, n’est plus renvoyée au renderer et les anciennes
   copies en clair sont nettoyées seulement après vérification du coffre.

Critère de sortie atteint : une corruption détectée ne peut plus être
silencieusement écrasée par l’auto-sauvegarde. Les copies valides, archives et
journaux permettent une reprise explicite après une interruption.

La phase 4 qui suivait est désormais également terminée.

## Phase 4 — Assainissement final du code — terminée

Déjà nettoyé dans ce périmètre :

- les conversations directes agent et leurs surfaces orphelines ont été
  retirées ;
- le délai de boot simulé a été supprimé ;
- la capture historique obsolète et ses références ont été retirées.

Travaux terminés :

1. Fenêtre Electron principale durcie : isolation de contexte, sandbox,
   désactivation de Node et des webviews, CSP, refus des nouvelles fenêtres et
   des navigations hors du document applicatif. Une future automatisation de
   fenêtres reste réservée à une API main séparée et permissionnée.
2. Catalogue provider conservé : les providers planifiés restent visibles
   comme « à venir », mais sont désactivés. `ActiveAIProviderId` est séparé du
   catalogue et la validation main refuse toute valeur autre qu’OpenAI.
3. Settings découplés du réseau : la sauvegarde locale n’appelle plus le test
   OpenAI, la validation est faite par section, `agentsDirectory` est requis et
   le test réseau possède un timeout/abort de dix secondes.
4. Visibilité structurée : `ChatMessage.visibility` distingue `public` et
   `internal`, avec compatibilité déterministe pour les anciens messages.
   Permissions, saisies, progression compacte et `/cmd` utilisateur restent
   visibles ; les détails d’orchestration agent restent internes.
5. Couverture portée à 211 tests dans 33 fichiers : permissions asynchrones,
   résolution unique, annulation de tour, queue après échec, timeout OpenAI,
   sécurité de fenêtre, visibilité, payloads et composants React critiques.
6. TypeScript renforcé : `allowJs` retiré, `strict` activé, casse des fichiers
   et chutes de `switch` contrôlées, sans `any` ajouté.
   `noUncheckedIndexedAccess` et `exactOptionalPropertyTypes` restent des
   options futures à évaluer séparément, car elles dépassent le critère
   `strict` et impliquent des changements de contrats plus larges.
7. Erreurs asynchrones auditées : contrôleurs Settings/Agents/Workspace,
   hydratation, sauvegarde, interactions et reprise affichent un état contrôlé.
   Le démarrage et le timeout Device ne laissent plus de rejet non géré.
8. Refactors bornés réalisés : validation IPC par domaine, migrations racine
   et agent, étape Planner de l’orchestrateur, contrôleur commun des pages
   agents et payloads OpenAI assistant/Device/agent.
9. Passe de cohérence terminée : branche provider inaccessible supprimée,
   runtime provider resserré, contrôleurs dupliqués fusionnés et façades
   publiques conservées pour limiter les changements d’imports.
10. Environnement reproductible vérifié : `npm.cmd ci` réussit depuis le
    lockfile, `agents/` rejoint les données locales ignorées et aucun test ne
    lit les settings ou agents de la machine.
11. Régression automatisée complète réussie sur les contrats de démarrage,
    chat, settings, provider, agents, permissions, `/cmd`, arrêt, stockage et
    récupération. Les essais nécessitant une vraie clé OpenAI, le lancement du
    binaire packagé et les plateformes non Windows restent explicitement dans
    la validation manuelle/de distribution.

Critère de sortie atteint :

- aucun provider non implémenté ne peut devenir actif ;
- sauvegarder les settings ne dépend pas du réseau ;
- la visibilité des messages est déterministe et testée ;
- la fenêtre principale est durcie sans accès générique du renderer ;
- permission, abort, courses et récupération ont des tests automatisés ;
- TypeScript strict, ESLint, 211 tests, audits npm et packaging passent ;
- aucun bug reproductible connu n’est laissé sans entrée dans `RISKS.md` ;
- les données locales et artefacts ne polluent plus `git status --short`.

## Phase 5 — Maintenabilité ciblée — terminée

Découper sans refonte globale :

1. ~~`agent-orchestrator.service.ts` par agent et par phase ;~~ terminé avec
   une façade d’orchestration et des modules Planner, Device, permission,
   résolution de commande et messages ;
2. ~~`agent-storage.service.ts` entre chemins, récupération et écritures ;~~
   terminé avec une façade et des modules paths, recovery, workspace, records
   et conversations ;
3. ~~`device.policy.ts` entre parsing et règles ;~~ terminé avec des modules
   dédiés aux règles, segments, chemins, tokens et types ;
4. ~~`DeviceAgentPage.tsx` en vues d’onglets ;~~ terminé avec un hook
   contrôleur et des vues General, Contexte, Permissions et Historique ;
5. ~~déplacer les types de chat transversaux vers `src/shared` ;~~ terminé,
   `shared/chat.types.ts` est désormais la source unique des contrats de
   message, conversation et commande ;
6. ~~découper `ai.orchestrator.cycle.ts` ;~~ terminé avec des modules dédiés à
   l’appel provider, aux handoffs, au cycle agent et aux transitions.

~~Corriger aussi la mutation du tableau de règles Webpack.~~ Terminé : les
configurations main et renderer construisent désormais des tableaux de règles
indépendants.

Les surfaces sans consommateur, les délais simulés et l’hygiène de distribution
recensés en P2 sont également traités. Les phases 2 à 5 forment désormais le
socle stabilisé du projet.

## Phase 6 — Nouvelles capacités

Seulement après les phases précédentes :

1. streaming provider ;
2. provider local Ollama ou LM Studio ;
3. autres providers ;
4. recherche globale ;
5. nouveaux agents spécialisés ;
6. résumé/compaction des longues conversations ;
7. extension i18n au reste de l’interface si le bilingue devient un objectif
   confirmé.

## Entretien continu des dépendances

À chaque mise à jour d’Electron Forge :

1. tenter de retirer séparément les overrides `tar`, `tmp`, `uuid` et
   `webpack-dev-server` ;
2. exécuter les audits complet et production ;
3. rejouer tests, TypeScript, lint, démarrage et packaging ;
4. conserver uniquement les overrides encore justifiés par l’arbre réel.

Ce contrôle est récurrent et ne constitue pas une nouvelle fonctionnalité.

## Phase finale — Validation de distribution — toute dernière tâche

Cette phase reste volontairement la dernière tâche absolue, après les travaux
de code et les capacités retenues :

1. exécuter `npm.cmd run make` et vérifier les artefacts produits ;
2. installer et lancer le binaire packagé hors environnement de développement ;
3. tester mise à jour, migration `userData`, coffre de secrets et reprise
   après arrêt sur une installation réelle ;
4. valider Windows, puis macOS et Linux sur leurs plateformes natives ;
5. documenter les éventuels prérequis de signature et de publication.

Ne pas lancer ce chantier tant que les contrats et capacités encore prévus
sont susceptibles de modifier le packaging.

## Non-objectifs immédiats

- redesign complet du workspace ;
- remplacement global de React/Electron ;
- migration vers une base de données sans besoin mesuré ;
- autonomie illimitée des agents ;
- extension de l’allowlist Device avant tests ;
- nouveau méga-refactor transversal.
