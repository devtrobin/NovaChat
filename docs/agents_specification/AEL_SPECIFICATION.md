# Cahier des charges — AEL, Agent d’Exécution Locale

## Statut

Spécification validée et implémentée dans la phase 6.1. L’identité **AEL** et
l’identifiant `agent-ael` sont définitifs. Les validations automatisée et
manuelle ainsi que le nettoyage local confirmé sont terminés ; la phase est
close.

La réalisation existante est décrite dans la
[spécification technique AEL](AEL_SPECIFICATION_TECHNIQUE.md).

## Position dans la feuille de route

Cette spécification appartient à la phase 6.1 de
[NEXT_STEPS.md](../NEXT_STEPS.md), consacrée à la réorganisation des agents
système existants avant l’ajout d’ARI en phase 6.2 et d’ACA en phase 6.3.

## Identité remplacée

- nom affiché : **Device** ou **Agent Device** ;
- identifiant persistant : `device-agent` ;
- dossier local : `agents/device-agent/` ;
- rôle : préparer et exécuter une commande locale contrôlée.

Ces noms sont supprimés du code actif. Ils ne restent documentés ici que pour
expliquer la rupture de données de développement réalisée pendant la phase 6.1.

## Identité validée

- nom : **AEL — Agent d’Exécution Locale** ;
- identifiant canonique : `agent-ael` ;
- dossier local : `agents/agent-ael/` ;

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

Le renommage a couvert :

- identifiants et unions de types partagés ;
- registre des agents et settings d’activation ;
- messages structurés, handoffs et tâches persistées ;
- prompts internes de génération de commande ;
- dossier agent, contexte, permissions, historique et conversations ;
- page agent, activité, libellés, aide et messages de permission ;
- références d’ACP ;
- noms de tests, fixtures et documentation ;
- renommage des modules, types, fonctions, variables, tests, classes CSS et
  fixtures afin que le vocabulaire actif utilise exclusivement AEL.

## Réinitialisation des données de développement

NovaChat n’étant pas encore distribué, l’utilisateur a autorisé puis confirmé la
suppression des données locales incompatibles. La phase 6.1 ne maintient aucune
migration ni compatibilité des opérations ou espaces agents historiques. Seuls
les identifiants et rôles présents dans des messages de conversation déjà
existants sont normalisés vers ACP/AEL à la frontière IPC.

- les workspaces et conversations agents utilisant l’ancien ID ont été
  supprimés ;
- aucun dossier `.migration-backups` n’est créé ;
- les paramètres généraux et le secret OpenAI restent conservés ;
- toutes les nouvelles données utilisent exclusivement `agent-ael` ;
- une future migration de données destinée à des versions distribuées devra
  faire l’objet d’un contrat séparé.

## Frontières à préserver

- Le shell reste exclusivement dans le domaine `src/main/ael`.
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
- les données locales incompatibles sont réinitialisées sans supprimer les
  paramètres généraux ni le secret OpenAI ;
- les handoffs utilisent uniquement l’identifiant canonique ;
- toute la matrice de régression AEL reste verte sans assouplissement ;
- tests, TypeScript, lint et packaging restent verts.

## Décisions validées

1. Nom complet : **AEL — Agent d’Exécution Locale**.
2. Identifiant : `agent-ael`, selon la convention `agent-<acronyme>`.
3. Nom compact dans l’interface : **AEL** ; nom complet sur la page agent.
4. Renommage intégral du vocabulaire applicatif : sources, contrats, fichiers,
   tests, classes CSS et documentation active utilisent AEL.
5. Rupture assumée des espaces agents locaux de développement, sans sauvegarde
   ni compatibilité active avec l’ancien identifiant ; les messages de chat
   historiques bénéficient uniquement d’une normalisation bornée.
