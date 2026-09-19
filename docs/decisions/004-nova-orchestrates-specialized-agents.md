# ADR 004 - Nova orchestre des agents spécialisés

## Statut

Acceptée et implémentée.

## Contexte

Nova doit pouvoir analyser une demande non triviale et agir sur la machine
sans confondre conversation utilisateur, planification et exécution locale.

Donner à chaque agent une autonomie d’orchestration complète compliquerait :

- le suivi d’un tour ;
- l’arrêt global ;
- les permissions ;
- la traçabilité ;
- la production d’une réponse finale cohérente.

## Décision

Nova, l’assistant principal, reste l’unique orchestrateur.

- `agent-acp` recommande au plus une prochaine étape atomique.
- `agent-ael` prépare ou exécute une action locale atomique.
- Les agents ne s’appellent pas directement entre eux.
- Tout handoff passe par le main et le registre de tour.
- Le résultat d’un agent revient à Nova avant une éventuelle nouvelle étape.
- Les identités et métadonnées système proviennent du registre partagé.
- Un tour principal est limité à huit cycles assistant et six exécutions AEL,
  puis dispose d’une synthèse finale sans nouvelle délégation.

## Conséquences positives

- contrôle centralisé des permissions et arrêts ;
- conversations internes traçables ;
- prompts spécialisés ;
- UI capable d’afficher les tâches actives ;
- boucle et responsabilités compréhensibles.

## Conséquences négatives

- l’orchestrateur principal concentre beaucoup de logique ;
- chaque étape agent ajoute un appel provider et de la latence ;
- la qualité du routage dépend encore de prompts et heuristiques ;
- le format d’ACP doit être parsé et peut être invalide.

## Garde-fous

- Un nouvel agent doit être routé par Nova.
- Il doit s’enregistrer dans le registre de tour.
- Il ne doit pas contourner la policy et les permissions AEL.
- Son résultat doit être représentable comme message Nova.
- Les tâches longues doivent être annulables.
