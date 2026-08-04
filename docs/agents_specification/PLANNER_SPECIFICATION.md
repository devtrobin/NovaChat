# Cahier des charges — renommage et organisation de l’agent Planner

## Statut

Étude initiale de la phase 6.1. Le nouveau nom et l’identifiant technique
doivent être validés avant toute migration du code ou des données locales.

## Position dans la feuille de route

Cette spécification appartient à la phase 6.1 de
[NEXT_STEPS.md](../NEXT_STEPS.md), consacrée à la réorganisation des agents
système existants avant l’ajout d’ARI en phase 6.2 et d’ACA en phase 6.3.

## Identité actuelle

- nom affiché : **Planner** ou **Agent Planner** ;
- identifiant persistant : `agent-planner` ;
- ancien identifiant encore accepté en migration : `diagnostic-agent` ;
- dossier local : `agents/agent-planner/` ;
- rôle : analyser une demande et proposer une prochaine étape atomique.

Le mot anglais « Planner » n’est pas cohérent avec les noms français et les
acronymes retenus pour ARI et ACA.

## Identité recommandée

- nom : **ACP — Agent de Cadrage et de Planification** ;
- identifiant canonique : `agent-acp` ;
- dossier local : `agents/agent-acp/` ;
- identifiants de compatibilité : `agent-planner` et `diagnostic-agent`.

Le nom recommandé décrit mieux le comportement réel : ACP cadre la demande,
signale les informations manquantes et choisit une prochaine étape. Il ne
devient pas l’orchestrateur général, responsabilité qui reste à Nova.

La convention cible pour les agents système devient `agent-<acronyme>` :
`agent-acp`, `agent-ael`, puis `agent-ari` et `agent-aca`.

## Mission à préserver

Le renommage ne modifie pas les responsabilités actuelles. L’agent devra
toujours :

- analyser une demande non triviale ;
- produire un statut `ready`, `needs-info` ou `blocked` ;
- résumer son diagnostic ;
- proposer au plus une prochaine étape atomique ;
- recommander un agent compatible ou aucune délégation ;
- ne jamais exécuter de commande ni répondre directement à l’utilisateur.

L’arrivée future d’ARI et d’ACA étendra le registre des agents disponibles,
mais ne transférera pas l’orchestration générale à ACP.

## Périmètre du renommage

La future migration devra inventorier et traiter :

- identifiants et unions de types partagés ;
- registre des agents et settings d’activation ;
- messages structurés et handoffs persistés ;
- prompts internes et parser de la réponse de planification ;
- dossier agent, contexte, permissions, tâches, historiques et conversations ;
- pages, libellés, commandes d’aide et activité dans le renderer ;
- noms de tests, fixtures et documentation ;
- compatibilité avec `agent-planner` et `diagnostic-agent`.

## Migration des données

La migration devra être idempotente et sans perte :

1. reconnaître `diagnostic-agent`, `agent-planner` et `agent-acp` ;
2. fusionner les données vers `agents/agent-acp/` sans écraser une version plus
   récente ;
3. dédupliquer permissions, tâches, historiques et conversations ;
4. conserver les anciens dossiers dans `.migration-backups` après vérification ;
5. normaliser les nouvelles écritures vers `agent-acp` ;
6. continuer à lire les anciens messages sans réécriture destructive de toutes
   les conversations.

## Frontières à préserver

- Nova reste l’unique orchestrateur du tour utilisateur.
- ACP reste consultatif et sans effet de bord.
- Les règles système ne deviennent pas éditables via `contexte.json`.
- Les appels provider restent dans le process `main`.
- Le renderer ne reçoit aucune capacité nouvelle pendant ce renommage.

## Non-objectifs

- transformer ACP en générateur de plans longs ;
- lui permettre d’appeler directement un agent ;
- changer de provider ou de modèle ;
- modifier le budget global d’orchestration ;
- ajouter ARI ou ACA pendant la migration de nom.

## Critères de validation

- le nom et l’identifiant définitifs sont validés ;
- les anciens settings et dossiers sont migrés de façon idempotente ;
- les anciennes conversations restent lisibles ;
- les handoffs utilisent uniquement l’identifiant canonique après migration ;
- aucun changement fonctionnel du cadrage n’est observé ;
- tests, TypeScript, lint et packaging restent verts.

## Décisions à confirmer

1. Valider **ACP — Agent de Cadrage et de Planification**.
2. Valider l’identifiant `agent-acp` et la convention `agent-<acronyme>`.
3. Conserver le terme technique `planner` dans les noms de modules qui décrivent
   la fonction de planification, tout en utilisant ACP pour l’identité produit
   et persistante. Cette séparation est recommandée pour éviter un renommage
   mécanique qui réduirait la lisibilité du code.
