# Plan d'Implémentation - Mistral AI
**NovaChat** | *Providers Extension*

---

## 📌 Résumé

Ce document décrit le **plan d'implémentation par phases** pour intégrer **Mistral AI** (local via Ollama et distant via API) dans NovaChat, en suivant le même format que la documentation des agents.

**Objectif** : Permettre aux utilisateurs de sélectionner Mistral AI comme provider alternatif à OpenAI, avec support complet pour les écrans de configuration dans `Paramètres > Providers`.

---

## 🎯 Portée

### Inclus
✅ **Mistral Cloud** : Intégration complète de l'API Mistral AI (distant)
✅ **Mistral Ollama** : Intégration complète avec Ollama (local)
✅ **Écrans de configuration** : UI complète dans `Paramètres > Providers`
✅ **Système de providers** : Refactorisation de l'architecture pour supporter plusieurs providers
✅ **Sécurité** : Chiffrement des clés, validation des configurations
✅ **Tests** : Couverture complète des nouveaux fonctionnalités
✅ **Documentation** : Mise à jour de la documentation existante

### Exclus
❌ Autres providers (Anthropic, Google, LM Studio) - à faire ultérieurement
❌ Fonctionnalités spécifiques à Mistral non disponibles dans l'API standard
❌ Optimisations avancées (streaming, batch processing) - phase future

---

## 📅 Phases d'Implémentation

---

### 🔹 **Phase 1 : Préparation et Architecture**
**Durée estimée** : 1-2 jours
**Priorité** : ⭐⭐⭐⭐⭐
**Responsable** : Thomas

#### Objectifs
- Comprendre l'architecture existante des providers
- Définir l'interface commune pour tous les providers
- Créer le Provider Manager
- Préparer la structure des fichiers

#### Tâches

| ID | Tâche | Complexité | Dépendances | Validation |
|----|-------|------------|-------------|------------|
| **P1.1** | Lire et analyser le code existant lié à OpenAI | ⭐ | Aucune | ✅ Compréhension complète |
| **P1.2** | Définir l'interface `AIProvider` | ⭐⭐ | P1.1 | ✅ Interface validée |
| **P1.3** | Créer la classe `ProviderManager` | ⭐⭐⭐ | P1.2 | ✅ Tests unitaires passants |
| **P1.4** | Adapter le provider OpenAI existant à la nouvelle interface | ⭐⭐ | P1.3 | ✅ Fonctionnalité préservée |
| **P1.5** | Créer la structure de configuration pour les providers | ⭐⭐ | P1.2 | ✅ Schéma validé |
| **P1.6** | Mettre à jour `settings.json` avec la nouvelle structure | ⭐ | P1.5 | ✅ Migration testée |

#### Livrables
- [ ] `src/main/providers/ai-provider.interface.ts`
- [ ] `src/main/providers/provider-manager.ts`
- [ ] `src/main/providers/openai-provider.ts` (adapté)
- [ ] Mise à jour de `src/shared/types/settings.ts`
- [ ] Tests unitaires pour le Provider Manager

#### Critères de succès
- ✅ Le Provider Manager est fonctionnel
- ✅ OpenAI fonctionne toujours avec la nouvelle architecture
- ✅ Tous les tests existants passent
- ✅ Aucune régression fonctionnelle

---

### 🔹 **Phase 2 : Implémentation de Mistral Cloud**
**Durée estimée** : 2-3 jours
**Priorité** : ⭐⭐⭐⭐⭐
**Responsable** : Thomas

#### Objectifs
- Implémenter le provider Mistral Cloud
- Intégrer avec le Provider Manager
- Tester la connexion et les fonctionnalités de base

#### Tâches

| ID | Tâche | Complexité | Dépendances | Validation |
|----|-------|------------|-------------|------------|
| **P2.1** | Créer `MistralCloudProvider` selon l'interface | ⭐⭐⭐ | Phase 1 | ✅ Implémentation complète |
| **P2.2** | Implémenter `sendRequest()` pour Mistral Cloud | ⭐⭐⭐ | P2.1 | ✅ Réponses valides |
| **P2.3** | Implémenter `validateConfig()` | ⭐⭐ | P2.1 | ✅ Validation correcte |
| **P2.4** | Implémenter `testConnection()` | ⭐⭐ | P2.1 | ✅ Test fonctionnel |
| **P2.5** | Implémenter `getAvailableModels()` | ⭐⭐ | P2.1 | ✅ Liste des modèles |
| **P2.6** | Ajouter Mistral Cloud au Provider Manager | ⭐ | P2.1 | ✅ Enregistrement OK |
| **P2.7** | Chiffrer la clé API avec `electron.safeStorage` | ⭐⭐⭐ | P2.1 | ✅ Clé sécurisée |
| **P2.8** | Tester avec une vraie clé API Mistral | ⭐⭐ | P2.1-P2.7 | ✅ Connexion réussie |

#### Livrables
- [ ] `src/main/providers/mistral-cloud-provider.ts`
- [ ] Tests unitaires pour Mistral Cloud
- [ ] Documentation technique mise à jour

#### Critères de succès
- ✅ Mistral Cloud répond correctement aux requêtes
- ✅ La clé API est correctement chiffrée
- ✅ Les erreurs sont gérées proprement
- ✅ Les tokens sont comptabilisés
- ✅ Test de connexion fonctionnel

---

### 🔹 **Phase 3 : Implémentation de Mistral Ollama**
**Durée estimée** : 2-3 jours
**Priorité** : ⭐⭐⭐⭐⭐
**Responsable** : Thomas

#### Objectifs
- Implémenter le provider Mistral Ollama
- Détecter automatiquement les modèles disponibles
- Tester avec Ollama local

#### Tâches

| ID | Tâche | Complexité | Dépendances | Validation |
|----|-------|------------|-------------|------------|
| **P3.1** | Créer `MistralOllamaProvider` selon l'interface | ⭐⭐⭐ | Phase 1 | ✅ Implémentation complète |
| **P3.2** | Implémenter `sendRequest()` pour Ollama | ⭐⭐⭐ | P3.1 | ✅ Réponses valides |
| **P3.3** | Implémenter `validateConfig()` | ⭐⭐ | P3.1 | ✅ Validation correcte |
| **P3.4** | Implémenter `testConnection()` | ⭐⭐⭐ | P3.1 | ✅ Vérification Ollama + modèle |
| **P3.5** | Implémenter `getAvailableModels()` avec détection dynamique | ⭐⭐⭐ | P3.1 | ✅ Liste mise à jour |
| **P3.6** | Ajouter Mistral Ollama au Provider Manager | ⭐ | P3.1 | ✅ Enregistrement OK |
| **P3.7** | Gérer les erreurs spécifiques à Ollama | ⭐⭐ | P3.1 | ✅ Messages clairs |
| **P3.8** | Tester avec Ollama local et différents modèles | ⭐⭐ | P3.1-P3.7 | ✅ Fonctionnel |

#### Livrables
- [ ] `src/main/providers/mistral-ollama-provider.ts`
- [ ] Tests unitaires pour Mistral Ollama
- [ ] Scripts de test pour Ollama

#### Critères de succès
- ✅ Mistral Ollama répond correctement
- ✅ Détection automatique des modèles
- ✅ Gestion des erreurs (Ollama non démarré, modèle manquant)
- ✅ Compatible avec différents modèles Mistral

---

### 🔹 **Phase 4 : UI - Écrans de Configuration**
**Durée estimée** : 3-4 jours
**Priorité** : ⭐⭐⭐⭐
**Responsable** : Thomas

#### Objectifs
- Créer les écrans de configuration dans `Paramètres > Providers`
- Permettre la sélection et la configuration des providers
- Afficher les statuts et erreurs

#### Tâches

| ID | Tâche | Complexité | Dépendances | Validation |
|----|-------|------------|-------------|------------|
| **P4.1** | Créer la page principale `ProvidersSettingsPage` | ⭐⭐⭐ | Phase 1-3 | ✅ Structure de base |
| **P4.2** | Implémenter le sélecteur de provider actif | ⭐⭐ | P4.1 | ✅ Changement OK |
| **P4.3** | Créer le composant `OpenAISettingsTab` | ⭐⭐ | P4.1 | ✅ Fonctionnel |
| **P4.4** | Créer le composant `MistralCloudSettingsTab` | ⭐⭐⭐ | P4.1, P2 | ✅ Tous les champs |
| **P4.5** | Créer le composant `MistralOllamaSettingsTab` | ⭐⭐⭐ | P4.1, P3 | ✅ Tous les champs |
| **P4.6** | Ajouter la gestion des clés API chiffrées dans l'UI | ⭐⭐⭐ | P4.1 | ✅ Sécurisé |
| **P4.7** | Implémenter le bouton "Tester la connexion" | ⭐⭐⭐ | P4.1 | ✅ Feedback visuel |
| **P4.8** | Ajouter la liste des modèles disponibles | ⭐⭐ | P4.1 | ✅ Dropdown fonctionnel |
| **P4.9** | Gérer les erreurs et afficher les messages | ⭐⭐ | P4.1 | ✅ Messages clairs |
| **P4.10** | Implémenter le rafraîchissement des modèles | ⭐⭐ | P4.1 | ✅ Mise à jour OK |
| **P4.11** | Ajouter des tooltips et documentation contextuelle | ⭐ | P4.1 | ✅ Aide intégrée |

#### Livrables
- [ ] `src/renderer/components/settings/ProvidersSettingsPage.tsx`
- [ ] `src/renderer/components/settings/OpenAISettingsTab.tsx`
- [ ] `src/renderer/components/settings/MistralCloudSettingsTab.tsx`
- [ ] `src/renderer/components/settings/MistralOllamaSettingsTab.tsx`
- [ ] `src/renderer/components/common/ProviderSelector.tsx`
- [ ] `src/renderer/components/common/TestConnectionButton.tsx`
- [ ] Styles CSS/SCSS pour les nouveaux composants

#### Critères de succès
- ✅ Sélection du provider fonctionnelle
- ✅ Configuration complète de chaque provider
- ✅ Test de connexion avec feedback visuel
- ✅ Gestion des erreurs propre
- ✅ UI cohérente avec le reste de l'application

---

### 🔹 **Phase 5 : Intégration et Adaptation**
**Durée estimée** : 2-3 jours
**Priorité** : ⭐⭐⭐⭐
**Responsable** : Thomas

#### Objectifs
- Intégrer les nouveaux providers avec l'orchestrateur
- Adapter Nova et les agents pour utiliser les nouveaux providers
- Tester l'intégration complète

#### Tâches

| ID | Tâche | Complexité | Dépendances | Validation |
|----|-------|------------|-------------|------------|
| **P5.1** | Adapter Nova pour utiliser le Provider Manager | ⭐⭐⭐ | Phase 1-4 | ✅ Fonctionnel |
| **P5.2** | Adapter ACP pour utiliser les nouveaux providers | ⭐⭐ | P5.1 | ✅ Tests passants |
| **P5.3** | Adapter AEL pour utiliser les nouveaux providers | ⭐⭐ | P5.1 | ✅ Tests passants |
| **P5.4** | Mettre à jour les messages système pour Mistral | ⭐⭐ | P5.1 | ✅ Prompts adaptés |
| **P5.5** | Tester les workflows complets avec Mistral | ⭐⭐⭐ | P5.1 | ✅ Tout fonctionne |
| **P5.6** | Adapter le système de permissions pour les nouveaux providers | ⭐⭐ | P5.1 | ✅ Sécurisé |
| **P5.7** | Mettre à jour les logs pour inclure le provider utilisé | ⭐ | P5.1 | ✅ Traçabilité |

#### Livrables
- [ ] Modifications dans `src/main/nova/` (orchestrateur)
- [ ] Mises à jour des prompts système
- [ ] Tests d'intégration

#### Critères de succès
- ✅ Nova fonctionne avec Mistral Cloud et Mistral Ollama
- ✅ ACP et AEL fonctionnent avec les nouveaux providers
- ✅ Aucune régression sur OpenAI
- ✅ Logging complet

---

### 🔹 **Phase 6 : Tests et Validation**
**Durée estimée** : 2-3 jours
**Priorité** : ⭐⭐⭐⭐
**Responsable** : Thomas

#### Objectifs
- Tester exhaustivement toutes les fonctionnalités
- Valider la sécurité et la robustesse
- Préparer la documentation utilisateur

#### Tâches

| ID | Tâche | Complexité | Dépendances | Validation |
|----|-------|------------|-------------|------------|
| **P6.1** | Écrire des tests unitaires pour Mistral Cloud | ⭐⭐ | Phase 2 | ✅ 90%+ couverture |
| **P6.2** | Écrire des tests unitaires pour Mistral Ollama | ⭐⭐ | Phase 3 | ✅ 90%+ couverture |
| **P6.3** | Écrire des tests d'intégration pour les providers | ⭐⭐⭐ | Phase 5 | ✅ Scénarios complets |
| **P6.4** | Tester la migration depuis l'ancienne configuration | ⭐⭐ | Phase 1 | ✅ Données préservées |
| **P6.5** | Tester la sécurité (chiffrement, validation) | ⭐⭐⭐ | Phase 1-5 | ✅ Aucune faille |
| **P6.6** | Tester les erreurs et edge cases | ⭐⭐⭐ | Phase 1-5 | ✅ Tout géré |
| **P6.7** | Valider les performances | ⭐⭐ | Phase 1-5 | ✅ Acceptable |
| **P6.8** | Tester sur différents environnements (Windows, macOS, Linux) | ⭐⭐⭐ | Phase 1-5 | ✅ Compatible |
| **P6.9** | Rédiger la documentation utilisateur | ⭐⭐ | Phase 1-5 | ✅ Complète |
| **P6.10** | Mettre à jour le README et la documentation technique | ⭐ | Phase 1-5 | ✅ À jour |

#### Livrables
- [ ] Suite de tests complète (Vitest)
- [ ] Rapport de validation
- [ ] Documentation utilisateur
- [ ] Guide de migration

#### Critères de succès
- ✅ Tous les tests passent
- ✅ Aucune régression fonctionnelle
- ✅ Sécurité validée
- ✅ Documentation complète

---

### 🔹 **Phase 7 : Finalisation et Déploiement**
**Durée estimée** : 1-2 jours
**Priorité** : ⭐⭐⭐
**Responsable** : Thomas

#### Objectifs
- Finaliser l'implémentation
- Packager et tester l'application
- Préparer la livraison

#### Tâches

| ID | Tâche | Complexité | Dépendances | Validation |
|----|-------|------------|-------------|------------|
| **P7.1** | Revoir et nettoyer le code | ⭐⭐ | Phase 6 | ✅ Code propre |
| **P7.2** | Optimiser les performances si nécessaire | ⭐ | Phase 6 | ✅ Efficace |
| **P7.3** | Packager l'application avec les nouveaux providers | ⭐⭐ | Phase 6 | ✅ Package valide |
| **P7.4** | Tester le package final | ⭐⭐⭐ | P7.3 | ✅ Fonctionnel |
| **P7.5** | Mettre à jour le CHANGELOG | ⭐ | Phase 6 | ✅ À jour |
| **P7.6** | Préparer les notes de release | ⭐ | Phase 6 | ✅ Prêt |
| **P7.7** | Faire un audit final | ⭐⭐⭐ | Phase 6 | ✅ Tout validé |

#### Livrables
- [ ] Package NovaChat avec support Mistral
- [ ] CHANGELOG mis à jour
- [ ] Notes de release
- [ ] Rapport d'audit final

#### Critères de succès
- ✅ Application packagée et fonctionnelle
- ✅ Tous les tests passent
- ✅ Documentation complète
- ✅ Prêt pour la livraison

---

## 📊 Planning Global

| Phase | Durée | Début | Fin | Statut |
|-------|-------|-------|-----|--------|
| Phase 1 | 1-2 jours | J1 | J2 | ⏳ À faire |
| Phase 2 | 2-3 jours | J3 | J5 | ⏳ À faire |
| Phase 3 | 2-3 jours | J6 | J8 | ⏳ À faire |
| Phase 4 | 3-4 jours | J9 | J12 | ⏳ À faire |
| Phase 5 | 2-3 jours | J13 | J15 | ⏳ À faire |
| Phase 6 | 2-3 jours | J16 | J18 | ⏳ À faire |
| Phase 7 | 1-2 jours | J19 | J20 | ⏳ À faire |
| **Total** | **13-20 jours** | - | - | - |

---

## 🎯 Priorités et Dépendances

### Diagramme de dépendances
```
Phase 1 (Architecture)
    ↓
Phase 2 (Mistral Cloud) --- Phase 3 (Mistral Ollama)
    ↓                       ↓
    Phase 4 (UI) ←─────────┘
        ↓
    Phase 5 (Intégration)
        ↓
    Phase 6 (Tests)
        ↓
    Phase 7 (Finalisation)
```

### Priorités par tâche
- **Critique (⭐⭐⭐⭐⭐)** : P1.1, P1.2, P1.3, P2.1, P2.2, P3.1, P3.2, P4.1, P4.2
- **Élevée (⭐⭐⭐⭐)** : Toutes les tâches des phases 1-5
- **Moyenne (⭐⭐⭐)** : Tâches de tests et documentation
- **Faible (⭐⭐)** : Optimisations et nettoyage

---

## 🔧 Outils et Ressources Nécessaires

### Développement
- Node.js 22+ (déjà installé)
- TypeScript 5.9+
- Electron 44+
- React 19+
- Vitest (pour les tests)

### Pour Mistral Cloud
- **Clé API Mistral** (à obtenir sur [mistral.ai](https://mistral.ai/))
- Documentation API : [docs.mistral.ai/api](https://docs.mistral.ai/api/)

### Pour Mistral Ollama
- **Ollama installé** (à télécharger sur [ollama.ai](https://ollama.ai/))
- **Modèles Mistral** téléchargés (`mistral:latest`, `mistral:7b`, etc.)
- Documentation : [github.com/ollama/ollama](https://github.com/ollama/ollama)

### Outils de test
- Postman / cURL (pour tester les APIs)
- Ollama CLI (pour gérer les modèles locaux)

---

## 📝 Conventions de Codage

### Nommage
- **Fichiers** : `kebab-case` (ex: `mistral-cloud-provider.ts`)
- **Classes** : `PascalCase` (ex: `MistralCloudProvider`)
- **Interfaces** : `PascalCase` avec préfixe `I` (ex: `IMistralCloudConfig`)
- **Variables** : `camelCase`
- **Constantes** : `UPPER_CASE`

### Organisation du code
```
src/
├── main/
│   └── providers/
│       ├── ai-provider.interface.ts      # Interface commune
│       ├── provider-manager.ts          # Gestionnaire de providers
│       ├── openai-provider.ts           # Provider OpenAI (existante, adaptée)
│       ├── mistral-cloud-provider.ts    # Provider Mistral Cloud
│       └── mistral-ollama-provider.ts    # Provider Mistral Ollama
│
└── renderer/
    └── components/
        └── settings/
            ├── ProvidersSettingsPage.tsx    # Page principale
            ├── OpenAISettingsTab.tsx        # Onglet OpenAI
            ├── MistralCloudSettingsTab.tsx   # Onglet Mistral Cloud
            └── MistralOllamaSettingsTab.tsx   # Onglet Mistral Ollama
```

### Gestion des erreurs
- **Toujours** utiliser des classes d'erreur personnalisées
- **Toujours** logger les erreurs (sans les clés API)
- **Toujours** fournir des messages utilisateur clairs

---

## 🚨 Risques et Atténuation

| Risque | Probabilité | Impact | Atténuation |
|--------|-------------|--------|-------------|
| **Changement d'API Mistral** | Moyenne | Élevé | Utiliser des interfaces flexibles, tests automatisés |
| **Incompatibilité Ollama** | Faible | Moyen | Tester avec plusieurs versions d'Ollama |
| **Problèmes de sécurité** | Faible | Critique | Revues de code, tests de sécurité |
| **Délais dépassés** | Moyenne | Moyen | Prioriser les tâches critiques, découper en sous-tâches |
| **Régressions sur OpenAI** | Moyenne | Élevé | Tests complets avant chaque commit |
| **Problèmes de chiffrement** | Faible | Élevé | Utiliser `electron.safeStorage`, tests spécifiques |
| **Incompatibilité cross-platform** | Moyenne | Moyen | Tester sur Windows, macOS, Linux |

---

## 📊 Métriques de Succès

### Fonctionnelles
- ✅ Mistral Cloud fonctionne avec une clé API valide
- ✅ Mistral Ollama fonctionne avec Ollama local
- ✅ Sélection du provider fonctionne
- ✅ Configuration de chaque provider fonctionne
- ✅ Test de connexion fonctionne
- ✅ OpenAI fonctionne toujours
- ✅ Aucune régression fonctionnelle

### Techniques
- ✅ 90%+ de couverture de code pour les nouveaux providers
- ✅ Tous les tests existants passent
- ✅ 0 vulnérabilités de sécurité (audit npm)
- ✅ Temps de réponse acceptable (< 5s pour une requête simple)

### Utilisateur
- ✅ UI intuitive et cohérente
- ✅ Messages d'erreur clairs
- ✅ Documentation complète
- ✅ Expérience utilisateur fluide

---

## 📚 Documentation à Produire

### Technique
- [ ] **Ce document** : Plan d'implémentation (✅ **En cours**)
- [ ] **PROVIDERS_PLAN.md** : Architecture globale (✅ **Fait**)
- [ ] **MISTRAL_SPECIFICATION.md** : Spécifications techniques (✅ **Fait**)
- [ ] **API Documentation** : Documentation des nouvelles APIs
- [ ] **Tests Documentation** : Documentation des tests

### Utilisateur
- [ ] **Guide de configuration Mistral Cloud**
- [ ] **Guide de configuration Mistral Ollama**
- [ ] **FAQ Mistral**
- [ ] **Guide de migration** (si nécessaire)

---

## 🎉 Critères d'Acceptation Finaux

1. **Fonctionnalité** :
   - [ ] Les utilisateurs peuvent sélectionner Mistral Cloud comme provider
   - [ ] Les utilisateurs peuvent sélectionner Mistral Ollama comme provider
   - [ ] La configuration de chaque provider fonctionne
   - [ ] Le test de connexion fonctionne
   - [ ] Les requêtes sont envoyées correctement
   - [ ] Les réponses sont affichées correctement
   - [ ] OpenAI fonctionne toujours

2. **UI/UX** :
   - [ ] Les écrans de configuration sont intuitifs
   - [ ] Les messages d'erreur sont clairs
   - [ ] L'expérience utilisateur est fluide
   - [ ] L'UI est cohérente avec le reste de l'application

3. **Sécurité** :
   - [ ] Les clés API sont chiffrées
   - [ ] Aucune clé API n'est exposée dans les logs ou l'UI
   - [ ] Les validations sont robustes
   - [ ] Aucune vulnérabilité de sécurité

4. **Qualité du code** :
   - [ ] Code propre et bien structuré
   - [ ] Commentaires appropriés
   - [ ] Tests unitaires complets
   - [ ] Tests d'intégration complets
   - [ ] Documentation technique complète

5. **Performance** :
   - [ ] Temps de réponse acceptable
   - [ ] Pas de fuites mémoire
   - [ ] Consommation CPU/RAM raisonnable

---

## 📞 Contacts et Support

- **Responsable technique** : Thomas (thomas.robin94@hotmail.fr)
- **Documentation Mistral** : [docs.mistral.ai](https://docs.mistral.ai/)
- **Documentation Ollama** : [github.com/ollama/ollama](https://github.com/ollama/ollama)

---

## 📅 Prochaines Étapes

1. **Valider ce plan** avec l'équipe
2. **Commencer la Phase 1** (Préparation et Architecture)
3. **Suivre la progression** avec des points réguliers
4. **Adapter le plan** si nécessaire en fonction des imprévus

---

**Statut** : ⏳ **En attente de validation**
**Version** : 1.0
**Date** : 30 octobre 2026
**Auteur** : Mistral Vibe (pour Thomas)

---

> ⚠️ **Note** : Ce plan suppose que vous avez **150K tokens restants**. Pour Mistral Medium 3.5, cela représente environ **375 000 mots** ou **150 000-200 000 tokens** selon le contexte. Ce plan est conçu pour être **complet mais concis**, et peut être adapté si nécessaire.
