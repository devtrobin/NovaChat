# Cahier des charges — AEL — Agent d’Exécution Locale

Compagnon : [AEL_SPECIFICATION_TECHNIQUE.md](AEL_SPECIFICATION_TECHNIQUE.md)
— outils, bibliothèques, contrats, délégations et choix techniques. Les solutions
marquées « proposées » dans ce fichier compagnon restent à valider ; elles ne
modifient pas implicitement les décisions fonctionnelles ci-dessous.

## Statut

Périmètre confirmé par l’utilisateur le 16 septembre 2026 : renommage complet,
rupture de compatibilité et remise à zéro des anciennes données NovaChat.
Le découpage de la phase 6.1 est inscrit dans
[NEXT_STEPS.md](../NEXT_STEPS.md). L’implémentation attend la finalisation de
la documentation ; aucune suppression de données n’est effectuée pendant
cette préparation.

## Identité retenue

- nom : **AEL — Agent d’Exécution Locale** ;
- identifiant canonique : `agent-ael` ;
- dossier local : `agents/agent-ael/` ;
- préfixes techniques : `ael`, `Ael` ou `AEL` suivant la convention du support ;
- aucun identifiant de compatibilité.

La convention des agents système est `agent-<acronyme>`. AEL est réorganisé
avec ACP en phase 6.1, avant ARI en phase 6.2 puis ACA en phase 6.3.

## Mission à préserver

AEL doit :

- accepter une commande exacte ou un objectif en langage naturel ;
- rester propriétaire de la syntaxe terminal adaptée à la plateforme ;
- appliquer le profil terminal déterministe et la policy de permission ;
- demander une saisie ou une autorisation seulement lorsque nécessaire ;
- exécuter la commande dans le shell réel de la plateforme ;
- borner sortie, durée et arbre de processus ;
- retourner un résultat structuré à Nova et conserver les traces autorisées.

## Renommage complet

Le nouveau nom s’applique aussi à l’intégralité du sous-système technique :

- domaine `src/main/ael/`, fichiers, imports, exports, fonctions et variables ;
- types `Ael*`, policy, profil terminal, runtime, shell et exécution ;
- registre commun, identifiant `agent-ael`, settings `aelExecution` ;
- contrats de messages `from`/`to` avec la valeur `ael`, événements et statuts
  comportant l’ancien nom ;
- prompts, parser ACP, handoffs, tâches et traces ;
- chemins de stockage, contextes par défaut et schémas ;
- composants dont `AelAgentPage` et `MessageItemAel`, styles, routes, libellés,
  aide, activité et permissions ;
- tests, fixtures, documentation, scripts et métadonnées du projet concernés.

Exemples de cibles à implémenter : `ael.policy.ts`, `ael.runtime.ts`,
`agent-task.ael.ts` et `ai.ael-flow.ts`. Ces noms sont documentés dès
maintenant ; les fichiers source seront renommés pendant l’implémentation
seulement.

## Rupture de compatibilité et données

La phase 6.1 repart d’une base neuve. Elle ne conserve, ne fusionne et ne
convertit aucune ancienne donnée : settings, contextes personnalisés,
permissions mémorisées, tâches, historiques et conversations principales ou
internes seront supprimés lors de la remise à zéro. Les sauvegardes, archives,
traces, secrets NovaChat et anciens états de migration entrent également dans
ce périmètre pour éviter une réimportation de l’ancien état.

La procédure commune est définie par
[l’ADR 005](../decisions/005-acp-ael-breaking-reset.md). Elle cible seulement
les fichiers appartenant à NovaChat, y compris dans ses chemins configurés.
Elle ne supprime pas les autres fichiers présents dans un dossier partagé.
Les nouveaux espaces seront initialisés aux valeurs par défaut ; paramètres,
clé OpenAI et préférences devront être reconfigurés.

Aucun alias, lecteur de secours ni migration depuis un ancien identifiant ne
sera conservé. Les anciennes données et les anciens payloads seront refusés.
Les protections de stockage atomique et de récupération continueront à
s’appliquer aux données créées après la remise à zéro.

## Frontières à préserver

- Le shell reste exclusivement dans le domaine `src/main/ael` du main.
- La policy reste un contrôle de permission, pas un sandbox.
- Le renderer ne reçoit aucun accès direct au shell.
- Les commandes inconnues, interactives ou non analysables conservent leur
  traitement restrictif.
- `/cmd`, les catégories et les règles de décision de permission gardent leur
  comportement ; les anciennes décisions mémorisées sont supprimées et les
  nouvelles commencent dans un registre vide.

## Non-objectifs

- élargissement de l’allowlist ou assouplissement des confirmations ;
- automatisation graphique, navigateur ou connecteur générique ;
- ajout d’ARI ou d’ACA dans la phase 6.1 ;
- maintien d’une compatibilité avec les anciennes installations.

## Critères de validation

- toutes les surfaces utilisent AEL, `agent-ael`, `ael` et `Ael*` ;
- les anciens identifiants, messages et settings sont refusés ;
- le nouvel espace est créé vide, avec contexte valide et aucune permission
  mémorisée ;
- aucun ancien historique, conversation ou backup n’est réimporté ;
- les nouvelles données survivent à un redémarrage sans nouvelle remise à zéro ;
- toute la matrice de régression terminal/permissions reste verte ;
- génération, exécution, saisie, arrêt et `/cmd` gardent leur comportement ;
- tests, TypeScript strict, lint et packaging passent.
