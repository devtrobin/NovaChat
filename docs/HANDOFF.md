# Handoff

## Purpose

Ce document sert de point de reprise court apres une interruption, une compression de contexte, ou un changement d'agent.

## Current Branch Status

Etat attendu au moment de la redaction :
- grosse refacto structurelle terminee
- base stable
- `tsc` et `lint` doivent passer
- premiere iteration `device-agent` fonctionnelle

## What Was Just Finished

Chantiers recents termines :
- architecture renderer en `WorkspaceLayout` + `AppSidebar` + pages dediees
- remplacement des anciens concepts `Modal` par `SettingsPanel` / `SettingsPage`
- decoupage du `main` par domaines :
  - `ai`
  - `device`
  - `chat`
  - `ipc`
  - `window`
- decoupage des composants de messages
- creation de fichiers de contexte dans `docs/`
- premiere vue `Agents` stable
- premiere boucle `assistant -> device-agent -> permission -> execution`

## Current Safe Assumptions

On peut considerer comme stables :
- stockage local des conversations
- settings OpenAI
- pipeline `/cmd`
- pipeline `assistant -> device-agent -> assistant`
- navigation UI globale
- workflow de permission exact par commande
- stockage local du `device-agent`

## What Should Be Done Next

Priorite produit recommandee :
1. consolider `device-agent`
2. ameliorer la lisibilite et le rafraichissement de `DeviceAgentPage`
3. ensuite seulement etendre le systeme a d'autres agents

## Next Technical Entry Points

Pour commencer le systeme d'agents :
- [docs/AGENTS_PLAN.md](/Users/trobin/workspace/nova-chat/docs/AGENTS_PLAN.md)
- [src/renderer/pages/AgentsPage/AgentsPage.tsx](/Users/trobin/workspace/nova-chat/src/renderer/pages/AgentsPage/AgentsPage.tsx)
- [src/renderer/pages/AgentsPage/DeviceAgentPage/DeviceAgentPage.tsx](/Users/trobin/workspace/nova-chat/src/renderer/pages/AgentsPage/DeviceAgentPage/DeviceAgentPage.tsx)
- [src/main/agents/agent-storage.service.ts](/Users/trobin/workspace/nova-chat/src/main/agents/agent-storage.service.ts)
- [src/main/ai/ai.permission.service.ts](/Users/trobin/workspace/nova-chat/src/main/ai/ai.permission.service.ts)

## What Not To Reopen Without Reason

Eviter de repartir en grosse refacto sur :
- layout global
- nommage `WorkspaceLayout`
- nommage `AppSidebar`
- nommage `SettingsPanel`
- arborescence `main/ai`, `main/device`, `main/chat`

Ne reouvrir ces sujets que si le systeme d'agents casse vraiment l'architecture.

## Known Risks

Risques encore presents :
- le contexte global du projet est large
- le sujet multi-agents peut reintroduire de la complexite rapidement
- `device` reste un sujet sensible cote securite / UX

## Before Starting A New Large Task

Checklist :
1. relire `docs/ARCHITECTURE.md`
2. relire `docs/PROJECT_STATE.md`
3. relire `docs/AGENTS_PLAN.md`
4. lancer `npm exec tsc -- --noEmit`
5. lancer `npm run lint`
6. cadrer le chantier en une responsabilite principale

## Commit Rhythm Recommendation

Pour les prochains gros sujets :
- faire des commits plus petits
- un commit par etape logique
- eviter les megacommits de refacto + produit melanges

## Recovery Sentence

Si un autre agent reprend ce projet, la phrase de demarrage recommandee est :

> Lire `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md` et `docs/AGENTS_PLAN.md`, puis reprendre le chantier agents sans relancer de refacto globale.
