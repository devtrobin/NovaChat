# NovaChat - Consignes de reprise

## Point de départ

Avant toute modification significative, lire dans cet ordre :

1. `docs/README.md`
2. `docs/PROJECT_STATE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/RISKS.md`
5. `docs/NEXT_STEPS.md`

La documentation a été auditée contre le code le 19 juillet 2026. Le commit
`d589ae1` est la base historique de l’audit, complétée par les phases 3 et 4.

## État actif

Le socle des phases 2 à 5 est terminé. Le périmètre de la phase 6.1 est
confirmé le 16 septembre 2026 : renommage complet en ACP (`agent-acp`) et AEL
(`agent-ael`), y compris tous les noms techniques, puis remise à zéro des
anciennes données NovaChat sans migration ni compatibilité. Les tâches
ordonnées sont dans `docs/NEXT_STEPS.md` ; les cahiers sont
`docs/agents_specification/ACP_SPECIFICATION.md` et
`docs/agents_specification/AEL_SPECIFICATION.md`.

La demande active concerne uniquement la documentation. Ne pas commencer
l’implémentation ni supprimer de données avant sa finalisation. La décision
et le périmètre du reset différé sont dans
`docs/decisions/005-acp-ael-breaking-reset.md`.

Les noms et chemins ACP/AEL employés par les docs désignent la cible ; les
sources restent sous leurs anciens noms jusqu’au chantier de code. Le shell
reste dans le main : son domaine sera renommé `src/main/ael`.

L’implémentation de la phase 6.1 précède ARI en 6.2 ; ARI doit être validé avant
ACA en 6.3. ARI est une recherche transversale accessible à Nova et à tout
agent autorisé. Son cadrage fonctionnel est complet, mais son cahier doit
encore être relu, validé et découpé. Les réponses ACA restent à relire avec
l’utilisateur avant le découpage de la phase 6.3. Finir cette documentation
avant de passer à l’implémentation.

Chaque agent possède un cahier fonctionnel `XXX_SPECIFICATION.md` et un
compagnon `XXX_SPECIFICATION_TECHNIQUE.md` décrivant outils, bibliothèques,
contrats et appels aux agents. Les compagnons distinguent existant, décidé,
proposé et à préciser. Leur rédaction ne valide pas les choix proposés.
Les délégations passent par Nova dans le main, selon le contrat à finaliser
avec les phases 6.2/6.3 dans `docs/AGENTS_PLAN.md`.

## Invariants d’architecture

- Les appels provider, l’orchestration des agents et l’exécution locale restent
  dans le process Electron `main`.
- Le renderer passe uniquement par l’API minimale exposée dans `src/preload.ts`.
- Les messages Nova structurés (`from`, `to`, `agentId`, `status`) sont le
  contrat entre UI, orchestration et stockage.
- La persistance des conversations reste éclatée par conversation et par
  message. Ne pas la remplacer implicitement par un fichier monolithique.
- Le shell local ne doit jamais être appelé directement depuis le renderer.

## Commandes de validation

Sous PowerShell avec une politique d’exécution restrictive, utiliser
`npm.cmd` :

```powershell
npm.cmd ci
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run package
```

La suite Vitest couvre notamment la policy AEL, les parsers OpenAI/ACP,
le stockage, les événements du chat, les permissions/annulations asynchrones,
la fenêtre Electron, la visibilité et des composants React critiques. La
matrice AEL couvre les séparateurs shell, expansions, wrappers,
redirections, chemins et options mutantes avec des tests de régression normaux.

## Données locales

`settings.json`, `conversations.json`, `conversations/`, `agents/`, `.webpack/`
et `out/` sont des données ou artefacts locaux. Ne pas les committer, les
réinitialiser ou les supprimer hors du chantier autorisé. La remise à zéro
est prévue en phase 6.1 conformément à l’ADR 005, mais aucune suppression ne
doit être exécutée pendant la préparation documentaire. Le reset futur cible
uniquement les données appartenant à NovaChat, même dans un dossier partagé.

Les settings actuels ne contiennent plus la clé API, mais des fichiers
antérieurs ou backups non encore migrés peuvent en contenir. Ne jamais
afficher ni copier leur valeur dans des logs, une documentation ou un commit.

## Point de vigilance prioritaire

Ne considérer ni `ael.policy.ts` ni le workflow de permission comme une
frontière de sécurité complète. Les syntaxes non analysables sont classées
`ask-always`, mais une commande explicitement autorisée reste exécutée par le
shell de la plateforme. Lire `docs/RISKS.md` avant toute extension du canal
`ael`.
