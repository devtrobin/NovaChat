# Cahier des charges — renommage et organisation de l’agent Device

## Statut

Étude initiale de la phase 6.1. Le nouveau nom et l’identifiant technique
doivent être validés avant toute migration du code ou des données locales.

## Position dans la feuille de route

Cette spécification appartient à la phase 6.1 de
[NEXT_STEPS.md](../NEXT_STEPS.md), consacrée à la réorganisation des agents
système existants avant l’ajout d’ARI en phase 6.2 et d’ACA en phase 6.3.

## Identité actuelle

- nom affiché : **Device** ou **Agent Device** ;
- identifiant persistant : `device-agent` ;
- dossier local : `agents/device-agent/` ;
- rôle : préparer et exécuter une commande locale contrôlée.

Le nom anglais et l’identifiant utilisant le suffixe `-agent` sont incohérents
avec les noms français et la convention proposée pour ACP, ARI et ACA.

## Identité recommandée

- nom : **AEL — Agent d’Exécution Locale** ;
- identifiant canonique : `agent-ael` ;
- dossier local : `agents/agent-ael/` ;
- identifiant de compatibilité : `device-agent`.

Le nom recommandé décrit la capacité réelle sans la confondre avec un appareil
matériel : AEL transforme un objectif en commande terminal, applique les
contrôles de permission et exécute localement.

La convention cible pour les agents système devient `agent-<acronyme>` :
`agent-acp`, `agent-ael`, puis `agent-ari` et `agent-aca`.

## Mission à préserver

Le renommage ne modifie pas les responsabilités actuelles. L’agent devra
toujours :

- accepter une commande exacte ou un objectif en langage naturel ;
- rester propriétaire de la syntaxe terminal adaptée à la plateforme ;
- appliquer le profil terminal déterministe et la policy de permission ;
- demander une saisie ou une autorisation seulement lorsque nécessaire ;
- exécuter la commande dans le shell réel de la plateforme ;
- borner sortie, durée et arbre de processus ;
- retourner un résultat structuré à Nova et conserver les traces autorisées.

## Périmètre du renommage

La future migration devra inventorier et traiter :

- identifiants et unions de types partagés ;
- registre des agents et settings d’activation ;
- messages structurés, handoffs et tâches persistées ;
- prompts internes de génération de commande ;
- dossier agent, contexte, permissions, historique et conversations ;
- page agent, activité, libellés, aide et messages de permission ;
- références du Planner actuel puis d’ACP ;
- noms de tests, fixtures et documentation ;
- compatibilité avec l’identifiant `device-agent`.

## Migration des données

La migration devra être idempotente et sans perte :

1. reconnaître `device-agent` et `agent-ael` ;
2. fusionner les données vers `agents/agent-ael/` sans écraser une version plus
   récente ;
3. dédupliquer permissions, tâches, historiques et conversations ;
4. conserver l’ancien dossier dans `.migration-backups` après vérification ;
5. normaliser les nouvelles écritures vers `agent-ael` ;
6. continuer à lire les anciens messages sans réécriture destructive de toutes
   les conversations.

## Frontières à préserver

- Le shell reste exclusivement dans le domaine `src/main/device`.
- Une décision `allow` n’est pas un sandbox ni une garantie de sûreté complète.
- Le renderer ne reçoit aucun accès direct au shell.
- Les commandes inconnues, interactives ou non analysables conservent leur
  traitement restrictif.
- Le renommage ne modifie ni `/cmd`, ni les catégories de permission, ni les
  règles mémorisées.

## Non-objectifs

- élargir l’allowlist de commandes ;
- ajouter une automatisation graphique ou un navigateur ;
- remplacer le shell par un connecteur générique ;
- modifier les confirmations ou la classification des lectures ;
- ajouter une fonctionnalité ARI ou ACA.

## Critères de validation

- le nom et l’identifiant définitifs sont validés ;
- les anciens settings et dossiers sont migrés de façon idempotente ;
- les anciennes conversations, permissions et historiques restent lisibles ;
- les handoffs utilisent uniquement l’identifiant canonique après migration ;
- toute la matrice de régression Device reste verte sans assouplissement ;
- tests, TypeScript, lint et packaging restent verts.

## Décisions à confirmer

1. Valider **AEL — Agent d’Exécution Locale**.
2. Valider l’identifiant `agent-ael` et la convention `agent-<acronyme>`.
3. Conserver `device` comme nom du sous-système technique, de la policy et des
   types de commande, tout en utilisant AEL pour l’identité produit et
   persistante. Cette séparation est recommandée afin de ne pas masquer la
   nature technique des modules existants.
