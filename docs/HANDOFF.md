# Handoff express

## Où en est le projet ?

NovaChat est un Electron + React fonctionnel avec :

- chat local persistant ;
- OpenAI Responses API ;
- assistant principal Nova ;
- `agent-acp` pour la prochaine étape atomique ;
- `agent-ael` pour générer/exécuter une commande locale ;
- permissions, historique, activité et arrêt de tâches.

Le bilan de phase 6.1 intégré le 19 septembre 2026 rapporte tests, TypeScript
strict, lint et packaging Windows x64 réussis : 281 tests dans 41 fichiers,
dont 119 cas de policy AEL. Revue documentaire du 21 septembre sur `6245e7a` ;
ces validations n’ont pas été rejouées aujourd’hui.
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

## Prochain chantier

La phase 6.1 est close. Les cahiers ARI sont finalisés pour le développement
au 22 septembre 2026 : [fonctionnel](agents_specification/ARI_SPECIFICATION.md)
et [technique](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md).
Commencer par 6.2.1 dans [NEXT_STEPS.md](NEXT_STEPS.md), puis suivre les dépendances.
Aucun code ARI n’a été ajouté pendant la préparation documentaire.

Outlook personnel et Microsoft 365 professionnel/scolaire sont obligatoires ;
Gmail et Orange sont facultatifs. Les contrats fixent curl sans shell, budgets,
lecture privée sans Google, accords révocables et provenance privée jusque dans
les appels provider ultérieurs. Qualifier les versions/artefacts et configurer
le client Microsoft pendant le développement ; ne pas les supposer déjà prêts.

Après la validation du code ARI, finaliser les deux cahiers ACA et son runtime,
puis découper 6.3. L’installateur `make` reste réservé à la phase finale.

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

> Reprendre NovaChat à la tâche 6.2.1 : les cahiers ARI et les tâches sont
> prêts pour le développement. Implémenter et valider le socle public, les
> accords et Outlook personnel/professionnel/scolaire avant ACA. Ne pas
> confondre contrats documentés et capacités livrées ; garder les installateurs
> comme dernière tâche absolue.
