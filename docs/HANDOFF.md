# Handoff express

> Nomenclature cible de la phase 6.1 : ACP/AEL, y compris chemins, types et
> contrats techniques. Le code n’est pas encore renommé. Le changement complet
> et la remise à zéro sans compatibilité seront implémentés après finalisation
> de la documentation ; voir [ADR 005](decisions/005-acp-ael-breaking-reset.md).

## Où en est le projet ?

NovaChat est un Electron + React fonctionnel avec :

- chat local persistant ;
- OpenAI Responses API ;
- assistant principal Nova ;
- `agent-acp` pour la prochaine étape atomique ;
- `agent-ael` pour générer/exécuter une commande locale ;
- permissions, historique, activité et arrêt de tâches.

Tests, TypeScript strict, lint, audits et packaging Windows x64 passent au
19 juillet 2026. Le bilan de `PROJECT_STATE.md` compte 277 réussites dans 40 fichiers, dont 119 cas
de policy AEL.
La phase 2 de sécurisation AEL et la priorité P2 de maintenabilité recensée
dans `RISKS.md` sont terminées. La phase 3 de fiabilisation des données est
également terminée : JSON atomiques et récupérables, queues agents, migrations
`userData`/ACP, traces bornées et clé OpenAI chiffrée. La phase 4 de
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

## Prochaine étape : finir la documentation

Le périmètre de la phase 6.1 est confirmé le 16 septembre 2026 : ACP et AEL
partout, y compris modules techniques, et remise à zéro des anciennes données
NovaChat sans migration ni compatibilité. Les cahiers
[ACP](agents_specification/ACP_SPECIFICATION.md) et
[AEL](agents_specification/AEL_SPECIFICATION.md), le
[découpage ordonné](NEXT_STEPS.md) et
[l’ADR 005](decisions/005-acp-ael-breaking-reset.md) portent cette décision.

L’implémentation et les suppressions attendent la finalisation de la
documentation. Chaque cahier possède désormais un compagnon
`XXX_SPECIFICATION_TECHNIQUE.md` : relire les inventaires ACP/AEL, puis les
cahiers fonctionnels et techniques ARI/ACA avant leurs découpages. Les choix
proposés de scraper, réseau, sessions, compilation et isolation restent à
valider ; les délégations sont détaillées dans `AGENTS_PLAN.md`. Leurs validations ne sont pas acquises par la décision ACP/AEL.
ARI restera transversal à Nova et aux agents autorisés. L’ordre ultérieur de
code reste 6.1, 6.2 puis 6.3, avec validation d’ARI avant ACA. Les autres
capacités restent en phase 7 et la distribution en toute dernière tâche.

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
- shell uniquement dans `src/main/ael` ;
- renderer uniquement via `window.nova` ;
- future automatisation de fenêtres uniquement via une capacité main dédiée et
  permissionnée ;
- stockage des conversations éclaté par message ;
- ACP consultatif, AEL atomique, Nova orchestrateur ;
- ne pas traiter la policy actuelle comme un sandbox.

## Données à ne pas toucher pendant la documentation

Les chemins suivants sont des données locales ou artefacts ignorés :

```text
settings.json
conversations.json
conversations/
agents/
.webpack/
out/
```

Le reset futur inclut aussi les données sous `userData`, les copies dans les
chemins personnalisés, les backups, les traces et les secrets NovaChat selon
l’ADR 005. Il est unique et ne supprime jamais les autres fichiers d’un dossier
partagé. La configuration devra être renseignée à nouveau.

Les settings courants ne contiennent plus la clé API, mais des fichiers
antérieurs ou backups non encore migrés peuvent en contenir. Ne jamais les
journaliser.

## Pièges immédiats

- la policy AEL est restrictive, mais reste un contrôle UX et non un sandbox ;
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

> Finir la documentation avant toute implémentation. La phase 6.1 prévoit
> ACP/AEL dans toutes les surfaces et une remise à zéro sans compatibilité ;
> ses tâches sont définies. Relire, valider et découper ARI puis ACA. Ne
> modifier aucun code ni donnée locale pendant cette préparation.
