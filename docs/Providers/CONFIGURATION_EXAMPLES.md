# Exemples de Configuration - Providers NovaChat

## 📌 Introduction

Ce document fournit des **exemples concrets** de configuration pour les différents providers dans NovaChat.

**Format** : Tous les exemples suivent la structure JSON utilisée dans `settings.json`.

---

## 📁 Structure globale de `settings.json`

```json
{
  "providers": {
    "activeProviderId": "<provider_actif>",
    "<provider_id_1>": {
      "...": "configuration spécifique"
    },
    "<provider_id_2>": {
      "...": "configuration spécifique"
    }
  },
  "...": "autres paramètres NovaChat"
}
```

---

## 🔧 Exemple 1 : Configuration par défaut (OpenAI)

**Cas d'usage** : Configuration initiale, seul OpenAI est activé.

```json
{
  "providers": {
    "activeProviderId": "openai",
    "openai": {
      "apiKey": "[CHIFFRÉ:sk-...]",
      "baseUrl": "https://api.openai.com/v1",
      "modelId": "gpt-4o-mini",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096,
        "topP": 1.0
      }
    }
  }
}
```

**Explications** :
- `apiKey` est **chiffré** par `electron.safeStorage` (ne jamais le stocker en clair)
- `baseUrl` : URL standard de l'API OpenAI
- `modelId` : Modèle par défaut recommandé pour NovaChat
- `parameters` : Paramètres standard pour un usage général

---

## 🟢 Exemple 2 : Configuration Mistral Ollama (Local)

### 2.1 Configuration minimale

**Cas d'usage** : Utilisation basique de Mistral Ollama avec un seul modèle.

```json
{
  "providers": {
    "activeProviderId": "mistral-ollama",
    "openai": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.openai.com/v1",
      "modelId": "gpt-4o-mini",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096
      }
    },
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:7b-instruct",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096,
        "topP": 0.9,
        "topK": 50
      }
    }
  }
}
```

**Explications** :
- `baseUrl` : URL par défaut d'Ollama (port 11434)
- `modelId` : `mistral:7b-instruct` est recommandé pour le chat
- **Pas de clé API** : Ollama n'en nécessite pas
- `topP` et `topK` : Paramètres spécifiques à Ollama

---

### 2.2 Configuration avancée avec modèle quantisé

**Cas d'usage** : Optimisation pour les machines avec peu de RAM.

```json
{
  "providers": {
    "activeProviderId": "mistral-ollama",
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:7b-q4_K_M",
      "parameters": {
        "temperature": 0.5,
        "maxTokens": 2048,
        "topP": 0.95,
        "topK": 40,
        "repeatPenalty": 1.1
      }
    }
  }
}
```

**Explications** :
- `modelId` : `mistral:7b-q4_K_M` est un modèle **quantisé** (~4 Go au lieu de ~7 Go)
- `maxTokens` : Réduit à 2048 pour économiser de la RAM
- `temperature` : Réduite à 0.5 pour des réponses plus déterministes (et souvent plus rapides)
- `repeatPenalty` : Paramètre spécifique pour éviter les répétitions

---

### 2.3 Configuration avec port personnalisé

**Cas d'usage** : Ollama configuré sur un port différent.

```json
{
  "providers": {
    "activeProviderId": "mistral-ollama",
    "mistral-ollama": {
      "baseUrl": "http://localhost:11435",
      "modelId": "mistral:latest",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096
      }
    }
  }
}
```

**Prérequis** :
```bash
# Démarrer Ollama sur le port 11435
OLLAMA_HOST=0.0.0.0 OLLAMA_PORT=11435 ollama serve
```

---

### 2.4 Configuration avec plusieurs modèles disponibles

**Cas d'usage** : Plusieurs modèles Mistral installés localement.

```json
{
  "providers": {
    "activeProviderId": "mistral-ollama",
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:7b-instruct",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096
      },
      "availableModels": [
        "mistral:latest",
        "mistral:7b",
        "mistral:7b-instruct",
        "codestral:latest"
      ]
    }
  }
}
```

**Note** : La liste `availableModels` est **automatiquement mise à jour** par NovaChat lors du rafraîchissement.

---

## ☁️ Exemple 3 : Configuration Mistral Cloud (Distant)

### 3.1 Configuration minimale

**Cas d'usage** : Utilisation basique de Mistral Cloud.

```json
{
  "providers": {
    "activeProviderId": "mistral-cloud",
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
      "apiKey": "[CHIFFRÉ:mst_...]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "mistral-medium",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096
      }
    }
  }
}
```

**Explications** :
- `apiKey` : Clé API Mistral **chiffrée** (commence par `mst_`)
- `baseUrl` : URL standard de l'API Mistral
- `modelId` : `mistral-medium` est recommandé pour un bon équilibre qualité/prix

---

### 3.2 Configuration avec modèle économique

**Cas d'usage** : Optimisation des coûts.

```json
{
  "providers": {
    "activeProviderId": "mistral-cloud",
    "mistral-cloud": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "mistral-tiny",
      "parameters": {
        "temperature": 0.5,
        "maxTokens": 1024
      }
    }
  }
}
```

**Explications** :
- `modelId` : `mistral-tiny` est le modèle **le moins cher**
- `maxTokens` : Réduit à 1024 pour limiter les coûts
- `temperature` : Réduite à 0.5 pour des réponses plus directes

---

### 3.3 Configuration avec modèle pour le code

**Cas d'usage** : Génération et analyse de code.

```json
{
  "providers": {
    "activeProviderId": "mistral-cloud",
    "mistral-cloud": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "codestral-latest",
      "parameters": {
        "temperature": 0.2,
        "maxTokens": 8192
      }
    }
  }
}
```

**Explications** :
- `modelId` : `codestral-latest` est **spécialisé pour le code**
- `temperature` : Très basse (0.2) pour une **génération de code déterministe**
- `maxTokens` : Élevé (8192) pour permettre des **réponses longues** (fichiers complets)

---

### 3.4 Configuration avec datacenter européen

**Cas d'usage** : Utilisateurs en Europe pour une latence réduite.

```json
{
  "providers": {
    "activeProviderId": "mistral-cloud",
    "mistral-cloud": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "mistral-small",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096
      }
    }
  }
}
```

**Note** : Mistral AI utilise des datacenters **européens par défaut** pour tous les utilisateurs.

---

## 🔄 Exemple 4 : Configuration Multi-Providers

### 4.1 Basculer entre providers

**Cas d'usage** : Utiliser différents providers pour différentes tâches.

```json
{
  "providers": {
    "activeProviderId": "mistral-ollama",
    "openai": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.openai.com/v1",
      "modelId": "gpt-4o-mini",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096
      }
    },
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:7b-instruct",
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
        "temperature": 0.7,
        "maxTokens": 4096
      }
    }
  }
}
```

**Utilisation** :
- Pour les **tâches locales/confidentielles** : Sélectionner `mistral-ollama`
- Pour les **tâches nécessitant plus de puissance** : Sélectionner `mistral-cloud`
- Pour les **tâches spécifiques** (ex: code) : Sélectionner `openai` avec un modèle adapté

---

### 4.2 Configuration avec paramètres différents par provider

**Cas d'usage** : Paramètres optimisés pour chaque provider.

```json
{
  "providers": {
    "activeProviderId": "mistral-ollama",
    "openai": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.openai.com/v1",
      "modelId": "gpt-4o-mini",
      "parameters": {
        "temperature": 0.8,
        "maxTokens": 4096,
        "topP": 0.9
      }
    },
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:7b-instruct",
      "parameters": {
        "temperature": 0.6,
        "maxTokens": 2048,
        "topP": 0.95,
        "topK": 50
      }
    },
    "mistral-cloud": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "mistral-medium",
      "parameters": {
        "temperature": 0.5,
        "maxTokens": 4096
      }
    }
  }
}
```

**Explications** :
- **OpenAI** : `temperature` élevée (0.8) pour plus de créativité
- **Mistral Ollama** : `maxTokens` réduit (2048) pour économiser la RAM
- **Mistral Cloud** : `temperature` basse (0.5) pour des réponses plus précises

---

## ⚙️ Exemple 5 : Configuration des paramètres avancés

### 5.1 Paramètres pour un chat créatif

```json
{
  "providers": {
    "activeProviderId": "mistral-cloud",
    "mistral-cloud": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "mistral-medium",
      "parameters": {
        "temperature": 0.9,
        "maxTokens": 4096,
        "topP": 0.95,
        "topK": 100
      }
    }
  }
}
```

**Cas d'usage** : Brainstorming, génération d'idées, storytelling.

---

### 5.2 Paramètres pour un chat précis

```json
{
  "providers": {
    "activeProviderId": "mistral-ollama",
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:7b-instruct",
      "parameters": {
        "temperature": 0.2,
        "maxTokens": 2048,
        "topP": 0.1,
        "topK": 10,
        "repeatPenalty": 1.5
      }
    }
  }
}
```

**Cas d'usage** : Q&A, analyse technique, explications précises.

---

### 5.3 Paramètres pour la génération de code

```json
{
  "providers": {
    "activeProviderId": "mistral-cloud",
    "mistral-cloud": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "codestral-latest",
      "parameters": {
        "temperature": 0.1,
        "maxTokens": 8192,
        "topP": 0.95,
        "topK": 50
      }
    }
  }
}
```

**Cas d'usage** : Génération de fonctions, correction de bugs, optimisation de code.

---

### 5.4 Paramètres pour une conversation longue

```json
{
  "providers": {
    "activeProviderId": "mistral-ollama",
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:latest",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 8192,
        "topP": 0.9,
        "topK": 50
      }
    }
  }
}
```

**Cas d'usage** : Analyse de documents, résumés longs, discussions approfondies.

---

## 🔒 Exemple 6 : Configuration avec sécurité renforcée

**Cas d'usage** : Environnement sensible où la sécurité est critique.

```json
{
  "providers": {
    "activeProviderId": "mistral-ollama",
    "openai": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.openai.com/v1",
      "modelId": "gpt-4o-mini",
      "parameters": {
        "temperature": 0.5,
        "maxTokens": 2048
      },
      "enabled": false  // Désactivé pour plus de sécurité
    },
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:7b-instruct",
      "parameters": {
        "temperature": 0.5,
        "maxTokens": 2048
      },
      "enabled": true,
      "allowedModels": ["mistral:7b-instruct", "mistral:7b"]  // Restriction des modèles
    },
    "mistral-cloud": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "mistral-medium",
      "parameters": {
        "temperature": 0.5,
        "maxTokens": 2048
      },
      "enabled": false  // Désactivé pour plus de sécurité
    }
  },
  "security": {
    "allowCloudProviders": false,  // Interdire les providers cloud
    "requireLocalProviders": true    // Exiger les providers locaux
  }
}
```

**Explications** :
- Seul **Mistral Ollama** est activé
- Les providers cloud sont **désactivés**
- Seuls certains modèles sont **autorisés**

---

## 📊 Exemple 7 : Configuration pour le développement

**Cas d'usage** : Environnement de développement avec plusieurs providers pour test.

```json
{
  "providers": {
    "activeProviderId": "openai",
    "openai": {
      "apiKey": "[CHIFFRÉ:test_...]",
      "baseUrl": "https://api.openai.com/v1",
      "modelId": "gpt-3.5-turbo",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 1024
      },
      "debug": true  // Mode debug pour le développement
    },
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:7b-instruct",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 2048
      },
      "debug": true
    },
    "mistral-cloud": {
      "apiKey": "[CHIFFRÉ:test_...]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "mistral-tiny",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 1024
      },
      "debug": true
    }
  },
  "development": {
    "logProviderRequests": true,  // Logger toutes les requêtes
    "logProviderResponses": true, // Logger toutes les réponses
    "mockProviders": false        // Désactiver les mocks
  }
}
```

**Explications** :
- Tous les providers sont **activés** pour les tests
- Mode **debug** activé pour chaque provider
- **Logging** des requêtes et réponses
- Utilisation de modèles **économiques** pour les tests

---

## 💾 Migration depuis l'ancienne configuration

### Avant la migration
```json
{
  "openai": {
    "apiKey": "[CHIFFRÉ]",
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-4o-mini"
  }
}
```

### Après la migration
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
    }
  }
}
```

**Changements** :
- `openai` → `providers.openai`
- `model` → `modelId`
- Ajout de `parameters` avec valeurs par défaut
- Ajout de `activeProviderId`

---

## 📝 Exemple 8 : Configuration complète recommandée

**Cas d'usage** : Configuration complète pour un utilisateur standard.

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
        "maxTokens": 4096,
        "topP": 1.0
      },
      "enabled": true
    },
    "mistral-ollama": {
      "baseUrl": "http://localhost:11434",
      "modelId": "mistral:7b-instruct",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096,
        "topP": 0.9,
        "topK": 50
      },
      "enabled": true
    },
    "mistral-cloud": {
      "apiKey": "[CHIFFRÉ]",
      "baseUrl": "https://api.mistral.ai/v1",
      "modelId": "mistral-medium",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096
      },
      "enabled": false
    }
  }
}
```

**Explications** :
- **OpenAI** : Provider par défaut, activé
- **Mistral Ollama** : Configuré et activé (prêt à l'emploi)
- **Mistral Cloud** : Configuré mais désactivé (nécessite une clé API)

---

## 🔍 Comment utiliser ces exemples

### 1. Copier un exemple
Copiez le JSON d'un exemple et collez-le dans votre `settings.json`.

### 2. Adapter les valeurs
Modifiez les champs suivants selon votre configuration :
- `apiKey` (pour les providers cloud)
- `baseUrl` (si vous utilisez un port personnalisé)
- `modelId` (selon les modèles installés/disponibles)
- `parameters` (selon vos préférences)

### 3. Tester la configuration
1. Sauvegardez `settings.json`
2. Redémarrez NovaChat
3. Allez dans **Paramètres > Providers**
4. Testez la connexion pour chaque provider

---

## ⚠️ Bonnes pratiques

### 1. Sécurité
- **Ne jamais** stocker les clés API en clair
- **Ne jamais** commiter `settings.json` dans un dépôt Git
- Utiliser **toujours** le chiffrement (`electron.safeStorage`)

### 2. Organisation
- **Documenter** vos configurations dans un fichier séparé
- **Versionner** vos configurations pour différents environnements
- **Sauvegarder** vos configurations avant les mises à jour

### 3. Performance
- **Adapter** `maxTokens` en fonction de vos besoins
- **Choisir** le bon modèle pour chaque tâche
- **Monitorer** l'utilisation des tokens (pour les providers cloud)

---

## 🎯 Résumé des clés API

| Provider | Format de la clé | Exemple | Où l'obtenir |
|----------|------------------|---------|--------------|
| OpenAI | `sk-...` | `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | [platform.openai.com](https://platform.openai.com) |
| Mistral Cloud | `mst_...` | `mst_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | [console.mistral.ai](https://console.mistral.ai) |
| Mistral Ollama | Aucune | - | [ollama.ai](https://ollama.ai) |

---

## 📚 Références

- [Documentation OpenAI](https://platform.openai.com/docs)
- [Documentation Mistral AI](https://docs.mistral.ai/)
- [Documentation Ollama](https://github.com/ollama/ollama)
- [Spécifications des providers](../Providers/MISTRAL_SPECIFICATION.md)
- [Plan d'implémentation](../Providers/MISTRAL_IMPLEMENTATION_PLAN.md)
