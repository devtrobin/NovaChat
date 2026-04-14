# Handoff

## Purpose

Ce document sert de point de reprise court apres une interruption, une compression de contexte, ou un changement d'agent.

## Current Branch Status

Etat attendu au moment de la redaction :
- grosse refacto structurelle terminee
- base stable
- `tsc` et `lint` doivent passer

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

## Current Safe Assumptions

On peut considerer comme stables :
- stockage local des conversations
- settings OpenAI
- pipeline `/cmd`
- pipeline `assistant -> device -> assistant`
- navigation UI globale

## What Should Be Done Next

Priorite produit recommandee :
1. commencer le systeme d'agents
2. definir le workflow de permissions autour de l'agent `device`
3. seulement apres, reprendre du durcissement `device` si necessaire

## Next Technical Entry Points

Pour commencer le systeme d'agents :
- [docs/AGENTS_PLAN.md](/Users/trobin/workspace/nova-chat/docs/AGENTS_PLAN.md)
- [src/renderer/pages/AgentsPage/AgentsPage.tsx](/Users/trobin/workspace/nova-chat/src/renderer/pages/AgentsPage/AgentsPage.tsx)
- [src/renderer/components/AppSidebar/AppSidebar.tsx](/Users/trobin/workspace/nova-chat/src/renderer/components/AppSidebar/AppSidebar.tsx)
- [src/main/ai/ai.orchestrator.ts](/Users/trobin/workspace/nova-chat/src/main/ai/ai.orchestrator.ts)

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
- le sujet agents peut reintroduire de la complexite rapidement
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
