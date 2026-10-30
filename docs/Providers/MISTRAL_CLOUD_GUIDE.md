# Guide d'Installation et Configuration - Mistral Cloud pour NovaChat

## 📌 Introduction

Ce guide détaille **comment configurer Mistral Cloud** comme provider dans NovaChat.

**Mistral Cloud** est l'API officielle de Mistral AI, qui permet d'accéder à leurs modèles **sans avoir à les héberger localement**.

---

## 🎯 Prérequis

### 1. Compte Mistral AI
- **Créer un compte** : [mistral.ai](https://mistral.ai/)
- **Obtenir une clé API** : Dans le [dashboard](https://console.mistral.ai/), aller dans **API Keys**

### 2. Modèles disponibles
Mistral Cloud propose plusieurs modèles (voir [MISTRAL_SPECIFICATION.md](MISTRAL_SPECIFICATION.md) pour la liste complète).

Les modèles les plus populaires :
- `mistral-tiny` : Rapide et économique
- `mistral-small` : Bon équilibre qualité/prix
- `mistral-medium` : Performant (recommandé pour NovaChat)
- `mistral-large` : Le plus puissant
- `codestral-latest` : Spécialisé pour le code

---

## 🔐 Configuration de la clé API

### 1. Obtenir une clé API

1. Se connecter à [console.mistral.ai](https://console.mistral.ai/)
2. Aller dans **API Keys** (ou **Paramètres > Clés API**)
3. Cliquer sur **"Create new key"**
4. Donner un nom à la clé (ex: "NovaChat")
5. Copier la clé générée (elle ne sera plus affichée ensuite !)

> ⚠️ **IMPORTANT** : **Ne jamais partager votre clé API** ou la commiter dans un dépôt. Elle donne accès à votre compte Mistral et peut générer des frais.

---

### 2. Stocker la clé API en sécurité

Dans NovaChat, la clé API est :
- **Chiffrée** via `electron.safeStorage` (coffre du système d'exploitation)
- **Jamais** stockée en clair dans `settings.json`
- **Jamais** exposée au renderer (interface graphique)
- **Jamais** envoyée dans les logs

---

## 🔧 Configuration dans NovaChat

### 1. Sélectionner Mistral Cloud comme provider

1. Ouvrir NovaChat
2. Aller dans **Paramètres** (⚙️)
3. Sélectionner **Providers**
4. Dans le sélecteur de provider actif, choisir **Mistral Cloud**

---

### 2. Configurer Mistral Cloud

Dans l'onglet **Mistral Cloud**, vous trouverez :

| Champ | Valeur par défaut | Description |
|-------|-------------------|-------------|
| **Clé API** | - | Votre clé API Mistral (champ sécurisé) |
| **Base URL** | `https://api.mistral.ai/v1` | URL de l'API Mistral |
| **Modèle** | `mistral-medium` | Modèle à utiliser |
| **Température** | `0.7` | Créativité (0.0 - 1.0) |
| **Max Tokens** | `4096` | Limite de tokens dans la réponse |

---

### 3. Tester la connexion

1. Cliquer sur le bouton **"Tester la connexion"**
2. NovaChat va :
   - Vérifier que la clé API est valide
   - Vérifier que le modèle sélectionné existe
   - Récupérer la liste des modèles disponibles
   - Afficher un message de succès ou d'erreur

#### Messages possibles
| Message | Signification | Solution |
|---------|--------------|----------|
| ✅ Connexion réussie | Clé API valide, modèle accessible | Prêt à utiliser |
| ❌ Clé API invalide | La clé API est incorrecte | Vérifier la clé API |
| ❌ Modèle non trouvé | Le modèle n'existe pas | Choisir un autre modèle |
| ❌ Erreur réseau | Problème de connexion | Vérifier la connexion internet |
| ❌ Quota dépassé | Trop de requêtes | Attendre ou mettre à jour votre plan |

---

### 4. Sauvegarder la configuration

La configuration est **automatiquement sauvegardée** dans `settings.json` :

```json
{
  "providers": {
    "activeProviderId": "mistral-cloud",
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

> ⚠️ **Note** : La clé API est **chiffrée** et n'apparaît **pas en clair** dans ce fichier.

---

## 🚀 Utilisation avec NovaChat

### 1. Démarrer une nouvelle conversation
1. Sélectionner **Mistral Cloud** comme provider actif
2. Cliquer sur **Nouvelle conversation**
3. Envoyer un message

### 2. Exemple de conversation

**Vous** :
```
Bonjour, peux-tu m'expliquer la différence entre un CPU et un GPU ?
```

**NovaChat (via Mistral Cloud)** :
```
Un CPU (Central Processing Unit) et un GPU (Graphics Processing Unit) sont tous deux des unités de traitement, mais ils sont optimisés pour des tâches différentes...
```

---

### 3. Changer de modèle

1. Aller dans **Paramètres > Providers > Mistral Cloud**
2. Sélectionner un autre modèle dans le dropdown
3. Cliquer sur **"Tester la connexion"** pour vérifier
4. Les nouvelles conversations utiliseront le nouveau modèle

---

## 📊 Limites et quotas

### 1. Quotas par défaut

Mistral Cloud propose différents plans avec des quotas variables :

| Plan | Requêtes/minute | Tokens/mois | Coût |
|------|-----------------|-------------|------|
| Free | 30 | 1M | Gratuit |
| Pro | 100 | 5M | Payant |
| Enterprise | Illimité | Illimité | Sur devis |

> 💡 **Note** : Vérifiez votre plan sur [console.mistral.ai](https://console.mistral.ai/)

---

### 2. Gestion des quotas

#### Vérifier son quota
1. Aller sur [console.mistral.ai](https://console.mistral.ai/)
2. Voir le **Usage** dans le dashboard

#### Réduire la consommation
- Utiliser des **modèles plus petits** (ex: `mistral-tiny` au lieu de `mistral-large`)
- Limiter le **maxTokens** (ex: 1024 au lieu de 4096)
- Utiliser le **streaming** (si implémenté) pour recevoir les réponses token par token

---

### 3. Erreurs de quota

Si vous dépassez votre quota :
- **Erreur 429** : Too many requests (trop de requêtes par minute)
  **Solution** : Attendre 1 minute ou réduire le nombre de requêtes
- **Erreur 402** : Payment required (quota mensuel dépassé)
  **Solution** : Mettre à jour votre plan ou attendre le mois suivant

---

## 🔄 Rafraîchir la liste des modèles

Mistral ajoute régulièrement de nouveaux modèles. Pour mettre à jour la liste :

1. Cliquer sur **"Rafraîchir la liste des modèles"**
2. NovaChat récupérera la liste depuis l'API Mistral
3. Le dropdown des modèles sera mis à jour

---

## ⚡ Optimisation des performances

### 1. Réduire la latence

- Utiliser le **datacenter le plus proche** :
  - Europe : `https://api.mistral.ai/v1`
  - (Autres régions à venir)
- Utiliser des **modèles plus petits** : `mistral-tiny` est plus rapide que `mistral-large`

### 2. Réduire les coûts

- Utiliser des **modèles plus petits** : Moins chers par token
- Limiter le **maxTokens** : Moins de tokens = moins cher
- Utiliser le **caching** : Si NovaChat implémente le caching des réponses

### 3. Améliorer la qualité

- Augmenter la **température** pour plus de créativité
- Utiliser des **modèles plus grands** pour des tâches complexes
- Fournir un **contexte clair** dans vos messages

---

## 🛠 Dépannage

### Problème 1 : "Clé API invalide"

**Causes possibles** :
- Clé API mal copiée
- Clé API expirée
- Clé API révoquée

**Solutions** :
1. Vérifier que vous avez bien copié la clé **complète** (commence par `mst_`)
2. Générer une **nouvelle clé API** sur [console.mistral.ai](https://console.mistral.ai/)
3. Vérifier que la clé n'a pas été révoquée

---

### Problème 2 : "Modèle non trouvé"

**Causes possibles** :
- Le modèle n'existe pas
- Le modèle a été renommé
- Votre plan ne donne pas accès à ce modèle

**Solutions** :
1. Vérifier la liste des modèles disponibles :
   ```bash
   curl -H "Authorization: Bearer <VOTRE_CLE_API>" https://api.mistral.ai/v1/models
   ```
2. Choisir un modèle dans la liste retournée
3. Vérifier votre plan sur [console.mistral.ai](https://console.mistral.ai/)

---

### Problème 3 : "Erreur 401 - Unauthorized"

**Cause** : La clé API est invalide ou expirée.

**Solutions** :
1. Vérifier que la clé API est correcte
2. Générer une nouvelle clé API
3. Vérifier que la clé n'a pas été révoquée

---

### Problème 4 : "Erreur 429 - Too Many Requests"

**Cause** : Vous avez dépassé la limite de requêtes par minute.

**Solutions** :
1. Attendre 1 minute avant de réessayer
2. Réduire le nombre de requêtes simultanées
3. Passer à un plan supérieur si nécessaire

---

### Problème 5 : "Erreur 500 - Server Error"

**Cause** : Problème temporaire côté Mistral.

**Solutions** :
1. Attendre quelques minutes et réessayer
2. Vérifier le statut de l'API Mistral : [status.mistral.ai](https://status.mistral.ai/)
3. Contacter le support Mistral si le problème persiste

---

### Problème 6 : Réponses trop lentes

**Causes possibles** :
- Modèle très demandé (charge élevée)
- Problème réseau
- Datacenter éloigné

**Solutions** :
1. Attendre que la charge diminue
2. Vérifier votre connexion internet
3. Essayer un autre modèle

---

## 📊 Vérification de l'installation

### Checklist finale

- [ ] Vous avez un compte Mistral AI
- [ ] Vous avez une clé API valide
- [ ] NovaChat peut se connecter à Mistral Cloud (test de connexion réussi)
- [ ] NovaChat peut envoyer des messages et recevoir des réponses

---

## 🔗 Ressources utiles

### Documentation officielle
- [Mistral AI Documentation](https://docs.mistral.ai/)
- [API Reference](https://docs.mistral.ai/api/)
- [Console Mistral](https://console.mistral.ai/)

### Outils
- [Postman Collection](https://www.postman.com/mistralai) : Pour tester l'API manuellement
- [Mistral Playground](https://mistral.ai/) : Pour tester les modèles en ligne

### Communauté
- [Discord Mistral](https://discord.gg/mistralai)
- [GitHub Mistral](https://github.com/mistralai)

---

## 💡 Bonnes pratiques

### 1. Sécurité
- **Ne jamais** partager votre clé API
- **Ne jamais** commiter votre clé API dans un dépôt Git
- **Utiliser** les variables d'environnement ou les coffres sécurisés (comme NovaChat)
- **Révoquer** les clés API compromis

### 2. Optimisation
- **Cacher** les réponses fréquentes pour réduire les coûts
- **Utiliser** le modèle le plus petit possible pour votre tâche
- **Limiter** le nombre de tokens dans les réponses

### 3. Monitoring
- **Surveiller** votre consommation de tokens dans le dashboard Mistral
- **Configurer** des alertes pour éviter les dépassements de quota
- **Analyser** les logs de NovaChat pour identifier les optimisations possibles

---

## 📝 Exemple d'utilisation avancée

### 1. Utilisation avec des paramètres personnalisés

Dans NovaChat, vous pouvez ajuster les paramètres pour chaque conversation :

```typescript
// Exemple de configuration avancée
{
  "modelId": "mistral-medium",
  "parameters": {
    "temperature": 0.9,  // Plus créatif
    "maxTokens": 2048,   // Réponse plus courte
    "topP": 0.95,        // Sampling plus large
    "topK": 100         // Top-K plus élevé
  }
}
```

### 2. Comparaison des modèles

| Modèle | Vitesse | Qualité | Coût | Cas d'usage |
|--------|---------|---------|------|-------------|
| mistral-tiny | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | $ | Tâches simples, prototypes |
| mistral-small | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$ | Usage général |
| mistral-medium | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$$ | Tâches complexes, qualité élevée |
| mistral-large | ⭐⭐ | ⭐⭐⭐⭐⭐ | $$$$ | Tâches très complexes |
| codestral | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$$$ | Génération de code |

---

## 🎉 Conclusion

Avec **Mistral Cloud**, vous avez accès à :
- ✅ **Des modèles puissants** sans installation locale
- ✅ **Une API fiable et scalabe**
- ✅ **Des mises à jour automatiques** des modèles
- ✅ **Un support professionnel** (selon votre plan)

**Prochaine étape** : [Configurer Ollama](OLLAMA_SETUP_GUIDE.md) pour utiliser Mistral en local, ou commencer à utiliser NovaChat avec Mistral Cloud !
