# Handoff express

## Où en est le projet ?

NovaChat est un Electron + React fonctionnel avec :

- chat local persistant ;
- OpenAI Responses API ;
- assistant principal Nova ;
- `agent-planner` pour la prochaine étape atomique ;
- `device-agent` pour générer/exécuter une commande locale ;
- permissions, historique, activité et arrêt de tâches.

Tests, TypeScript strict, lint, audits et packaging Windows x64 passent au
19 juillet 2026. La suite compte 211 réussites dans 33 fichiers, dont 88 cas
de policy Device.
La phase 2 de sécurisation Device et la priorité P2 de maintenabilité recensée
dans `RISKS.md` sont terminées. La phase 3 de fiabilisation des données est
également terminée : JSON atomiques et récupérables, queues agents, migrations
`userData`/Planner, traces bornées et clé OpenAI chiffrée. La phase 4 de
nettoyage est close : fenêtre durcie, providers planifiés désactivés, settings
découplés du réseau, visibilité structurée, erreurs async contrôlées et modules
denses séparés.

## Ce qu’il faut lire

1. [PROJECT_STATE.md](PROJECT_STATE.md)
2. [RISKS.md](RISKS.md)
3. [ARCHITECTURE.md](ARCHITECTURE.md)
4. [NEXT_STEPS.md](NEXT_STEPS.md)

Pour un flux précis, consulter [WORKFLOWS.md](WORKFLOWS.md). Pour les fichiers
et contrats, consulter [DATA_MODEL.md](DATA_MODEL.md).

## Prochaine décision

Valider d’abord les noms et migrations proposés pour Planner et Device dans
[PLANNER_SPECIFICATION.md](agents_specification/PLANNER_SPECIFICATION.md) et
[DEVICE_SPECIFICATION.md](agents_specification/DEVICE_SPECIFICATION.md), puis
découper la phase 6.1 dans [NEXT_STEPS.md](NEXT_STEPS.md). Relire ensuite le
cadrage complet d’ARI en phase 6.2, puis les réponses du cahier
[ACA_SPECIFICATION.md](agents_specification/ACA_SPECIFICATION.md) avant le
découpage de la phase 6.3. ARI doit être implémenté et validé avant ACA, mais
reste un service transversal utilisable par Nova et tous les agents autorisés,
pas une dépendance privée d’ACA. Les autres nouvelles capacités restent en
phase 7. Les installateurs et essais du binaire distribué restent la toute
dernière tâche absolue.

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
- future automatisation de fenêtres uniquement via une capacité main dédiée et
  permissionnée ;
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
- OpenAI est le seul `ActiveAIProviderId` ; les autres providers sont un
  catalogue planifié non activable ;
- les providers futurs doivent rester au catalogue mais ne pas être activables
  avant leur implémentation ;
- la saisie interactive reste heuristique sans pseudo-terminal ;
- acquitter une bannière de récupération réautorise les écritures mais ne
  restaure pas une donnée illisible ;
- la redaction des traces masque les secrets reconnaissables, pas tout contenu
  métier potentiellement sensible.

## Phrase de reprise

> Reprendre NovaChat sur son socle stabilisé après la phase 4. Valider puis
> découper la réorganisation Planner/Device en phase 6.1, relire et découper ARI
> en phase 6.2, puis relire ACA avant le découpage de la phase 6.3. Préserver les
> frontières main/preload/renderer et garder la validation de distribution
> comme dernière tâche absolue.
