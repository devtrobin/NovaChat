# Base de connaissance NovaChat

Cette base distingue le socle observé et la cible documentaire de la phase 6. Elle a été vérifiée le **19 juillet 2026** sur la
branche `main`. Le commit `d589ae1` constitue la base historique de l’audit,
complétée par les phases 3 et 4.

Le fichier [../AGENTS.md](../AGENTS.md) fournit la version courte destinée aux
outils et agents qui ouvrent le dépôt.

## État actif

L’assainissement du code est terminé : contrats explicites, TypeScript strict,
gestion d’erreurs, tests critiques, sécurité Electron et refactors bornés sont
validés. La prochaine étape retenue est la phase 6 de
[NEXT_STEPS.md](NEXT_STEPS.md) : réorganisation d’ACP et AEL en 6.1,
ARI en 6.2, puis création automatique d’agents avec ACA en 6.3. Les autres
nouvelles capacités sont reportées en phase 7.

Le 16 septembre 2026, l’utilisateur a confirmé ACP et AEL dans toutes les
surfaces, y compris les noms techniques, ainsi qu’un breaking change avec
suppression de l’ancien état NovaChat. Les noms et chemins cibles sont déjà
utilisés dans les docs ; le code ne sera renommé qu’après finalisation de la
documentation. Le découpage de la phase 6.1 est rédigé. La prochaine étape
est de terminer la documentation, dont les relectures et découpages ARI/ACA.
Aucune suppression ni implémentation n’est engagée pendant cette préparation.
La portée du reset est définie dans
[l’ADR 005](decisions/005-acp-ael-breaking-reset.md).

## Parcours de lecture

Pour reprendre rapidement le projet :

1. [PROJECT_STATE.md](PROJECT_STATE.md) — ce qui fonctionne, ce qui manque et
   le niveau de validation actuel.
2. [ARCHITECTURE.md](ARCHITECTURE.md) — composants, frontières de sécurité et
   carte du code.
3. [WORKFLOWS.md](WORKFLOWS.md) — déroulé précis des principaux flux métier.
4. [DATA_MODEL.md](DATA_MODEL.md) — schémas de messages, stockage local,
   settings et contrat IPC.
5. [DEVELOPMENT.md](DEVELOPMENT.md) — installation, commandes, debug et
   critères de validation.
6. [RISKS.md](RISKS.md) — dette et risques classés par priorité.
7. [NEXT_STEPS.md](NEXT_STEPS.md) — ordre de travail recommandé.
8. [agents_specification/ACP_SPECIFICATION.md](agents_specification/ACP_SPECIFICATION.md),
   [agents_specification/AEL_SPECIFICATION.md](agents_specification/AEL_SPECIFICATION.md),
   [agents_specification/ARI_SPECIFICATION.md](agents_specification/ARI_SPECIFICATION.md)
   et [agents_specification/ACA_SPECIFICATION.md](agents_specification/ACA_SPECIFICATION.md)
   — cahiers fonctionnels des agents système de la phase 6, chacun accompagné
   de sa spécification technique :
   [ACP](agents_specification/ACP_SPECIFICATION_TECHNIQUE.md),
   [AEL](agents_specification/AEL_SPECIFICATION_TECHNIQUE.md),
   [ARI](agents_specification/ARI_SPECIFICATION_TECHNIQUE.md) et
   [ACA](agents_specification/ACA_SPECIFICATION_TECHNIQUE.md).
9. [HANDOFF.md](HANDOFF.md) — reprise express après une interruption.

## Documents normatifs

- [DEV_RULES.md](DEV_RULES.md) et
  [CODING_GUIDELINES.md](CODING_GUIDELINES.md) définissent les
  conventions de contribution.
- [CHANGELOG.md](CHANGELOG.md) conserve le journal des évolutions du projet.
- [decisions/](decisions/) contient les décisions d’architecture acceptées,
  dont l’orchestration centralisée des agents.
- [AGENTS_PLAN.md](AGENTS_PLAN.md) décrit le rôle des agents internes.
- [../src/ressources/NOVA_GUIDELINES.md](../src/ressources/NOVA_GUIDELINES.md)
  décrit l’intention design/UX. Certaines cibles, notamment le streaming, ne
  sont pas encore réalisées.

## Source de vérité

En cas de contradiction :

1. pour le comportement exécuté, le code et les types partagés priment ;
   pour la cible à implémenter, les décisions acceptées de phase 6 priment
   sans prétendre que cette cible est déjà réalisée ;
2. les ADR priment pour les décisions structurelles ;
3. `PROJECT_STATE.md` et `RISKS.md` priment pour l’état opérationnel ;
4. le README racine reste une introduction, pas une spécification.

Les fichiers sous `settings.json`, `conversations/` et `agents/` sont des
données d’exécution locales et ne font pas partie de la base de connaissance.
