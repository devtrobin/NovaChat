# Handoff express

## Où en est le projet ?

NovaChat est un Electron + React fonctionnel avec :

- chat local persistant ;
- OpenAI Responses API ;
- assistant principal Nova ;
- `agent-planner` pour la prochaine étape atomique ;
- `device-agent` pour générer/exécuter une commande locale ;
- permissions, historique, activité et arrêt de tâches.

TypeScript, lint et packaging Windows x64 passent au 18 juillet 2026.

## Ce qu’il faut lire

1. [PROJECT_STATE.md](PROJECT_STATE.md)
2. [RISKS.md](RISKS.md)
3. [ARCHITECTURE.md](ARCHITECTURE.md)
4. [NEXT_STEPS.md](NEXT_STEPS.md)

Pour un flux précis, consulter [WORKFLOWS.md](WORKFLOWS.md). Pour les fichiers
et contrats, consulter [DATA_MODEL.md](DATA_MODEL.md).

## Première action recommandée

Mettre en place un runner de tests et verrouiller
`src/main/device/device.policy.ts` avec une matrice adversariale. Ne pas
étendre les commandes autorisées avant cette étape.

## Commandes de départ

```powershell
git status --short
npm.cmd ci
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
```

Utiliser `npm` au lieu de `npm.cmd` hors PowerShell Windows si approprié.

## Invariants

- orchestration IA et agents dans le main ;
- shell uniquement dans `src/main/device` ;
- renderer uniquement via `window.nova` ;
- stockage des conversations éclaté par message ;
- Planner consultatif, Device atomique, Nova orchestrateur ;
- ne pas traiter la policy actuelle comme un sandbox.

## Données à ne pas toucher

Les chemins suivants sont des données locales ou artefacts ignorés :

```text
settings.json
conversations.json
conversations/
agents/
.webpack/
out/
```

`settings.json` peut contenir une clé API en clair. Ne jamais la journaliser.

## Pièges immédiats

- pas de tests malgré la présence de fichiers `*.test.tsx` ;
- `activeProvider` n’effectue pas encore de routage multi-provider ;
- `diagnostic-agent` est un ancien ID partiellement migré ;
- le refus “Non” d’une permission peut devenir permanent ;
- les writes JSON ne sont pas atomiques ;
- les API de conversations directes agent n’ont pas d’UI ;
- la capture du README historique n’est plus représentative.

## Phrase de reprise

> Reprendre NovaChat au socle : ajouter les tests de policy et de stockage,
> fermer les contournements shell, puis rendre la persistance atomique avant
> toute nouvelle capacité agent.
