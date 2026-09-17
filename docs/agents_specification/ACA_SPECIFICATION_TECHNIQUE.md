# ACA — Spécification technique

## Lecture et statut

Ce fichier complète le [cahier fonctionnel](ACA_SPECIFICATION.md).
Il décrit les outils, leurs responsabilités, les contrats et les dépendances.
Les exigences métier restent dans le cahier fonctionnel.

- **Existant** : comportement ou bibliothèque constaté dans le dépôt.
- **Décidé** : exigence déjà retenue, même si elle n’est pas encore codée.
- **Proposé** : solution technique soumise à relecture, non installée et non
  validée implicitement par ce document.
- **À préciser** : décision nécessaire avant de considérer la conception
  technique comme terminée.

Les noms et chemins ACP/AEL sont ceux de la cible de phase 6.1. Le code actuel
reste sous ses anciens noms, répertoriés dans
[l’ADR 005](../decisions/005-acp-ael-breaking-reset.md).
Aucune implémentation, installation de dépendance ni suppression de données
n’est déclenchée par cette documentation.

## État et chaîne technique

ACA n’est pas implémenté. TypeScript, le dossier autonome par agent, les actions
`{ action, arguments }`, ARI, le courtier de secrets et l’exécution isolée sont
prévus par le cahier. Le choix de l’isolation effective reste ouvert.

```text
Nova -> demande de création cadrée -> ACA
     -> ARI si documentation manquante
     -> brouillon + manifeste + configuration + connector.ts + tests
     -> configuration utilisateur et coffre
     -> compilation et tests isolés -> activation si tous les contrôles passent
```

ACA produit du code et des fichiers par des services de confiance bornés.
Il ne dispose pas d’un terminal libre. L’exécution du connecteur généré est
une capacité distincte de celle d’AEL.

## Inventaire des outils

| Besoin | Outil ou service | Statut |
| --- | --- | --- |
| Concevoir le connecteur | Transport OpenAI commun du main | Socle existant ; prompts et validation ACA à construire |
| Rechercher l’API d’un outil | ARI via l’orchestrateur | Décidé, disponible après phase 6.2 |
| Produire et modifier le brouillon | Service de fichiers NovaChat, `node:fs/promises`, chemins confinés | Réutilisation du socle proposée |
| Valider manifeste, configuration et actions | `ajv`, sous-ensemble JSON Schema borné | Nouvelle dépendance proposée |
| Compiler `connector.ts` | Compilateur TypeScript dans un processus contrôlé | TypeScript existe en dev ; outillage livré avec l’app à concevoir |
| Installer les dépendances autorisées | Service dédié pilotant npm et un lockfile propre à l’agent | Décidé fonctionnellement, intégration à construire |
| Audit des dépendances | `npm audit` par le service contrôlé | Décidé ; réseau et échec d’audit à traiter explicitement |
| Tests du connecteur | `node:test` et `node:assert/strict` dans le runtime isolé | Proposition, sans ajouter Vitest à chaque agent |
| Tests de NovaChat | Vitest, TypeScript, ESLint et Electron Forge | Outillage existant du projet |
| Exécuter le connecteur | Runtime Node séparé avec restriction effective OS | Exigence décidée ; mécanisme non choisi |
| Accéder à un service externe | Courtier HTTP/protocole de confiance avec domaines et actions déclarés | À construire, aucun secret donné au code généré |
| Stocker les secrets | `CredentialsService` global + `electron.safeStorage` | Dépendance de phase 6.2 |
| Activer une version | Registre commun, stockage versionné et bascule atomique | À construire sur le stockage existant |
| Suivre les tâches | Queue persistante par agent, historique et registre d’annulation | Extension à construire ; la queue actuelle de stockage ne suffit pas |

Ajv est proposé car ACA produit déjà des fichiers JSON Schema. Les schémas
créés par le modèle restent non fiables : limiter taille/profondeur, refuser
les références distantes et mots-clés non autorisés, borner les expressions
régulières et le temps de compilation/validation. Un schéma ne décide jamais
seul des permissions. Référence : [sécurité Ajv](https://ajv.js.org/security.html).

## Services proposés et contrats

- `AcaDraftService` : écrit seulement dans le brouillon du nouvel agent ; aucune
  modification du code de NovaChat ou d’un agent système.
- `ConnectorManifestValidator` : contrôle identité, capacité, domaines,
  protocoles, actions, effets et paramètres requis.
- `ConnectorBuildService` : compilation du TypeScript et diagnostics expurgés,
  sans exécuter le code généré dans le main.
- `ConnectorDependencyService` : présente noms, versions, sources et raisons,
  attend la confirmation prévue puis installe dans le seul espace de l’agent.
- `ConnectorTestRunner` : lance les tests dans la même restriction que le
  runtime réel et produit un rapport structuré.
- `ConnectorRuntime` et `ConnectorBroker` : échanges bornés par identifiant
  d’action, délai, volume, permission et identité d’agent.
- `AgentActivationService` : remplace la version active uniquement après
  réussite de tous les contrôles ; conserve la dernière version valide.

Les noms sont des propositions, pas des modules déjà présents. Les entrées
IPC sont validées côté main. Les valeurs `action` et `arguments` sont confrontées
au manifeste et à la décision de permission ; une action inconnue est refusée.

Une action du connecteur ne devient jamais implicitement une commande shell.
Le courtier résout les `credentialRef` au moment de l’appel, limite les
origines et n’expose pas la valeur secrète au modèle ou au code généré.
HTTP, OAuth et IMAP/SMTP exigent des adaptateurs de protocole distincts ; les
bibliothèques métier seront choisies par connecteur, documentées et approuvées
avec leurs dépendances. Il n’existe pas encore de bibliothèque universelle
retenue pour tous les outils possibles.

## Isolation : décision encore nécessaire

Un `child_process` ou un `utilityProcess` séparé évite de charger le code dans
le main, mais ne démontre pas à lui seul les restrictions filesystem, réseau
et shell exigées. `utilityProcess` fournit un enfant Node avec communication
par messages ; il est candidat pour la supervision, pas une preuve de
confinement suffisante. Référence :
[Electron utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process).

Les permissions Node constituent une protection complémentaire, et leur
documentation exclut une garantie contre du code malveillant. Elles ne peuvent
pas être présentées comme l’unique frontière de sécurité du code généré.
Référence : [permissions Node](https://nodejs.org/api/permissions.html).

Avant validation technique, choisir et vérifier un backend de restriction OS
sur chaque plateforme supportée, ou un environnement isolé distribué avec des
prérequis explicites. Il devra interdire les sorties filesystem, le shell,
les processus arbitraires et le réseau direct non autorisé, y compris via les
dépendances du connecteur. Le courtier reste la seule voie autorisée pour les
secrets et les actions externes.

Proposition : refus d’exécution et d’activation sur une plateforme où ce backend
n’est pas disponible ou n’a pas été validé ; aucun repli vers AEL ou un processus
Node non restreint. Aucun choix de conteneur ou de backend natif n’est déclaré
validé dans ce document.

## Compilation, paquets et tests

Le compilateur doit produire du JavaScript exécutable par le runtime retenu.
Les dépendances de développement du dépôt ne seront pas supposées présentes
chez l’utilisateur. Il faut définir la livraison/version de Node, TypeScript
et npm, ou leur remplacement par un outillage embarqué équivalent, et vérifier
les fuses Electron, ASAR, licences et plateformes.

Proposition d’installation : registre et versions autorisés, lockfile propre,
aucun script de cycle de vie npm exécuté par défaut, aucune installation globale.
Les paquets exigeant du code natif ou un script d’installation restent bloqués
tant qu’un traitement isolé spécifique n’est pas défini. L’installation ne
passe pas par une commande libre générée puis confiée à AEL.

Les tests réels utilisent le même courtier et les mêmes restrictions que le
runtime. Ils suivent la progression du cahier : schémas, connexion TLS vers les
seuls hôtes déclarés, authentification, identité, lecture minimale et refus des
accès non déclarés. Les créations, modifications et suppressions restent
soumises à la politique d’actions, y compris pendant les tests.

L’activation automatique n’est possible qu’après tous les contrôles requis ;
un échec laisse le brouillon inactif ou conserve la version active précédente.
Un audit indisponible n’est pas une réussite. Les résultats de tests produits
uniquement par le code généré ne suffisent pas : le harnais de confiance doit
lui-même vérifier les refus d’accès et le dialogue complet.

## Appels aux autres agents

| Destination | Usage | Routage et statut |
| --- | --- | --- |
| ARI | Documentation de l’API, authentification, SDK, versions | Décidé ; via Nova, retour à la tâche ACA |
| ACP | Aucun appel requis par le cahier actuel | Nova peut demander un cadrage avant de confier la création à ACA |
| AEL | Aucun outil d’installation, de compilation ou d’exécution des connecteurs | Non prévu ; ne peut pas remplacer l’isolation ACA |
| Agent spécialisé | Tests et activation via les services contrôlés, puis tâches métier via Nova | Pas d’appel autonome libre d’ACA à son code |
| ACA lui-même | Pas de création récursive d’ACA | Non autorisé |

Le contrat de délégation partagé est dans
[AGENTS_PLAN.md](../AGENTS_PLAN.md#contrat-technique-de-délégation-proposé).
Le coût et l’annulation de la recherche ARI restent liés à la tâche de création.
Les droits Credentials du demandeur initial sont vérifiés même si ACA puis
ARI interviennent ; aucune délégation ne sert à emprunter les droits d’un autre
agent.

## Stockage, tâches et rétention

Le dossier autonome suit le cahier fonctionnel : manifeste, contexte,
configuration et schéma, `connector.ts`, dépendances éventuelles, tests,
permissions, historique et conversations. Les chemins sont validés par les
services de confiance ; aucun chemin fourni par le modèle n’est utilisé brut.

Une seule tâche utilise un connecteur à la fois. La queue persistante reprend
les tâches `waiting`, transforme `working` en `interrupted` au redémarrage et
ne rejoue jamais automatiquement un effet externe incertain. Les retries ont
un nouvel identifiant et `retryOf`. L’arrêt bloque les étapes restantes sans
promettre d’annuler un effet déjà exécuté.

La conservation suit 90 jours ou 1 000 tâches finales par agent ; les tâches
actives et en attente ne sont pas purgées. Les mises à jour gardent la dernière
version valide. La base antérieure à 6.1 n’est jamais réimportée.

## Points à trancher pendant la relecture

- Backend d’isolation réel et stratégie de distribution multi-plateforme.
- Livraison/version des outils Node, TypeScript et npm dans l’application.
- Validation de la proposition Ajv et `node:test`, formats de manifeste et IPC.
- Politique détaillée des paquets, scripts d’installation et modules natifs.
- Adaptateurs de courtier par protocole, plafonds CPU/mémoire/temps/sortie,
  nombre de tentatives de réparation et budgets d’appels provider/ARI.

Les références externes ont été consultées le 16 septembre 2026. Leur version
courante doit être confrontée au runtime réellement livré par NovaChat avant
implémentation. Aucun de ces points n’est considéré résolu par la seule
rédaction du présent fichier.
