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
