# NovaChat - Consignes de reprise

## Point de départ

Avant toute modification significative, lire dans cet ordre :

1. `docs/README.md`
2. `docs/PROJECT_STATE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/RISKS.md`
5. `docs/NEXT_STEPS.md`

La documentation a été auditée contre le code le 27 août 2026. Le commit
`d589ae1` est la base historique de l’audit, complétée par les phases 3 à 5 et
la réorganisation technique de la phase 6.1.

## État actif

Le socle de nettoyage et les phases 2 à 5 sont terminés. La phase 6 est divisée
entre la réorganisation des agents existants en 6.1, ARI en 6.2 et ACA en 6.3.
ACP (`agent-acp`) et AEL (`agent-ael`) sont les identités canoniques. Leur
renommage intégral, le registre partagé, le nettoyage local et les validations
automatisée et manuelle sont terminés. La phase 6.1 est close.
Les anciens identifiants encore présents dans des messages de conversation
sont normalisés vers ACP/AEL à la frontière IPC afin de ne pas bloquer une
sauvegarde ; cette tolérance ne s’applique pas aux opérations, settings ou
espaces de stockage des agents.
Le 29 octobre 2026, les cahiers ARI ont été relus, les arbitrages techniques
ont été arrêtés par délégation et 17 tâches ont été préparées dans
`docs/NEXT_STEPS.md`. L’utilisateur a explicitement confirmé le maintien du
scraper Google avec une exception robots limitée à sa page de résultats.
L’utilisateur a approuvé ce découpage le 29 octobre 2026 et demandé de continuer.
La qualification de 6.2.1 est réussie le 30 octobre 2026 : Electron 44.10.0,
Forge 8.0.1 et Packager 20.3.0, tests, audits, contrôles Node 22/24 et harnais
DOM/PDF packagé avec canari chiffré 39 vers 44. Les majeures de construction ont
reçu un accord explicite. La prochaine tâche est 6.2.2, contrats et délégations.
Voir `docs/NEXT_STEPS.md`. Ne pas redemander l’accord sur le découpage. ARI doit être
livré et validé avant ACA en préservant sécurité, données, visibilité et validation.
ARI est une capacité de recherche transversale accessible à Nova et à tout
agent autorisé ; il ne doit pas être conçu comme un composant réservé à ACA.
Les décisions D01 à D10 du cahier technique ARI sont retenues pour conception.
La qualification de 6.2.1 prouve la compatibilité du runtime testé ; le
confinement réseau et les sessions restent à démontrer. Les portes 6.2.5 et 6.2.10
bloquent l’activation du rendu distant et des comptes tant que leurs garanties ne sont
pas démontrées. Seul le harnais de qualification ARI est présent ; aucun service
de recherche n’est activé. ACA possède aussi un cahier
technique initial ; sa frontière d’exécution du code généré reste bloquante.
Ses réponses restent à relire avant le découpage de la phase 6.3.

## Invariants d’architecture

Le correctif AEL du 30 octobre 2026 ajoute `write-file` (voir
`docs/validation/AEL_FILE_WRITE.md`) : nouveau fichier uniquement, cible
`desktop` ou `workspace`, nom simple, UTF-8 jusqu'à 128 Kio, permission
ponctuelle sur le contenu exact et relecture vérifiée dans le main. Ne pas
le remplacer par un contournement shell ni l'assimiler à une autorisation
d'exécuter le code créé. Il ne change pas l'ordre ARI puis ACA.

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
réinitialiser ou les supprimer sans demande explicite.

Les settings actuels ne contiennent plus la clé API, mais des fichiers
antérieurs ou backups non encore migrés peuvent en contenir. Ne jamais
afficher ni copier leur valeur dans des logs, une documentation ou un commit.

## Point de vigilance prioritaire

Ne considérer ni `ael.policy.ts` ni le workflow de permission comme une
frontière de sécurité complète. Les syntaxes non analysables sont classées
`ask-always`, mais une commande explicitement autorisée reste exécutée par le
shell de la plateforme. Lire `docs/RISKS.md` avant toute extension du canal
`ael`.
