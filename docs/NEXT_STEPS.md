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
workflow utilisateur. Le socle peut maintenant entrer dans la phase 6,
consacrée d’abord à la réorganisation des agents existants, puis à l’Agent de
Recherche Internet et enfin à la création automatique d’agents, avant tout
autre développement fonctionnel.

## Phase 1 — Filet de sécurité — terminée

- Vitest ajouté avec `npm test` et `npm run test:watch`.
- Policy Device testée avec cas sûrs et cas adversariaux.
- Parsers OpenAI et Planner testés.
- Sérialisation, round-trip du stockage et reducers d’événements testés.
- La suite actuelle compte 277 tests réussis, dont 119 cas de policy Device.

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
5. Couverture portée à 277 tests dans 40 fichiers : permissions asynchrones,
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
- TypeScript strict, ESLint, 277 tests, audits npm et packaging passent ;
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

## Maintenance corrective post-phase 5 — terminée

L’analyse d’un parcours réel d’inventaire Windows a révélé plusieurs défauts
du socle existant, corrigés sans ajouter de nouvelle capacité produit :

1. une décision Device `allow` ne déclenche plus de demande de permission ;
2. les lectures Windows automatiques sont classées par commande et options,
   avec confirmations conservées pour le réseau, les mutations et les données
   potentiellement sensibles ;
3. Planner transmet des objectifs et Device reste propriétaire de la syntaxe
   shell ;
4. le shell runtime exposé aux prompts correspond au shell réellement exécuté
   (`cmd.exe` sous Windows) ;
5. les quatre cycles uniques sont remplacés par huit cycles assistant, six
   exécutions Device, une détection des répétitions et une synthèse finale
   réservée ;
6. les contextes agents sont versionnés, les anciens defaults sont migrés et
   les personnalisations sont préservées ;
7. les sorties Windows passent en UTF-8 et le buffer conserve les caractères
   multioctets coupés entre deux chunks ;
8. la règle Git `/agents/` est ancrée à la racine et ne masque plus les
   nouveaux modules sous `src/main/agents/`.
9. les commandes générées par Device passent par un profil terminal
   déterministe avant toute permission : trois segments au plus, aucune
   interface graphique, console secondaire, commande inconnue ou utilitaire
   interactif tel que DiskPart ;
10. le séparateur Windows `&` est reconnu comme séquentiel au lieu d’être
    classé à tort comme exécution en arrière-plan ;
11. les lectures ciblées de version Windows dans
    `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion` rejoignent les lectures
    sûres, avec une liste fermée de valeurs autorisées.

Le critère de sortie est la disparition des confirmations pour les lectures
explicitement sûres, sans autorisation globale des lectures sensibles, ainsi
qu’une réponse finale même lorsque le budget d’orchestration est atteint.

## Phase 6 — Réorganisation et extension des agents système

### Phase 6.1 — Réorganisation des agents existants

Objectif retenu : harmoniser les noms, identifiants, dossiers et contrats des
agents système existants avant d’ajouter ARI et ACA. Cette sous-phase ne doit
ajouter aucune capacité fonctionnelle à Planner ou Device.

Deux cahiers des charges initiaux sont créés :

- [Spécification du renommage de Planner](agents_specification/PLANNER_SPECIFICATION.md) ;
- [Spécification du renommage de Device](agents_specification/DEVICE_SPECIFICATION.md).

Les noms recommandés sont :

- **ACP — Agent de Cadrage et de Planification**, identifiant `agent-acp` ;
- **AEL — Agent d’Exécution Locale**, identifiant `agent-ael`.

La convention cible proposée est `agent-<acronyme>`, ce qui permettra ensuite
`agent-ari` et `agent-aca`. Les noms, acronymes et identifiants devront être
validés avant toute modification du code ou des données.

La spécification puis le futur découpage devront couvrir :

1. inventaire des identifiants, labels, types, prompts, routes, pages et tests ;
2. migration idempotente de `diagnostic-agent`, `agent-planner` et
   `device-agent` vers les identifiants canoniques retenus ;
3. préservation des settings, contextes, permissions, tâches, historiques et
   conversations ;
4. compatibilité en lecture des anciens messages sans réécriture destructive ;
5. centralisation du registre et des métadonnées des agents système afin de
   préparer ARI et ACA ;
6. validation complète sans changement de comportement Planner/Device ni
   assouplissement de la policy terminal.

Cette phase 6.1 doit être spécifiée, validée, implémentée et vérifiée avant de
commencer ARI.

### Phase 6.2 — ARI — Agent de Recherche Internet

Objectif retenu : ajouter un agent système de recherche Internet capable de
rechercher et lire des pages publiques ou des contenus accessibles depuis un
compte configuré, de privilégier les sources officielles et de restituer un
dossier de recherche sourcé à l’assistant ou à l’agent qui l’a sollicité.

Cf. [Cahier des charges — ARI](agents_specification/ARI_SPECIFICATION.md).

ARI est une capacité transversale utilisable par Nova, les autres agents
système et les agents spécialisés autorisés. Il doit être étudié, découpé,
implémenté et validé avant ACA ; ACA sera l’un de ses consommateurs pour la
création de connecteurs, mais ARI ne lui est pas réservé.

La sous-phase inclura un écran Credentials générique, un registre JSON expurgé
des secrets et un stockage chiffré dans le coffre système. La décision retient
un `CredentialsService` dédié dans le process `main`, sans passage par Device,
ainsi que des sessions authentifiées strictement limitées à la lecture. ARI
appliquera une stratégie « public d’abord » : poursuivre sur
d’autres sources lorsqu’un site demande un compte, recenser les sites bloqués
et arrêter le cycle après dix sites candidats par défaut si aucune réponse
suffisante n’a été trouvée.

### Phase 6.3 — ACA — Agent de Création Automatique

Objectif retenu : permettre à Nova de rechercher un agent capable de répondre
à une demande et, si cette capacité manque, de faire intervenir ACA pour
préparer un agent spécialisé, son contexte et son connecteur configurable.

Cf. [Cahier des charges — ACA](agents_specification/ACA_SPECIFICATION.md).

### Arbitrages ARI confirmés pour la reprise

La prochaine session repartira des décisions confirmées suivantes :

1. découverte publique par un scraper Google local, sans outil de recherche
   OpenAI, puis extraction des dix premiers sites organiques retenus ;
2. scraping public ou authentifié par des composants contrôlés dans le `main`,
   avec assainissement du HTML avant transmission au modèle ;
3. dix sites distincts par cycle, avec budgets séparés pour requêtes, pages,
   temps et documents ;
4. PDF texte pris en charge, sans OCR automatique dans la première version ;
5. citations visibles et résultat structuré commun à tous les agents ;
6. conservation des résultats et métadonnées pendant 90 jours et au plus
   1 000 tâches finales, sans archive persistante du contenu intégral des
   pages ;
7. registre Credentials global, chiffré et partagé uniquement par autorisation
   explicite de chaque agent demandeur, même lorsqu’ARI exécute la recherche ;
8. API Credentials dédiée dans le `main` ; Device ne manipule jamais le
   registre ni les secrets ;
9. navigation authentifiée en lecture seule, avec intervention manuelle pour
   MFA, OAuth ou SSO et session chiffrée révocable ; tout captcha fait ignorer
   le site sans tentative de résolution ;
10. ACA et les agents spécialisés peuvent solliciter ARI, sans en faire un
    connecteur privé d’ACA.

Les règles du scraper Google sont confirmées : résultats organiques
dédupliqués par domaine, arrêt si Google présente un captcha, abandon de tout
site avec captcha, rendu JavaScript seulement dans une session Electron
isolée, respect de `robots.txt` et des réponses `403`/`429`, et une seule
requête Google par cycle.

Les autres règles confirmées sont : URL directe examinée avant Google, lecture
publique et création structurelle de credentials autorisées par défaut lorsque
ARI est actif, session Google éphémère sans compte ni SafeSearch, et validation
d’un fait par une donnée officielle ou trois sources réellement indépendantes.
Les copies, propriétaires communs et sources politiquement ou éditorialement
orientées ne comptent pas comme confirmations distinctes.

ARI pourra suivre jusqu’à dix pages pertinentes sur un même site. La première
version restera limitée aux contenus textuels exploitables et refusera les
exécutables, archives, téléchargements forcés, destinations locales ou privées
et pages malveillantes. Une source dont la neutralité ne peut pas être établie
sera signalée `neutrality-unverified` et ne comptera pas automatiquement parmi
les trois confirmations. Le plafond global est fixé à trente pages HTML par
cycle.

Le cadrage fonctionnel d’ARI est complet. La prochaine étape documentaire sera
sa relecture et sa validation finale, puis la transformation de la phase 6.2 en
tâches ordonnées et vérifiables. Le cahier ACA sera relu et validé séparément
avant le découpage de la phase 6.3.

Chaque sous-phase commence par la rédaction et la validation de son cahier des
charges. Elle sera ensuite découpée ici en tâches d’implémentation ordonnées.
Aucun développement de la phase 6 ne doit commencer avant ce découpage.

## Phase 7 — Nouvelles capacités

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
