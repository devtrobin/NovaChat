# Cahier des charges — ACP — Agent de Cadrage et de Planification

Compagnon : [ACP_SPECIFICATION_TECHNIQUE.md](ACP_SPECIFICATION_TECHNIQUE.md)
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

- nom : **ACP — Agent de Cadrage et de Planification** ;
- identifiant canonique : `agent-acp` ;
- dossier local : `agents/agent-acp/` ;
- préfixes techniques : `acp`, `Acp` ou `ACP` suivant la convention du support ;
- aucun identifiant de compatibilité.

La convention des agents système est `agent-<acronyme>`. ACP précède ARI en
phase 6.2 et ACA en phase 6.3, avec AEL réorganisé dans la même phase 6.1.

## Mission à préserver

ACP doit :

- analyser une demande non triviale ;
- produire un statut `ready`, `needs-info` ou `blocked` ;
- résumer son diagnostic et signaler les informations manquantes ;
- proposer au plus une prochaine étape atomique ;
- recommander AEL ou aucune délégation dans le périmètre actuel ;
- ne jamais exécuter de commande ni répondre directement à l’utilisateur.

Nova reste l’unique orchestrateur. L’arrivée d’ARI et d’ACA étendra le registre
sans transférer l’orchestration générale à ACP.

## Renommage complet

Le nouveau nom s’applique à toutes les surfaces, sans exception pour le code
interne :

- fichiers et dossiers, imports, exports, fonctions, variables et types ;
- registre commun, métadonnées et settings d’activation ;
- messages structurés, handoffs, tâches, prompts et parser de planification ;
- contextes par défaut, schémas et chemins de stockage ;
- pages, composants, styles, routes, libellés, aide et activité ;
- tests, fixtures, documentation, scripts et métadonnées du projet concernés.

Exemples de cibles à implémenter : `ai.acp.ts`,
`ai.orchestrator.acp-handoff.ts`, `agent-task.acp.ts` et `AcpAgentPage.tsx`.
Ces noms sont documentés dès maintenant ; les fichiers source seront renommés
pendant l’implémentation seulement.

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

- ACP reste consultatif et sans effet de bord.
- Les règles système restent distinctes du contexte éditable.
- Les appels provider et l’orchestration restent dans le process `main`.
- Le renderer passe uniquement par l’API minimale du preload.
- Les messages structurés restent le contrat entre UI, orchestration et stockage.

## Non-objectifs

- plans longs, appels directs à un autre agent ou nouvelles fonctions ;
- changement de provider, de modèle ou du budget d’orchestration ;
- ajout d’ARI ou d’ACA dans la phase 6.1 ;
- maintien d’une compatibilité avec les anciennes installations.

## Critères de validation

- toutes les surfaces utilisent ACP et `agent-acp` ;
- les anciens identifiants sont refusés et les adaptations historiques retirées ;
- le nouvel espace est créé vide avec un contexte par défaut valide ;
- aucune ancienne conversation, permission ou sauvegarde n’est réimportée ;
- les nouvelles données survivent à un redémarrage sans nouvelle remise à zéro ;
- le cadrage atomique, les statuts et les frontières d’orchestration restent identiques ;
- tests, TypeScript strict, lint et packaging passent.
