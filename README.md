# Nova Chat

Nova Chat est une application desktop Electron + React pensee comme une interface de chat type ChatGPT, avec une persistance locale complete, une configuration provider, un canal `device` et maintenant un premier agent interne `device-agent` capable d'executer des commandes locales avec workflow de permission.

![Capture de Nova Chat](docs/screenshot.png)

## Fonctionnalites

- Interface de chat desktop avec theme Nova
- Conversations sauvegardees localement en JSON
- Parametres OpenAI sauvegardes localement
- Appel OpenAI via `Responses API`
- Execution de commandes locales via le canal `device`
- Premiere vue `Agents` avec page dediee `Device`
- Workflow `assistant -> device-agent -> system -> utilisateur`
- Permissions exactes stockees localement pour les commandes device
- Historique local des executions de l'agent device
- Boucle d'orchestration cote Electron :
  - `assistant -> device`
  - execution locale
  - `device -> assistant`
  - nouvel appel IA

## Stack

- Electron
- React
- TypeScript
- Electron Forge

## Lancer le projet

Installer les dependances :

```bash
npm install
```

Lancer l'application en developpement :

```bash
npm start
```

## Configuration OpenAI

Depuis l'application :

1. Ouvrir `Parametres` dans la navigation de gauche
2. Renseigner :
   - `OpenAI API Key`
   - `Model`
   - `Base URL` si necessaire
3. Cliquer sur `Tester la connexion`
4. Valider

Valeur classique pour `Base URL` :

```text
https://api.openai.com/v1
```

## Stockage local

Les donnees sont ecrites dans les chemins configures dans `Parametres > Fichier local` :

- conversations utilisateur :
  - `conversations.json`
  - un dossier par conversation
  - un dossier par message avec `message.json`, `log.json`, `apis.json`
- agents :
  - un dossier par agent
  - `contexte.json`
  - `permissions.json`
  - `historique.json`
  - `conversations/`
- parametres : `settings.json`

Sur macOS, avec la configuration actuelle du projet, cela donne generalement :

```text
~/Library/Application Support/nova-chat/nova-chat/
```

## Architecture

- `src/renderer` : interface utilisateur React
- `src/main` : orchestration IA, execution device, gestion des settings
- `src/preload.ts` : pont IPC securise entre renderer et main
- `src/shared` : types partages entre Electron et le renderer

Le renderer n'appelle pas OpenAI directement. Il envoie l'etat de conversation au main process, qui :

1. charge la configuration active
2. appelle le provider IA
3. delegue au `device-agent` si l'assistant cible `device`
4. demande une permission utilisateur si la commande est inconnue
5. execute la commande locale si elle est autorisee
6. renvoie au renderer uniquement les nouveaux messages et mises a jour

## Compatibilite

- macOS : OK
- Windows : OK pour l'infrastructure Electron et le lancement des commandes `device`
- Linux : OK sur le principe

Attention : les commandes generees par l'agent doivent rester coherentes avec l'OS cible. Une commande Unix comme `ls -la` ne fonctionnera pas sous `cmd.exe`.

## Etat actuel

Le projet est fonctionnel pour :

- discuter avec OpenAI
- sauvegarder les conversations localement
- tester et enregistrer une configuration provider
- executer des commandes locales via `device`
- afficher une vue `Agents` stable
- visualiser l'agent `Device`
- stocker le contexte, les permissions et l'historique du `device-agent`
- demander une validation utilisateur pour une commande inconnue

Les ameliorations naturelles ensuite seraient :

- capacite du `device-agent` a concevoir lui-meme une commande
- rafraichissement live de `DeviceAgentPage`
- support de providers locaux type Ollama
- streaming
- garde-fous supplementaires sur les commandes device
