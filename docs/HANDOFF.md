# Handoff express

## Où en est le projet ?

NovaChat est un Electron + React fonctionnel avec :

- chat local persistant ;
- OpenAI Responses API ;
- assistant principal Nova ;
- `agent-planner` pour la prochaine étape atomique ;
- `device-agent` pour générer/exécuter une commande locale ;
- permissions, historique, activité et arrêt de tâches.

Tests, TypeScript, lint et packaging Windows x64 passent au 18 juillet 2026.
La suite compte 191 réussites dans 23 fichiers, dont 88 cas de policy Device.
La phase 2 de sécurisation Device et la priorité P2 de maintenabilité recensée
dans `RISKS.md` sont terminées. La phase 3 de fiabilisation des données est
également terminée : JSON atomiques et récupérables, queues agents, migrations
`userData`/Planner, traces bornées et clé OpenAI chiffrée.

## Ce qu’il faut lire

1. [PROJECT_STATE.md](PROJECT_STATE.md)
2. [RISKS.md](RISKS.md)
3. [ARCHITECTURE.md](ARCHITECTURE.md)
4. [NEXT_STEPS.md](NEXT_STEPS.md)

Pour un flux précis, consulter [WORKFLOWS.md](WORKFLOWS.md). Pour les fichiers
et contrats, consulter [DATA_MODEL.md](DATA_MODEL.md).

## Première action recommandée

Commencer la phase 4 par la clarification des providers non implémentés, puis
corriger `hideInternalConversations` afin de conserver les résultats `/cmd`.
Ne pas étendre les commandes autorisées sans cas sûr et adversarial
correspondant.

## Commandes de départ

```powershell
git status --short
npm.cmd ci
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run ci
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

Les settings courants ne contiennent plus la clé API, mais des fichiers
antérieurs ou backups non encore migrés peuvent en contenir. Ne jamais les
journaliser.

## Pièges immédiats

- la policy Device est restrictive, mais reste un contrôle UX et non un sandbox ;
- `activeProvider` n’effectue pas encore de routage multi-provider ;
- la saisie interactive reste heuristique sans pseudo-terminal ;
- acquitter une bannière de récupération réautorise les écritures mais ne
  restaure pas une donnée illisible ;
- la redaction des traces masque les secrets reconnaissables, pas tout contenu
  métier potentiellement sensible.

## Phrase de reprise

> Reprendre NovaChat en phase 4 : aligner les surfaces visibles avec les
> capacités réellement implémentées avant toute nouvelle capacité agent.
