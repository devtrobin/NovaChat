# Dev Rules

> Nomenclature cible de la phase 6.1 : ACP/AEL, y compris chemins, types et
> contrats techniques. Le code n’est pas encore renommé. Le changement complet
> et la remise à zéro sans compatibilité seront implémentés après finalisation
> de la documentation ; voir [ADR 005](decisions/005-acp-ael-breaking-reset.md).

## Purpose

Ces regles servent a garder le projet lisible, stable et coherent dans le temps.

## General Rules

- privilegier la clarte avant l'ingeniosite
- garder les responsabilites bien separees
- ne pas reintroduire de logique metier lourde dans les composants React
- preferer plusieurs petits modules coherents a un gros fichier central

## Renderer Rules

- `pages/` pour les ecrans principaux du workspace
- `components/` pour les blocs UI reutilisables
- `services/` et `use*` pour la logique ou l'orchestration
- les composants React doivent rester principalement declaratifs

Regle pratique :
- si un composant commence a gerer beaucoup de logique metier, extraire vers un hook ou un service

## Main Process Rules

- toute logique provider doit rester dans `src/main/ai`
- toute logique shell / machine doit rester dans `src/main/ael`
- toute persistence conversationnelle doit rester dans `src/main/chat`
- l'enregistrement des IPC doit rester dans `src/main/ipc`

Ne pas :
- appeler OpenAI depuis le renderer
- appeler le shell depuis le renderer
- dupliquer la logique d'orchestration entre renderer et main

## Naming Rules

Conserver ces noms :
- `WorkspaceLayout`
- `AppSidebar`
- `SettingsPanel`
- `ChatPage`
- `AgentsPage`
- `SettingsPage`

Conventions :
- `Page` = ecran principal
- `Panel` = bloc d'interface integre
- `Layout` = structure globale
- `service` = logique fonctionnelle
- `use*` = hook React / orchestration renderer

Eviter :
- reintroduire des noms `Modal` si le contenu est une vraie page
- melanger francais et anglais dans les noms de fichiers

## Storage Rules

- les conversations restent eclatees par conversation et par message
- `message.json`, `log.json`, `apis.json` ont des roles distincts
- ne pas retransformer le stockage en un seul gros fichier

## AI / AEL Rules

- les messages Nova sont la source de verite
- `from` / `to` doivent rester explicites
- les traces API et logs ne doivent pas polluer le payload provider
- la boucle `assistant -> ael -> assistant` doit rester cote `main`

## Refactor Rules

- ne pas lancer de grosse refacto sans besoin reel
- si une refacto est necessaire, la borner a un domaine clair
- privilegier les refactos qui reduisent une responsabilite melangee
- eviter les micro-fichiers artificiels juste pour passer sous un nombre de lignes
- traiter la cible de 100 lignes comme un signal de revue, pas comme une raison
  suffisante de découper un module métier cohérent

## Validation Rules

Avant commit significatif :
1. `npm exec tsc -- --noEmit`
2. `npm run lint`
3. `npm test`

Sous PowerShell avec execution de scripts desactivee, utiliser `npm.cmd`.

Si le chantier touche un flux critique, verifier aussi manuellement :
- envoi d'un message
- ouverture de settings
- navigation sidebar
- si concerne : `/cmd` ou `ael`

## Agent Rules

Le systeme d'agents existe :
- garder Nova comme chef d'orchestre
- garder `agent-acp` consultatif
- garder `agent-ael` specialise et atomique
- brancher tout nouvel agent sur le registre de tour du `main`
- ne pas contourner le workflow de permissions
- lire `docs/RISKS.md` avant toute extension de `ael`

## When In Doubt

En cas d'incertitude :
1. lire `docs/ARCHITECTURE.md`
2. lire `docs/WORKFLOWS.md`
3. lire `docs/PROJECT_STATE.md`
4. lire `docs/RISKS.md`
5. choisir l'option la plus simple qui preserve l'architecture actuelle
