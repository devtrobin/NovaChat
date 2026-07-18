# Architecture des agents

## État

Le système d’agents n’est plus un plan futur : deux agents spécialisés sont
implémentés et activés par défaut.

```text
Utilisateur
  -> Nova, assistant principal
  -> agent-planner (optionnel)
  -> device-agent (optionnel)
  -> Nova
  -> Utilisateur
```

Nova reste l’unique orchestrateur. Les agents ne s’appellent pas entre eux.

## Nova

Responsabilités :

- maintenir la conversation utilisateur ;
- décider de répondre ou déléguer ;
- interpréter le résultat d’un agent ;
- limiter le tour à quatre cycles ;
- produire la réponse finale.

Nova reçoit tous les messages visibles du tour dans le format JSON interne.

## Agent Planner

ID : `agent-planner`.

Mission :

- analyser une demande non triviale ;
- identifier un blocage ou une information manquante ;
- proposer une seule prochaine étape atomique ;
- recommander `device-agent` ou aucune délégation.

Contraintes :

- aucun shell ;
- aucun appel direct à un autre agent ;
- aucune réponse finale utilisateur ;
- format textuel à labels stricts ;
- une seule étape, pas un plan complet.

Le Planner est un appel OpenAI distinct utilisant son `contexte.json`.

## Agent Device

ID : `device-agent`.

Mission :

- transformer un objectif en une commande adaptée à la plateforme, si besoin ;
- classifier la permission ;
- exécuter une commande locale ;
- remonter un résultat concis et des détails techniques ;
- journaliser l’échange.

Modes :

- `command` : commande déjà formée ;
- `goal` : génération d’une commande puis exécution ;
- `analysis` existe dans les types mais n’a pas de branche Device spécifique ;
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

- `PlannerAgentPage` : général, activation, tâches actives, contexte.
- `DeviceAgentPage` : général, contexte, permissions, historique.
- `AgentsActivityView` : tâches actives globales et historique récent.

Les pages interrogent périodiquement le main. Elles ne lisent jamais
directement les fichiers agent.

## Conversations directes

Le backend permet une conversation directe d’origine `assistant-test`, mais
les pages actuelles n’exposent plus de composer ni de liste de conversations
internes. Cette surface doit être terminée ou supprimée.

## Compatibilité historique

L’ancien ID `diagnostic-agent` est converti vers Planner dans deux endroits :

- merge du flag d’activation ;
- parsing d’une réponse provider.

Les fichiers sous `agents/diagnostic-agent/` ne sont pas migrés. Une migration
de données explicite reste nécessaire.

## Limites actuelles

- Planner et Device utilisent le même modèle/configuration OpenAI que Nova.
- Pas de budget token ou coût par agent.
- Pas de structured output provider : respect du format par prompt.
- Pas de validation réelle du critère de succès du Planner.
- Pas de récupération de tâche après redémarrage.
- Pas de queue de stockage agent.
- Policy Device insuffisante comme frontière de sécurité.

## Direction recommandée

Avant tout troisième agent :

1. tests des formats et du cycle ;
2. sécurisation Device ;
3. robustesse de stockage ;
4. métriques coût/durée/statut ;
5. décision sur les conversations directes.

Un nouvel agent devra :

- avoir un ID ajouté aux types et settings ;
- avoir un contexte par défaut ;
- avoir une stratégie de prompt et parsing explicite ;
- être routé par Nova ;
- avoir une UI minimale d’état ;
- ne pas contourner le registre de tour ni les permissions.
