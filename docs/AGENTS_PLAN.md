# Architecture des agents

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

Nova reste l’unique orchestrateur. Les agents ne s’appellent pas entre eux.
Le registre partagé `src/shared/system-agent.registry.ts` centralise leurs IDs,
acronymes, libellés, capacités, outils et contextes par défaut.

Les références fonctionnelles et techniques de chaque agent sont indexées dans
[agents_specification/README.md](agents_specification/README.md). Les documents
ACP/AEL décrivent le code existant ; les documents ARI/ACA séparent les choix
retenus de ceux qui bloquent encore leur implémentation.

## Nova

Responsabilités :

- maintenir la conversation utilisateur ;
- décider de répondre ou déléguer ;
- interpréter le résultat d’un agent ;
- borner le tour à huit cycles assistant et six exécutions AEL ;
- réserver un cycle final sans délégation lorsque le budget est atteint ;
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

L’ACP est un appel OpenAI distinct utilisant son `contexte.json`.

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

- `ACPAgentPage` : général, activation, tâches actives, contexte.
- `AELAgentPage` : général, contexte, permissions, historique.
- `AgentsActivityView` : tâches actives globales et historique récent.

Les pages interrogent périodiquement le main. Elles ne lisent jamais
directement les fichiers agent.

## Conversations internes

L’orchestrateur crée les conversations internes nécessaires aux tâches et à
leur historique. Elles sont d’origine `assistant`, ne possèdent pas de
composer dédié et aucune API de conversation directe n’est exposée au
renderer.

## Identités canoniques

Seuls `agent-acp` et `agent-ael` sont acceptés dans les contrats, settings,
messages et chemins. Les anciens espaces de développement ne sont pas migrés :
ils doivent être supprimés après confirmation explicite, sans toucher aux
paramètres généraux ni au secret OpenAI.

La décision, son périmètre de données final et l’unique tolérance réservée aux
messages historiques sont consignés dans
[l’ADR 005](decisions/005-acp-ael-breaking-reset.md).

## Limites actuelles

- ACP et AEL utilisent le même modèle/configuration OpenAI que Nova.
- Pas de budget token ou coût par agent.
- Pas de structured output provider : respect du format par prompt.
- Pas de validation réelle du critère de succès d’ACP.
- Pas de récupération de tâche après redémarrage.
- Policy AEL insuffisante comme frontière de sécurité.

## Direction recommandée

La phase 6.1 est close après le nettoyage local confirmé et le test manuel
ACP/AEL. Relire ensemble les cahiers fonctionnel et technique ARI, résoudre les
choix techniques puis découper 6.2 en tâches vérifiables. ACA vient seulement
après la validation d’ARI et la validation de sa propre frontière d’exécution.

Un nouvel agent devra :

- avoir un ID et ses métadonnées ajoutés au registre partagé ;
- dériver ses types, settings et validations de ce registre ;
- avoir un contexte par défaut ;
- avoir une stratégie de prompt et parsing explicite ;
- être routé par Nova ;
- avoir une UI minimale d’état ;
- ne pas contourner le registre de tour ni les permissions.

## Références techniques par agent

Chaque agent possède un cahier fonctionnel et un compagnon technique. Les
documents ACP/AEL décrivent l’existant ; ARI/ACA restent des conceptions à
valider avant implémentation.

| Agent | Outil principal | Spécification technique |
| --- | --- | --- |
| ACP | Modèle et parser de cadrage, sans outil d’action | [ACP](agents_specification/ACP_SPECIFICATION_TECHNIQUE.md) |
| AEL | Terminal local contrôlé par le `main` | [AEL](agents_specification/AEL_SPECIFICATION_TECHNIQUE.md) |
| ARI | HTTP contrôlé, extraction de documents et rendu Electron isolé | [ARI](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md) |
| ACA | Génération, compilation, tests et activation de connecteurs | [ACA](agents_specification/ACA_SPECIFICATION_TECHNIQUE.md) |

## Relations entre agents

| Demandeur | Destination | Usage et disponibilité |
| --- | --- | --- |
| Nova | ACP, AEL | Cadrage et action locale, implémentés |
| ACP | AEL | Recommandation d’une étape que Nova décide d’exécuter, implémentée |
| Nova, ACP, AEL | ARI | Recherche documentaire via l’orchestrateur, à construire en phase 6.2 |
| ACA et agents spécialisés autorisés | ARI | Documentation ou complément d’information après leur implémentation |
| Nova | ACA | Création cadrée et confirmée, prévue en phase 6.3 |
| ARI | Demandeur initial | Retour du dossier sourcé via Nova, sans nouvelle délégation automatique |

Les agents ne s’appellent jamais directement. Une relation autorisée signifie
que le demandeur remet une requête structurée au `main`; celui-ci vérifie les
droits, crée la tâche cible et rattache son résultat au parent. ARI n’utilise
pas AEL pour scraper et ACA n’utilise pas AEL comme substitut à son futur
environnement d’exécution isolé.

## Contrat technique de délégation proposé

Ce contrat prépare les phases 6.2 et 6.3. Il ne décrit pas une API déjà
disponible et ne doit pas être ajouté implicitement au socle ACP/AEL.

L’orchestrateur du `main` construira et validera une enveloppe contenant au
minimum :

- `delegationId`, `turnId`, `parentTaskId`, conversation et message d’origine ;
- `originatorId`, identité de la tâche racine ;
- `requesterAgentId`, agent qui demande réellement le travail, ou `nova` ;
- `targetAgentId`, capacité demandée et objectif borné ;
- contexte expurgé, URL ou références de résultats strictement nécessaires ;
- échéance héritée, budgets restants et référence d’annulation.

Les identités proviennent des tâches enregistrées par le `main`. Un modèle ne
peut ni les choisir dans son texte ni emprunter les droits de Nova, d’ARI ou
d’un autre agent. Avant lancement, le `main` contrôle l’activation, la
capacité autorisée, les droits du demandeur effectif, l’absence de boucle, le
budget et le temps restant. Le courtier Credentials vérifie les ACL de ce même
demandeur, même lorsque la recherche est exécutée par ARI.

Le résultat contient l’identifiant de délégation, un statut terminal, les
données typées de la capacité, les budgets consommés et des diagnostics
expurgés. Le `main` le rattache au parent ; le simple retour d’un résultat ne
peut pas créer une nouvelle tâche.

La proposition initiale limite un parent à une sous-tâche active, refuse une
destination déjà présente dans la chaîne et borne l’enfant au temps restant
du parent. Une délégation ne remet aucun compteur à zéro. L’arrêt du parent
annule les appels, attentes et opérations encore annulables de ses enfants.

La phase 6.2 devra figer le schéma exact, la profondeur, les budgets, l’état
d’attente du parent et les tests d’annulation/reprise. La phase 6.3 devra en
plus définir la persistance des sous-tâches sans jamais rejouer
automatiquement un effet externe incertain après redémarrage.
