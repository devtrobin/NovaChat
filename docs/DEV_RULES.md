# Dev Rules

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
- toute logique shell / machine doit rester dans `src/main/device`
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

## AI / Device Rules

- les messages Nova sont la source de verite
- `from` / `to` doivent rester explicites
- les traces API et logs ne doivent pas polluer le payload provider
- la boucle `assistant -> device -> assistant` doit rester cote `main`

## Refactor Rules

- ne pas lancer de grosse refacto sans besoin reel
- si une refacto est necessaire, la borner a un domaine clair
- privilegier les refactos qui reduisent une responsabilite melangee
- eviter les micro-fichiers artificiels juste pour passer sous un nombre de lignes

## Validation Rules

Avant commit significatif :
1. `npm exec tsc -- --noEmit`
2. `npm run lint`

Si le chantier touche un flux critique, verifier aussi manuellement :
- envoi d'un message
- ouverture de settings
- navigation sidebar
- si concerne : `/cmd` ou `device`

## Agent Rules For Future Work

Quand le systeme d'agents arrivera :
- ne pas le greffer en contournant l'orchestrateur `main`
- garder l'agent principal comme chef d'orchestre
- garder l'agent `device` specialise
- brancher les permissions sur ce workflow, pas en parallele

## When In Doubt

En cas d'incertitude :
1. lire `docs/ARCHITECTURE.md`
2. lire `docs/WORKFLOWS.md`
3. lire `docs/PROJECT_STATE.md`
4. choisir l'option la plus simple qui preserve l'architecture actuelle
