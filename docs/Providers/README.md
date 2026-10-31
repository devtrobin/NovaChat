# Providers — préparation de la phase 7

Révision du 30 octobre 2026. Ce dossier décrit une cible à implémenter après
ARI (6.2) et ACA (6.3). La demande actuelle porte sur la documentation.

## État réellement disponible

| Élément | État |
| --- | --- |
| OpenAI Responses API | implémenté dans le main |
| Clé OpenAI | coffre chiffré séparé, jamais retournée au renderer |
| Mistral, Ollama, Anthropic, Google, LM Studio | catalogue planifié, non activable |
| Connecteurs Mistral/Ollama, sélection multi-provider | non implémentés |
| Migration et tests propres à ces connecteurs | à développer et qualifier |

Les identifiants actuels sont `openai`, `anthropic`, `google`, `lmstudio`,
`mistral` et `ollama` dans `src/shared/settings.types.ts`. Seul `openai`
appartient à `ActiveAIProviderId`.

## Conception retenue pour cette préparation

- `mistral` désigne le connecteur vers l'API Mistral.
- `ollama` désigne un connecteur Ollama générique ; Mistral est une famille
  de modèles sélectionnable, pas un autre provider.
- Les anciens noms proposés `mistral-cloud` et `mistral-ollama` ne sont pas
  des identifiants actifs à migrer. Le code ne les a jamais acceptés.
- Tous les transports et secrets restent dans `src/main/ai` et les services
  main existants. Le renderer utilise uniquement le preload.
- Les messages Nova et les permissions AEL, dont `write-file`, sont conservés.
- La configuration OpenAI et son coffre sont préservés. Une extension additive
  est proposée pour les nouveaux connecteurs, sans déplacement de la clé.
- La première livraison décrite ici utilise des réponses non streamées.
  Le chantier de streaming global reste distinct.

Les propositions de contrats, de schéma et d'IPC restent à implémenter, typer,
valider et tester. Cette préparation n'atteste aucun support multi-provider
dans l'application actuelle.

## Lecture et ordre de travail

Commencer par [l'architecture cible](PROVIDERS_PLAN.md), puis
[la spécification HTTP](MISTRAL_SPECIFICATION.md),
[les tâches futures](MISTRAL_IMPLEMENTATION_PLAN.md) et
[la matrice de validation](TESTING_GUIDE.md).
[L'index](INDEX.md) relie les exemples, la migration et les guides préparatoires.

[L'ordre global](../NEXT_STEPS.md) prime : prochaine tâche d'implémentation
ARI 6.2.2, puis qualification complète d'ARI et d'ACA avant la phase 7.
La documentation des providers peut être entretenue sans démarrer ces travaux.
