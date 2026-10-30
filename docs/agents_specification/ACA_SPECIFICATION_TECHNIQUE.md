# Spécification technique — ACA, Agent de Création Automatique

## Statut

Étude technique initiale à relire après implémentation et validation d’ARI.
Les contrats documentaires 6.2 sont finalisés ; cela ne valide pas ceux d’ACA.
ACA et les agents spécialisés ne sont pas encore implémentés. Ce document
complète le [cahier fonctionnel ACA](ACA_SPECIFICATION.md) et sépare les
décisions déjà prises des choix techniques encore bloquants.

La phase 6.3 ne pourra pas être découpée tant que le cahier fonctionnel ACA et
la frontière d’exécution du code généré n’auront pas été validés.

Le choix initial d’API Node natives dans le cahier fonctionnel reste à
réconcilier avec le runtime à capacités proposé ici. TypeScript est retenu,
mais ni l’accès direct à Node ni QuickJS/WASM ne sont validés comme solution
d’exécution du code généré.

## Objectifs techniques

- ajouter ACA comme agent système statique `agent-aca` ;
- permettre à Nova de détecter l’absence d’un agent compatible ;
- cadrer la création avec l’utilisateur avant toute génération ;
- générer un agent spécialisé, un connecteur TypeScript éditable et ses tests ;
- valider, tester et versionner le paquet sans altérer la version active ;
- exécuter le connecteur hors du process Electron principal ;
- limiter fichiers, réseau, actions et credentials aux capacités déclarées ;
- persister une file de tâches par agent ;
- permettre désactivation, réparation, retour arrière et suppression confirmée.

## Architecture cible

```text
Nova
  -> SpecializedAgentRegistry
  -> aucun agent compatible
  -> confirmation utilisateur
  -> ACAOrchestrator
       -> ARIResearchClient si documentation manquante
       -> AgentDraftGenerator
       -> AgentPackageService (staging)
       -> ManifestValidator
       -> ConnectorCompiler
       -> ConnectorTestRunner isolé
       -> Configuration/Credentials utilisateur
       -> ActivationService atomique
  -> SpecializedAgentRegistry recharge la version active
  -> SpecializedAgentRuntime
       -> ConnectorPermissionService
       -> ConnectorRunner isolé
       -> CredentialBroker / NetworkBroker
  -> résultat vers Nova
```

Le modèle propose des artefacts ; seuls des services de confiance dans le
`main` créent les chemins, écrivent les fichiers, installent les dépendances,
valident les schémas et activent une version.

## Composants cibles

| Composant | Responsabilité |
| --- | --- |
| `ACAOrchestrator` | cycle de création, réparation et activation |
| `AgentCapabilityMatcher` | correspondance demande → agents actifs |
| `AgentDraftGenerator` | paquet structuré produit avec le provider |
| `AgentPackageService` | staging, chemins, versions et écritures atomiques |
| `AgentManifestValidator` | schémas fermés et cohérence des capacités |
| `ConnectorCompiler` | compilation TypeScript reproductible |
| `ConnectorStaticAnalyzer` | imports, API interdites et surface déclarée |
| `ConnectorTestRunner` | tests dans la frontière d’exécution cible |
| `ConnectorRuntimeBroker` | démarrage, timeout, annulation et RPC |
| `ConnectorPermissionService` | politique CRUD et règles mémorisées |
| `ConnectorNetworkBroker` | destinations et requêtes réseau déclarées |
| `CredentialBroker` | résolution opaque et injection d’authentification |
| `SpecializedAgentRegistry` | chargement des manifests actifs |
| `SpecializedAgentTaskQueue` | file persistante par agent |
| `AgentActivationService` | promotion atomique et retour arrière |
| `AgentDeletionService` | suppression confirmée et nettoyage du coffre |

Organisation de sources proposée :

```text
src/main/aca/
├── aca.orchestrator.ts
├── aca.generator.ts
├── aca.package.ts
├── aca.validation.ts
├── aca.compiler.ts
├── aca.tests.ts
├── aca.activation.ts
└── aca.types.ts

src/main/connectors/
├── connector.runtime-broker.ts
├── connector.permission.ts
├── connector.network-broker.ts
├── connector.credentials.ts
├── connector.queue.ts
└── connector.types.ts
```

## Évolution du registre d’agents

Le registre actuel est une constante TypeScript fermée aux agents système. Il
devra être séparé en deux niveaux :

1. `SystemAgentRegistry`, compilé avec NovaChat, contenant ACP, AEL, ARI et ACA ;
2. `SpecializedAgentRegistry`, chargé depuis les manifests validés et actifs.

Les agents système restent typés par une union fermée et non supprimables. Les
agents spécialisés utilisent un identifiant validé à l’exécution, avec un
préfixe réservé distinct, par exemple `custom-<slug>-<suffixe>`, afin d’éviter
toute collision avec `agent-*`.

Le matcher utilise des capacités déclarées et structurées, jamais seulement le
texte du contexte. Une égalité entre plusieurs agents compatibles produit une
demande de choix à l’utilisateur.

## Contrat du paquet généré

Le provider ne doit pas demander au système d’écrire arbitrairement des
fichiers. Il retourne un objet `AgentDraftPackage` fermé :

```ts
type AgentDraftPackage = {
  configuration: unknown;
  configurationSchema: JSONSchema;
  connector: {
    actionsSchema: JSONSchema;
    dependencies: Array<{ name: string; reason: string; version: string }>;
    source: string;
    tests: ConnectorTestDefinition[];
  };
  context: {
    description: string;
    instructions: string;
    name: string;
  };
  manifest: SpecializedAgentManifest;
  notes: string;
  readme: string;
};
```

Le service de confiance impose le nom et la destination de chaque fichier. Le
modèle ne fournit jamais de chemin absolu, `..`, lien symbolique, script npm ou
commande d’installation.

Les champs texte, le nombre de fichiers et la taille totale sont bornés avant
écriture dans un dossier de staging.

## Manifeste d’un agent spécialisé

Schéma minimal proposé :

```ts
type SpecializedAgentManifest = {
  capabilities: Array<{
    id: string;
    description: string;
    distinctions: string[];
  }>;
  connector: {
    actions: Array<{
      argumentsSchemaRef: string;
      description: string;
      effect: "create" | "delete" | "read" | "update";
      name: string;
    }>;
    domains: string[];
    entrypoint: string;
  };
  createdAt: string;
  createdBy: "aca" | "user";
  id: string;
  name: string;
  schemaVersion: number;
  state: "active" | "configuration-required" | "disabled" | "draft" | "error" | "testing";
  version: string;
};
```

Le schéma JSON est fermé (`additionalProperties: false`), versionné et validé
dans le `main`. Le manifeste ne contient ni secret ni code exécutable.

## Dossier et versionnement

Structure technique proposée :

```text
agents/<custom-agent-id>/
├── agent.json
├── active-version.json
├── contexte.json
├── configuration.json
├── configuration.schema.json
├── permissions.json
├── README.md
├── notes.md
├── tasks/
│   └── <task-id>.json
├── historique-actions.jsonl
├── historique-demandes.jsonl
├── staging/
│   └── <draft-id>/...
└── versions/
    └── <version-id>/
        ├── manifest.json
        ├── connector.ts
        ├── connector.actions.schema.json
        ├── package.json
        ├── package-lock.json
        ├── tests/
        └── build/
```

Une version validée devient immuable. `active-version.json` contient uniquement
l’identifiant et le hash de la version active. La promotion écrit d’abord tous
les artefacts, synchronise les fichiers, puis remplace atomiquement ce petit
pointeur. Cette stratégie évite les liens symboliques et reste compatible avec
Windows.

Une modification manuelle de `connector.ts`, d’un schéma ou du contexte crée
un nouveau brouillon. La version active n’est jamais modifiée sur place. La
dernière version valide reste disponible pour retour arrière.

## Configuration et secrets

`configuration.schema.json` décrit les valeurs, formats, contraintes, valeurs
par défaut et champs secrets. Le renderer affiche un éditeur JSON générique.

À la sauvegarde :

1. le payload IPC est borné et validé ;
2. le `main` valide le JSON avec le schéma de la version en staging ;
3. chaque champ secret est extrait ;
4. le coffre système chiffre la valeur ;
5. le JSON persistant reçoit un `credentialRef` opaque et un état ;
6. le renderer reçoit uniquement la configuration expurgée.

ACA, le modèle et le code source généré ne reçoivent jamais la valeur d’un
secret. Le `CredentialBroker` résout la référence au moment d’une opération
autorisée et applique l’authentification sans retourner la valeur au connecteur.

Le registre Credentials prévu par ARI est réutilisé. Chaque référence vérifie
`allowedAgentIds`, les domaines et la méthode d’authentification. L’identité du
demandeur effectif vient du main ; une délégation ne transmet pas implicitement
les droits de Nova ou d’un autre agent.

## Contrat des actions connecteur

Entrée minimale :

```ts
type ConnectorActionRequest = {
  action: string;
  arguments: unknown;
  connectorVersion: string;
  requestId: string;
  taskId: string;
};
```

Sortie minimale :

```ts
type ConnectorActionResult = {
  data?: unknown;
  diagnostics?: Array<{ code: string; message: string }>;
  requestId: string;
  status: "cancelled" | "error" | "partial" | "success";
};
```

Avant exécution, le broker vérifie l’agent, la version active, le nom de
l’action, le schéma fermé des arguments, la catégorie CRUD, la permission et
les budgets. La réponse est également validée et bornée avant d’être transmise
au modèle.

Une action inconnue ou des arguments supplémentaires non déclarés sont refusés.
Une action connecteur n’est jamais transformée en commande shell.

## Politique de permission

La catégorie du manifeste fournit la décision par défaut :

| Effet | Décision initiale |
| --- | --- |
| `read` | autorisé lorsque l’agent est actif et le domaine déclaré |
| `create` | confirmation |
| `update` | confirmation |
| `delete` | confirmation obligatoire |

Une règle mémorisée est liée à l’agent, la version compatible et l’action
précise. Elle ne peut pas autoriser une action inconnue, un nouveau domaine ou
un schéma d’arguments élargi. Une évolution de manifeste invalidant la portée
d’une règle exige une nouvelle décision.

Le connecteur ne reçoit la requête qu’après résolution de la permission. Les
refus et confirmations sont conservés dans le détail de la tâche sans secret.

## Génération du code

ACA utilise le provider pour produire le paquet structuré à partir :

- du cadrage confirmé par l’utilisateur ;
- du contrat SDK de connecteur ;
- de la documentation fournie ou recherchée par ARI ;
- des contraintes de permissions et de configuration ;
- des diagnostics d’une éventuelle version précédente.

Le code initial est TypeScript. Il doit exporter une fabrique conforme au SDK,
déclarer ses actions et utiliser seulement les capacités fournies par le
runtime. Il ne peut ni lire le coffre, ni accéder au preload, ni appeler AEL.

Le prompt n’est pas une frontière. Le paquet passe obligatoirement par schémas,
analyse statique, compilation et tests négatifs avant toute exécution réelle.

## Compilation et dépendances

Proposition initiale :

- validation de schémas avec `ajv` ;
- compilation et vérification TypeScript via l’API du compilateur TypeScript,
  rendue disponible dans le binaire packagé ;
- bundle ESM déterministe ;
- source maps privées aux diagnostics locaux ;
- hash SHA-256 de tous les artefacts de la version.

Pour une dépendance externe, ACA produit une proposition avec nom, version
exacte, source, licence, justification et accès supplémentaires. Après
confirmation :

- génération d’un `package.json` minimal sans scripts arbitraires ;
- installation verrouillée par lockfile ;
- `npm ci --ignore-scripts` dans le staging ;
- refus initial des modules natifs et paquets nécessitant un script
  d’installation ;
- audit npm avant tests ;
- dépendance incluse uniquement dans la version de cet agent.

Les scripts npm, binaires natifs et dépendances demandant Node complet restent
hors périmètre de la première version, sauf nouvelle étude de sécurité.

### Outils de build et de test à figer

L’application packagée ne peut pas supposer que les dépendances de
développement du dépôt existent chez l’utilisateur. La décision technique doit
préciser comment Node, TypeScript et npm — ou leurs remplaçants — sont livrés,
versionnés et exécutés avec ASAR et les fuses Electron sur chaque plateforme.

Une variante étudiée utilise `node:test` et `node:assert/strict` dans le runtime
isolé afin de ne pas embarquer Vitest dans chaque agent. Elle doit être
comparée au format déclaratif `ConnectorTestDefinition` : dans les deux cas,
un harnais de confiance garde la maîtrise des entrées, des attentes et des
tests négatifs. Un rapport produit uniquement par le code généré ne prouve ni
le confinement ni le refus effectif d’un accès.

Les schémas `ajv` devront refuser les références distantes et les mots-clés non
autorisés, borner taille, profondeur et expressions régulières, et ne jamais
décider seuls d’une permission. De même, un audit npm indisponible ou
inexécutable est un échec de validation, pas une réussite implicite.

## Frontière d’exécution du connecteur

Le code généré ne doit jamais être chargé par `import()` dans le process
Electron principal. `node:vm`, un Worker ou `utilityProcess` seuls ne sont pas
des frontières de sécurité suffisantes pour du code arbitraire disposant des
API Node.

La cible recommandée est un runtime à capacités :

- moteur JavaScript isolé sans `process`, `require`, import dynamique, shell,
  filesystem ni réseau natif ;
- SDK injecté contenant seulement des appels RPC bornés ;
- réseau exclusivement via `ConnectorNetworkBroker` ;
- fichiers exclusivement via un broker confiné au dossier de l’agent ;
- authentification exclusivement via `CredentialBroker` ;
- timeout, mémoire, taille de messages et nombre d’actions limités ;
- un runtime éphémère par action ou tâche selon le coût mesuré.

Une solution de type QuickJS/WASM est une candidate cohérente avec ce modèle,
mais doit encore être comparée à un helper Node protégé par un sandbox OS. La
solution choisie devra fonctionner dans le package Electron Windows et être
testée comme une frontière, pas seulement comme une séparation de processus.

Sur une plateforme où la frontière retenue n’est pas disponible ou n’a pas
été validée, l’activation et l’exécution du connecteur doivent être refusées.
Il ne peut exister aucun repli vers AEL, `utilityProcess`, les permissions Node
seules ou un processus Node non confiné.

Tant que ce choix n’est pas validé, ACA ne peut pas être considéré comme
techniquement spécifié : autoriser du TypeScript arbitraire dans un simple
processus Node contredirait les restrictions de fichiers et de réseau du cahier
fonctionnel.

## Broker réseau

Le connecteur formule une requête structurée au broker au lieu d’utiliser
`fetch` directement. Le broker vérifie :

- domaine et port déclarés dans le manifeste ;
- schéma de requête et méthode HTTP ;
- catégorie CRUD de l’action ;
- absence d’adresse locale ou privée ;
- redirections et DNS à chaque étape ;
- taille, délai et type MIME ;
- en-têtes autorisés ;
- credential compatible avec l’agent et la destination.

Le broker attache l’authentification après journalisation expurgée de la requête.
La réponse est bornée et expurgée avant retour au runtime.

## File de tâches

Chaque agent spécialisé dispose d’une file persistante séquentielle :

- `waiting` ;
- `working` ;
- `completed` ;
- `error` ;
- `interrupted` ;
- `cancelled`.

Une seule tâche utilise le connecteur à la fois. Le passage `waiting` →
`working` et l’écriture du démarrage sont atomiques. Au redémarrage :

- les tâches `waiting` reprennent dans leur ordre ;
- une tâche `working` devient `interrupted` ;
- aucune action externe n’est rejouée automatiquement.

Une relance crée un nouvel ID et `retryOf`. Les résultats finaux sont conservés
90 jours et dans la limite de 1 000 tâches par agent. Les tâches actives ne sont
jamais supprimées par la rétention.

## Cycle de création

```text
Nova confirme le besoin de création
  -> ACA collecte le cadrage fonctionnel
  -> recherche ARI éventuelle
  -> génération AgentDraftPackage
  -> validation des schémas et chemins
  -> écriture dans staging
  -> analyse statique
  -> proposition et confirmation des dépendances
  -> compilation
  -> configuration-required si valeurs manquantes
  -> saisie utilisateur et extraction des secrets
  -> testing dans la frontière cible
  -> activation atomique si tout réussit
  -> rechargement du registre spécialisé
  -> reprise de la demande initiale
```

La confirmation initiale autorise la génération et les tests dans le périmètre
annoncé. Elle n’autorise pas une dépendance, un domaine, un fichier externe ou
une action sensible découvert ultérieurement.

## Tests avant activation

Ordre obligatoire :

1. schémas du manifeste, contexte, configuration, actions et résultats ;
2. confinement de tous les chemins et absence de liens symboliques interdits ;
3. analyse des imports et API interdites ;
4. compilation TypeScript stricte ;
5. tests unitaires dans le runtime cible ;
6. tests négatifs de filesystem, réseau, shell, import et secrets ;
7. tests des permissions CRUD ;
8. test du broker réseau avec serveur local contrôlé ;
9. test réel minimal en lecture, explicitement borné et non destructeur ;
10. dialogue complet Nova → agent → connecteur → agent → Nova ;
11. audit des dépendances et vérification des hashes ;
12. test d’activation et retour arrière atomiques.

Un échec laisse le brouillon inactif et préserve la version active. Le
diagnostic est expurgé avant d’être transmis à ACA ou affiché.

## Modification, réparation et activation

Toute modification crée une version de staging. ACA peut réparer uniquement
après confirmation utilisateur et reçoit code, schémas, tests, configuration
non sensible et diagnostic expurgé.

Une version remplace la version active seulement lorsque la suite complète
réussit. Le registre ne recharge jamais un fichier modifié à chaud. Un retour
arrière consiste à repointer atomiquement vers une version validée antérieure.

## Désactivation et suppression

La désactivation :

- retire immédiatement l’agent du routage ;
- demande l’arrêt au mieux de la tâche active ;
- suspend les tâches en attente ;
- conserve dossier, versions, configuration et secrets.

La suppression exige l’état `disabled` et une confirmation explicite. Le
service supprime ensuite le registre, le dossier et les références de coffre
appartenant exclusivement à l’agent. Aucun `rm` ou shell généré n’est utilisé :
le service de confiance manipule des chemins vérifiés sous la racine agents.

## IPC et interface

Le renderer utilisera des canaux séparés et validés pour :

- créer un brouillon après confirmation ;
- charger manifeste, état et version active ;
- modifier contexte, configuration expurgée et code de staging ;
- soumettre un secret au coffre sans le relire ;
- lancer les validations et consulter les diagnostics ;
- afficher, annuler et relancer les tâches ;
- activer, désactiver, réparer ou supprimer selon le workflow prévu ;
- consulter versions et demander un retour arrière.

Les agents système n’exposent pas les actions de suppression. La page d’un
agent spécialisé contient au minimum Général, Contexte, Configuration,
Connecteur, Permissions, Tâches, Historique et Versions.

## Validation de la génération elle-même

La qualité d’ACA sera mesurée avec un catalogue de scénarios reproductibles :

- API REST publique en lecture ;
- API authentifiée avec secret injecté par broker ;
- serveur IMAP de test ou double contrôlé ;
- action de création nécessitant une confirmation ;
- action inconnue et arguments supplémentaires ;
- dépendance refusée ;
- code tentant filesystem, réseau direct ou import Node ;
- modification manuelle invalide ;
- test en échec avec version active préservée ;
- crash pendant activation et récupération du pointeur ;
- arrêt et reprise de file après redémarrage.

Les tests ne doivent jamais utiliser une boîte e-mail ou un compte réel en CI.

## Points techniques bloquants à valider

1. Choisir le runtime de sécurité du code généré : QuickJS/WASM, sandbox OS ou
   autre solution démontrant réellement le confinement.
2. Décider quelles dépendances JavaScript sont compatibles avec ce runtime.
3. Confirmer l’interdiction initiale des modules natifs et scripts npm.
4. Valider la stratégie de compilation TypeScript dans le binaire packagé.
5. Figer les schémas `AgentDraftPackage`, manifeste, action et résultat.
6. Figer le format du SDK RPC et les brokers fichiers/réseau/credentials.
7. Définir les maxima de CPU, mémoire, taille de bundle et messages IPC.
8. Définir la convention définitive des IDs d’agents spécialisés.
9. Vérifier le nettoyage transactionnel du coffre lors d’une suppression.
10. Valider le modèle de versions immuables et `active-version.json`.

Ces décisions sont nécessaires avant de déclarer la spécification technique
ACA complète. Elles n’empêchent pas de finaliser d’abord ARI en phase 6.2.

## Contrats partagés désormais fixés par ARI 6.2

Le registre Credentials, les ACL du demandeur effectif, l’enveloppe de délégation
et les budgets sont définis dans [ARI_SPECIFICATION_TECHNIQUE.md](ARI_SPECIFICATION_TECHNIQUE.md).
ACA devra réutiliser ces contrats, sans réintroduire de droits implicites
lorsqu’il agit comme demandeur. Ils sont prêts pour le développement ARI mais
pas encore disponibles dans le code. Les propositions de ce cahier 6.3 doivent
être alignées sur cette base lors de sa finalisation.
