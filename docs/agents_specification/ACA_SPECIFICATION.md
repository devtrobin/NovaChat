# Cahier des charges — ACA — Agent de Création Automatique

## Statut

Étude en cours d’alimentation. Les questions communes disposent d’une réponse
confirmée ou provisoire ; l’ensemble reste à relire, valider puis découper avant
toute implémentation.

## Objectif de l’étude

Produire le cahier des charges de la création automatique d’agents spécialisés
par un Agent Creator système. L’étude devra définir le contexte, les
connecteurs configurables, les permissions, les secrets, les tests, le cycle
de vie et les limites d’autonomie de ces agents.

## Vocabulaire retenu

- **ACA** : Agent de Création Automatique, agent système chargé de créer et de
  faire évoluer les agents spécialisés.
- **Agent spécialisé** : agent créé par ACA ou par l’utilisateur pour maîtriser
  un outil ou une capacité déterminée.
- **Connecteur** : interface entre un agent spécialisé et l’outil qu’il
  maîtrise. Il reçoit des actions de l’agent et retourne des résultats
  structurés.
- **Action connecteur** : objet structuré contenant au minimum une opération
  identifiée par un mot-clé et ses arguments. Elle joue pour un agent
  spécialisé le rôle que joue une commande terminal pour Device, sans être
  envoyée au shell.

## Décisions fonctionnelles confirmées

### Agents système

NovaChat comportera quatre agents système principaux :

1. Planner ;
2. Device ;
3. ARI ;
4. ACA.

Ces agents système ne seront ni supprimables ni librement éditables. ACA sera
le seul agent système responsable de la création automatique d’autres agents.

### Dépendance confirmée vers ARI

ARI — Agent de Recherche Internet est confirmé comme troisième agent système.
Il possède son propre [cahier des charges](ARI_SPECIFICATION.md) en phase 6.2
et doit être implémenté et validé avant ACA, prévu en phase 6.3.

ARI est une capacité de recherche transversale disponible pour Nova et tous les
agents autorisés ; il n’est pas un composant réservé à ACA. ARI ne crée ni
agent ni connecteur. Dans le cas d’une création, ACA reste responsable de la
conception, du code, des tests et de l’activation. Pour un outil inconnu, le
flux devient :

```text
Nova
  -> confirmation de création
  -> ACA
  -> demande de recherche à ARI
  -> sources et documentation structurées
  -> ACA crée le brouillon, le connecteur et les tests
  -> configuration utilisateur
  -> tests
  -> activation
```

ARI et ACA seront livrés dans la même phase et la même version, avec cet ordre
d’implémentation :

1. registre et routage permettant plusieurs agents système ;
2. canal de recherche Internet contrôlé ;
3. ARI et ses tests ;
4. ACA et sa délégation de recherche vers ARI ;
5. création des agents spécialisés et connecteurs.

Cette organisation évite une dépendance circulaire : ARI est construit
directement dans NovaChat, puis ACA peut s’appuyer sur lui. Si l’utilisateur
fournit déjà une documentation ou du code suffisant, ACA peut se passer d’une
recherche ARI pour cette création.

### Demande de création

L’assistant principal pourra demander à ACA de créer un agent en lui indiquant
l’outil à maîtriser ou la capacité attendue. Cette délégation devra pouvoir
intervenir au cours d’une conversation afin que la demande utilisateur
initiale puisse reprendre après la création.

Avant de proposer une création, Nova consultera le registre des capacités
déclarées par les agents actifs :

- si un seul agent correspond, Nova l’utilisera automatiquement ;
- si plusieurs agents correspondent et que la demande n’en désigne aucun,
  Nova demandera à l’utilisateur lequel utiliser ;
- si le nom, le compte, l’outil ou le contexte désigne sans ambiguïté un agent,
  Nova le sélectionnera sans confirmation supplémentaire ;
- si aucun agent ne correspond, Nova proposera de faire intervenir ACA.

Nova ne devra jamais choisir arbitrairement entre plusieurs agents compatibles.
Chaque manifeste devra donc déclarer des capacités et informations de
distinction exploitables par le registre, sans dépendre uniquement du texte
libre du contexte.

Lorsqu’un utilisateur demande directement la création d’un agent, ou accepte
une création proposée par Nova, l’assistant devra d’abord conduire un cadrage
conversationnel. Il pourra poser toutes les questions nécessaires pour
comprendre les fonctionnalités attendues tant que celles-ci restent dans le
périmètre de l’outil que l’agent devra maîtriser.

Le cadrage pourra notamment couvrir :

- les opérations que l’agent devra savoir réaliser ;
- les opérations explicitement exclues ;
- les données à lire, créer, modifier ou supprimer ;
- les déclencheurs et parcours d’utilisation attendus ;
- la forme des résultats et réponses ;
- les services, comptes et environnements concernés ;
- les permissions et niveaux d’autonomie souhaités ;
- les contraintes, limites et cas d’erreur importants.

L’assistant devra tenir compte des réponses déjà fournies, éviter les questions
répétitives et poursuivre jusqu’à disposer d’un besoin cohérent. Une demande
hors du périmètre de l’outil ne devra pas être ajoutée silencieusement : elle
sera signalée comme hors scope et pourra faire l’objet d’un autre agent ou
d’une étude séparée.

Si l’utilisateur ne connaît pas une réponse ou demande à Nova de choisir,
l’assistant proposera une valeur recommandée et l’intégrera au périmètre final
soumis à confirmation. Tant que l’outil et ses interfaces le permettent, le
cadrage cherchera à couvrir les quatre familles CRUD :

- créer ;
- lire et rechercher ;
- modifier ;
- supprimer.

Une opération CRUD indisponible, incompatible avec l’outil ou explicitement
exclue devra être signalée. La présence d’une capacité de modification ou de
suppression dans le connecteur ne constitue pas une permission de l’exécuter :
les actions sensibles conservent leurs règles de consentement propres.

Par défaut, les questions seront posées progressivement, par petits groupes
cohérents, afin de permettre à l’utilisateur d’affiner ses réponses sans
recevoir un questionnaire massif. L’assistant respectera toute indication
contraire demandant, par exemple, un questionnaire complet ou un autre rythme.

L’assistant devra toujours demander une confirmation explicite à l’utilisateur
avant de déléguer la création à ACA. L’absence d’agent compatible ne constitue
jamais à elle seule une autorisation de création.

Avant cette confirmation, l’assistant devra présenter une proposition
compréhensible contenant au minimum :

- le nom proposé du nouvel agent ;
- l’outil qu’il devra maîtriser ;
- sa finalité ;
- les accès réseau envisagés ;
- les permissions estimées ;
- les informations ou identifiants probablement nécessaires.

Ces éléments constituent une estimation préalable. Une permission sensible ou
un accès supplémentaire découvert pendant la création ne sera pas considéré
comme implicitement accepté.

La confirmation initiale autorise uniquement ACA à fabriquer et tester le
nouvel agent dans les limites annoncées. Elle ne vaut pas autorisation générale
pour les opérations futures du connecteur. Les éléments suivants devront
utiliser des parcours de consentement séparés lorsqu’ils deviennent
nécessaires :

- la saisie ou la liaison d’un secret, identifiant, mot de passe, jeton ou clé ;
- un accès réseau qui n’était pas annoncé dans la proposition initiale ;
- un accès à des fichiers situés hors du dossier propre de l’agent ;
- une action sensible, destructive ou produisant une écriture externe.

ACA devra alors préparer un paquet cohérent comprenant au minimum :

- l’identité et les capacités du nouvel agent ;
- son contexte spécialisé ;
- son connecteur dédié ;
- le code source éditable de ce connecteur ;
- le vocabulaire d’actions utilisable avec ce connecteur ;
- les permissions requises ;
- les tests permettant de vérifier que l’agent et son connecteur fonctionnent.

La relation entre agents spécialisés et connecteurs sera strictement
un-à-un : un agent possède exactement un connecteur, et ce connecteur
n’appartient qu’à cet agent. Un connecteur ou une connexion ne sera pas
partagé entre plusieurs agents.

### Utilisation d’un connecteur

Après activation, l’agent spécialisé dialoguera avec son connecteur à l’aide
d’actions structurées utilisant des mots-clés ou noms d’opérations. Le contrat
minimal retenu est de la forme `{ action, arguments }`. Le flux cible est
analogue au flux Device, avec une frontière d’exécution différente :

```text
Assistant principal
  -> agent spécialisé
  -> action connecteur
  -> exécuteur du connecteur
  -> outil ou service ciblé
  -> résultat structuré
  -> agent spécialisé
  -> assistant principal
  -> utilisateur
```

Une action connecteur ne devra jamais être transmise implicitement au terminal.
Le connecteur possédera son propre parseur, sa validation, ses permissions et
son exécuteur dans le process Electron `main`.

### Politique de permission commune

ACA devra classifier chaque action du connecteur dans son manifeste selon son
effet : lecture, création, modification ou suppression.

La politique commune à tous les agents créés sera :

- toute lecture classifiée est autorisée par défaut sans confirmation ;
- toute création, modification ou suppression demande une confirmation avant
  exécution ;
- l’utilisateur peut ensuite enregistrer une autorisation ou un refus
  différent pour une action précise de cet agent.

Les décisions personnalisées seront stockées dans le `permissions.json` propre
à l’agent. Elles ne seront ni partagées avec un autre agent ni déduites du nom
de l’action. Une action inconnue, non déclarée ou impossible à classifier sera
refusée avant d’atteindre le connecteur.

### Visibilité et modification

Le contexte et les connecteurs créés seront visibles dans les paramètres de
l’agent spécialisé. Ils pourront être modifiés par l’utilisateur ou proposés
à la modification par l’IA.

Le code source généré pour le connecteur devra être conservé dans un fichier
lisible et modifiable manuellement par l’utilisateur. ACA devra générer à la
fois la configuration, le code et ses tests, puis exécuter ces tests avant
activation.

Toute modification du contexte ou du connecteur actif produira une nouvelle
version en brouillon, sans modifier directement la version en cours
d’utilisation. La version en brouillon devra repasser l’intégralité des
validations et tests obligatoires. Elle remplacera atomiquement la version
active uniquement en cas de réussite complète.

Une modification manuelle du fichier de code devra être détectée comme une
nouvelle version non validée. Elle ne sera jamais chargée à chaud dans le
connecteur actif avant validation et réussite des tests.

La dernière version validée devra être conservée afin de permettre un retour
arrière. L’échec d’une modification ne devra ni désactiver ni altérer la
version active précédente.

### Réparation par ACA

Lorsqu’un agent ou son connecteur passe dans l’état persistant `error`, Nova
proposera à l’utilisateur de demander une réparation à ACA. Aucune réparation
ne commencera sans confirmation explicite.

Après confirmation, ACA pourra analyser le diagnostic expurgé, le code, la
configuration non sensible, les tests et l’historique utile. Il produira une
nouvelle version en brouillon, corrigera le contexte, la configuration, le
connecteur ou les tests nécessaires, puis rejouera l’intégralité de la suite
obligatoire.

La nouvelle version sera activée automatiquement uniquement si tous les tests
réussissent. En cas d’échec, elle restera en brouillon ou en erreur et la
dernière version précédemment valide sera préservée. Si la réparation exige une
nouvelle valeur de configuration ou un secret, ACA demandera à l’utilisateur
de compléter le JSON dans l’écran Configuration.

ACA ne surveillera pas les agents en arrière-plan et ne lancera aucune
réparation de sa propre initiative.

### Dossier autonome de l’agent

Chaque agent spécialisé disposera de son propre dossier de données et de
travail. Une organisation cible à préciser pourrait être :

```text
agents/<agent-id>/
├── agent.json
├── contexte.json
├── configuration.json
├── configuration.schema.json
├── README.md
├── notes.md
├── connector/
│   ├── connector.ts
│   ├── connector.schema.json
│   └── tests/
├── permissions.json
├── tasks/
├── historique-actions.jsonl
├── historique-demandes.jsonl
└── versions/
```

Ce dossier contiendra les paramètres non sensibles, le contexte, le code
source, les notes d’utilisation, les permissions, les historiques des actions
connecteur et des demandes, les tests et les versions. Les secrets n’y seront
jamais stockés en clair : seule une référence vers le coffre système pourra y
figurer. Les historiques devront appliquer une politique de taille, rétention
et redaction comparable aux traces API existantes.

### Cycle de vie et activité

Le cycle de vie d’un agent créé comprendra :

```text
draft
  -> configuration-required
  -> testing
  -> active
```

Les états persistants complémentaires seront :

- `error` : l’agent, sa configuration ou son connecteur ne permet pas de
  fonctionner ;
- `disabled` : l’agent est conservé mais volontairement exclu du routage.

L’état transitoire `working` sera affiché pendant qu’un agent actif traite une
demande ou utilise son connecteur. À la fin de la tâche, il reviendra à
`active` s’il reste utilisable.

Une erreur propre à une action ne devra pas automatiquement rendre tout l’agent
inutilisable : elle sera enregistrée dans le résultat et l’historique de la
tâche. L’état persistant `error` sera réservé aux défaillances empêchant les
utilisations suivantes, par exemple une configuration invalide, un connecteur
qui ne peut plus démarrer ou des tests obligatoires non satisfaits.

Seuls les agents `active` ou temporairement `working` pourront participer au
routage. L’utilisateur pourra désactiver puis réactiver un agent sans supprimer
son dossier.

La désactivation prendra effet immédiatement. Si une tâche est `working`,
NovaChat demandera son arrêt et la marquera `cancelled`, avec les mêmes limites
qu’une annulation manuelle concernant les effets externes déjà exécutés. Les
tâches `waiting` resteront conservées mais suspendues. Elles reprendront dans
leur ordre initial uniquement si l’agent est réactivé, sauf annulation manuelle
entre-temps.

### Suppression d’un agent

Seuls les agents spécialisés créés par ACA ou l’utilisateur pourront être
supprimés. Planner, Device, ARI et ACA seront non supprimables.

La suppression définitive exigera que l’agent soit d’abord placé dans l’état
`disabled`, puis demandera une confirmation explicite. Une fois confirmée,
NovaChat supprimera :

- le dossier de l’agent ;
- son contexte, sa configuration et le code de son connecteur ;
- ses versions et tests ;
- ses tâches et historiques ;
- ses permissions ;
- toutes les références et valeurs secrètes qui lui appartiennent dans le
  coffre système.

La désactivation restera l’alternative réversible. La suppression définitive ne
proposera pas de restauration implicite.

### File de tâches et écran de suivi

Chaque agent spécialisé possédera une file de tâches indépendante et
persistante. Une seule tâche pourra utiliser son connecteur à la fois. Toute
nouvelle demande reçue pendant l’état `working` sera placée en attente puis
exécutée séquentiellement, dans l’ordre d’arrivée.

Une tâche utilisera au minimum les états suivants :

- `waiting` : enregistrée dans la file et pas encore démarrée ;
- `working` : actuellement traitée par l’agent ;
- `completed` : terminée avec succès ;
- `error` : terminée en échec ;
- `interrupted` : l’application s’est arrêtée alors que la tâche était active ;
- `cancelled` : annulée avant son exécution.

L’utilisateur pourra annuler une tâche `waiting`. Cette annulation la retirera
de la file d’exécution sans supprimer sa trace.

L’utilisateur pourra également interrompre une tâche `working` depuis l’écran
Tâches ou depuis la conversation d’origine. NovaChat demandera l’arrêt de
l’appel provider et de l’action connecteur en cours, puis conservera les
résultats partiels et les actions déjà exécutées dans le détail de la tâche.

L’annulation sera une opération au mieux : elle empêchera les étapes restantes,
mais ne pourra pas annuler un effet externe déjà accepté et exécuté par
l’outil. Si le connecteur reste utilisable après l’arrêt, l’agent reviendra à
l’état `active` et poursuivra sa file.

Chaque page d’agent spécialisé comportera un onglet ou écran **Tâches**
affichant les tâches en attente, en cours, terminées, en erreur, interrompues
et annulées. Il permettra d’ouvrir le détail d’une tâche avec au minimum :

- la demande d’origine et la conversation source ;
- les dates de création, démarrage et fin ;
- l’état et le résultat ou diagnostic ;
- les actions connecteur exécutées ;
- les permissions demandées et leurs décisions.

Une tâche représente la demande fonctionnelle confiée à l’agent. Une tâche
peut produire plusieurs actions connecteur, chacune conservée séparément dans
l’historique des actions.

Après un redémarrage de NovaChat, les tâches `waiting` seront reprises
automatiquement dans leur ordre persistant. Une tâche restée `working` sera
convertie en `interrupted` et ne sera jamais rejouée automatiquement, car une
action externe pourrait avoir été exécutée avant l’arrêt.

Une tâche `error`, `interrupted` ou `cancelled` pourra être relancée depuis son
détail. La relance créera une nouvelle tâche avec son propre identifiant et une
référence `retryOf` vers la tâche d’origine. Elle ne modifiera pas le résultat
ni l’historique de la tentative précédente.

Par défaut, les tâches ayant atteint un état final seront conservées pendant
90 jours, dans la limite de 1 000 tâches par agent. La première limite atteinte
déclenchera la suppression des entrées finales les plus anciennes.

La durée et le plafond seront configurables pour chaque agent. Les tâches
`waiting` et `working` ne seront jamais supprimées automatiquement. L’écran
Tâches proposera également une action manuelle de nettoyage de l’historique
final, sans toucher à la file active.

### Code des connecteurs et activation

ACA est autorisé à produire le code exécutable nécessaire au connecteur. Le
cahier des charges devra donc définir une frontière d’exécution, des
permissions et une stratégie de test adaptées à du code nouvellement généré.
L’autorisation du code ne vaut pas autorisation implicite de contourner les
protections du process `main`, d’accéder aux secrets ou d’obtenir des droits
non déclarés.

Pour la première version, ACA générera uniquement des connecteurs en
TypeScript. Le code source de référence sera `connector.ts` et utilisera le
runtime Node déjà maîtrisé par NovaChat. Python et les autres langages sont
hors du périmètre initial ; ils pourront être étudiés ultérieurement sans
modifier le contrat fonctionnel `{ action, arguments }`.

ACA privilégiera les API natives de Node afin de limiter les dépendances.
Lorsqu’une bibliothèque externe est nécessaire, le connecteur pourra posséder
son propre `package.json` et son lockfile dans le dossier de l’agent.

Avant toute installation ou mise à jour, NovaChat présentera à l’utilisateur :

- le nom et la version de chaque paquet ;
- la justification de son utilisation ;
- la source de téléchargement ;
- les permissions ou accès supplémentaires éventuellement nécessaires.

L’installation exigera une confirmation explicite. Les versions seront
verrouillées, les dépendances resteront isolées dans le périmètre de l’agent et
ne modifieront pas celles de NovaChat. Un audit npm et les tests complets du
connecteur seront exécutés avant son activation.

Le code de chaque connecteur devra s’exécuter dans un processus isolé, distinct
du process Electron principal, avec les restrictions suivantes :

- accès aux fichiers limité par défaut au dossier propre de l’agent et de son
  connecteur ;
- accès réseau limité aux domaines déclarés par le connecteur ;
- aucun accès direct au shell ;
- dépendances explicitement déclarées et installées par un mécanisme contrôlé ;
- toute permission ou extension d’accès supplémentaire traitée séparément ;
- aucune exposition directe des secrets stockés par NovaChat.

Les tests du connecteur devront être exécutés dans le même environnement isolé
et avec les mêmes restrictions que son exécution réelle. Un test réalisé avec
des privilèges plus larges ne pourra pas valider l’activation.

La suite obligatoire avant activation comprendra :

- la validation du manifeste, du contexte et de leurs schémas ;
- la validation de toutes les actions structurées `{ action, arguments }` ;
- les tests unitaires du connecteur ;
- des tests négatifs vérifiant le refus des accès non autorisés ;
- un test réel minimal ne produisant aucun effet destructeur ;
- un test du dialogue complet entre l’agent et son connecteur.

Lorsque tous les tests obligatoires du nouvel agent et de son connecteur
réussissent, ACA pourra activer automatiquement l’agent sans demander une
seconde confirmation. En cas d’échec pendant une première création, l’agent
devra rester inactif. En cas d’échec après une modification, la nouvelle
version restera inactive et la dernière version précédemment validée restera
la version active.

## Scénario nominal initial

1. L’utilisateur demande à Nova une tâche nécessitant un outil spécialisé.
2. L’assistant détermine qu’un nouvel agent est nécessaire.
3. L’assistant identifie l’outil ciblé et mène le cadrage des fonctionnalités
   attendues avec l’utilisateur.
4. L’assistant restitue le périmètre consolidé puis demande à l’utilisateur
   l’autorisation de créer cet agent.
5. Après confirmation, l’assistant délègue à ACA la création en précisant
   l’outil ou la capacité attendue.
6. ACA crée un agent en brouillon avec son contexte, son connecteur, son code,
   ses opérations, ses tests et le JSON de configuration attendu.
7. L’assistant demande à l’utilisateur d’ouvrir l’écran Configuration de ce
   nouvel agent et d’y compléter lui-même le JSON généré.
8. NovaChat valide la configuration, place les secrets dans le coffre et
   signale à ACA que l’agent est prêt à être testé.
9. ACA teste le nouvel ensemble.
10. Si tous les tests obligatoires réussissent, ACA active automatiquement
   l’agent ; sinon, il le laisse inactif.
11. La demande utilisateur initiale reprend avec le nouvel agent.
12. L’agent émet des actions structurées vers son connecteur et interprète les
    résultats.
13. Nova fournit la réponse finale à l’utilisateur.

## Exemple de cadrage — agent e-mail — configuration de référence à relire

### Périmètre compris

Un agent e-mail maîtrisera exactement une boîte e-mail déterminée au moyen
d’un connecteur dédié au fournisseur retenu, par exemple Gmail, Outlook ou un
serveur IMAP/SMTP. Deux boîtes différentes, y compris chez le même fournisseur,
nécessiteront deux agents distincts.

Chaque boîte disposera ainsi de son propre agent, connecteur, JSON de
configuration, référence de secret, ensemble de permissions et historique.
Aucun agent e-mail ne mutualisera une connexion ou des données avec l’agent
d’une autre boîte.

L’agent ne manipulerait jamais directement les API ni les secrets. Il
choisirait uniquement parmi les actions structurées exposées par son
connecteur, interpréterait leurs résultats et rendrait la main à Nova.

### Questions de cadrage que Nova poserait

Les questions seraient présentées progressivement et couvriraient notamment :

1. le fournisseur et la boîte concernés ;
2. la lecture souhaitée : métadonnées, contenu, pièces jointes et dossiers ;
3. les recherches et filtres utiles ;
4. la création de brouillons, l’envoi, la réponse et le transfert ;
5. les modifications autorisées : lu/non lu, drapeau, libellé, déplacement ou
   archivage ;
6. la mise à la corbeille et l’éventuelle suppression définitive ;
7. le format de restitution attendu : résumé, liste, contenu complet ou
   extraction structurée ;
8. les opérations qui devront toujours demander une confirmation.

Si l’utilisateur laisse ACA choisir, la proposition par défaut cherchera à
couvrir le CRUD complet sans autoriser automatiquement les opérations
sensibles.

### Traduction CRUD et actions métier

| Famille | Capacités proposées |
| --- | --- |
| Créer | créer et modifier un brouillon, préparer une réponse ou un transfert |
| Lire | lister les dossiers, rechercher, lire les métadonnées, le contenu et les pièces jointes autorisées |
| Modifier | modifier un brouillon, marquer lu/non lu, gérer drapeaux ou libellés, déplacer et archiver |
| Supprimer | placer à la corbeille et, si explicitement demandé, supprimer définitivement |
| Actions métier | envoyer un brouillon, répondre et transférer |

L’envoi, le déplacement, l’archivage et la suppression sont des effets externes
et conservent une politique de permission distincte de leur simple présence
dans le connecteur.

### Politique de permission e-mail par défaut

Toute action classée en lecture sera autorisée par défaut sans confirmation
répétée. Cela comprend notamment la liste, la recherche, les métadonnées, le
contenu des messages, les dossiers et les pièces jointes accessibles au
connecteur.

Toute action modifiant ou supprimant une donnée demandera par défaut une
confirmation avant exécution. Sont notamment concernées :

- la création d’un brouillon ;
- la modification d’un brouillon ;
- l’envoi, la réponse et le transfert d’un message ;
- le changement lu/non lu ;
- les drapeaux et libellés ;
- le déplacement et l’archivage ;
- la mise à la corbeille ;
- la suppression définitive.

L’utilisateur pourra remplacer cette politique par défaut pour un agent ou une
action déterminée, par exemple en autorisant systématiquement une modification
précise ou en la refusant toujours. Ces choix seront stockés dans
`permissions.json` et ne modifieront pas le code du connecteur.

### Contrat connecteur illustratif

Le connecteur pourrait notamment exposer :

```text
{ action: "search_messages", arguments: { query, limit } }
{ action: "get_message", arguments: { messageId, includeAttachments } }
{ action: "create_draft", arguments: { to, subject, body } }
{ action: "update_draft", arguments: { draftId, changes } }
{ action: "send_draft", arguments: { draftId } }
{ action: "reply_to_message", arguments: { messageId, body } }
{ action: "set_message_state", arguments: { messageId, read, labels } }
{ action: "move_message", arguments: { messageId, destination } }
{ action: "trash_message", arguments: { messageId } }
```

Chaque action posséderait un schéma d’arguments fermé, une catégorie de risque
et une règle de permission. Une action inconnue ou des arguments non conformes
seraient refusés avant tout appel au fournisseur.

### Exemple d’utilisation après activation

```text
Utilisateur : « Trouve le dernier e-mail contenant une facture. »
Nova -> agent e-mail : rechercher la facture la plus récente.
Agent -> connecteur : search_messages
Connecteur -> agent : résultats structurés.
Agent -> connecteur : get_message pour le résultat retenu.
Connecteur -> agent : contenu autorisé.
Agent -> Nova : message trouvé et informations utiles.
Nova -> utilisateur : réponse finale.
```

Le test réel minimal avant activation pourrait vérifier l’identité du compte,
la connexion et la liste des dossiers sans envoyer, modifier ou supprimer de
message. Les actions à effet externe seraient testées avec des doubles de test
tant qu’un scénario réel non destructeur n’a pas été explicitement autorisé.

### Absence de surveillance automatique

L’agent e-mail agira uniquement lorsqu’il sera sollicité dans une conversation.
Il ne surveillera pas automatiquement les nouveaux messages et n’exécutera
aucun polling, traitement planifié, notification ou tâche en arrière-plan.

La surveillance automatique relève d’une éventuelle fonctionnalité
d’automatisation distincte, hors du périmètre de cette phase. La justification
produit de cette séparation sera complétée ultérieurement par l’utilisateur.

### Configuration générique par JSON

ACA créera d’abord l’agent en brouillon et générera
`configuration.schema.json`, qui décrira tous les paramètres nécessaires, puis
`configuration.json`, qui contiendra les valeurs par défaut et les emplacements
à compléter.

Tous les agents utiliseront le même écran Configuration : un éditeur JSON
générique, sans formulaire spécialisé par type d’agent. Après la création du
brouillon, l’assistant demandera à l’utilisateur d’ouvrir cet écran, de remplir
lui-même les informations demandées puis d’enregistrer le document.

Le schéma généré par ACA devra identifier :

- les champs obligatoires et facultatifs ;
- les types, formats, valeurs autorisées et valeurs par défaut ;
- les champs secrets ;
- les contraintes de validation ;
- les paramètres nécessaires avant test et activation.

Lors de la sauvegarde, le process `main` validera le document. Les valeurs des
champs déclarés secrets seront extraites, chiffrées dans le coffre système et
remplacées dans le JSON persisté par des références opaques. Le mot de passe,
le jeton ou la clé pourront donc être saisis temporairement dans l’éditeur,
mais ne devront jamais être conservés en clair dans le dossier de l’agent, les
historiques ou les traces.

Après sauvegarde, l’écran continuera d’afficher un JSON expurgé, par exemple :

```json
{
  "account": "utilisateur@example.com",
  "authentication": {
    "method": "password",
    "username": "utilisateur@example.com",
    "password": {
      "credentialRef": "agent-email/password",
      "status": "configured"
    }
  },
  "imap": {
    "host": "imap.example.com",
    "port": 993,
    "tls": true
  }
}
```

Le modèle et ACA ne recevront ensuite que les valeurs non sensibles, l’état de
la configuration et les références opaques. La sauvegarde réussie déclenchera
la reprise du workflow de création, les tests puis l’activation automatique.

Si un secret est néanmoins détecté dans un message normal, NovaChat devra
tenter de bloquer son envoi et orienter l’utilisateur vers l’écran
Configuration. Une redaction ultérieure des historiques locaux restera une
défense complémentaire, mais ne pourra jamais annuler une transmission déjà
effectuée au provider ; un secret réellement envoyé devra être considéré comme
compromis et remplacé.

À partir de l’adresse e-mail et des informations non sensibles autorisées, ACA
pourra :

1. identifier le fournisseur ou le protocole attendu ;
2. sélectionner un profil connu, par exemple une API avec OAuth ou une
   connexion IMAP/SMTP ;
3. compléter les paramètres standards connus ;
4. décrire les valeurs manquantes dans le schéma et le JSON de configuration ;
5. générer le code, le manifeste et les actions du connecteur ;
6. déclarer les domaines, ports, protocoles et permissions nécessaires ;
7. demander au coffre système d’enregistrer les secrets lors de la sauvegarde ;
8. conserver uniquement un `credentialRef` dans la configuration visible ;
9. tester la connexion dans l’environnement isolé ;
10. activer automatiquement l’agent si tous les tests obligatoires réussissent.

Pour une API, les paramètres visibles pourraient comprendre l’URL de base, le
type d’authentification, les scopes, les endpoints et les schémas de données.
Pour IMAP/SMTP, ils pourraient comprendre les hôtes, ports, modes TLS,
identifiant de compte et capacités attendues. Les champs secrets seraient
remplacés dans l’interface par un simple état `configuré`, `expiré` ou
`à renouveler`.

Le code généré ne devra pas lire directement le fichier du coffre ni recevoir
le secret dans son contexte. Un composant de confiance servira de courtier
d’authentification : il résoudra `credentialRef` au moment de l’appel, limitera
la destination aux domaines déclarés et ajoutera les informations
d’authentification sans les exposer au modèle, aux traces ou au code source
généré.

Les tests réels suivront une progression non destructive :

1. validation des paramètres et schémas ;
2. résolution et connexion TLS vers les seules destinations déclarées ;
3. authentification par le courtier ;
4. vérification de l’identité ou du profil du compte ;
5. lecture minimale des capacités ou dossiers ;
6. refus vérifié des destinations et opérations non déclarées.

Une erreur laissera l’agent inactif et conservera le diagnostic expurgé de tout
secret. Les paramètres non sensibles resteront modifiables ; remplacer un
secret utilisera toujours l’écran Configuration et le même mécanisme
d’extraction vers le coffre.

Lorsqu’un fournisseur ou environnement permet plusieurs méthodes de connexion,
l’assistant demandera le choix à l’utilisateur. Si l’utilisateur ne sait pas
répondre ou lui demande de choisir, Nova sélectionnera la solution paraissant
la plus adaptée à l’environnement, aux capacités demandées et aux informations
disponibles, puis l’inclura dans le récapitulatif soumis à confirmation.

## Réponses provisoires à confirmer

Aucune question fonctionnelle commune à ACA ni à l’exemple e-mail ne reste
sans proposition de réponse. Les choix transversaux introduits avec ARI sont
provisoirement résolus ainsi :

1. **Recherche Internet des agents créés.** Un agent spécialisé pourra
   solliciter ARI par le routage commun lorsqu’une information publique manque
   à son connecteur. ARI reste un service système séparé et ne devient pas un
   second connecteur de l’agent.
2. **Recherche d’ACA.** ACA utilisera ARI pour étudier un outil inconnu. La
   stratégie « public d’abord » et les limites d’ARI s’appliqueront. ACA ne
   demandera un credential pour de la documentation qu’après échec des
   alternatives publiques et avec l’accord de l’utilisateur.
3. **Registre de secrets.** ACA et les connecteurs générés utiliseront le
   `CredentialsService` global défini pour ARI. Les fichiers
   `configuration.json` ne contiendront que des `credentialRef`, états et
   paramètres non sensibles.
4. **Création des entrées.** ACA pourra générer le schéma et demander la
   création de la structure non sensible d’une entrée. Seul l’utilisateur
   saisira le secret dans l’écran Credentials, et seul le courtier de confiance
   pourra le résoudre.
5. **Partage d’un compte.** Un credential pourra être accordé à plusieurs
   agents uniquement après une autorisation explicite par agent. Lorsqu’un
   agent délègue une recherche à ARI, le courtier vérifiera l’identité de cet
   agent demandeur avant d’utiliser le compte. Ce partage ne remet pas en cause
   la règle « un agent spécialisé = un connecteur ».
6. **Configuration e-mail par défaut.** L’exemple e-mail ci-dessus constitue
   la configuration fonctionnelle de référence lorsque l’utilisateur ne donne
   pas d’instruction contraire : CRUD exposé autant que le fournisseur le
   permet, lectures automatiques et confirmation des créations, modifications,
   envois et suppressions.
7. **Questions restantes.** Les seules réponses encore à valider concernent le
   périmètre propre d’ARI et sont centralisées dans
   [ARI_SPECIFICATION.md](ARI_SPECIFICATION.md). Aucun choix ACA ne bloque la
   reprise de l’étude.

## Méthode de travail pour les prochaines sessions

L’utilisateur fournira progressivement des indices, scénarios d’utilisation,
contraintes, exemples et morceaux de code. Chaque contribution devra être
analysée et intégrée dans ce document sous une forme consolidée et cohérente.
Les éléments bruts servent de matière à l’étude ; ils ne deviennent pas
automatiquement des exigences définitives.

À chaque mise à jour :

1. reformuler le besoin fonctionnel sans perdre l’intention utilisateur ;
2. classer séparément les décisions confirmées, propositions, hypothèses et
   questions ouvertes ;
3. compléter les scénarios, règles métier, contraintes techniques, sécurité,
   données, UX et critères d’acceptation concernés ;
4. relever explicitement les contradictions avec le code actuel ou une
   décision déjà enregistrée ;
5. préserver les invariants de [AGENTS.md](../../AGENTS.md) et de
   [ARCHITECTURE.md](../ARCHITECTURE.md) ;
6. ne pas découper l’implémentation en tâches tant que le cahier des charges
   n’a pas été relu et validé dans son ensemble.

Ce fichier est la source de vérité de l’étude pour les prochaines sessions.
Il doit permettre de reprendre le raisonnement sans dépendre de l’historique
de conversation.

Après validation du cahier des charges, la phase 6.3 de
[NEXT_STEPS.md](../NEXT_STEPS.md) sera découpée en tâches d’implémentation
ordonnées et vérifiables.
