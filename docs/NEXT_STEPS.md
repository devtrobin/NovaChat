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
workflow utilisateur. La phase 6.1 de réorganisation ACP/AEL est désormais
close et intégrée le 19 septembre 2026. Le cadrage et le découpage d’ARI en 6.2
sont finalisés le 22 septembre. Son développement précède ACA en 6.3, puis les
autres capacités.

## Phase 1 — Filet de sécurité — terminée

- Vitest ajouté avec `npm test` et `npm run test:watch`.
- Policy AEL testée avec cas sûrs et cas adversariaux.
- Parsers OpenAI et ACP testés.
- Sérialisation, round-trip du stockage et reducers d’événements testés.
- Le dernier bilan de phase 6.1 rapporte 281 tests réussis, dont 119 cas de
  policy AEL ; ce total ne correspond pas au seul filet de tests initial.

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
5. Couverture renforcée pendant cette phase : permissions asynchrones,
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
- TypeScript strict, ESLint, suite de tests, audits npm et packaging validés
  lors de la clôture ; le total de 281 tests appartient au bilan ultérieur 6.1 ;
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

La phase 6.1 est implémentée et close. Les deux cahiers ARI sont finalisés
et le découpage de la phase 6.2 figure ci-dessous ; son code reste à réaliser.

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

État revu le 21 septembre 2026 : phase 6.1 close, livrée dans `ebb9b03` puis
intégrée dans `6245e7a` le 19 septembre. Les résultats de validation ci-dessus
proviennent du bilan enregistré ; ils ne sont pas réexécutés par cette revue.
Aucune fonctionnalité nouvelle n’a été ajoutée et la policy terminal n’a pas été
assouplie en 6.1. La préparation documentaire 6.2 est finalisée le 22 septembre ;
le prochain chantier de code commence par la tâche 6.2.1.

### Phase 6.2 — ARI — Agent de Recherche Internet

**Prête pour le développement au 22 septembre 2026 ; non implémentée.**
Le [cahier fonctionnel](agents_specification/ARI_SPECIFICATION.md) et le
[compagnon technique](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md)
constituent la base finalisée. Aucune décision produit restante ; les preuves
techniques et prérequis externes ci-dessous restent à réaliser pendant le code.

Périmètre obligatoire : recherche Google et URL directe par curl, lecture
statique HTML/texte/JSON/PDF, Credentials et accords persistants révocables,
Outlook personnel **et** Microsoft 365 professionnel/scolaire, routage
Nova/ACP/AEL, interface et validations. Gmail, Orange et les autres adaptateurs
authentifiés restent facultatifs. Aucun code ni nettoyage de données n’est
réalisé par cette préparation documentaire.

Décisions à préserver : exception robots uniquement pour la recherche Google,
aucun contournement de captcha/403/429, aucune API de recherche hébergée,
aucun rendu navigateur automatique. API officielles des services et IMAP
chiffré sont autorisés. Une recherche privée ne passe jamais par Google.
Les accords sont vérifiés pour le compte, le demandeur réel et le provider
réellement destinataire, y compris lors de la reprise d’une conversation.

#### Tâches ordonnées et critères de fin

Chaque tâche inclut ses tests utiles et la mise à jour de l’état réellement
livré. Les contrôles 6.2.10/11 consolident ces preuves sans remplacer les tests
de chaque composant. Toutes les cases sont ouvertes : ce document n’est pas
un bilan d’implémentation.

| Tâche | Dépendances | Travail et preuve de fin |
| --- | --- | --- |
| [ ] **6.2.1 — Qualifier outils et dépendances** | 6.1 close | versions exactes compatibles Node/Electron/Webpack, audit/licences, curl+CA hors ASAR et manifeste d’empreintes ; prévol hors réseau et absence de téléchargement runtime |
| [ ] **6.2.2 — Figer les schémas dans le code** | 6.2.1 | registre `agent-ari`, schémas v1 intention/enveloppe/résultat/compte/accord, budgets, états, provenance ; payloads malformés et identités forgées refusés |
| [ ] **6.2.3 — Construire le transport curl** | 6.2.1–2 | arguments et stdin contrôlés, DNS épinglé, robots et exception exacte, redirections, tailles, TLS, abort ; fixtures sûres/adversariales et zéro fuite de secret |
| [ ] **6.2.4 — Recherche publique et documents** | 6.2.3 | URL directe, Google organique, extraction statique/PDF en worker, classement/regroupement et citations ; changement HTML/captcha/budgets produisent les états prévus |
| [ ] **6.2.5 — Comptes, coffre, accords et provenance** | 6.2.2 | écritures atomiques, safeStorage, brouillons, registre global, révocation et marquage du chat ; garde avant tous les appels provider et réutilisation après redémarrage |
| [ ] **6.2.6 — Connecter Microsoft** | 6.2.3, 6.2.5 | app publique personnelle+organisations, MSAL PKCE via curl, callback local, cache chiffré, scopes minimaux, compte stable et erreurs tenant ; fixtures OAuth et configuration de test |
| [ ] **6.2.7 — Lire Outlook** | 6.2.4, 6.2.6 | Graph v1.0 pour les deux types de comptes, critères structurés, pagination, corps et pièces jointes texte/PDF ; aucune mutation ni divulgation à Google |
| [ ] **6.2.8 — Raccorder Nova, ACP et AEL** | 6.2.4–7 | demande structurée, attente/reprise parent, identité main, un cycle par tour et anti-boucle ; droits vérifiés et annulation propagée, comportement existant préservé |
| [ ] **6.2.9 — Interface et IPC** | 6.2.5–8 | page ARI, Credentials, Accès accordés, activation, consentements uniques, citations et états ; API minimale validée, aucune valeur de secret retournée |
| [ ] **6.2.10 — Régressions et récupération** | 6.2.3–9 | matrice réseau/parseurs/permissions/routage, révocation en course, provenance privée après purge, corruption, reprise sans rejeu et régressions ACP/AEL/chat |
| [ ] **6.2.11 — Qualifier et clôturer le lot** | 6.2.1–10 | Vitest, tsc, lint, audits et package Windows x64 ; parcours en développement public et Outlook réel personnel+pro/scolaire, absence de mutations, accords/révocation, bilan et docs de l’existant |

Les choix détaillés de transport, stockage, budget et types sont dans le
compagnon ; ne pas créer une deuxième définition divergente dans les tickets.
La première tâche peut identifier une incompatibilité de version concrète : la
résoudre sans installer un paquet incompatible ou annoncer un contrôle non fait.

#### Prérequis externes et sortie

L’enregistrement Microsoft exige un clientId public et un redirect autorisé.
Sa configuration appartient à 6.2.6 ; les tests réels de 6.2.11 nécessitent un
compte personnel et un compte professionnel/scolaire autorisé. Ni la rédaction
ni des fixtures ne prouvent ces parcours. Une politique tenant refusant l’app
est testée comme blocage explicite ; elle n’autorise pas une escalade de droits.

Les douze scénarios F01–F12 du cahier fonctionnel et la matrice du compagnon
sont obligatoires. Les tests Google réels restent manuels pour ne pas rendre la
CI dépendante du moteur. L’implémentation n’est close qu’après un bilan traçable,
avec les limites externes explicitement distinguées des validations réussies.
Les artefacts du package sont contrôlés ; le lancement du binaire distribué,
`make` et les installateurs restent en phase finale.

#### Extensions facultatives après le socle obligatoire

- **6.2.O1 — Gmail** : OAuth/lecture officielle, mêmes contrats de droits,
  provenance et tests de non-mutation ; exigences fournisseur documentées.
- **6.2.O2 — Orange** : IMAPS dédié via curl, lecture sans flag Seen, tests de
  compte et de TLS ; aucun SMTP ni élargissement du client Web.
- **6.2.O3 — Autres sites authentifiés** : un adaptateur explicite par parcours
  réellement testé ; texte seulement pour YouTube/streaming.

Ces extensions ne conditionnent pas la clôture de 6.2.11. Elles restent
signalées « non prises en charge » lorsqu’elles ne sont pas livrées.

### Phase 6.3 — ACA — Agent de Création Automatique

Après implémentation et validation d’ARI : relire et finaliser les cahiers
[fonctionnel ACA](agents_specification/ACA_SPECIFICATION.md) et
[technique ACA](agents_specification/ACA_SPECIFICATION_TECHNIQUE.md), résoudre
le confinement du code généré puis découper 6.3. La finalisation d’ARI ne valide
pas le runtime ACA. Les contrats communs de droits et de délégation 6.2 seront
réutilisés ; ARI reste transversal, pas une dépendance privée d’ACA.

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
