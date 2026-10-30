# Documentation des Providers - NovaChat

## 📌 Introduction

Ce dossier centralise la **documentation technique et fonctionnelle** pour l'intégration des **providers d'IA** dans NovaChat. 

Actuellement, seul **OpenAI** est implémenté comme provider actif. Les autres providers (Mistral, Anthropic, Google, Ollama, LM Studio) sont visibles dans l'UI comme un **catalogue planifié**, mais **non sélectionnables** et **rejetés par la validation main**.

L'objectif est d'étendre NovaChat pour supporter **Mistral AI** (local via Ollama et distant via API), puis éventuellement d'autres providers.

---

## 🗂 Structure de la documentation

| Fichier | Description |
|---------|-------------|
| **[PROVIDERS_PLAN.md](PROVIDERS_PLAN.md)** | Architecture globale des providers, contrat technique, et intégration avec l'orchestrateur |
| **[MISTRAL_SPECIFICATION.md](MISTRAL_SPECIFICATION.md)** | Spécifications techniques détaillées pour Mistral AI (local + distant) |
| **[MISTRAL_IMPLEMENTATION_PLAN.md](MISTRAL_IMPLEMENTATION_PLAN.md)** | **Plan d'implémentation par phases** pour Mistral AI |

---

## 🎯 Objectifs

1. **Permettre la sélection de Mistral AI** comme provider alternatif à OpenAI
2. **Supporter deux modes** pour Mistral :
   - **Local** : via **Ollama** (modèles Mistral exécutés localement)
   - **Distant** : via l'**API Mistral AI** (cloud)
3. **Conserver l'architecture actuelle** :
   - Tous les appels provider passent par le **process Electron `main`**
   - Le **renderer** communique uniquement via l'API minimale exposée dans `src/preload.ts`
   - Les **messages structurés** (`from`, `to`, `agentId`, `status`) restent le contrat entre UI, orchestration et stockage
4. **Intégrer les écrans de configuration** dans `Paramètres > Providers`

---

## 📝 Conventions

- **Noms des providers** : Utiliser les identifiants canoniques (`mistral-ollama` pour local, `mistral-cloud` pour distant)
- **Configuration** : Stocker dans `settings.json` sous `settings.providers[providerId]`
- **Sécurité** : Les clés API doivent être **chiffrées** via `electron.safeStorage` (comme pour OpenAI)
- **Validation** : Tout provider non implémenté doit être **désactivé dans l'UI** et **rejeté par le main**

---

## 🔗 Liens utiles

- [Architecture globale de NovaChat](../ARCHITECTURE.md)
- [État du projet](../PROJECT_STATE.md)
- [Spécifications des agents](../AGENTS_PLAN.md)
- [Documentation Mistral AI](https://docs.mistral.ai/)
- [Documentation Ollama](https://github.com/ollama/ollama)

---

## ⚠️ Points de vigilance

1. **Ne pas contourner le main** : Le renderer ne doit **jamais** appeler directement un provider
2. **Gestion des erreurs** : Prévoir des messages clairs pour les erreurs spécifiques (ex: Ollama non installé, modèle non téléchargé)
3. **Compatibilité** : Vérifier que les réponses des providers respectent le format attendu par Nova
4. **Sécurité** : Les clés API et configurations sensibles ne doivent **jamais** être exposées au renderer
