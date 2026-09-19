# Cahier des charges — ACP, Agent de Cadrage et de Planification

## Statut

Spécification validée et implémentée dans la phase 6.1. L’identité **ACP** et
l’identifiant `agent-acp` sont définitifs. Les validations automatisée et
manuelle ainsi que le nettoyage local confirmé sont terminés ; la phase est
close.

La réalisation existante est décrite dans la
[spécification technique ACP](ACP_SPECIFICATION_TECHNIQUE.md).

## Position dans la feuille de route

Cette spécification appartient à la phase 6.1 de
[NEXT_STEPS.md](../NEXT_STEPS.md), consacrée à la réorganisation des agents
système existants avant l’ajout d’ARI en phase 6.2 et d’ACA en phase 6.3.

## Identité remplacée

- nom affiché : **Planner** ou **Agent Planner** ;
- identifiant persistant : `agent-planner` ;
- identifiant historique précédemment accepté en migration : `diagnostic-agent` ;
- dossier local : `agents/agent-planner/` ;
- rôle : analyser une demande et proposer une prochaine étape atomique.

Ces noms sont supprimés du code actif. Ils ne restent documentés ici que pour
expliquer la rupture de données de développement réalisée pendant la phase 6.1.

## Identité validée

- nom : **ACP — Agent de Cadrage et de Planification** ;
- identifiant canonique : `agent-acp` ;
- dossier local : `agents/agent-acp/` ;

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

Le renommage a couvert :

- identifiants et unions de types partagés ;
- registre des agents et settings d’activation ;
- messages structurés et handoffs persistés ;
- prompts internes et parser de la réponse de planification ;
- dossier agent, contexte, permissions, tâches, historiques et conversations ;
- pages, libellés, commandes d’aide et activité dans le renderer ;
- noms de tests, fixtures et documentation ;
- renommage des modules, types, fonctions, variables, tests et fixtures afin
  que le vocabulaire actif utilise exclusivement ACP.

## Réinitialisation des données de développement

NovaChat n’étant pas encore distribué, l’utilisateur a autorisé puis confirmé la
suppression des données locales incompatibles. La phase 6.1 ne maintient aucune
migration ni compatibilité des opérations ou espaces agents historiques. Seuls
les identifiants présents dans des messages de conversation déjà existants sont
normalisés vers ACP/AEL à la frontière IPC.

- les workspaces et conversations agents utilisant les anciens IDs ont été
  supprimés ;
- aucun dossier `.migration-backups` n’est créé ;
- les paramètres généraux et le secret OpenAI restent conservés ;
- toutes les nouvelles données utilisent exclusivement `agent-acp` ;
- une future migration de données destinée à des versions distribuées devra
  faire l’objet d’un contrat séparé.

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
- les données locales incompatibles sont réinitialisées sans supprimer les
  paramètres généraux ni le secret OpenAI ;
- les handoffs utilisent uniquement l’identifiant canonique ;
- aucun changement fonctionnel du cadrage n’est observé ;
- tests, TypeScript, lint et packaging restent verts.

## Décisions validées

1. Nom complet : **ACP — Agent de Cadrage et de Planification**.
2. Identifiant : `agent-acp`, selon la convention `agent-<acronyme>`.
3. Nom compact dans l’interface : **ACP** ; nom complet sur la page agent.
4. Renommage intégral du vocabulaire applicatif : sources, contrats, fichiers,
   tests et documentation active utilisent ACP.
5. Rupture assumée des espaces agents locaux de développement, sans sauvegarde
   ni compatibilité active avec les anciens identifiants ; les messages de chat
   historiques bénéficient uniquement d’une normalisation bornée.
