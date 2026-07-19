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

Le socle de nettoyage est terminé : la phase 4 et son critère de sortie sont
clos dans `docs/NEXT_STEPS.md`. Avant une nouvelle modification fonctionnelle,
choisir explicitement une seule capacité de phase 6 et préserver les contrats
de sécurité, données, visibilité et validation obtenus.

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

La suite Vitest couvre notamment la policy Device, les parsers OpenAI/Planner,
le stockage, les événements du chat, les permissions/annulations asynchrones,
la fenêtre Electron, la visibilité et des composants React critiques. La
matrice Device couvre les séparateurs shell, expansions, wrappers,
redirections, chemins et options mutantes avec des tests de régression normaux.

## Données locales

`settings.json`, `conversations.json`, `conversations/`, `agents/`, `.webpack/`
et `out/` sont des données ou artefacts locaux. Ne pas les committer, les
réinitialiser ou les supprimer sans demande explicite.

Les settings actuels ne contiennent plus la clé API, mais des fichiers
antérieurs ou backups non encore migrés peuvent en contenir. Ne jamais
afficher ni copier leur valeur dans des logs, une documentation ou un commit.

## Point de vigilance prioritaire

Ne considérer ni `device.policy.ts` ni le workflow de permission comme une
frontière de sécurité complète. Les syntaxes non analysables sont classées
`ask-always`, mais une commande explicitement autorisée reste exécutée par le
shell de la plateforme. Lire `docs/RISKS.md` avant toute extension du canal
`device`.
