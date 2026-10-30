# Architecture des Providers - NovaChat

## 📋 État actuel

### Provider implémenté
- **OpenAI** (ID: `openai`) : **Fonctionnel** et actif par défaut
  - Utilise la **Responses API** (`/v1/responses`)
  - Clé API chiffrée via `electron.safeStorage`
  - Configuration stockée dans `settings.openai.model` et `settings.openai.baseUrl`

### Providers visibles (catalogue planifié)
Les identifiants suivants sont **visibles dans l'UI** mais **non implémentés** :
- `anthropic`
- `google`
- `mistral` (à remplacer par `mistral-ollama` et `mistral-cloud`)
- `ollama` (à fusionner avec `mistral-ollama`)
- `lm-studio`

**Comportement actuel** :
- Désactivés dans l'UI (non sélectionnables)
- Rejetés par la validation dans le **main process**
- `ActiveAIProviderId` ne peut contenir que `openai`

---

## 🏗 Architecture cible

### Schéma global
```
Utilisateur
  -> UI (React)
  -> preload (window.nova)
  -> Electron main
      -> Provider Manager
          -> OpenAI Provider (implémenté)
          -> Mistral Cloud Provider (à implémenter)
          -> Mistral Ollama Provider (à implémenter)
          -> [Autres providers futurs]
      -> Agents (ACP, AEL, ARI...)
      -> Stockage JSON
```

### Contrat technique des providers

#### 1. Interface commune
Tous les providers doivent implémenter l'interface suivante :

```typescript
interface AIProvider {
  // Identifiant unique du provider
  id: string;
  
  // Nom affichable
  displayName: string;
  
  // Description
  description: string;
  
  // Type de provider (cloud, local, hybrid)
  type: 'cloud' | 'local' | 'hybrid';
  
  // Icône (pour l'UI)
  icon: string;
  
  // Configuration requise
  requiredConfig: ProviderConfigRequirement[];
  
  // Méthode pour envoyer une requête
  sendRequest(
    messages: ChatMessage[],
    options: ProviderOptions
  ): Promise<ProviderResponse>;
  
  // Méthode pour valider la configuration
  validateConfig(config: ProviderConfig): ValidationResult;
  
  // Méthode pour tester la connexion
  testConnection(config: ProviderConfig): Promise<ConnectionTestResult>;
  
  // Méthode pour obtenir les modèles disponibles
  getAvailableModels(config: ProviderConfig): Promise<Model[]>;
}
```

#### 2. Structure des messages
Le format des messages doit être **compatible** avec le système existant :

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
  // Métadonnées optionnelles
  metadata?: {
    timestamp?: number;
    providerId?: string;
    modelId?: string;
  };
}
```

#### 3. Structure de la réponse
```typescript
interface ProviderResponse {
  // Réponse textuelle
  content: string;
  
  // ID du message (pour suivi)
  messageId: string;
  
  // ID du modèle utilisé
  modelId: string;
  
  // Statut de la réponse
  status: 'success' | 'error' | 'partial' | 'aborted';
  
  // Métadonnées
  metadata: {
    // Usage (tokens)
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    // Temps de réponse (ms)
    responseTime?: number;
    // Erreur (si status === 'error')
    error?: ProviderError;
  };
}
```

#### 4. Configuration des providers
Chaque provider a sa propre configuration stockée dans `settings.providers[providerId]` :

```typescript
interface ProviderConfig {
  // Clé API (chiffrée pour les providers cloud)
  apiKey?: string;
  
  // URL de base de l'API
  baseUrl?: string;
  
  // ID du modèle à utiliser
  modelId: string;
  
  // Paramètres spécifiques
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    // ... autres paramètres
  };
  
  // Configuration spécifique au provider
  providerSpecific?: Record<string, unknown>;
}
```

---

## 🎯 Provider Manager

### Responsabilités
1. **Gestion du cycle de vie** : Instanciation, configuration, destruction des providers
2. **Routing des requêtes** : Sélection du provider actif et transmission des requêtes
3. **Validation** : Vérification de la configuration avant envoi
4. **Gestion des erreurs** : Normalisation des erreurs provenant des différents providers
5. **Cache des modèles** : Mise en cache des listes de modèles disponibles

### Implémentation proposée
```typescript
class ProviderManager {
  private providers: Map<string, AIProvider>;
  private activeProviderId: string;
  private config: ProvidersConfig;
  
  constructor() {
    this.providers = new Map();
    this.registerBuiltInProviders();
  }
  
  // Enregistrement des providers natifs
  private registerBuiltInProviders(): void {
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new MistralCloudProvider());
    this.registerProvider(new MistralOllamaProvider());
  }
  
  // Sélection du provider actif
  setActiveProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} non enregistré`);
    }
    this.activeProviderId = providerId;
  }
  
  // Envoi d'une requête via le provider actif
  async sendRequest(
    messages: ChatMessage[],
    options: ProviderOptions
  ): Promise<ProviderResponse> {
    const provider = this.getActiveProvider();
    return provider.sendRequest(messages, options);
  }
  
  // Validation de la configuration
  validateConfig(providerId: string, config: ProviderConfig): ValidationResult {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { valid: false, error: `Provider ${providerId} non trouvé` };
    }
    return provider.validateConfig(config);
  }
}
```

---

## 🔌 Intégration avec l'orchestrateur

### Modifications nécessaires

#### 1. Dans le `main process`
- **Remplacer** les appels directs à OpenAI par des appels au `ProviderManager`
- **Adapter** le format des réponses pour maintenir la compatibilité avec Nova
- **Gérer** les erreurs spécifiques aux providers

#### 2. Dans le `preload`
- **Exposer** les méthodes nécessaires pour :
  - Lister les providers disponibles
  - Obtenir la configuration d'un provider
  - Tester la connexion à un provider
  - Changer de provider actif

#### 3. Dans le `renderer`
- **Créer les écrans** dans `Paramètres > Providers`
- **Gérer les formulaires** de configuration par provider
- **Afficher les statuts** de connexion et erreurs

---

## 📊 Stockage des configurations

### Structure proposée pour `settings.json`
```json
{
  "providers": {
    "activeProviderId": "openai",
    "openai": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.openai.com/v1",
      "modelId": "gpt-4o-mini",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096
      }
    },
    "mistral-cloud": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "mistral-medium",
      "parameters": {
        "temperature": 0.7
      }
    },
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:latest",
      "parameters": {
        "temperature": 0.7
      }
    }
  }
}
```

### Chiffrement des clés API
- Utiliser `electron.safeStorage` pour chiffrer les clés API
- **Ne jamais** stocker les clés en clair dans `settings.json`
- **Ne jamais** exposer les clés au renderer

---

## 🎨 UI - Écrans de configuration

### Structure proposée pour `Paramètres > Providers`

```
Paramètres
└── Providers
    ├── Sélecteur de provider actif (dropdown)
    │
    ├── OpenAI (onglet)
    │   ├── Clé API (champ chiffré)
    │   ├── Base URL (champ texte)
    │   ├── Modèle (dropdown)
    │   ├── Paramètres avancés
    │   └── Bouton "Tester la connexion"
    │
    ├── Mistral Cloud (onglet)
    │   ├── Clé API (champ chiffré)
    │   ├── Base URL (champ texte, défaut: https://api.mistral.ai/v1)
    │   ├── Modèle (dropdown)
    │   ├── Paramètres avancés
    │   └── Bouton "Tester la connexion"
    │
    └── Mistral Ollama (onglet)
        ├── Base URL (champ texte, défaut: http://localhost:11434)
        ├── Modèle (dropdown avec détection automatique)
        ├── Bouton "Rafraîchir la liste des modèles"
        └── Bouton "Tester la connexion"
```

---

## 🔒 Sécurité et validation

### Règles de sécurité
1. **Aucun appel direct** : Le renderer ne doit **jamais** appeler un provider directement
2. **Chiffrement obligatoire** : Toutes les clés API doivent être chiffrées
3. **Validation stricte** : Les URLs et configurations doivent être validées
4. **Permissions** : Les appels provider doivent respecter les permissions de l'utilisateur

### Validation des configurations

#### Pour Mistral Cloud
- **Clé API** : Obligatoire, format valide (commence par `mst_`)
- **Base URL** : Doit être une URL HTTPS valide
- **Modèle** : Doit exister dans la liste des modèles disponibles

#### Pour Mistral Ollama
- **Base URL** : Doit être une URL valide (HTTP ou HTTPS)
- **Modèle** : Doit exister localement (vérification via `/api/tags`)
- **Ollama** : Doit être installé et en cours d'exécution

---

## 📈 Métriques et monitoring

### À implémenter
1. **Journalisation** des appels aux providers (sans les clés API)
2. **Suivi des tokens** consommés par provider
3. **Temps de réponse** par provider et modèle
4. **Taux d'erreur** par provider

### Stockage
- Stocker les métriques dans des fichiers JSON séparés
- Permettre l'export pour analyse
- Respecter les paramètres de confidentialité de l'utilisateur

---

## 🔄 Migration depuis l'ancien système

### Étapes de migration
1. **Conserver** la configuration OpenAI existante
2. **Ajouter** les nouveaux providers dans `settings.providers`
3. **Migrer** `settings.openai` vers `settings.providers.openai`
4. **Mettre à jour** `ActiveAIProviderId` pour pointer vers `settings.providers.activeProviderId`
5. **Nettoyer** les anciennes clés dans `settings.json`

### Rétrocompatibilité
- **Maintenir** le support de l'ancienne structure pendant la transition
- **Avertir** l'utilisateur de migrer vers la nouvelle structure
- **Automatiser** la migration si possible

---

## 🚀 Prochaines étapes

Voir **[MISTRAL_IMPLEMENTATION_PLAN.md](MISTRAL_IMPLEMENTATION_PLAN.md)** pour le plan détaillé d'implémentation de Mistral AI.
