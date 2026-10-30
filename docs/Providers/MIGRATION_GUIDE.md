# Guide de Migration - Providers NovaChat

## 📌 Introduction

Ce document explique **comment migrer** depuis l'ancienne configuration (OpenAI uniquement) vers la nouvelle architecture **multi-providers** de NovaChat, avec un focus sur **Mistral Ollama** (local).

**Objectif** : Permettre aux utilisateurs existants de **passer en douceur** à la nouvelle version avec support de Mistral AI via Ollama, **sans perdre leurs données existantes**.

---

## 🎯 Portée de la Migration

### Ce qui change
| Élément | Ancienne version | Nouvelle version |
|---------|------------------|------------------|
| **Configuration** | `settings.openai` | `settings.providers.openai` |
| **Provider actif** | Toujours OpenAI | Configurable (`settings.providers.activeProviderId`) |
| **Nouveaux providers** | Non | Mistral Cloud, Mistral Ollama, etc. |
| **UI** | Paramètres OpenAI | Onglets par provider |
| **Stockage** | `settings.json` | `settings.json` (nouvelle structure) |

### Ce qui ne change pas
- ✅ **Conversations existantes** : Conservées sans modification
- ✅ **Clé API OpenAI** : Automatiquement migrée et chiffrée
- ✅ **Préférences utilisateur** : Conservées (thème, etc.)
- ✅ **Fonctionnalités existantes** : Toutes les fonctionnalités OpenAI restent disponibles

---

## 📅 Plan de Migration

### Phase 1 : Préparation (Avant la mise à jour)

#### 1. Sauvegarder vos données
```bash
# Sauvegarder le répertoire userData de NovaChat
# Windows : %APPDATA%\nova-chat\userData
# macOS : ~/Library/Application Support/nova-chat/userData
# Linux : ~/.config/nova-chat/userData

# Exemple de sauvegarde
cp -r ~/.config/nova-chat ~/.config/nova-chat-backup-$(date +%Y%m%d)
```

#### 2. Vérifier la version actuelle
- Ouvrir NovaChat
- Aller dans **Aide > À propos**
- Noter la version actuelle

#### 3. Préparer Ollama (optionnel mais recommandé)
Si vous souhaitez utiliser **Mistral Ollama** :
1. [Installer Ollama](OLLAMA_SETUP_GUIDE.md)
2. Télécharger un modèle Mistral :
   ```bash
   ollama pull mistral:7b-instruct
   ```

---

### Phase 2 : Mise à jour de NovaChat

#### 1. Mettre à jour NovaChat
```bash
# Depuis le répertoire du projet
cd /c/Users/thoma/workspace/NovaChat

# Mettre à jour les dépendances
git pull origin codex/ael-file-write
npm install

# Reconstruire l'application
npm run build

# Packager (optionnel)
npm run package
```

#### 2. Vérifier la nouvelle structure
Après la mise à jour, NovaChat va **automatiquement migrer** votre configuration :
- `settings.openai` → `settings.providers.openai`
- Ajout de `settings.providers.activeProviderId = "openai"`

---

### Phase 3 : Vérification Post-Migration

#### 1. Vérifier la configuration
1. Ouvrir NovaChat
2. Aller dans **Paramètres > Providers**
3. Vérifier que :
   - OpenAI est sélectionné comme provider actif
   - Votre clé API OpenAI est toujours là (masquée)
   - Vos paramètres OpenAI sont conservés

#### 2. Tester OpenAI
1. Démarrer une nouvelle conversation
2. Envoyer un message
3. ✅ **Attendu** : Réponse via OpenAI (comme avant)

#### 3. Tester Mistral Ollama (si installé)
1. Aller dans **Paramètres > Providers**
2. Sélectionner **Mistral Ollama** comme provider actif
3. Cliquer sur **"Tester la connexion"**
   - ✅ **Attendu** : "Connexion réussie"
4. Démarrer une nouvelle conversation
5. Envoyer un message
   - ✅ **Attendu** : Réponse via Mistral Ollama

---

## 🔧 Migration Manuelle (si nécessaire)

### Cas d'usage
- La migration automatique a échoué
- Vous souhaitez migrer manuellement
- Vous voulez comprendre le processus

---

### 1. Ancienne structure de `settings.json`

**Avant la migration** :
```json
{
  "openai": {
    "apiKey": "[CHIFFRÉ:sk-...]",
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-4o-mini"
  },
  "theme": "dark",
  "conversations": [...],
  "agents": [...]
}
```

---

### 2. Nouvelle structure de `settings.json`

**Après la migration** :
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
        "maxTokens": 4096
      },
      "enabled": true
    }
  },
  "theme": "dark",
  "conversations": [...],
  "agents": [...]
}
```

---

### 3. Étapes de migration manuelle

#### Étape 1 : Sauvegarder l'ancienne configuration
```bash
cp settings.json settings.json.backup
```

#### Étape 2 : Créer la nouvelle structure
```json
{
  "providers": {
    "activeProviderId": "openai"
  }
}
```

#### Étape 3 : Migrer la configuration OpenAI
```json
{
  "providers": {
    "activeProviderId": "openai",
    "openai": {
      "apiKey": "[COPIER DEPUIS settings.json.backup]",
      "baseUrl": "[COPIER DEPUIS settings.json.backup]",
      "modelId": "[COPIER model DEPUIS settings.json.backup]",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 4096
      },
      "enabled": true
    }
  }
}
```

#### Étape 4 : Copier les autres paramètres
Copier **tous les autres champs** (`theme`, `conversations`, `agents`, etc.) **tels quels** depuis l'ancienne configuration.

#### Étape 5 : Vérifier la migration
```bash
# Vérifier que le fichier JSON est valide
jq . settings.json

# ou
python -m json.tool settings.json
```

---

### 4. Script de migration automatique

Si vous préférez un script pour migrer automatiquement :

#### Script Node.js (`migrate-settings.js`)
```javascript
const fs = require('fs');
const path = require('path');

// Chemin vers settings.json
const settingsPath = path.join(process.env.APPDATA || '', 'nova-chat', 'userData', 'settings.json');

// Lire l'ancienne configuration
let oldSettings;
try {
  const data = fs.readFileSync(settingsPath, 'utf8');
  oldSettings = JSON.parse(data);
} catch (err) {
  console.error('Erreur lors de la lecture de settings.json:', err.message);
  process.exit(1);
}

// Créer la nouvelle structure
const newSettings = {
  ...oldSettings,
  providers: {
    activeProviderId: 'openai',
    openai: {
      apiKey: oldSettings.openai?.apiKey || '',
      baseUrl: oldSettings.openai?.baseUrl || 'https://api.openai.com/v1',
      modelId: oldSettings.openai?.model || oldSettings.openai?.modelId || 'gpt-4o-mini',
      parameters: {
        temperature: 0.7,
        maxTokens: 4096
      },
      enabled: true
    }
  }
};

// Supprimer l'ancienne configuration OpenAI
delete newSettings.openai;

// Sauvegarder la nouvelle configuration
try {
  // Sauvegarder l'ancien fichier
  fs.copyFileSync(settingsPath, `${settingsPath}.backup`);
  
  // Écrire le nouveau fichier
  fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
  
  console.log('✅ Migration terminée avec succès !');
  console.log(`📄 Sauvegarde créée : ${settingsPath}.backup`);
} catch (err) {
  console.error('❌ Erreur lors de la sauvegarde:', err.message);
  process.exit(1);
}
```

#### Exécuter le script
```bash
node migrate-settings.js
```

---

## 🎨 Migration de l'UI

### Ancienne UI (Paramètres OpenAI)
```
Paramètres
└── OpenAI
    ├── Clé API
    ├── Base URL
    ├── Modèle
    └── Paramètres avancés
```

### Nouvelle UI (Paramètres Providers)
```
Paramètres
└── Providers
    ├── Sélecteur de provider actif
    ├── OpenAI (onglet)
    │   ├── Clé API
    │   ├── Base URL
    │   ├── Modèle
    │   └── Paramètres avancés
    ├── Mistral Ollama (onglet)
    │   ├── Base URL
    │   ├── Modèle
    │   └── Paramètres avancés
    └── Mistral Cloud (onglet)
        ├── Clé API
        ├── Base URL
        ├── Modèle
        └── Paramètres avancés
```

### Ce qui est conservé
- ✅ **Clé API OpenAI** : Toujours chiffrée et accessible
- ✅ **Base URL OpenAI** : Conservée
- ✅ **Modèle OpenAI** : Converti en `modelId`
- ✅ **Autres paramètres** : Thème, conversations, agents, etc.

### Ce qui est nouveau
- ➕ **Sélecteur de provider actif** : Pour changer de provider
- ➕ **Onglets par provider** : Configuration dédiée pour chaque provider
- ➕ **Boutons "Tester la connexion"** : Pour vérifier chaque provider
- ➕ **Boutons "Rafraîchir les modèles"** : Pour Mistral Ollama

---

## 📊 Migration des Données

### Conversations
- ✅ **Aucune modification** : Les conversations existantes restent inchangées
- ✅ **Compatibilité** : Les conversations créées avec OpenAI fonctionnent toujours
- ✅ **Nouveaux messages** : Utilisent le provider actuellement sélectionné

### Agents (ACP, AEL, etc.)
- ✅ **Aucune modification** : Les agents existants continuent de fonctionner
- ✅ **Provider par défaut** : Les agents utilisent le provider actif
- ⚠️ **À noter** : Les agents peuvent être configurés pour utiliser un provider spécifique (fonctionnalité future)

### Historique et Logs
- ✅ **Conservés** : Tous les historiques sont conservés
- ✅ **Nouveau format** : Les nouveaux logs incluent le `providerId`

---

## ⚠️ Problèmes Courants et Solutions

### Problème 1 : "Clé API manquante" après migration

**Symptômes** :
- NovaChat affiche "Clé API manquante" pour OpenAI
- La connexion échoue

**Causes** :
- La migration automatique a échoué
- La clé API n'a pas été copiée correctement

**Solutions** :
1. **Vérifier le fichier** `settings.json` :
   ```json
   {
     "providers": {
       "openai": {
         "apiKey": "[DOIT ÊTRE PRÉSENT]",
         ...
       }
     }
   }
   ```
2. **Récupérer depuis la sauvegarde** :
   ```bash
   # Depuis settings.json.backup, copier la clé API
   jq '.openai.apiKey' settings.json.backup
   ```
3. **Reconfigurer manuellement** :
   - Aller dans **Paramètres > Providers > OpenAI**
   - Entrer à nouveau votre clé API

---

### Problème 2 : "Provider inconnu" après migration

**Symptômes** :
- NovaChat affiche "Provider inconnu : openai"
- L'application ne démarre pas correctement

**Causes** :
- La nouvelle structure n'a pas été appliquée correctement
- `activeProviderId` est manquant

**Solutions** :
1. **Vérifier** `settings.json` :
   ```json
   {
     "providers": {
       "activeProviderId": "openai",  // DOIT ÊTRE PRÉSENT
       "openai": { ... }
     }
   }
   ```
2. **Ajouter manuellement** :
   ```json
   {
     "providers": {
       "activeProviderId": "openai",
       "openai": { ... }
     }
   }
   ```

---

### Problème 3 : "Modèle non trouvé" pour Mistral Ollama

**Symptômes** :
- Le test de connexion échoue avec "Modèle non trouvé"
- Ollama est démarré mais la connexion échoue

**Causes** :
- Le modèle n'est pas installé dans Ollama
- Le nom du modèle est incorrect

**Solutions** :
1. **Vérifier les modèles installés** :
   ```bash
   ollama list
   ```
2. **Installer le modèle** :
   ```bash
   ollama pull mistral:7b-instruct
   ```
3. **Sélectionner un modèle installé** dans NovaChat

---

### Problème 4 : Conversations existantes ne fonctionnent plus

**Symptômes** :
- Les anciennes conversations ne s'ouvrent pas
- Erreur lors du chargement des messages

**Causes** :
- Problème de compatibilité avec la nouvelle version
- Corruption des données

**Solutions** :
1. **Vérifier les sauvegardes** :
   ```bash
   ls -la ~/.config/nova-chat/userData/conversations/
   ```
2. **Restaurer depuis la sauvegarde** :
   ```bash
   cp -r ~/.config/nova-chat-backup/userData/conversations/ ~/.config/nova-chat/userData/
   ```
3. **Contacter le support** si le problème persiste

---

### Problème 5 : NovaChat ne démarre pas après migration

**Symptômes** :
- NovaChat crash au démarrage
- Erreur dans la console

**Causes** :
- Fichier `settings.json` corrompu
- Structure JSON invalide

**Solutions** :
1. **Valider le JSON** :
   ```bash
   jq . settings.json
   ```
2. **Corriger les erreurs** de syntaxe JSON
3. **Restaurer depuis la sauvegarde** :
   ```bash
   cp settings.json.backup settings.json
   ```
4. **Démarrer avec les paramètres par défaut** :
   ```bash
   mv settings.json settings.json.broken
   # NovaChat créera un nouveau fichier avec les paramètres par défaut
   ```

---

## 🔄 Migration Incrementale

Si vous préférez migrer **par étapes** :

### Étape 1 : Migrer uniquement OpenAI
1. Mettre à jour NovaChat
2. La configuration OpenAI est **automatiquement migrée**
3. Vérifier que OpenAI fonctionne
4. **Arrêter ici** si vous ne voulez pas utiliser Mistral

### Étape 2 : Ajouter Mistral Ollama
1. [Installer Ollama](OLLAMA_SETUP_GUIDE.md)
2. Aller dans **Paramètres > Providers > Mistral Ollama**
3. Configurer la **Base URL** et sélectionner un **modèle**
4. Tester la connexion
5. Basculer vers Mistral Ollama si souhaité

### Étape 3 : Ajouter Mistral Cloud (optionnel)
1. Créer un compte sur [mistral.ai](https://mistral.ai/)
2. Obtenir une **clé API**
3. Aller dans **Paramètres > Providers > Mistral Cloud**
4. Entrer votre **clé API**
5. Tester la connexion

---

## 📈 Vérification de la Migration

### Checklist de vérification

#### ✅ Configuration
- [ ] `settings.json` a une structure valide
- [ ] `providers.activeProviderId` est défini
- [ ] `providers.openai` existe avec la bonne configuration
- [ ] La clé API OpenAI est toujours chiffrée

#### ✅ Fonctionnalités OpenAI
- [ ] OpenAI peut être sélectionné comme provider actif
- [ ] Le test de connexion OpenAI réussit
- [ ] Les nouvelles conversations avec OpenAI fonctionnent
- [ ] Les anciennes conversations avec OpenAI fonctionnent

#### ✅ Fonctionnalités Mistral Ollama (si installé)
- [ ] Mistral Ollama peut être sélectionné comme provider actif
- [ ] Le test de connexion Mistral Ollama réussit
- [ ] Les nouvelles conversations avec Mistral Ollama fonctionnent

#### ✅ UI
- [ ] La page **Paramètres > Providers** s'affiche correctement
- [ ] Le **sélecteur de provider** fonctionne
- [ ] Les **onglets par provider** s'affichent correctement
- [ ] Les **boutons de test** fonctionnent

---

## 📚 Documentation Complémentaire

- [Guide d'installation d'Ollama](OLLAMA_SETUP_GUIDE.md)
- [Spécifications techniques Mistral](MISTRAL_SPECIFICATION.md)
- [Plan d'implémentation](MISTRAL_IMPLEMENTATION_PLAN.md)
- [Exemples de configuration](CONFIGURATION_EXAMPLES.md)
- [Guide de test](TESTING_GUIDE.md)

---

## 🆘 Support et Dépannage

### Où trouver de l'aide
| Problème | Ressource |
|----------|-----------|
| Migration échouée | Ce guide + [README](../README.md) |
| Problèmes avec Ollama | [Ollama Setup Guide](OLLAMA_SETUP_GUIDE.md) |
| Problèmes avec Mistral Cloud | [Mistral Documentation](https://docs.mistral.ai/) |
| Problèmes généraux | [NovaChat README](../../README.md) |
| Bugs | Ouvrir une issue sur le dépôt |

### Fichiers de log
Si vous rencontrez des problèmes, consultez les logs :
- **Logs NovaChat** : `~/.config/nova-chat/logs/` (Linux/macOS) ou `%APPDATA%\nova-chat\logs\` (Windows)
- **Logs Ollama** : 
  - **Linux/macOS** : `~/.ollama/logs/`
  - **Windows** : `%LOCALAPPDATA%\Ollama\logs\`

---

## 🎉 Conclusion

La migration vers la nouvelle architecture **multi-providers** de NovaChat est **simple et sécurisée** :

1. ✅ **Automatique** : La plupart des utilisateurs n'auront rien à faire
2. ✅ **Sans risque** : Vos données sont sauvegardées et conservées
3. ✅ **Flexible** : Vous pouvez choisir quand et comment migrer
4. ✅ **Extensible** : Ajoutez de nouveaux providers (Mistral, Anthropic, etc.) quand vous le souhaitez

**Prochaine étape** : [Commencer à utiliser Mistral Ollama](OLLAMA_SETUP_GUIDE.md) pour une expérience **locale, privée et gratuite** !

---

## 📅 Changelog de la Migration

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 30 oct. 2026 | Création initiale de ce guide |
| 1.1 | - | À venir : Mise à jour avec les retours utilisateurs |

---

**Statut** : ✅ **Prêt pour la migration**
**Version** : 1.0
**Date** : 30 octobre 2026
**Auteur** : Mistral Vibe (pour Thomas)
