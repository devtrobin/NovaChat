# Guide d'Installation et Configuration - Ollama pour NovaChat

## 📌 Introduction

Ce guide détaille **comment configurer Ollama avec un modèle Mistral** pour l'utiliser comme **provider local** dans NovaChat.

**Objectif** : Permettre à NovaChat de communiquer avec **Ollama** pour exécuter des modèles **Mistral** localement, sans dépendre d'une API cloud.

---

## 🎯 Prérequis

### 1. Système d'exploitation supporté
Ollama est disponible sur :
- ✅ **Windows** 10/11 (64-bit)
- ✅ **macOS** 11+ (Apple Silicon ou Intel)
- ✅ **Linux** (Ubuntu 20.04+, Debian 11+, Fedora 38+, Arch, etc.)

### 2. Configuration matérielle minimale
| Composant | Recommandation (Mistral 7B) | Recommandation (Mistral Medium) |
|-----------|-----------------------------|--------------------------------|
| **RAM** | 8 Go minimum | 16 Go minimum |
| **CPU** | 4 cœurs | 8 cœurs |
| **Espace disque** | 10 Go libre | 20 Go libre |
| **GPU** | Optionnel (CPU-only) | Optionnel (CPU-only) |

> ⚠️ **Note** : Avec un GPU compatible (NVIDIA, AMD, Apple Silicon), les performances seront **beaucoup meilleures** et la consommation RAM réduite.

---

## 🚀 Installation d'Ollama

### 🪟 **Sur Windows**

#### Méthode 1 : Installateur officiel (recommandé)
1. Télécharger l'installateur depuis [ollama.ai](https://ollama.ai/)
2. Exécuter l'installateur (`.exe`)
3. Suivre les instructions (installation en `C:\Program Files\Ollama`)
4. **Cocher** "Add to PATH" pendant l'installation

#### Méthode 2 : Via Chocolatey
```powershell
choco install ollama
```

#### Vérification
```powershell
ollama --version
# Doit afficher : ollama version 0.3.x ou supérieur
```

#### Démarrer le service
Ollama s'installe comme un **service Windows** et démarre automatiquement.

Vérifier qu'il tourne :
```powershell
Get-Service -Name OllamaService
# Doit afficher : Running
```

#### Dépannage Windows
- **Problème** : `ollama` command not found
  **Solution** : Redémarrer le terminal ou ajouter manuellement Ollama au PATH
- **Problème** : Service ne démarre pas
  **Solution** : `Start-Service -Name OllamaService`
- **Problème** : Port 11434 déjà utilisé
  **Solution** : Changer le port dans la configuration Ollama ou arrêter le service conflit

---

### 🍎 **Sur macOS**

#### Méthode 1 : Installateur officiel
1. Télécharger le `.dmg` depuis [ollama.ai](https://ollama.ai/)
2. Ouvrir le fichier et glisser Ollama dans Applications
3. Lancer Ollama depuis Spotlight ou Launchpad

#### Méthode 2 : Via Homebrew
```bash
brew install ollama
```

#### Vérification
```bash
ollama --version
# Doit afficher : ollama version 0.3.x ou supérieur
```

#### Démarrer le service
```bash
# Ollama démarre automatiquement avec le fichier .app
# ou manuellement :
ollama serve
```

#### Dépannage macOS
- **Problème** : Permission denied
  **Solution** : `chmod +x /Applications/Ollama.app/Contents/MacOS/ollama`
- **Problème** : Firewall bloque le port 11434
  **Solution** : Autoriser Ollama dans les préférences Système > Sécurité > Firewall

---

### 🐧 **Sur Linux**

#### Méthode 1 : Script officiel
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Méthode 2 : Manuel
```bash
# Télécharger le binaire
curl -L https://ollama.ai/download/ollama-linux-amd64 -o ollama
chmod +x ollama
sudo mv ollama /usr/local/bin/
```

#### Démarrer le service
```bash
# Mode interactif (pour test)
ollama serve

# Mode service (recommandé)
ollama serve &
```

#### Installation comme service systemd (recommandé)
```bash
# Créer un fichier de service
sudo nano /etc/systemd/system/ollama.service
```

Coller :
```ini
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Puis :
```bash
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama  # Vérifier
```

#### Vérification
```bash
curl http://localhost:11434/api/tags
# Doit retourner une liste vide (ou avec vos modèles)
```

#### Dépannage Linux
- **Problème** : Port 11434 bloqué
  **Solution** : `sudo ufw allow 11434`
- **Problème** : `ollama: command not found`
  **Solution** : Vérifier le PATH ou utiliser le chemin complet
- **Problème** : Erreur de permission
  **Solution** : `sudo chown -R $USER:$USER ~/.ollama`

---

## 📥 Installation des modèles Mistral

### 1. Vérifier qu'Ollama est démarré
```bash
curl http://localhost:11434/api/tags
# Doit retourner un JSON (peut être vide)
```

Si vous obtenez une erreur de connexion, Ollama n'est pas démarré.

---

### 2. Liste des modèles Mistral disponibles

| Nom du modèle | Taille | RAM requise | Description |
|--------------|--------|-------------|-------------|
| `mistral:latest` | ~14 Go | 16 Go+ | Dernière version de Mistral |
| `mistral:7b` | ~7 Go | 8 Go+ | Mistral 7B |
| `mistral:7b-instruct` | ~7 Go | 8 Go+ | Mistral 7B Instruct (meilleur pour le chat) |
| `mistral:7b-q4_0` | ~4 Go | 6 Go+ | Mistral 7B quantisé (Q4) |
| `mistral:7b-q4_K_M` | ~3.8 Go | 6 Go+ | Mistral 7B quantisé (Q4_K_M, équilibre qualité/taille) |
| `mistral:7b-q8_0` | ~7 Go | 8 Go+ | Mistral 7B quantisé (Q8, meilleure qualité) |
| `codestral:latest` | ~22 Go | 24 Go+ | Spécialisé pour le code |

> 💡 **Recommandation** : Pour NovaChat, commencez avec `mistral:7b-instruct` ou `mistral:latest`.

---

### 3. Télécharger un modèle

#### Commande de base
```bash
ollama pull <nom-du-modèle>
```

#### Exemples
```bash
# Télécharger Mistral 7B Instruct (recommandé pour le chat)
ollama pull mistral:7b-instruct

# Télécharger la dernière version de Mistral
ollama pull mistral:latest

# Télécharger Mistral quantisé (pour les machines avec peu de RAM)
ollama pull mistral:7b-q4_K_M
```

#### Progression du téléchargement
Ollama affiche la progression :
```
pulling manifest
pulling 4/5 layers
Downloaded 2.3 GB of 7.1 GB (32%)
```

#### Temps de téléchargement
- Dépend de votre connexion internet
- Mistral 7B : ~7 Go à télécharger
- Mistral 7B quantisé : ~4 Go

---

### 4. Vérifier les modèles installés

#### Liste des modèles locaux
```bash
ollama list
```

Exemple de sortie :
```
NAME                    ID              SIZE    MODIFIED
mistral:7b-instruct     abc123def456    7.1 GB  2026-10-30 12:00:00
mistral:latest          xyz789uvw012    14 GB   2026-10-30 12:30:00
```

#### Vérifier via l'API
```bash
curl http://localhost:11434/api/tags
```

Exemple de réponse :
```json
{
  "models": [
    {
      "name": "mistral:7b-instruct",
      "digest": "abc123def456",
      "modified_at": "2026-10-30T12:00:00Z",
      "size": 7100000000
    },
    {
      "name": "mistral:latest",
      "digest": "xyz789uvw012",
      "modified_at": "2026-10-30T12:30:00Z",
      "size": 14000000000
    }
  ]
}
```

---

### 5. Mettre à jour un modèle

```bash
# Mettre à jour un modèle existant
ollama pull mistral:latest

# Ollama gère automatiquement les mises à jour
```

---

### 6. Supprimer un modèle

```bash
# Supprimer un modèle
ollama rm mistral:7b-instruct

# Supprimer tous les modèles
ollama rm -a
```

---

## 🔧 Configuration dans NovaChat

### 1. Sélectionner Mistral Ollama comme provider

1. Ouvrir NovaChat
2. Aller dans **Paramètres** (⚙️)
3. Sélectionner **Providers**
4. Dans le sélecteur de provider actif, choisir **Mistral Ollama**

---

### 2. Configurer Mistral Ollama

Dans l'onglet **Mistral Ollama**, vous trouverez :

| Champ | Valeur par défaut | Description |
|-------|-------------------|-------------|
| **Base URL** | `http://localhost:11434` | URL du serveur Ollama |
| **Modèle** | `mistral:latest` | Modèle à utiliser |
| **Température** | `0.7` | Créativité (0.0 - 1.0) |
| **Max Tokens** | `4096` | Limite de tokens dans la réponse |
| **Top P** | `0.9` | Sampling top-p |
| **Top K** | `50` | Sampling top-k |

---

### 3. Tester la connexion

1. Cliquer sur le bouton **"Tester la connexion"**
2. NovaChat va :
   - Vérifier qu'Ollama est accessible sur `http://localhost:11434`
   - Vérifier que le modèle sélectionné existe
   - Afficher un message de succès ou d'erreur

#### Messages possibles
| Message | Signification | Solution |
|---------|--------------|----------|
| ✅ Connexion réussie | Ollama + modèle OK | Prêt à utiliser |
| ❌ Ollama non trouvé | Ollama n'est pas démarré | Démarrer Ollama |
| ❌ Modèle non trouvé | Le modèle n'est pas installé | `ollama pull <modèle>` |
| ❌ Erreur réseau | Problème de connexion | Vérifier le port/firewall |

---

### 4. Sauvegarder la configuration

La configuration est **automatiquement sauvegardée** dans `settings.json` :

```json
{
  "providers": {
    "activeProviderId": "mistral-ollama",
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

---

## 🚀 Utilisation avec NovaChat

### 1. Démarrer une nouvelle conversation
1. Sélectionner **Mistral Ollama** comme provider actif
2. Cliquer sur **Nouvelle conversation**
3. Envoyer un message

### 2. Exemple de conversation

**Vous** :
```
Bonjour, peux-tu m'expliquer comment fonctionne un moteur électrique ?
```

**NovaChat (via Mistral Ollama)** :
```
Un moteur électrique fonctionne sur le principe de l'électromagnétisme. Il convertit l'énergie électrique en énergie mécanique grâce à des champs magnétiques créés par des bobines de fil traversées par un courant électrique...
```

---

### 3. Changer de modèle

1. Aller dans **Paramètres > Providers > Mistral Ollama**
2. Sélectionner un autre modèle dans le dropdown
3. Cliquer sur **"Tester la connexion"** pour vérifier
4. Les nouvelles conversations utiliseront le nouveau modèle

> ⚠️ **Note** : Les conversations existantes continuent avec le modèle utilisé lors de leur création.

---

## 🔄 Rafraîchir la liste des modèles

Si vous installez un nouveau modèle **pendant que NovaChat est ouvert** :

1. Cliquer sur **"Rafraîchir la liste des modèles"**
2. Le dropdown des modèles sera mis à jour
3. Vous pourrez sélectionner le nouveau modèle

---

## ⚡ Optimisation des performances

### 1. Réduire la consommation RAM

- Utiliser des **modèles quantisés** : `mistral:7b-q4_K_M` au lieu de `mistral:latest`
- Limiter le **maxTokens** : Réduire à 2048 ou 1024 si vous n'avez pas besoin de longues réponses
- Fermer les **autres applications** gourmandes en RAM

### 2. Améliorer la vitesse

- Utiliser un **GPU** : Ollama utilise automatiquement le GPU si disponible
- Réduire la **température** : Une température plus basse (= plus déterministe) peut être plus rapide
- Utiliser des **modèles plus petits** : `mistral:7b` est plus rapide que `mistral:latest`

### 3. Vérifier l'utilisation du GPU

Sur Linux/macOS :
```bash
# Vérifier que Ollama utilise le GPU
ollama serve
# Dans les logs, chercher :
# Using GPU: NVIDIA GeForce RTX 3080 (or similar)
```

Sur Windows :
- Ouvrir le **Gestionnaire des tâches**
- Vérifier que `ollama.exe` utilise le GPU

---

## 🛠 Dépannage

### Problème 1 : "Ollama non trouvé" dans NovaChat

**Cause** : Ollama n'est pas démarré ou le service ne répond pas.

**Solutions** :
1. **Windows** :
   ```powershell
   Start-Service -Name OllamaService
   ```
2. **macOS** :
   - Lancer Ollama depuis Spotlight
3. **Linux** :
   ```bash
   ollama serve
   ```

**Vérification** :
```bash
curl http://localhost:11434/api/tags
# Doit retourner un JSON (peut être vide)
```

---

### Problème 2 : "Modèle non trouvé"

**Cause** : Le modèle n'est pas installé ou le nom est incorrect.

**Solutions** :
1. Vérifier les modèles installés :
   ```bash
   ollama list
   ```
2. Installer le modèle :
   ```bash
   ollama pull mistral:7b-instruct
   ```
3. Dans NovaChat, cliquer sur **"Rafraîchir la liste des modèles"**

---

### Problème 3 : Réponses trop lentes

**Causes possibles** :
- Modèle trop grand pour votre matériel
- CPU uniquement (pas de GPU)
- RAM insuffisante

**Solutions** :
1. Utiliser un modèle plus petit :
   ```bash
   ollama pull mistral:7b-q4_K_M
   ```
2. Réduire les paramètres :
   - `maxTokens`: 2048
   - `temperature`: 0.5
3. Fermer d'autres applications
4. Utiliser un GPU (si disponible)

---

### Problème 4 : Erreur "Out of Memory"

**Cause** : Le modèle nécessite plus de RAM que disponible.

**Solutions** :
1. Utiliser un modèle plus petit :
   ```bash
   ollama pull mistral:7b-q4_0  # ~4 Go au lieu de ~7 Go
   ```
2. Réduire `maxTokens` : 1024 ou moins
3. Fermer d'autres applications
4. Ajouter de la RAM à votre machine (solution matérielle)

---

### Problème 5 : Port 11434 déjà utilisé

**Cause** : Un autre service utilise le port 11434.

**Solutions** :
1. Trouver le processus qui utilise le port :
   - **Windows** : `netstat -ano | findstr 11434`
   - **Linux/macOS** : `lsof -i :11434`
2. Arrêter le processus conflit ou le reconfigurer
3. Changer le port d'Ollama (option avancée) :
   ```bash
   # Démarrer Ollama sur un autre port
   OLLAMA_HOST=0.0.0.0 OLLAMA_PORT=11435 ollama serve
   ```
   Puis mettre à jour la **Base URL** dans NovaChat : `http://localhost:11435`

---

### Problème 6 : "Connection refused" ou timeout

**Causes possibles** :
- Ollama n'est pas démarré
- Firewall bloque le port 11434
- NovaChat et Ollama ne sont pas sur la même machine (pour une utilisation locale)

**Solutions** :
1. Vérifier qu'Ollama est démarré (voir Problème 1)
2. **Windows** : Autoriser le port dans le firewall
   ```powershell
   New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -Protocol TCP -LocalPort 11434 -Action Allow
   ```
3. **Linux** :
   ```bash
   sudo ufw allow 11434
   ```
4. **macOS** : Autoriser Ollama dans les préférences Firewall

---

## 📊 Vérification de l'installation

### Checklist finale

- [ ] Ollama est installé (`ollama --version` fonctionne)
- [ ] Ollama est démarré (`curl http://localhost:11434/api/tags` retourne un JSON)
- [ ] Un modèle Mistral est installé (`ollama list` affiche au moins un modèle)
- [ ] NovaChat peut se connecter à Ollama (test de connexion réussi)
- [ ] NovaChat peut envoyer des messages et recevoir des réponses

---

## 🔗 Ressources utiles

### Documentation officielle
- [Ollama GitHub](https://github.com/ollama/ollama)
- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Modèles disponibles sur Ollama](https://ollama.ai/library)

### Communauté
- [Discord Ollama](https://discord.gg/ollama)
- [Discussions GitHub](https://github.com/ollama/ollama/discussions)

### Outils complémentaires
- [Ollama CLI](https://github.com/ollama/ollama#usage) : Pour gérer les modèles en ligne de commande
- [Ollama WebUI](https://github.com/ollama/ollama-webui) : Interface web alternative

---

## 📝 Notes techniques pour les développeurs

### Architecture d'Ollama
Ollama est composé de :
- **Serveur** : Gère les modèles et les requêtes (port 11434)
- **Modèles** : Stockés dans `~/.ollama/models/` (Linux/macOS) ou `%USERPROFILE%\.ollama\models\` (Windows)
- **Manifests** : Métadonnées des modèles

### API d'Ollama
Les endpoints principaux :
- `GET /api/tags` : Liste des modèles installés
- `POST /api/generate` : Génération simple
- `POST /api/chat` : Chat completion (recommandé pour NovaChat)

### Exemple de requête API
```bash
curl http://localhost:11434/api/chat -H "Content-Type: application/json" -d '{
  "model": "mistral:7b-instruct",
  "messages": [
    {"role": "user", "content": "Bonjour !"}
  ],
  "stream": false
}'
```

---

## 🎉 Conclusion

Avec Ollama et un modèle Mistral installé, vous avez maintenant un **provider local puissant** pour NovaChat, qui :
- ✅ **Ne nécessite pas de connexion internet** (sauf pour télécharger les modèles)
- ✅ **Garantit la confidentialité** de vos données
- ✅ **Est gratuit** (pas de coût par token)
- ✅ **Fonctionne hors ligne** une fois les modèles installés

**Prochaine étape** : [Configurer Mistral Cloud](MISTRAL_CLOUD_GUIDE.md) si vous souhaitez aussi utiliser l'API distante de Mistral AI.
