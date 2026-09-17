# Architecture des agents

> Nomenclature cible de la phase 6.1 : ACP/AEL, y compris chemins, types et
> contrats techniques. Le code n’est pas encore renommé. Le changement complet
> et la remise à zéro sans compatibilité seront implémentés après finalisation
> de la documentation ; voir [ADR 005](decisions/005-acp-ael-breaking-reset.md).

## État

Le système d’agents n’est plus un plan futur : deux agents spécialisés sont
implémentés et activés par défaut.

```text
Utilisateur
  -> Nova, assistant principal
  -> agent-acp (optionnel)
  -> agent-ael (optionnel)
  -> Nova
  -> Utilisateur
```

Nova reste l’unique orchestrateur. Les agents ne s’appellent pas directement :
une demande de travail à un autre agent est transmise au main, qui valide,
planifie et rend le résultat au demandeur. Le socle ne possède pas encore le
routage transversal ARI de la phase 6.2.

## Nova

Responsabilités :

- maintenir la conversation utilisateur ;
- décider de répondre ou déléguer ;
- interpréter le résultat d’un agent ;
- borner le tour à huit cycles assistant et six exécutions AEL, puis réserver
  une synthèse finale sans nouvelle délégation ;
- produire la réponse finale.

Nova reçoit tous les messages visibles du tour dans le format JSON interne.

## Agent ACP

ID : `agent-acp`.

Mission :

- analyser une demande non triviale ;
- identifier un blocage ou une information manquante ;
- proposer une seule prochaine étape atomique ;
- recommander `agent-ael` ou aucune délégation.

Contraintes :

- aucun shell ;
- aucun appel direct à un autre agent ;
- aucune réponse finale utilisateur ;
- format textuel à labels stricts ;
- une seule étape, pas un plan complet.

ACP est un appel OpenAI distinct utilisant son `contexte.json`.

## Agent AEL

ID : `agent-ael`.

Mission :

- transformer un objectif en une commande adaptée à la plateforme, si besoin ;
- classifier la permission ;
- exécuter une commande locale ;
- remonter un résultat concis et des détails techniques ;
- journaliser l’échange.

Modes :

- `command` : commande déjà formée ;
- `goal` : génération d’une commande puis exécution ;
- `analysis` existe dans les types mais n’a pas de branche AEL spécifique ;
- `goal` est préféré pour les demandes de haut niveau.

## Cycle et mémoire

Pour un même tour, le registre mémorise l’ID de conversation interne par
agent. Plusieurs étapes du même agent peuvent donc continuer la même
conversation interne.

L’historique relie :

- conversation utilisateur ;
- message déclencheur ;
- conversation agent ;
- commande/requête ;
- résultat et statut.

## Activation

Chaque agent possède `settings.agents[agentId].enabled`.

- Un agent désactivé reste visible dans l’UI.
- Nova reçoit la liste des agents activés dans son prompt.
- Un handoff vers un agent désactivé est transformé en réponse d’erreur
  contrôlée.

## UI

- `AcpAgentPage` : général, activation, tâches actives, contexte.
- `AelAgentPage` : général, contexte, permissions, historique.
- `AgentsActivityView` : tâches actives globales et historique récent.

Les pages interrogent périodiquement le main. Elles ne lisent jamais
directement les fichiers agent.

## Conversations internes

L’orchestrateur crée les conversations internes nécessaires aux tâches et à
leur historique. Elles sont d’origine `assistant`, ne possèdent pas de
composer dédié et aucune API de conversation directe n’est exposée au
renderer.

## Identités et remise à zéro de phase 6.1

Les identifiants cibles sont exclusivement `agent-acp` et `agent-ael`, issus
d’un registre commun. Tous les noms techniques suivent ACP/AEL. Les anciens
identifiants, formats et données ne sont ni migrés ni conservés ; les espaces
sont recréés aux valeurs par défaut selon
[l’ADR 005](decisions/005-acp-ael-breaking-reset.md).

Les tâches sont définies dans [NEXT_STEPS.md](NEXT_STEPS.md). L’implémentation
attend la finalisation documentaire ; aucune donnée locale n’est supprimée
pendant cette préparation.

## Limites actuelles

- ACP et AEL utilisent le même modèle/configuration OpenAI que Nova.
- Pas de budget token ou coût par agent.
- Pas de structured output provider : respect du format par prompt.
- Pas de validation réelle du critère de succès d’ACP.
- Pas de récupération de tâche après redémarrage.
- Les opérations de stockage agent sont sérialisées par racine et agent.
- Policy AEL insuffisante comme frontière de sécurité.

## Ordre retenu

Finir la documentation, puis implémenter et valider ACP/AEL en phase 6.1,
ARI en phase 6.2 et ACA en phase 6.3. ARI reste transversal à Nova et à tous
les agents autorisés.

Un nouvel agent devra :

- avoir un ID ajouté aux types et settings ;
- avoir un contexte par défaut ;
- avoir une stratégie de prompt et parsing explicite ;
- être routé par Nova ;
- avoir une UI minimale d’état ;
- ne pas contourner le registre de tour ni les permissions.

## Documentation technique par agent

Chaque agent possède deux fichiers voisins : `XXX_SPECIFICATION.md` pour les
exigences métier et `XXX_SPECIFICATION_TECHNIQUE.md` pour les outils, contrats,
dépendances, appels aux agents et validation technique.

| Agent | Outil principal | Compagnon technique |
| --- | --- | --- |
| ACP | Modèle + parser de planification, sans outil d’action | [ACP](agents_specification/ACP_SPECIFICATION_TECHNIQUE.md) |
| AEL | Terminal local via le main | [AEL](agents_specification/AEL_SPECIFICATION_TECHNIQUE.md) |
| ARI | Scrapers et transport HTTP contrôlés, rendu Electron isolé | [ARI](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md) |
| ACA | Services de génération, compilation, tests et activation de connecteurs | [ACA](agents_specification/ACA_SPECIFICATION_TECHNIQUE.md) |

Les compagnons distinguent existant, décidé, proposé et à préciser. Le code
reste inchangé pendant leur relecture. Les choix techniques d’ARI/ACA ne sont
pas considérés validés par la seule existence de ces fichiers.

## Relations entre agents

| Demandeur | Destination | Usage et disponibilité |
| --- | --- | --- |
| Nova | ACP, AEL | Analyse et action locale, socle existant à renommer |
| ACP | AEL | Recommandation d’étape que Nova décide d’exécuter, socle existant |
| Nova, ACP, AEL | ARI | Recherche documentaire, prévue en phase 6.2 |
| ACA et agents spécialisés autorisés | ARI | Documentation ou complément d’information, après leur implémentation |
| Nova | ACA | Création cadrée selon le workflow d’autorisation, phase 6.3 |
| ARI | Demandeur | Retour de résultat via Nova ; aucune nouvelle tâche agent |

Les autres relations ne sont pas implicitement autorisées. En particulier,
ARI n’utilise pas AEL pour scraper, et ACA n’utilise pas AEL comme remplacement
de son environnement d’exécution isolé. Si un agent ne peut pas finir, il
retourne le blocage à Nova, qui décide de la suite.

## Contrat technique de délégation proposé

Ce contrat concerne les nouvelles délégations de phase 6.2/6.3. Il ne décrit
pas une API déjà disponible ni une extension à coder pendant le renommage 6.1.

L’orchestrateur du main construit et valide une enveloppe comprenant :

- `delegationId`, `turnId`, `parentTaskId`, conversation et message d’origine ;
- `originatorId` : origine de la tâche racine ;
- `requesterAgentId` : agent qui demande effectivement ce travail, ou `nova` ;
- `targetAgentId`, capacité demandée et objectif borné ;
- contexte utile expurgé, URLs ou références de résultats si nécessaires ;
- échéance héritée, budgets restants et référence d’annulation.

Les identités proviennent des tâches enregistrées par le main. Le modèle ne
peut ni les choisir ni usurper un autre agent dans le texte de sa demande.
Le passage par Nova ne transforme pas une demande d’ACP, AEL ou ACA en demande
propre de Nova pour obtenir ses autorisations.

Avant lancement, le main contrôle activation, capacité autorisée, droits du
demandeur, absence de boucle et budget. Le courtier Credentials vérifie les
ACL de l’agent demandeur effectif et les restrictions héritées de l’origine ;
les droits d’ARI ou du relais Nova ne remplacent jamais ces contrôles.

Le résultat contient l’identifiant de délégation, un statut terminal, les
données typées de la capacité, les budgets consommés et les diagnostics
expurgés. Le main le rattache au parent et décide de sa reprise. Un retour de
résultat ne peut pas créer une nouvelle tâche à lui seul.

Proposition initiale à valider : une seule sous-tâche active par parent,
refus d’une destination déjà présente dans la chaîne et délai enfant limité
au temps restant du parent. L’attente utilisateur suit une règle explicite ;
une délégation ne remet pas les compteurs à zéro. L’arrêt du parent annule
les appels, attentes et opérations des enfants.

À préciser avec ARI : schéma exact de l’enveloppe, profondeur maximale, budgets
communs, état d’attente du parent et tests de reprise. Avec ACA : persistance
des sous-tâches et comportement après redémarrage sans rejouer un effet externe.
