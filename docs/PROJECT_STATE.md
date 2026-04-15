# Project State

## Purpose

Ce document sert de point de reprise rapide pour un humain ou un autre agent.

## Stable Today

Le projet sait deja faire :
- afficher un chat desktop coherent
- persister les conversations localement
- persister les settings localement
- appeler OpenAI via `Responses API`
- executer des commandes locales via `device`
- gerer `/cmd` pour l'utilisateur
- afficher les logs et traces API par message
- naviguer entre `Conversations`, `Agents`, `Parametres`
- stocker un espace local dedie par agent
- afficher et editer le contexte du `device-agent`
- journaliser les conversations internes assistant <-> device-agent
- demander une permission utilisateur pour toute commande inconnue

## Current UI

Navigation gauche :
- `Conversations`
- `Agents`
- `Parametres`

Zone droite :
- `ChatPage`
- `AgentsPage`
- `SettingsPage`

## Current Provider Support

Provider reellement branche :
- `OpenAI`

Providers visibles ou prepares :
- `Anthropic`
- `Google`
- `Mistral`
- `Ollama`
- `LM Studio`

Pour l'instant, seul `OpenAI` a un formulaire complet.

## Device Behavior Today

Supporte :
- execution de commande
- kill de commande
- retour du resultat dans la meme bulle
- saisie interactive si le terminal attend une entree
- retour `device -> assistant`

Limites actuelles :
- la policy `device` reste simple
- permissions exactes seulement, pas encore de patterns
- une seule demande de permission active par conversation principale
- le `device-agent` n'a pas encore son propre appel LLM

## Refactor Status

La grosse remise au propre est consideree comme terminee.

Etat actuel :
- architecture claire
- fichiers raisonnablement segmentes
- plus de gros composants React "god files"
- `main` decoupe par domaines

Validation actuelle :
- `npm exec tsc -- --noEmit` passe
- `npm run lint` passe

## Remaining Technical Hotspots

Encore un peu denses mais acceptables :
- `src/main/device/device.runtime.ts`
- `src/renderer/components/WorkspaceLayout/WorkspaceLayout.service.ts`

Ces fichiers ne sont pas consideres comme bloquants.

## Known Product Gaps

Sujets volontairement repousses :
- extension du systeme d'agents au-dela de `device-agent`
- permissions evoluees sur `device`
- provider local reel
- resume intelligent de conversation
- streaming provider

## Recommended Next Steps

Ordre recommande :
1. consolider `device-agent`
2. lui donner sa propre conception de commande
3. durcir les actions `device`
4. ajouter plus tard un provider local

## Recovery Checklist

Avant de toucher un gros sujet :
1. lire `docs/ARCHITECTURE.md`
2. lire `docs/AGENTS_PLAN.md`
3. verifier que `tsc` et `lint` passent
4. travailler par chantier borne

## Important Decisions Already Made

- l'IA est orchestree cote Electron `main`
- le renderer ne parle pas directement aux providers
- les conversations sont stockees sous forme de dossiers eclates
- la structure UI globale s'appelle `WorkspaceLayout`
- la barre de gauche s'appelle `AppSidebar`
- `SettingsModal` a ete remplace par `SettingsPanel` / `SettingsPage`
