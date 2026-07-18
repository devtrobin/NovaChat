# NovaChat - Consignes de reprise

## Point de départ

Avant toute modification significative, lire dans cet ordre :

1. `docs/README.md`
2. `docs/PROJECT_STATE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/RISKS.md`
5. `docs/NEXT_STEPS.md`

La documentation a été auditée contre le code le 18 juillet 2026 au commit
`3595d2fa72f3da83b7673459c621f3365f908084`.

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
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run package
```

Il n’existe pas encore de vraie suite de tests. Les fichiers `*.test.tsx`
actuels sont des placeholders et aucun script `test` n’est défini.

## Données locales

`settings.json`, `conversations.json`, `conversations/`, `agents/`, `.webpack/`
et `out/` sont des données ou artefacts locaux. Ne pas les committer, les
réinitialiser ou les supprimer sans demande explicite.

`settings.json` peut contenir une clé API en clair. Ne jamais afficher ni
copier sa valeur dans des logs, une documentation ou un commit.

## Point de vigilance prioritaire

Ne considérer ni `device.policy.ts` ni le workflow de permission comme une
frontière de sécurité complète. Le parseur de commandes est contournable par
plusieurs constructions shell. Lire `docs/RISKS.md` avant toute extension du
canal `device`.
