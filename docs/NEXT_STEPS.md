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
- Policy AEL testée avec cas sûrs et cas adversariaux.
- Parsers OpenAI et ACP testés.
- Sérialisation, round-trip du stockage et reducers d’événements testés.
- La suite actuelle compte 281 tests réussis, dont 119 cas de policy AEL.

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
6. ~~Migration historique d’identité agent.~~ Elle a protégé les données lors
   de la phase 3, puis a été retirée en phase 6.1 au profit d’identifiants
   canoniques et d’une réinitialisation assumée des données de développement.
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
5. Couverture portée à 281 tests dans 41 fichiers : permissions asynchrones,
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
- TypeScript strict, ESLint, 281 tests, audits npm et packaging passent ;
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
4. ~~`AELAgentPage.tsx` en vues d’onglets ;~~ terminé avec un hook
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

### Phase 6.1 — Réorganisation des agents existants — terminée

Objectif retenu : harmoniser les noms, identifiants, dossiers et contrats des
agents système existants avant d’ajouter ARI et ACA. Cette sous-phase ne doit
ajouter aucune capacité fonctionnelle à ACP ou AEL.

Les cahiers fonctionnels et techniques validés encadrent cette phase :

- [Spécification ACP](agents_specification/ACP_SPECIFICATION.md) ;
- [Spécification technique ACP](agents_specification/ACP_SPECIFICATION_TECHNIQUE.md) ;
- [Spécification AEL](agents_specification/AEL_SPECIFICATION.md) ;
- [Spécification technique AEL](agents_specification/AEL_SPECIFICATION_TECHNIQUE.md).

Les noms validés sont :

- **ACP — Agent de Cadrage et de Planification**, identifiant `agent-acp` ;
- **AEL — Agent d’Exécution Locale**, identifiant `agent-ael`.

La convention cible est `agent-<acronyme>`, ce qui permettra ensuite
`agent-ari` et `agent-aca`.

L’implémentation couvre :

1. inventaire des identifiants, labels, types, prompts, routes, pages et tests ;
2. réinitialisation assumée des espaces agents locaux de développement liés aux
   anciens identifiants, sans migration ni sauvegarde ; les messages des
   conversations principales déjà chargées sont uniquement normalisés vers les
   identifiants canoniques afin de rester sauvegardables ;
3. préservation des paramètres généraux et du secret OpenAI ;
4. adoption exclusive des identifiants `agent-acp` et `agent-ael` ;
5. centralisation du registre et des métadonnées des agents système afin de
   préparer ARI et ACA ;
6. validation complète sans changement de comportement ACP/AEL ni
   assouplissement de la policy terminal.

Cette phase 6.1 doit être spécifiée, validée, implémentée et vérifiée avant de
commencer ARI.

#### Découpage de la phase 6.1

1. ~~**6.1.1 — Figer les contrats**~~ : noms, acronymes, identifiants et rupture
   de données validés.
2. ~~**6.1.2 — Centraliser le registre**~~ : `system-agent.registry.ts` est la
   source de vérité partagée des identités et métadonnées système.
3. ~~**6.1.3 — Renommer ACP**~~ : sources, contrats, prompts, pages, fichiers et
   tests utilisent ACP et `agent-acp`.
4. ~~**6.1.4 — Renommer AEL**~~ : sources, contrats, settings, pages, fichiers,
   classes CSS et tests utilisent AEL et `agent-ael`.
5. ~~**6.1.5 — Réinitialiser les données incompatibles**~~ : la compatibilité des
   opérations et la migration des espaces agents historiques sont retirées du
   code. Une normalisation bornée des identifiants présents dans les messages
   de conversation évite de bloquer leur poursuite ou leur sauvegarde. Les trois
   anciens dossiers locaux ont été supprimés après confirmation explicite ; les
   paramètres généraux, conversations principales et le secret OpenAI sont
   restés conservés.
6. ~~**6.1.6 — Aligner la documentation**~~ : architecture, workflows, modèle
   de données, risques, règles de développement et reprise sont alignés.
7. ~~**6.1.7 — Valider**~~ : 281 tests dans 41 fichiers, TypeScript, ESLint et
   le packaging Windows x64 passent. Le test manuel commun ACP/AEL a réussi.

État de la phase 6.1 : close, sans fonctionnalité nouvelle ni assouplissement de
la policy terminal. Le 29 octobre 2026, les cahiers ARI ont été relus et les
arbitrages ont été arrêtés. L’utilisateur a approuvé le découpage ci-dessous
le même jour et demandé de continuer. La réalisation ordonnée est autorisée ;
la préparation documentaire n’implémente aucune capacité.

### Phase 6.2 — ARI — Agent de Recherche Internet

Objectif retenu : ajouter un agent système de recherche Internet capable de
rechercher et lire des pages publiques ou des contenus accessibles depuis un
compte configuré, de privilégier les sources officielles et de restituer un
dossier de recherche sourcé à l’assistant ou à l’agent qui l’a sollicité.

Documents de référence :

- [Cahier fonctionnel ARI](agents_specification/ARI_SPECIFICATION.md) ;
- [Spécification technique ARI](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md).

**Découpage approuvé le 29 octobre 2026 ; qualification de 6.2.1 réussie le
30 octobre avec Electron 44, Forge 8 et Packager 20. Prochaine tâche : 6.2.2.** Les choix
techniques D01 à D10 sont consignés dans
le cahier technique. D01 a été explicitement confirmé par l’utilisateur ; les
autres arbitrages ont été effectués par délégation. Aucune approbation du code,
des preuves ou du packaging ARI n’est sous-entendue.

ARI reste transversal pour Nova et les agents autorisés, indépendant d’ACA.
Le périmètre comprend recherche Google, extraction HTML/texte/JSON/PDF, rendu
JavaScript contrôlé, Credentials global et sessions de lecture, résultat typé,
citations, annulation et rétention. Une livraison publique seule ne clôt pas
6.2. ACA attend la validation complète d’ARI.

#### Découpage de la phase 6.2

L’ordre numéroté est l’ordre de réalisation et de revue. Les dépendances
indiquent les prérequis techniques minimaux ; elles n’autorisent pas de sauter
une porte de validation. Les chemins source des tâches non réalisées restent
des cibles futures. Chaque tâche s’arrête sur ses
critères de sortie ; tout échec de garantie impose une correction ou un nouvel
arbitrage, jamais un contournement silencieux.

##### 6.2.1 — Qualifier le runtime et les dépendances

- **Dépendances :** approbation acquise le 29 octobre 2026.
- **État :** terminée le 30 octobre 2026. Electron 44.10.0, Forge 8.0.1,
  Packager 20.3.0 et paquets D05 sont verrouillés. L’utilisateur a approuvé les
  majeures de construction. CI Node 24, contrôles Node 22, 285 tests, typage,
  lint, audits à zéro et packaging Windows x64 passent. Le harnais DOM/PDF/N-API
  réussit en développement et dans l’ASAR avec canari chiffré 39 vers 44 ; les
  fuses, assets et l’absence du harnais en production sont vérifiés. Voir
  [le dossier de preuves](validation/ARI_RUNTIME_6_2_1.md). ARI reste inactif.
- **Périmètre/fichiers :** `package.json`, `package-lock.json`,
  `.github/workflows/ci.yml`, `forge.config.ts`, configurations Webpack et
  `tests/electron/ari/` (harnais isolé, absent de l’application de production).
- **Sortie :** qualifier Electron 44.10.0 maintenu à la date de préparation,
  moteurs `^22.22.2 || ^24.18.0`, CI Node 24.18.0 et contrôle sous 22.22.2 ;
  verrouiller les paquets D05 après manifestes/licences/transitives/audits.
  Vérifier ESM/CJS, worker et ressources PDF, dépendances natives optionnelles,
  fuses/ASAR et taille du bundle. Aucun changement de majeure de repli sans
  arbitrage. Garder ARI inactif.
- **Tests :** suite existante, typage, lint, audits complet/production et
  packaging ; smoke DOM/PDF dans le package de test ; canari chiffré temporaire
  pour vérifier la compatibilité du coffre, sans lire le coffre OpenAI réel.
  Pas d’installateur `make` ni de migration des données de l’utilisateur.

##### 6.2.2 — Fermer les contrats et la provenance des délégations

- **Dépendances :** 6.2.1.
- **Périmètre/fichiers :** `src/shared/ari.types.ts`, `credentials.types.ts`,
  `agent-delegation.types.ts`, `src/main/validation/`,
  `src/main/ai/ai.turn-registry.ts` et module de délégation dédié.
- **Sortie :** schémas v1 fermés requête/résultat/source/affirmation/budgets,
  identités produites par le main, rattachement parent/enfant, profondeur 2,
  enfant unique et refus des boucles ; aucun champ privilégié issu du modèle.
  Distinguer statuts de tâche, de recherche et de message. Pas d’activation ARI.
- **Tests :** champs inconnus/tailles invalides, demandeur absent ou usurpé,
  droits Nova différents du demandeur, enfant orphelin, boucle, dépassement de
  profondeur, arrêt du parent et non-réinitialisation des budgets.

##### 6.2.3 — Construire le client HTTP public et la policy de destination

- **Dépendances :** 6.2.1, 6.2.2.
- **Périmètre/fichiers :** `src/main/ari/ari.safe-http.ts`, modules URL/DNS/
  connexion/budgets du même domaine, fixtures et doubles de transport locaux.
- **Sortie :** IP publique épinglée à chaque socket, TLS conservant le nom
  d’origine, redirections manuelles, refus proxy utilisateur/PAC, pas de cookie
  ou header sensible public, streaming/décompression/délais/abort bornés.
- **Tests :** IPv4/IPv6 et formes mappées, DNS mixte et rebinding, reconnexion,
  pool, metadata cloud, userinfo, ports, redirection privée, TLS invalide,
  absence de connexion interdite, bombes de compression, corps sans longueur,
  arrêt et proxy indisponible sans sortie directe.

##### 6.2.4 — Appliquer robots et les règles d’accès aux sites

- **Dépendances :** 6.2.2, 6.2.3.
- **Périmètre/fichiers :** `src/main/ari/ari.robots.ts`, policy des sites et
  fixtures robots HTTP.
- **Sortie :** robots avant première page/PDF, cache par origine et cycle,
  user-agent `NovaChatARI`, politiques de statut/erreur et crawl-delay fixées ;
  exception D01 réservée au GET de résultats Google.
- **Tests :** allow/disallow, groupes UA, encodage, redirections robots,
  `404`/`410`, `401`/`403`/`429`, timeout/5xx/indéterminé, arrêt, plafond ;
  autres services Google et sites cibles non exemptés.

##### 6.2.5 — Prouver le confinement réseau Chromium

- **Dépendances :** 6.2.1 à 6.2.4.
- **Périmètre/fichiers :** `src/main/ari/ari.egress.ts`,
  `ari.rendered-page.ts`, `tests/electron/ari/`, configuration du package de test.
- **Sortie :** proxy HTTP/CONNECT privé épinglé, aucun DIRECT/bypass ;
  interception de partition contrôlant méthodes, redirections et volumes
  décompressés, conservation CORS/CSP/cookies ; permissions, protocoles et
  canaux alternatifs refusés. Preuve écrite avec résultats dev et packagés,
  uniquement sur serveurs de test et userData temporaire.
- **Tests :** TLS dans le tunnel, cookies HttpOnly/Set-Cookie, domaines refusés,
  double résolution, proxy coupé, worker/service worker/iframe/WebSocket/
  WebRTC/QUIC/préchargement, gzip, cache et requêtes après arrêt ; aucun accès
  aux IPC Nova depuis une page distante.
- **Porte bloquante :** si la composition ne tient pas ses garanties, arrêter
  avant rendu distant et authentification, demander un nouvel arbitrage. Un
  simple filtre `webRequest` ou un tunnel CONNECT seul ne valide pas cette tâche.

##### 6.2.6 — Extraire HTML, texte et JSON sans réseau implicite

- **Dépendances :** 6.2.1, 6.2.2, 6.2.3.
- **Périmètre/fichiers :** `src/main/ari/ari.extract-html.ts`, `ari.content.ts`,
  point d’entrée de parsing isolé et sa configuration Webpack.
- **Sortie :** Cheerio/jsdom/Readability sans scripts/ressources, encodages,
  sections/tableaux/liens et métadonnées normalisés, repli textuel conservateur,
  limites DOM/JSON/texte/temps/mémoire et arrêt du processus de parsing.
- **Tests :** documentation technique, article, page vide, charset, liens
  relatifs/canonical hostile, JSON profond, HTML volumineux, script et formulaire
  injectés, absence de fetch implicite et canaris secrets expurgés.

##### 6.2.7 — Extraire les PDF texte

- **Dépendances :** 6.2.1, 6.2.2, 6.2.3, 6.2.6.
- **Périmètre/fichiers :** `src/main/ari/ari.extract-pdf.ts`, processus de
  parsing, assets PDF locaux et fixtures PDF synthétiques.
- **Sortie :** octets fournis à PDF.js, sections et pages sourçables, 20 Mo,
  100 pages analysées et couverture partielle explicite ; refus chiffrement,
  mot de passe, exécutable embarqué et absence de texte ; aucun OCR/viewer.
- **Tests :** documents texte/multipages, 101 pages, dépassement streaming,
  fichier chiffré, pièce jointe dangereuse, scan, contenu malformé, timeout,
  mémoire et arrêt ; smoke dans le package sans ressource réseau auxiliaire.

##### 6.2.8 — Construire la découverte Google

- **Dépendances :** 6.2.2, 6.2.3, 6.2.4, 6.2.6.
- **Périmètre/fichiers :** `src/main/ari/ari.query.ts`, `ari.google-scraper.ts`,
  fixtures SERP versionnées et jar éphémère borné.
- **Sortie :** objectif minimal expurgé, langue/région/SafeSearch demandé,
  une requête sans compte ; sélection organique, déduplication avant plafond,
  ordre préservé, URL directe comptée, aucun retry/pagination/moteur de secours.
- **Tests :** publicités/carrousels, 10 sites distincts ou file plus courte,
  doublons et suffixes privés, URL signée, captcha, consentement, `403`/`429`,
  HTML inconnu => `blocked`, Google exigeant JS, cookies non réutilisés,
  requête contenant un secret => refus. Essai réel uniquement optionnel/manuel.

##### 6.2.9 — Créer le registre Credentials et le coffre global

- **Dépendances :** 6.2.1, 6.2.2.
- **Périmètre/fichiers :** `src/main/credentials/credentials.service.ts`,
  schéma/profils/stockage dédiés, adaptateur de chiffrement et validation IPC.
- **Sortie :** registre global versionné expurgé, références opaques,
  domaines/profils/ACL stricts ; création structurelle après choix utilisateur,
  commande de secret séparée, vérification de relecture et refus coffre faible.
  Aucun accès AEL ni modification du coffre OpenAI existant.
- **Tests :** mot de passe avec espaces conservé exactement, sorties publiques
  sans secret, schémas fermés, origine trompeuse/wildcard, injection de chemin,
  collision/récupération/concurrence et coffre indisponible ; backup chiffré.

##### 6.2.10 — Gérer connexion, lecture et révocation des sessions

- **Dépendances :** 6.2.4, 6.2.5, 6.2.9.
- **Périmètre/fichiers :** `src/main/credentials/authenticated-session.broker.ts`,
  profils de lecture/connexion, snapshots et fenêtres pilotées par le main.
- **Sortie :** lease selon demandeur réel, séparation connexion/lecture,
  injection dans le seul formulaire déclaré, MFA/OAuth/SSO manuels sans captcha,
  snapshots chiffrés par entrée, expiration et génération de révocation.
  Toute route inconnue refuse ; aucun compte utilisateur réel pour qualifier.
- **Tests :** deux comptes même domaine, ACL non héritée de Nova/ARI, lecture
  GET mutante refusée par profil, POST métier, domaine SSO non documentaire,
  captcha, session expirée/non restaurable, arrêt pendant attente et révocation
  pendant fetch/export/écriture ; aucun backup ne ressuscite la session.

##### 6.2.11 — Produire les faits, regroupements et citations vérifiables

- **Dépendances :** 6.2.2, 6.2.6, 6.2.7.
- **Périmètre/fichiers :** `src/main/ari/ari.sources.ts`, chunker,
  `src/main/ai/openai.ari.*`, schémas de réponses provider et policy de traces.
- **Sortie :** appels sans outils d’action ni traces brutes, fragments bornés,
  faits/inférences distincts, références collectées existantes, source officielle
  compétente ou trois confirmations admissibles ; incertitude => partiel.
- **Tests :** faux ID/page, injection de prompt, source officielle hors sujet,
  copies/propriétaires communs, neutralité inconnue, contradictions, refus/JSON
  provider invalide, quotas, arrêt et absence de canaris dans traces/erreurs.

##### 6.2.12 — Orchestrer un cycle ARI complet et annulable

- **Dépendances :** 6.2.3 à 6.2.11.
- **Périmètre/fichiers :** `src/main/ari/ari.orchestrator.ts`, file candidats,
  budgets et transitions ; adaptateur de résultat métier.
- **Sortie :** public d’abord, URL directe avant Google, arrêt anticipé sur
  preuve suffisante, candidats comptés même bloqués, fenêtres/statique/session
  dans le même budget, 20 s réservées à la finalisation ; aucun reset de budget.
- **Tests :** scénarios found/partial/not-found/blocked/cancelled/error,
  captcha Google après URL utile, credential manquant sans interruption globale,
  tous plafonds et annulation à chaque transition ; synthèse déterministe si
  le dernier appel provider échoue, aucune reconnexion après révocation.

##### 6.2.13 — Persister tâches et résultats avec rétention complète

- **Dépendances :** 6.2.2, 6.2.12.
- **Périmètre/fichiers :** `src/main/ari/ari.storage.ts`, intégration aux
  primitives `src/main/chat/` et `src/main/storage/`, sérialisation dédiée.
- **Sortie :** fichiers par tâche, messages toujours éclatés, index compact,
  writes atomiques et queue ; récupération explicite, 90 jours/1 000 tâches,
  purge des copies internes et backups, interruption sans rejeu au redémarrage.
- **Tests :** round-trip, corruption/backup/verrou, écriture concurrente,
  1 001 tâches, 91 jours, tâche active préservée, purge sans résurrection ;
  aucun corps brut/secret/URL signée ; conversations principales inchangées.

##### 6.2.14 — Intégrer ARI au routage Nova, ACP et AEL

- **Dépendances :** 6.2.2, 6.2.12, 6.2.13.
- **Périmètre/fichiers :** registre partagé, settings/validations agents,
  `agent-orchestrator.service.ts`, `ai.orchestrator.*`, `ai.acp.ts`, prompts et
  résultats ACP/AEL, registre de tour.
- **Sortie :** branche ARI explicite, activation initiale désactivée jusqu’à la
  qualification finale, demandes de recherche via main et retour au demandeur,
  arrêt/résultat attachés au parent ; aucun shell utilisé pour scraper ; aucun
  code ACA, agent spécialisé ou runtime de connecteur ajouté.
- **Tests :** Nova->ARI, ACP/AEL->ARI via Nova, retour au bon parent, agent
  désactivé, un cycle automatique par tour, boucle, arrêt parent/enfant,
  non-partage d’un résultat authentifié avec un autre demandeur et régressions
  des contrats ACP/AEL, du profil terminal et de `/cmd`.

##### 6.2.15 — Exposer les commandes étroites et l’écran Credentials

- **Dépendances :** 6.2.9, 6.2.10, 6.2.13, 6.2.14.
- **Périmètre/fichiers :** `src/main/ipc/credentials.handlers.ts`, handlers ARI,
  `src/preload.ts`, déclaration `window.nova`, `src/main/validation/`,
  `SettingsPanel` et contrôleur Credentials dédié.
- **Sortie :** tableau JSON public validé, écriture de secret sans retour,
  activation/partage utilisateur explicites, révoquer/effacer/reconnecter,
  erreurs/états contrôlés ; contrôles senderFrame/fenêtre et rattachement tâche.
- **Tests :** IPC depuis frame distante, IDs forgés, champs sensibles extra,
  secret absent après sauvegarde et jamais en historique React, formulaire
  refusé/chargement/erreur/révocation, action d’activation non implicite.

##### 6.2.16 — Afficher ARI, ses citations et ses tentatives

- **Dépendances :** 6.2.13, 6.2.14, 6.2.15.
- **Périmètre/fichiers :** `src/renderer/pages/AgentsPage/ARIAgentPage/`,
  `MessageItem`, composants Sources/progression, types chat, validation et
  sérialisation des citations, handler d’ouverture d’une source validée.
- **Sortie :** général/contexte/tâches/historique, progression compacte,
  citations proches des faits et panneau Sources et tentatives ; instantané de
  citation autonome, aucune navigation principale ni HTML Web injecté.
- **Tests :** visibilité interne/publique, résultat partiel/contradictoire,
  historique purgé mais citation publique encore lisible, URLs non HTTP(S) et
  source inventée refusées, clic utilisateur validé côté main, arrêt et erreurs.

##### 6.2.17 — Qualifier et clôturer la phase 6.2

- **Dépendances :** 6.2.1 à 6.2.16, portes D10 satisfaites.
- **Périmètre/fichiers :** tests Vitest et harnais Electron, scripts de contrôle,
  `docs/PROJECT_STATE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `WORKFLOWS.md`,
  `RISKS.md`, cahiers ARI, documentation de développement et reprise.
- **Sortie :** toutes les capacités ARI obligatoires et consommateurs actuels
  validés, limites réelles et versions livrées documentées ; aucun blocage réseau,
  secret ou lecture sans profil masqué. La validation manuelle utilisateur est
  consignée avant de déclarer ARI livré et d’ouvrir ACA.
- **Tests :** `npm.cmd run ci` (tests, TypeScript, lint, package), audits complet
  et production, matrice hostile D10, démarrage du package avec userData de test,
  parcours public/PDF/JS/auth et arrêt/révocation ; régression ACP/AEL et coffre
  via canaris. Google réel optionnel ; une page synthétique reste le test stable.
  Pas de `make`, installation, publication ou nettoyage de données locales.

#### Approbation et exécution du découpage

L’utilisateur a approuvé les 17 tâches le 29 octobre 2026, puis demandé de
continuer. Cette approbation autorise la réalisation ordonnée, pas une exception
aux portes de sécurité. Ne pas redemander l’accord sur ce découpage à la reprise.
Le 30 octobre, lors de la résolution de la divergence documentaire distante,
l’utilisateur a confirmé ce plan de 17 tâches avec Undici/Chromium comme référence.
La qualification de 6.2.1 est réussie. La prochaine tâche est 6.2.2, contrats
et provenance des délégations. Le rendu et l’authentification restent fermés
avant 6.2.5 et 6.2.10.
ACA attend 6.2.17 et sa propre spécification validée.

### Phase 6.3 — ACA — Agent de Création Automatique

Objectif retenu : permettre à Nova de rechercher un agent capable de répondre
à une demande et, si cette capacité manque, de faire intervenir ACA pour
préparer un agent spécialisé, son contexte et son connecteur configurable.

Documents de référence :

- [Cahier fonctionnel ACA](agents_specification/ACA_SPECIFICATION.md) ;
- [Spécification technique ACA](agents_specification/ACA_SPECIFICATION_TECHNIQUE.md).

Le cahier technique ACA est une première étude. Le runtime du TypeScript généré
reste un choix de sécurité bloquant à valider séparément après ARI. Les réponses
fonctionnelles ACA restent à relire avec l’utilisateur avant le découpage de
6.3. Aucun connecteur généré ni composant ACA n’est nécessaire pour livrer ARI.

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
- extension de l’allowlist AEL avant tests ;
- nouveau méga-refactor transversal.
