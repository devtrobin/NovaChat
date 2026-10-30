# Spécification Technique - Mistral AI

## 📋 Overview

Ce document détaille la **spécification technique** pour l'intégration de **Mistral AI** dans NovaChat, couvrant :
1. **Mistral Cloud** : Accès distant via l'API officielle
2. **Mistral Ollama** : Accès local via Ollama (modèles Mistral exécutés localement)

---

## 🎯 Objectifs

- **Permettre** aux utilisateurs de sélectionner Mistral AI comme provider
- **Supporter** les deux modes (cloud et local)
- **Maintenir** la compatibilité avec l'architecture existante
- **Garantir** la sécurité et la confidentialité des données

---

## 🏷 Identifiants Canoniques

| Mode | Identifiant | Description |
|------|-------------|-------------|
| Cloud | `mistral-cloud` | API Mistral AI (distant) |
| Local | `mistral-ollama` | Modèles Mistral via Ollama (local) |

---

## 📡 Mistral Cloud Provider

### 1. Configuration

#### Structure de configuration
```typescript
interface MistralCloudConfig {
  // Clé API Mistral (chiffrée)
  apiKey: string;
  
  // URL de base de l'API
  baseUrl: string;
  
  // ID du modèle à utiliser
  modelId: string;
  
  // Paramètres du modèle
  parameters: {
    temperature?: number;       // 0.0 - 1.0 (défaut: 0.7)
    maxTokens?: number;         // Max tokens dans la réponse
    topP?: number;              // 0.0 - 1.0 (défaut: 1.0)
    randomSeed?: number;        // Graine aléatoire
    safePrompt?: boolean;       // Mode safe
    responseFormat?: {
      type: 'text' | 'json';
    };
  };
}
```

#### Configuration par défaut
```json
{
  "baseUrl": "https://api.mistral.ai/v1",
  "modelId": "mistral-medium",
  "parameters": {
    "temperature": 0.7,
    "maxTokens": 4096,
    "topP": 1.0,
    "responseFormat": {
      "type": "text"
    }
  }
}
```

### 2. Modèles disponibles

#### Liste des modèles (à jour en octobre 2026)
| ID du modèle | Description | Type | Tokens max |
|-------------|-------------|------|------------|
| `mistral-tiny` | Modèle léger et rapide | Texte | 32k |
| `mistral-small` | Modèle équilibré | Texte | 32k |
| `mistral-medium` | Modèle performant | Texte | 32k |
| `mistral-large` | Modèle le plus puissant | Texte | 32k |
| `codestral-latest` | Spécialisé pour le code | Code | 32k |
| `mistral-embed` | Pour les embeddings | Embedding | - |

#### Récupération dynamique des modèles
- **Endpoint** : `GET /v1/models`
- **Fréquence** : 1 fois par session ou à la demande
- **Cache** : Stocker en mémoire pendant la session

### 3. Appels à l'API

#### a. Chat Completion (endpoint principal)
- **Endpoint** : `POST /v1/chat/completions`
- **Headers** :
  ```
  Authorization: Bearer <apiKey>
  Content-Type: application/json
  ```
- **Body** :
  ```json
  {
    "model": "<modelId>",
    "messages": [
      {
        "role": "system|user|assistant",
        "content": "<message content>"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 4096,
    "top_p": 1.0,
    "stream": false
  }
  ```

#### b. Responses API (alternative)
- **Endpoint** : `POST /v1/responses` (si disponible)
- **Format** : Similaire à OpenAI Responses API

### 4. Format des réponses

#### Réponse de base
```json
{
  "id": "resp_<unique_id>",
  "model": "mistral-medium",
  "created": 1730000000,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "<response text>"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 50,
    "total_tokens": 75
  }
}
```

#### Mapping vers ProviderResponse
```typescript
{
  content: "<response text>",
  messageId: "resp_<unique_id>",
  modelId: "mistral-medium",
  status: "success",
  metadata: {
    usage: {
      promptTokens: 25,
      completionTokens: 50,
      totalTokens: 75
    },
    responseTime: <time_elapsed>
  }
}
```

### 5. Gestion des erreurs

#### Erreurs courantes
| Code HTTP | Type d'erreur | Description | Action recommandée |
|-----------|---------------|-------------|-------------------|
| 401 | `AuthenticationError` | Clé API invalide | Vérifier la clé API |
| 404 | `NotFoundError` | Modèle non trouvé | Vérifier le modelId |
| 429 | `RateLimitError` | Trop de requêtes | Attendre et réessayer |
| 400 | `ValidationError` | Requête mal formée | Vérifier le format |
| 500 | `ServerError` | Erreur serveur | Réessayer plus tard |

#### Format d'erreur normalisé
```typescript
interface ProviderError {
  code: string;
  message: string;
  type: 'authentication' | 'validation' | 'rate_limit' | 'server' | 'network';
  retryable: boolean;
  details?: Record<string, unknown>;
}
```

### 6. Test de connexion

#### Méthode
```typescript
async testConnection(config: MistralCloudConfig): Promise<ConnectionTestResult> {
  try {
    // Appel minimal à /v1/models pour vérifier la connexion
    const response = await fetch(`${config.baseUrl}/v1/models`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`
      }
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: response.status.toString(),
          message: `Erreur ${response.status}`,
          type: 'authentication'
        }
      };
    }
    
    const models = await response.json();
    return {
      success: true,
      models: models.data.map((m: any) => m.id)
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Impossible de se connecter à Mistral AI',
        type: 'network'
      }
    };
  }
}
```

---

## 💻 Mistral Ollama Provider

### 1. Configuration

#### Structure de configuration
```typescript
interface MistralOllamaConfig {
  // URL de base d'Ollama (défaut: http://localhost:11434)
  baseUrl: string;
  
  // ID du modèle à utiliser (format: "mistral:latest" ou "mistral:7b")
  modelId: string;
  
  // Paramètres du modèle
  parameters: {
    temperature?: number;       // 0.0 - 1.0 (défaut: 0.7)
    maxTokens?: number;         // Max tokens dans la réponse
    topP?: number;              // 0.0 - 1.0 (défaut: 0.9)
    topK?: number;              // Top K (défaut: 50)
    repeatPenalty?: number;    // Pénalité de répétition (défaut: 1.1)
    seed?: number;             // Graine aléatoire
    stop?: string[];           // Tokens d'arrêt
    stream?: boolean;          // Mode streaming (défaut: false)
  };
}
```

#### Configuration par défaut
```json
{
  "baseUrl": "http://localhost:11434",
  "modelId": "mistral:latest",
  "parameters": {
    "temperature": 0.7,
    "maxTokens": 4096,
    "topP": 0.9,
    "topK": 50,
    "repeatPenalty": 1.1,
    "stream": false
  }
}
```

### 2. Modèles disponibles

#### Modèles Mistral supportés par Ollama
| ID du modèle | Description | Taille | Tokens max | RAM requise |
|-------------|-------------|--------|------------|-------------|
| `mistral:latest` | Dernière version | ~14Go | 32k | 16Go+ |
| `mistral:7b` | Mistral 7B | ~7Go | 32k | 8Go+ |
| `mistral:7b-instruct` | 7B Instruct | ~7Go | 32k | 8Go+ |
| `mistral:7b-q4_0` | 7B quantisé (Q4) | ~4Go | 32k | 6Go+ |
| `mistral:7b-q4_K_M` | 7B quantisé (Q4_K_M) | ~3.8Go | 32k | 6Go+ |
| `codestral:latest` | Spécialisé code | ~22Go | 32k | 24Go+ |

#### Récupération des modèles disponibles
- **Endpoint** : `GET /api/tags`
- **Exemple de réponse** :
  ```json
  {
    "models": [
      {
        "name": "mistral:latest",
        "digest": "abc123...",
        "modified_at": "2026-10-30T12:00:00Z",
        "size": 14321445890
      },
      {
        "name": "mistral:7b",
        "digest": "def456...",
        "modified_at": "2026-09-01T10:00:00Z",
        "size": 7213456789
      }
    ]
  }
  ```

### 3. Appels à l'API Ollama

#### a. Chat Completion
- **Endpoint** : `POST /api/chat`
- **Body** :
  ```json
  {
    "model": "mistral:latest",
    "messages": [
      {
        "role": "system|user|assistant",
        "content": "<message content>"
      }
    ],
    "stream": false,
    "options": {
      "temperature": 0.7,
      "max_tokens": 4096,
      "top_p": 0.9,
      "top_k": 50
    }
  }
  ```

#### b. Generation (alternative)
- **Endpoint** : `POST /api/generate`
- **Format** : Plus simple, mais moins structuré

### 4. Format des réponses

#### Réponse de base
```json
{
  "model": "mistral:latest",
  "created_at": "2026-10-30T12:00:00Z",
  "message": {
    "role": "assistant",
    "content": "<response text>"
  },
  "done": true,
  "total_duration": 5000,
  "load_duration": 1000,
  "prompt_eval_count": 25,
  "eval_count": 50
}
```

#### Mapping vers ProviderResponse
```typescript
{
  content: "<response text>",
  messageId: "<generated_id>",
  modelId: "mistral:latest",
  status: "success",
  metadata: {
    usage: {
      promptTokens: 25,  // prompt_eval_count
      completionTokens: 50, // eval_count
      totalTokens: 75
    },
    responseTime: 5000 // total_duration
  }
}
```

### 5. Gestion des erreurs

#### Erreurs courantes
| Code HTTP | Type d'erreur | Description | Action recommandée |
|-----------|---------------|-------------|-------------------|
| 404 | `NotFoundError` | Ollama non démarré | Démarrer Ollama |
| 404 | `ModelNotFoundError` | Modèle non trouvé | Télécharger le modèle |
| 500 | `ServerError` | Erreur Ollama | Vérifier les logs Ollama |
| 400 | `ValidationError` | Requête mal formée | Vérifier le format |
| 503 | `ServiceUnavailable` | Ollama surchargé | Attendre |

### 6. Test de connexion

#### Méthode
```typescript
async testConnection(config: MistralOllamaConfig): Promise<ConnectionTestResult> {
  try {
    // 1. Vérifier que Ollama est en cours d'exécution
    const pingResponse = await fetch(`${config.baseUrl}/api/tags`, {
      timeout: 5000
    });
    
    if (!pingResponse.ok) {
      return {
        success: false,
        error: {
          code: 'OLLAMA_NOT_RUNNING',
          message: 'Ollama ne semble pas démarré',
          type: 'connection'
        }
      };
    }
    
    // 2. Vérifier que le modèle existe
    const tags = await pingResponse.json();
    const availableModels = tags.models.map((m: any) => m.name);
    
    if (!availableModels.includes(config.modelId)) {
      return {
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: `Modèle ${config.modelId} non trouvé`,
          type: 'validation',
          details: { availableModels }
        }
      };
    }
    
    return {
      success: true,
      models: availableModels,
      version: tags?.version || 'unknown'
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Impossible de se connecter à Ollama',
        type: 'network'
      }
    };
  }
}
```

---

## 🔄 Comparaison Mistral Cloud vs Mistral Ollama

| Critère | Mistral Cloud | Mistral Ollama |
|---------|---------------|---------------|
| **Type** | Cloud (distant) | Local |
| **Latence** | variable (réseau) | faible (local) |
| **Coût** | payant (par token) | gratuit (après téléchargement) |
| **Clé API** | requise | non requise |
| **Installation** | aucune | Ollama requis |
| **Modèles** | official Mistral | Mistral via Ollama |
| **Mise à jour** | automatique | manuelle |
| **Confidentialité** | données sur serveurs Mistral | données locales |
| **Connexion internet** | requise | optionnelle (sauf pour télécharger les modèles) |
| **Performances** | optimisées par Mistral | dépendent du matériel |

---

## 🔒 Considérations de sécurité

### 1. Mistral Cloud
- **Chiffrement** : La clé API doit être **chiffrée** via `electron.safeStorage`
- **HTTPS** : Toujours utiliser HTTPS pour les connexions
- **Validation** : Vérifier que l'URL de base est valide et sécurisée
- **Limites de taux** : Respecter les limites de l'API Mistral

### 2. Mistral Ollama
- **HTTP local** : Ollama utilise HTTP par défaut (non chiffré)
- **Validation** : Vérifier que l'URL pointe vers localhost ou un serveur de confiance
- **Isolation** : Ollama s'exécute localement, donc moins de risques de fuite de données
- **Permissions** : Vérifier que l'utilisateur a les droits pour exécuter Ollama

### 3. Recommandations générales
- **Ne jamais** exposer les clés API dans les logs ou l'UI
- **Ne jamais** permettre les requêtes cross-origin non autorisées
- **Toujours** valider les entrées utilisateur
- **Implémenter** un système de timeout pour les requêtes

---

## 📊 Performances et optimisations

### 1. Cache des modèles
- **Mistral Cloud** : Mettre en cache la liste des modèles pendant 1 heure
- **Mistral Ollama** : Rafraîchir la liste à chaque démarrage d'application

### 2. Timeout des requêtes
- **Mistral Cloud** : 30 secondes
- **Mistral Ollama** : 60 secondes (les modèles locaux peuvent être plus lents)

### 3. Gestion des tokens
- **Compter** les tokens pour chaque requête (pour information)
- **Limiter** la taille des messages pour éviter les timeouts
- **Compresser** l'historique si nécessaire

---

## 🔧 Configuration UI

### 1. Mistral Cloud

#### Champs de configuration
| Champ | Type | Obligatoire | Défaut | Description |
|-------|------|------------|--------|-------------|
| Clé API | champ chiffré | ✅ | - | Clé API Mistral |
| Base URL | texte | ❌ | `https://api.mistral.ai/v1` | URL de l'API |
| Modèle | dropdown | ✅ | `mistral-medium` | Modèle à utiliser |
| Température | nombre | ❌ | 0.7 | 0.0 - 1.0 |
| Max Tokens | nombre | ❌ | 4096 | Limite de tokens |

#### Boutons
- **Tester la connexion** : Vérifie que la clé API est valide
- **Rafraîchir les modèles** : Met à jour la liste des modèles disponibles

### 2. Mistral Ollama

#### Champs de configuration
| Champ | Type | Obligatoire | Défaut | Description |
|-------|------|------------|--------|-------------|
| Base URL | texte | ✅ | `http://localhost:11434` | URL d'Ollama |
| Modèle | dropdown | ✅ | `mistral:latest` | Modèle à utiliser |
| Température | nombre | ❌ | 0.7 | 0.0 - 1.0 |
| Max Tokens | nombre | ❌ | 4096 | Limite de tokens |
| Top P | nombre | ❌ | 0.9 | 0.0 - 1.0 |
| Top K | nombre | ❌ | 50 | Top K sampling |

#### Boutons
- **Tester la connexion** : Vérifie qu'Ollama est démarré et que le modèle existe
- **Rafraîchir les modèles** : Met à jour la liste des modèles disponibles localement

---

## 📚 Références

- [Documentation Mistral AI](https://docs.mistral.ai/)
- [API Reference - Mistral AI](https://docs.mistral.ai/api/)
- [Ollama GitHub](https://github.com/ollama/ollama)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Modèles Mistral sur Ollama](https://ollama.ai/library)

---

## 🎯 Prochaines étapes

Voir **[MISTRAL_IMPLEMENTATION_PLAN.md](MISTRAL_IMPLEMENTATION_PLAN.md)** pour le **plan détaillé d'implémentation par phases**.
