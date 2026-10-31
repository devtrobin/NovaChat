# Index Providers — préparation de la phase 7

Révision du 30 octobre 2026 contre le code de NovaChat. Seul OpenAI est
implémenté. Ce dossier prépare une évolution future ; il ne fournit ni
connecteur Mistral/Ollama activé, ni migration exécutable, ni preuve de tests
de ces connecteurs.

## Parcours de lecture

| Document | Rôle |
| --- | --- |
| [README.md](README.md) | état réel, périmètre et vocabulaire |
| [PROVIDERS_PLAN.md](PROVIDERS_PLAN.md) | architecture cible, contrats, secrets et changement de provider |
| [MISTRAL_SPECIFICATION.md](MISTRAL_SPECIFICATION.md) | adaptation HTTP Mistral et Ollama, formats et erreurs |
| [MISTRAL_IMPLEMENTATION_PLAN.md](MISTRAL_IMPLEMENTATION_PLAN.md) | tâches futures, dépendances et critères de sortie |
| [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | stratégie additive à implémenter et qualifier |
| [CONFIGURATION_EXAMPLES.md](CONFIGURATION_EXAMPLES.md) | fragments JSON actuels et proposés, sans secret |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | matrice de validation à réaliser |
| [OLLAMA_SETUP_GUIDE.md](OLLAMA_SETUP_GUIDE.md) | préparation manuelle d'Ollama et futur parcours NovaChat |
| [MISTRAL_CLOUD_GUIDE.md](MISTRAL_CLOUD_GUIDE.md) | préparation d'un compte et futur parcours Mistral |

Les noms historiques des fichiers MISTRAL de plan et de spécification sont
conservés pour les liens ; leur périmètre inclut un connecteur Ollama générique.

## Références du projet

- [État opérationnel](../PROJECT_STATE.md) et [risques](../RISKS.md).
- [Ordre de travail](../NEXT_STEPS.md) : ARI 6.2, ACA 6.3, puis phase 7.
- [Architecture actuelle](../ARCHITECTURE.md) et [modèle de données](../DATA_MODEL.md).
- [Consignes de reprise](../../AGENTS.md).

Les tâches ARI déjà approuvées restent la référence. La correction documentaire
des providers n'ouvre pas leur implémentation et ne clôt aucune phase.

## Sources externes

Les références précises sont données dans la spécification et les guides.
Les endpoints et paramètres ont été revérifiés le 30 octobre 2026 dans les
documentations officielles Mistral et Ollama. Versions, modèles disponibles,
capacités, licences et besoins matériels devront être vérifiés de nouveau
au début de l'implémentation. Aucune estimation de couverture ou de délai
ne remplace une preuve de qualification.
