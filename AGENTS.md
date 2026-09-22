# NovaChat - Consignes de reprise

## Point de départ

Avant toute modification significative, lire dans cet ordre :

1. `docs/README.md`
2. `docs/PROJECT_STATE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/RISKS.md`
5. `docs/NEXT_STEPS.md`

Revue de cohérence documentaire : 21 septembre 2026, sur `6245e7a`.
Le commit `d589ae1` est la base historique de l’audit ; la phase 6.1 est livrée
par `ebb9b03` et intégrée dans `6245e7a`, tous deux du 19 septembre 2026.
Cette revue ne constitue pas une nouvelle exécution des validations.
La finalisation documentaire 6.2 du 22 septembre ne modifie pas ce bilan.

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
La documentation 6.2 est finalisée le 22 septembre 2026 et prête pour le
développement. Références normatives :
`docs/agents_specification/ARI_SPECIFICATION.md` et son compagnon technique.
Les tâches 6.2.1–6.2.11 sont dans `docs/NEXT_STEPS.md`. ARI n’est pas encore
implémenté ; aucun résultat de test ARI n’est acquis par cette rédaction.

Périmètre obligatoire : Google/URL directe via curl, lecture statique et PDF,
Credentials, registre d’accords révocables, Outlook personnel et Microsoft 365
professionnel/scolaire, routage Nova/ACP/AEL. Gmail et Orange sont facultatifs.
Exception robots uniquement pour `/search` Google, jamais captcha/403/429.
Pas d’API de recherche hébergée ni de navigateur de scraping. API officielles
et IMAP chiffré sont autorisés pour les services. Le runner curl est dédié au
main, sans shell et sans élargissement d’AEL.

Les accords portent sur compte, demandeur réel et provider/destination ; ils
sont mémorisés et contrôlés aussi lors de la réutilisation du chat privé.
Les versions, artefacts curl, configuration Microsoft et comptes réels sont
qualifiés pendant les tâches de développement, pas présumés disponibles.
ARI est transversal et doit être implémenté et validé avant ACA. Le runtime
ACA reste bloquant pour 6.3 et ses cahiers restent à finaliser séparément.

La demande active est uniquement documentaire : aucun code, installation de
dépendance ni suppression de données dans ce chantier. La prochaine étape de
code est 6.2.1. Chaque agent garde un cahier fonctionnel et un compagnon
technique ; distinguer systématiquement cible documentée et code livré.

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
