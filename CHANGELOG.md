# Changelog

## Unreleased

### Added
- socle de tests Vitest
  - policy de permissions Device
  - parsers OpenAI et Planner
  - serialisation et round-trip du stockage chat
  - application des evenements de conversation
- base de connaissance de reprise auditee contre le code au 18 juillet 2026
  - index `docs/README.md`
  - guide `docs/DEVELOPMENT.md`
  - modele de donnees et contrat IPC `docs/DATA_MODEL.md`
  - registre priorise `docs/RISKS.md`
  - consignes automatiques `AGENTS.md`
- documentation de reprise dans `docs/`
  - `ARCHITECTURE.md`
  - `PROJECT_STATE.md`
  - `AGENTS_PLAN.md`
  - `WORKFLOWS.md`
  - `HANDOFF.md`
  - `DEV_RULES.md`
- premiere iteration fonctionnelle de `device-agent`
- stockage local agent :
  - `contexte.json`
  - `permissions.json`
  - `historique.json`
  - `conversations/`
- workflow de permission structure avec `Oui`, `Oui permanent`, `Non`
- `DeviceAgentPage` avec onglets `General`, `Conversation`, `Contexte`
- recherche dans la conversation active avec raccourcis clavier
- pipeline `/cmd` cote utilisateur
- affichage des indicateurs de non-lu dans la sidebar
- support de prompts interactifs dans les messages `device`
- traces `message.json`, `log.json`, `apis.json` par message

### Changed
- policy Device restrictive par défaut pour les syntaxes inconnues ou
  complexes, avec séparation du parsing shell et des listes de règles
- mise à jour de sécurité de la chaîne npm :
  - Electron 39.2.7 vers 39.8.10
  - Electron Forge 7.10.2 vers 7.11.2
  - résolutions transitives documentées pour `tar`, `tmp`, `uuid` et
    `webpack-dev-server`
- mise a jour complete de l'architecture, de l'etat, des workflows, du plan
  agents, du handoff et de la feuille de route pour refleter `agent-planner`,
  la generation de commande Device et le registre de taches
- la section `Agents` n'est plus reservee au mode preview
- refacto majeure du renderer autour de `WorkspaceLayout`
- refacto de la navigation gauche vers `AppSidebar`
- remplacement de l'ancien systeme modal settings par `SettingsPage` / `SettingsPanel`
- decoupage du `main` en domaines `ai`, `device`, `chat`, `ipc`, `window`
- decoupage de l'orchestrateur IA et du systeme `device`
- decoupage du rendu des messages par type
- modernisation du `tsconfig` pour TypeScript recent

### Fixed
- fermeture des contournements Device connus par pipes, opérateurs shell,
  substitutions, wrappers, sous-commandes Git, redirections et options
  mutantes
- suppression des 57 vulnérabilités npm signalées, dont 2 critiques
- parsing des sections Planner vides, qui pouvaient absorber le label suivant
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
