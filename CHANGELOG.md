# Changelog

## Unreleased

### Added
- documentation de reprise dans `docs/`
  - `ARCHITECTURE.md`
  - `PROJECT_STATE.md`
  - `AGENTS_PLAN.md`
  - `WORKFLOWS.md`
  - `HANDOFF.md`
  - `DEV_RULES.md`
- support `previewMode` pour masquer ou afficher la zone `Agents`
- recherche dans la conversation active avec raccourcis clavier
- pipeline `/cmd` cote utilisateur
- affichage des indicateurs de non-lu dans la sidebar
- support de prompts interactifs dans les messages `device`
- traces `message.json`, `log.json`, `apis.json` par message

### Changed
- refacto majeure du renderer autour de `WorkspaceLayout`
- refacto de la navigation gauche vers `AppSidebar`
- remplacement de l'ancien systeme modal settings par `SettingsPage` / `SettingsPanel`
- decoupage du `main` en domaines `ai`, `device`, `chat`, `ipc`, `window`
- decoupage de l'orchestrateur IA et du systeme `device`
- decoupage du rendu des messages par type
- modernisation du `tsconfig` pour TypeScript recent

### Fixed
- imports CSS reconnus par TypeScript / VS Code
- meilleure classification des erreurs UI
- meilleure robustesse du parsing de reponses provider
- reduction du contexte envoye au provider
- correction des ecritures concurrentes du stockage de conversations

## Historical Summary

Les grandes etapes deja passees sont :
- mise en place du theme Nova et harmonisation visuelle
- introduction du systeme `from` / `to`
- support `device`
- migration de la logique IA vers Electron `main`
- refonte du layout applicatif
- grosse remise au propre de l'architecture
