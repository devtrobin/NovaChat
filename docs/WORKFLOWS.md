# Workflows

## Purpose

Ce document decrit les flux metier concrets du projet.  
Il sert a comprendre rapidement comment les pieces techniques collaborent.

## 1. User Message -> Assistant Reply

Flux nominal :

```text
ChatInput
  -> ChatPage
  -> WorkspaceLayout handlers
  -> window.nova.ai.runTurn(...)
  -> main ai orchestrator
  -> OpenAI
  -> ai events
  -> renderer state update
```

Etapes :
1. l'utilisateur envoie un message dans `ChatInput`
2. `ChatPage` delegue a `WorkspaceLayout`
3. le renderer appelle `window.nova.ai.runTurn(request)`
4. le `main` charge les settings actifs
5. `ai.orchestrator` cree le message user et le message systeme de travail
6. OpenAI est appele
7. le `main` emet des events `append-messages`, `replace-message`, `remove-message`
8. le renderer applique ces events a la conversation active

Fichiers cles :
- [src/preload.ts](/Users/trobin/workspace/nova-chat/src/preload.ts)
- [src/main/ipc/ai.handlers.ts](/Users/trobin/workspace/nova-chat/src/main/ipc/ai.handlers.ts)
- [src/main/ai/ai.orchestrator.ts](/Users/trobin/workspace/nova-chat/src/main/ai/ai.orchestrator.ts)
- [src/renderer/pages/ChatPage/ChatPage.tsx](/Users/trobin/workspace/nova-chat/src/renderer/pages/ChatPage/ChatPage.tsx)
- [src/renderer/pages/ChatPage/ChatPage.events.ts](/Users/trobin/workspace/nova-chat/src/renderer/pages/ChatPage/ChatPage.events.ts)

## 2. Assistant -> Device-Agent -> Assistant

Flux :

```text
OpenAI reply
  -> providerResponse to=device
  -> internal agent conversation
  -> optional permission request
  -> local command execution
  -> device-agent result message
  -> new OpenAI cycle
```

Etapes :
1. OpenAI renvoie un message Nova `from=assistant` `to=device`
2. l'orchestrateur cree une nouvelle conversation `assistant <-> device-agent`
3. `agent-storage.service.ts` journalise la demande et prepare `historique.json`
4. si la commande est inconnue, `ai.permission.service.ts` injecte une demande utilisateur dans la conversation principale
5. si la commande est autorisee, `device.service` la lance localement
6. les updates de progression sont renvoyees au renderer
7. la commande se termine
8. le resultat devient un message `device -> assistant`
9. l'orchestrateur relance un cycle IA avec ce nouveau contexte

Fichiers cles :
- [src/main/ai/ai.orchestrator.cycle.ts](/Users/trobin/workspace/nova-chat/src/main/ai/ai.orchestrator.cycle.ts)
- [src/main/ai/ai.device-flow.ts](/Users/trobin/workspace/nova-chat/src/main/ai/ai.device-flow.ts)
- [src/main/ai/ai.permission.service.ts](/Users/trobin/workspace/nova-chat/src/main/ai/ai.permission.service.ts)
- [src/main/agents/agent-storage.service.ts](/Users/trobin/workspace/nova-chat/src/main/agents/agent-storage.service.ts)
- [src/main/device/device.service.ts](/Users/trobin/workspace/nova-chat/src/main/device/device.service.ts)
- [src/main/device/device.runtime.ts](/Users/trobin/workspace/nova-chat/src/main/device/device.runtime.ts)

## 3. `/cmd`

Le mot-cle `/cmd` bypass l'appel OpenAI.

Exemple :
```text
/cmd ls
```

Etapes :
1. `ai.orchestrator` detecte `/cmd`
2. il cree un message user standard
3. il cree ensuite une execution `device` directe
4. la commande s'affiche dans la meme pipeline que les commandes assistant
5. le resultat revient vers l'utilisateur, pas vers l'assistant

Fichiers cles :
- [src/main/ai/ai.orchestrator.commands.ts](/Users/trobin/workspace/nova-chat/src/main/ai/ai.orchestrator.commands.ts)

## 4. Device Interactive Input

Supporte :
- prompt mot de passe
- demandes de saisie simples

Etapes :
1. la commande ecrit sur `stdout` / `stderr`
2. `device.progress.ts` detecte qu'une entree utilisateur est attendue
3. le renderer affiche un champ de saisie dans la bulle `device`
4. l'utilisateur envoie une valeur
5. `window.nova.ai.submitCommandInput(...)` pousse cette valeur dans `stdin`

Fichiers cles :
- [src/main/device/device.progress.ts](/Users/trobin/workspace/nova-chat/src/main/device/device.progress.ts)
- [src/main/ipc/ai.handlers.ts](/Users/trobin/workspace/nova-chat/src/main/ipc/ai.handlers.ts)

## 5. Conversation Loading / Saving

Chargement :
1. le renderer appelle `window.nova.chat.load()`
2. `main/ipc/chat.handlers.ts` choisit le bon dossier
3. `chat-storage.reader.ts` reconstruit l'etat depuis les dossiers

Sauvegarde :
1. le renderer appelle `window.nova.chat.save(state)`
2. le `main` serialize les sauvegardes avec une queue
3. `chat-storage.writer.ts` ecrit :
   - `conversations.json`
   - un dossier par conversation
   - un dossier par message

Fichiers cles :
- [src/main/ipc/chat.handlers.ts](/Users/trobin/workspace/nova-chat/src/main/ipc/chat.handlers.ts)
- [src/main/chat/chat-storage.reader.ts](/Users/trobin/workspace/nova-chat/src/main/chat/chat-storage.reader.ts)
- [src/main/chat/chat-storage.writer.ts](/Users/trobin/workspace/nova-chat/src/main/chat/chat-storage.writer.ts)

## 6. Settings Loading / Saving

Chargement :
1. le renderer ouvre `SettingsPage`
2. `SettingsPanel` charge via `window.nova.settings.load()`

Test :
1. le renderer appelle `window.nova.settings.test(settings)`
2. le `main` teste le provider actif
3. aujourd'hui seul `OpenAI` est supporte

Sauvegarde :
1. `window.nova.settings.save(settings)`
2. `main/settings.service.ts` ecrit les chemins et la config provider

Fichiers cles :
- [src/main/ipc/settings.handlers.ts](/Users/trobin/workspace/nova-chat/src/main/ipc/settings.handlers.ts)
- [src/main/settings/settings.service.ts](/Users/trobin/workspace/nova-chat/src/main/settings/settings.service.ts)

## 7. Permission Request Workflow

Flux :

```text
assistant asks device-agent
  -> command unknown
  -> system message in main conversation
  -> user decision
  -> allow / allow-always / deny
```

Etapes :
1. l'assistant delegue une commande au `device-agent`
2. `permissions.json` est verifie
3. si la commande exacte n'existe pas, Nova cree un message systeme structure
4. l'utilisateur choisit :
   - `Oui`
   - `Oui permanent`
   - `Non`
5. la decision est renvoyee au `main` via `submitPermissionDecision`
6. le `device-agent` execute, memorise ou refuse selon le cas

Fichiers cles :
- [src/main/ai/ai.permission.service.ts](/Users/trobin/workspace/nova-chat/src/main/ai/ai.permission.service.ts)
- [src/main/ipc/ai.handlers.ts](/Users/trobin/workspace/nova-chat/src/main/ipc/ai.handlers.ts)
- [src/renderer/components/MessageItem/MessageItemSystem.tsx](/Users/trobin/workspace/nova-chat/src/renderer/components/MessageItem/MessageItemSystem.tsx)

## 8. Sidebar Navigation

Le shell global est `WorkspaceLayout`.

Fonctionnement :
- `AppSidebar` change la section active
- `WorkspaceLayout` choisit la page de droite
- `ChatPage`, `AgentsPage`, `SettingsPage` ne gerent que leur contenu

Fichiers cles :
- [src/renderer/components/WorkspaceLayout/WorkspaceLayout.tsx](/Users/trobin/workspace/nova-chat/src/renderer/components/WorkspaceLayout/WorkspaceLayout.tsx)
- [src/renderer/components/AppSidebar/AppSidebar.tsx](/Users/trobin/workspace/nova-chat/src/renderer/components/AppSidebar/AppSidebar.tsx)

## 9. Search In Active Conversation

Supporte :
- `Ctrl+F` / `Cmd+F`
- surlignage
- navigation dans les resultats
- centrage du message actif

Fichiers cles :
- [src/renderer/pages/ChatPage/useConversationSearch.ts](/Users/trobin/workspace/nova-chat/src/renderer/pages/ChatPage/useConversationSearch.ts)
- [src/renderer/pages/ChatPage/ChatSearchBar.tsx](/Users/trobin/workspace/nova-chat/src/renderer/pages/ChatPage/ChatSearchBar.tsx)

## 10. Useful Recovery Paths

Si un bug apparait :
- bug UI conversation : commencer par `renderer/pages/ChatPage/*`
- bug sidebar/navigation : `WorkspaceLayout` + `AppSidebar`
- bug provider : `main/ai/*`
- bug shell/command : `main/device/*`
- bug persistence : `main/chat/*`
- bug settings : `main/settings/*` + `main/ipc/settings.handlers.ts`
