# Architecture

## Purpose

Nova Chat est une application desktop Electron + React qui :
- affiche une interface de chat
- persiste localement les conversations et les settings
- appelle un provider IA depuis le process `main`
- peut executer des commandes locales via un canal `device`

Le renderer ne parle jamais directement a OpenAI ni au shell local.

## High-Level Flow

```text
Renderer
  -> preload API
  -> main process
  -> provider IA / device / storage
  -> events de retour vers le renderer
```

Flux standard :
1. le renderer envoie la conversation + le nouveau message
2. le `main` orchestre le tour IA
3. si l'assistant demande `device`, le `main` execute la commande
4. le `main` renvoie des events `append/replace/remove`
5. le renderer met a jour la conversation locale

## Main Folders

### `src/main`

- `ai/`
  - orchestration du tour IA
  - appel provider OpenAI
  - boucle `assistant -> device -> assistant`
- `chat/`
  - lecture/ecriture des conversations sur disque
- `device/`
  - execution shell
  - policy de commandes
  - suivi des commandes en cours
- `ipc/`
  - enregistrement des handlers IPC par domaine
- `settings/`
  - lecture/ecriture de la configuration applicative
- `window/`
  - creation de la fenetre Electron

### `src/renderer`

- `components/WorkspaceLayout`
  - shell global de l'application
- `components/AppSidebar`
  - navigation gauche : conversations / agents / parametres
- `components/SettingsPanel`
  - contenu de la page de parametres
- `components/MessageItem`
  - rendu des messages chat / device / system
- `pages/ChatPage`
  - page de chat
- `pages/AgentsPage`
  - placeholder agents
- `pages/SettingsPage`
  - page parametres
- `services/workspace`
  - types et helpers du shell workspace

### `src/shared`

Types partages entre `main`, `preload` et `renderer`.

## Renderer Layout

Le layout courant est :

```text
App
  -> LoadingScreen
  -> WorkspaceLayout
       -> AppSidebar
       -> ChatPage | AgentsPage | SettingsPage
```

`WorkspaceLayout` porte :
- la navigation de haut niveau
- la conversation active
- le mode preview
- les handlers transmis aux pages

## AI Architecture

Entrypoint principal :
- [src/main/ai/ai.orchestrator.ts](/Users/trobin/workspace/nova-chat/src/main/ai/ai.orchestrator.ts)

Sous-modules importants :
- `ai.orchestrator.commands.ts`
  - gestion de `/cmd`
- `ai.orchestrator.cycle.ts`
  - cycle assistant / device / assistant
- `ai.orchestrator.errors.ts`
  - classification et rendu des erreurs
- `openai.service.ts`
  - point d'entree OpenAI
- `openai.payload.ts`
  - construction du payload
- `openai.parser.ts`
  - parsing de la reponse provider

## Device Architecture

Entrypoints :
- [src/main/device/device.service.ts](/Users/trobin/workspace/nova-chat/src/main/device/device.service.ts)
- [src/main/device/device.runtime.ts](/Users/trobin/workspace/nova-chat/src/main/device/device.runtime.ts)

Responsabilites :
- `device.policy.ts`
  - validation / blocage de commandes
- `device.shell.ts`
  - choix du shell selon l'OS
- `device.registry.ts`
  - commandes en cours
- `device.progress.ts`
  - detection des prompts interactifs
- `device.results.ts`
  - objets de retour standardises

## Storage

Les conversations sont eclatees :
- un index global `conversations.json`
- un dossier par conversation
- un dossier par message

Dans chaque dossier message :
- `message.json`
- `log.json`
- `apis.json`

Le stockage est gere par :
- [src/main/chat/chat-storage.service.ts](/Users/trobin/workspace/nova-chat/src/main/chat/chat-storage.service.ts)
- `chat-storage.reader.ts`
- `chat-storage.writer.ts`

## Settings

Type racine :
- [src/shared/settings.types.ts](/Users/trobin/workspace/nova-chat/src/shared/settings.types.ts)

Settings actuels :
- `activeProvider`
- `openai`
- `localFiles`
- `previewMode`

Le `main` lit/ecrit les settings. Le renderer ne fait qu'utiliser l'API exposee par `preload`.

## Naming Conventions

Conventions actuelles :
- `Page` : ecran principal du workspace
- `Panel` : bloc UI integre dans une page
- `Layout` : structure globale de l'ecran
- `service` / `use*` : logique et orchestration

Noms a retenir :
- `WorkspaceLayout`
- `AppSidebar`
- `SettingsPanel`

## What Not To Do

- Ne pas appeler OpenAI depuis le renderer
- Ne pas executer de commande shell depuis le renderer
- Ne pas remettre de logique metier lourde dans les composants React
- Ne pas reintroduire des composants nommes `Modal` pour des pages integrees
