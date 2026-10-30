# Handoff express

## Où en est le projet ?

NovaChat est un Electron + React fonctionnel avec :

- chat local persistant ;
- OpenAI Responses API ;
- assistant principal Nova ;
- `agent-acp` pour la prochaine étape atomique ;
- `agent-ael` pour générer/exécuter une commande locale ;
- permissions, historique, activité et arrêt de tâches.

Tests, TypeScript strict, lint et packaging Windows x64 passent au
27 août 2026. La suite compte 281 réussites dans 41 fichiers, dont 119 cas de
policy AEL.
La phase 2 de sécurisation AEL et la priorité P2 de maintenabilité recensée
dans `RISKS.md` sont terminées. La phase 3 de fiabilisation des données est
également terminée : JSON atomiques et récupérables, queues agents, migration
`userData`, traces bornées et clé OpenAI chiffrée. La phase 4 de
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

## Prochaine étape

La phase 6.1 est close : réorganisation technique ACP/AEL, validation
automatisée, packaging, suppression confirmée des trois dossiers obsolètes et
test manuel commun ont réussi. La préparation d’ARI a été consolidée le
29 octobre 2026 : cahiers relus, arbitrages techniques arrêtés par délégation,
exception robots limitée à la page de résultats Google explicitement confirmée
par l’utilisateur. Les [17 tâches de 6.2](NEXT_STEPS.md#découpage-de-la-phase-62)
ont été approuvées le même jour, avec demande de continuer. La qualification
de 6.2.1 est réussie le 30 octobre : Electron 44, Forge 8 et Packager 20,
audits à zéro, 285 tests, typage, lint, packaging Windows, contrôles Node 22/24,
harnais DOM/PDF/N-API dans l’ASAR et canari chiffré 39 vers 44. Consulter
[les preuves](validation/ARI_RUNTIME_6_2_1.md). La prochaine tâche est 6.2.2,
contrats et provenance des délégations, sans redemander l’accord sur le découpage. La
[spécification technique](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md)
décrit les portes réseau et sessions à prouver pendant l’implémentation ;
la recherche ARI n’est pas encore livrée. Relire ensuite
les cahiers [fonctionnel ACA](agents_specification/ACA_SPECIFICATION.md) et
[technique ACA](agents_specification/ACA_SPECIFICATION_TECHNIQUE.md) avant le
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
- shell uniquement dans `src/main/ael` ;
- renderer uniquement via `window.nova` ;
- future automatisation de fenêtres uniquement via une capacité main dédiée et
  permissionnée ;
- stockage des conversations éclaté par message ;
- ACP consultatif, AEL atomique, Nova orchestrateur ;
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

> Reprendre NovaChat après la préparation documentaire ARI du 29 octobre 2026 :
> lire les cahiers consolidés et les 17 tâches de 6.2 dans NEXT_STEPS.md.
> L’approbation des 17 tâches est acquise. Reprendre 6.2.1 en rétablissant l’accès
> autorisé aux paquets npm, sans contourner la revue automatique indisponible.
> Les choix sont arrêtés, leurs garanties restent à prouver dans le package réel.
> Relire ensuite les deux cahiers ACA avant le découpage de la phase 6.3.
> Préserver les frontières main/preload/renderer et garder la validation de
> distribution comme dernière tâche absolue.
