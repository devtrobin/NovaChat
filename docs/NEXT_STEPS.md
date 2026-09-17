# Prochaines étapes

Les bilans des phases terminées sont historiques ; les appellations ACP/AEL
sont harmonisées avec la cible. Les anciennes migrations décrites dans ces
bilans seront retirées en phase 6.1. Le renommage du code et la remise à zéro
ne sont pas encore réalisés.

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
- Policy AEL testée avec cas sûrs et cas adversariaux.
- Parsers OpenAI et ACP testés.
- Sérialisation, round-trip du stockage et reducers d’événements testés.
- La suite actuelle compte 277 tests réussis, dont 119 cas de policy AEL.

La phase 2 est terminée. Les anciens
`it.fails` sont désormais des tests de régression normaux.

## Phase 2 — Sécuriser AEL — terminée

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
6. ~~Migration idempotente de l’ancien agent de diagnostic vers l’agent de
   cadrage.~~ Réalisée dans le socle historique avec fusion et backups ; cette
   reprise sera retirée au profit du reset de phase 6.1.
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
   Le démarrage et le timeout AEL ne laissent plus de rejet non géré.
8. Refactors bornés réalisés : validation IPC par domaine, migrations racine
   et agent, étape ACP de l’orchestrateur, contrôleur commun des pages
   agents et payloads OpenAI assistant/AEL/agent.
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
   une façade d’orchestration et des modules ACP, AEL, permission,
   résolution de commande et messages ;
2. ~~`agent-storage.service.ts` entre chemins, récupération et écritures ;~~
   terminé avec une façade et des modules paths, recovery, workspace, records
   et conversations ;
3. ~~`ael.policy.ts` entre parsing et règles ;~~ terminé avec des modules
   dédiés aux règles, segments, chemins, tokens et types ;
4. ~~`AelAgentPage.tsx` en vues d’onglets ;~~ terminé avec un hook
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

1. une décision AEL `allow` ne déclenche plus de demande de permission ;
2. les lectures Windows automatiques sont classées par commande et options,
   avec confirmations conservées pour le réseau, les mutations et les données
   potentiellement sensibles ;
3. ACP transmet des objectifs et AEL reste propriétaire de la syntaxe
   shell ;
4. le shell runtime exposé aux prompts correspond au shell réellement exécuté
   (`cmd.exe` sous Windows) ;
5. les quatre cycles uniques sont remplacés par huit cycles assistant, six
   exécutions AEL, une détection des répétitions et une synthèse finale
   réservée ;
6. les contextes agents sont versionnés, les anciens defaults sont migrés et
   les personnalisations sont préservées ;
7. les sorties Windows passent en UTF-8 et le buffer conserve les caractères
   multioctets coupés entre deux chunks ;
8. la règle Git `/agents/` est ancrée à la racine et ne masque plus les
   nouveaux modules sous `src/main/agents/`.
9. les commandes générées par AEL passent par un profil terminal
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

### Phase 6.1 — Renommage complet ACP/AEL et remise à zéro

**Périmètre confirmé le 16 septembre 2026. Tâches définies ; implémentation
non démarrée et différée jusqu’à finalisation de la documentation.**

Cahiers de référence :

- [ACP — Agent de Cadrage et de Planification](agents_specification/ACP_SPECIFICATION.md),
  identifiant `agent-acp` ;
- [AEL — Agent d’Exécution Locale](agents_specification/AEL_SPECIFICATION.md),
  identifiant `agent-ael` ;
- [ADR 005 — Renommage complet et remise à zéro](decisions/005-acp-ael-breaking-reset.md).

Le renommage couvre la documentation et tout le code, y compris les noms des
modules techniques, fichiers, dossiers, types, fonctions, variables, styles,
contrats, paramètres, prompts, tests et métadonnées concernés. Les préfixes
sont `acp`/`Acp`/`ACP` et `ael`/`Ael`/`AEL`. Le domaine d’exécution locale
sera `src/main/ael`, le paramétrage `aelExecution` et le rôle de message `ael`.

La transition est un breaking change : suppression de l’ancien état NovaChat,
aucune migration ni compatibilité avec ses anciennes identités. Settings,
contextes, permissions, tâches, historiques, conversations principales et
internes, traces, backups, archives, marqueurs de migration et secrets NovaChat
seront remis à zéro dans le périmètre borné par l’ADR 005. Les nouvelles données
seront initialisées aux valeurs par défaut et la configuration devra être
renseignée à nouveau. Les capacités des agents et les protections du socle
restent identiques.

#### Tâches ordonnées

Toutes les tâches d’implémentation ci-dessous restent à faire. Leur présence
dans cette liste ne déclenche ni développement ni suppression aujourd’hui.

1. **Finaliser la documentation avant de commencer le code.**
   **ACP/AEL : périmètre fonctionnel documenté.** Noms et identifiants confirmés,
   renommage intégral prévu, breaking change sans reprise de l’ancien état,
   documents harmonisés et tâches ordonnées. Les nouveaux compagnons techniques
   décrivent le socle et les outils ; ils restent à relire, sans rouvrir les
   décisions de nommage ou de reset.
   **Reste à faire :** relire les quatre fichiers
   `XXX_SPECIFICATION_TECHNIQUE.md` et le contrat commun de délégation dans
   `AGENTS_PLAN.md`. Valider les cahiers fonctionnel et technique ARI, y compris
   pile de scraping et choix techniques ouverts, puis découper la phase 6.2 ;
   faire de même pour ACA, notamment son isolation, avant le découpage 6.3.
   **Validation :** documentation finalisée ; passage à l’implémentation
   explicitement acté, sans validation implicite d’ARI ou d’ACA.
2. **Inventorier les surfaces et établir la validation de départ.** Recenser
   les anciens noms dans les sources, configurations, scripts, assets, tests,
   imports et contrats. Préparer la liste des seuls fichiers de données
   NovaChat à remettre à zéro, y compris chemins personnalisés et backups,
   sans afficher de secrets. Restaurer les dépendances depuis le lockfile et
   lancer tests, typage et lint avant modification.
   **Validation :** inventaire complet, périmètre de suppression borné et
   résultats de référence consignés.
3. **Centraliser le registre et renommer les contrats partagés.** Définir ACP
   et AEL, leurs métadonnées, settings et contextes par défaut dans un registre
   commun ; remplacer les anciens identifiants, types, champs et rôles par les
   noms cibles. Répercuter les contrats dans la validation IPC et le preload.
   **Validation :** seuls `agent-acp` et `agent-ael` sont reconnus ; aucun alias
   historique ; ARI/ACA restent non implémentés.
4. **Renommer intégralement le main.** Renommer les fichiers et symboles des
   agents, orchestrateur, parsers, prompts, stockage et exécution locale vers
   ACP/AEL ; déplacer le domaine terminal vers `src/main/ael`. Adapter tous
   les imports, événements et journaux. Conserver les limites, permissions,
   annulations et la synthèse finale.
   **Validation :** aucune ancienne identité opérationnelle dans le main et
   mêmes responsabilités pour Nova, ACP et AEL.
5. **Renommer intégralement le renderer et les surfaces projet.** Adapter
   pages, composants, styles, routes, activité, aide, paramètres, messages et
   permissions ; mettre à jour scripts, configurations et description du
   package concernés.
   **Validation :** UI et contrats n’emploient que les nouveaux noms ; aucune
   capacité sensible n’est ajoutée au renderer.
6. **Retirer la compatibilité et préparer l’initialisation neuve.** Supprimer
   les alias, lecteurs et migrations de l’ancien état, y compris les imports
   automatiques de dossiers, messages et clés historiques. Préparer le reset
   de transition unique, reprenable après interruption, puis la création des
   données courantes aux valeurs par défaut. Conserver les écritures
   atomiques, queues, backups et récupération pour cette nouvelle base.
   **Validation :** refus explicite des anciens payloads ; aucun ancien backup
   réimporté ; périmètre limité aux données NovaChat ; aucun reset récurrent.
7. **Adapter les tests et vérifier les régressions.** Renommer tests et
   fixtures ; remplacer les attentes de migration historique par des tests
   de refus, reset et initialisation sur données temporaires. Couvrir les
   dossiers partagés, interruption/reprise du reset et conservation des
   nouvelles données au redémarrage. Rejouer les contrats chat, ACP, AEL,
   permissions, `/cmd`, saisie, arrêt, visibilité et stockage.
   **Validation :** tests, TypeScript strict, lint et packaging réussis ;
   matrice de sécurité maintenue sans assouplissement.
8. **Effectuer la remise à zéro et vérifier le premier démarrage.** Une fois
   le code vérifié, arrêter l’application, exécuter la procédure bornée sur
   les données NovaChat inventoriées puis démarrer sur les valeurs par défaut.
   Reconfigurer les paramètres et la clé OpenAI ; vérifier les parcours puis
   un second démarrage conservant les nouvelles données.
   **Validation :** aucun ancien état restauré, espaces ACP/AEL valides et
   parcours manuels consignés. Les installateurs restent en phase finale.
9. **Clore la phase et synchroniser la documentation avec le code.** Vérifier
   l’absence des anciens noms dans les surfaces actives, hors inventaire de
   retrait et tests de rejet explicites. Actualiser les chemins, résultats de
   validation, risques et handoff.
   **Validation :** critère de sortie ci-dessous rempli avant l’implémentation
   d’ARI.

#### Critère de sortie

- ACP/AEL sont les seules identités des deux agents, dans les docs et le code ;
- aucune conservation des anciens noms dans les modules techniques ;
- aucune migration, alias ou compatibilité avec l’ancien état ;
- ancienne base NovaChat supprimée, nouvelle base valide et persistante ;
- registre commun en place sans nouvelle capacité agent ;
- frontières main/preload/renderer, sécurité, données et visibilité préservées ;
- tests, typage, lint, packaging et parcours manuels documentés.

L’implémentation de cette phase précède celle d’ARI, puis ARI doit être validé
avant ACA. La rédaction de leurs cahiers peut se poursuivre dès maintenant.

### Phase 6.2 — ARI — Agent de Recherche Internet

Objectif retenu : ajouter un agent système de recherche Internet capable de
rechercher et lire des pages publiques ou des contenus accessibles depuis un
compte configuré, de privilégier les sources officielles et de restituer un
dossier de recherche sourcé à l’assistant ou à l’agent qui l’a sollicité.

Cf. [Cahier des charges — ARI](agents_specification/ARI_SPECIFICATION.md) et
[spécification technique ARI](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md).
Les bibliothèques de scraping sont proposées dans le compagnon technique ;
leur choix, les protections réseau et les sessions restent à valider avant
le découpage.

ARI est une capacité transversale utilisable par Nova, les autres agents
système et les agents spécialisés autorisés. Il doit être étudié, découpé,
implémenté et validé avant ACA ; ACA sera l’un de ses consommateurs pour la
création de connecteurs, mais ARI ne lui est pas réservé.

La sous-phase inclura un écran Credentials générique, un registre JSON expurgé
des secrets et un stockage chiffré dans le coffre système. La décision retient
un `CredentialsService` dédié dans le process `main`, sans passage par AEL,
ainsi que des sessions authentifiées strictement limitées à la lecture. ARI
appliquera une stratégie « public d’abord » : poursuivre sur
d’autres sources lorsqu’un site demande un compte, recenser les sites bloqués
et arrêter le cycle après dix sites candidats par défaut si aucune réponse
suffisante n’a été trouvée.

### Phase 6.3 — ACA — Agent de Création Automatique

Objectif retenu : permettre à Nova de rechercher un agent capable de répondre
à une demande et, si cette capacité manque, de faire intervenir ACA pour
préparer un agent spécialisé, son contexte et son connecteur configurable.

Cf. [Cahier des charges — ACA](agents_specification/ACA_SPECIFICATION.md) et
[spécification technique ACA](agents_specification/ACA_SPECIFICATION_TECHNIQUE.md).
Le backend d’isolation et la livraison des outils de compilation/exécution
restent des décisions techniques à résoudre avant le découpage.

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
8. API Credentials dédiée dans le `main` ; AEL ne manipule jamais le
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
Le périmètre de la phase 6.1 et son découpage sont confirmés. Tout
développement reste différé jusqu’à la finalisation de la documentation,
conformément à la demande utilisateur ; les cahiers ARI et ACA gardent leur
validation propre.

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
3. tester installation neuve, conservation des données post-reset lors des
   mises à jour, coffre de secrets et reprise après arrêt sur une installation
   réelle, sans réimport de l’état antérieur à la phase 6.1 ;
4. valider Windows, puis macOS et Linux sur leurs plateformes natives ;
5. documenter les éventuels prérequis de signature et de publication.

Ne pas lancer ce chantier tant que les contrats et capacités encore prévus
sont susceptibles de modifier le packaging.

## Non-objectifs immédiats

- redesign complet du workspace ;
- remplacement global de React/Electron ;
- migration vers une base de données sans besoin mesuré ;
- autonomie illimitée des agents ;
- extension de l’allowlist AEL avant tests ;
- nouveau méga-refactor transversal.
