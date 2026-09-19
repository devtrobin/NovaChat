# Base de connaissance NovaChat

Cette base décrit l’état réellement observé du projet, et non uniquement
l’intention historique. Elle a été vérifiée le **27 août 2026**. Le commit
`d589ae1` constitue la base historique de l’audit, complétée par les phases 3
à 5 et la réorganisation technique de la phase 6.1.

Le fichier [../AGENTS.md](../AGENTS.md) fournit la version courte destinée aux
outils et agents qui ouvrent le dépôt.

## État actif

L’assainissement du code est terminé. Le renommage technique d’ACP et d’AEL,
leur registre partagé, les tests, TypeScript, ESLint et le packaging de la
phase 6.1 sont validés. Les anciens dossiers locaux ont été supprimés après
confirmation et le test manuel ACP/AEL a réussi : la phase 6.1 est close. La
relecture conjointe des cahiers fonctionnel et technique ARI, puis son découpage,
constituent la prochaine étape en 6.2, avant la création automatique d’agents
avec ACA en 6.3. Les autres nouvelles capacités sont reportées en phase 7.

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
8. [agents_specification/README.md](agents_specification/README.md) — index des
   cahiers fonctionnels et spécifications techniques ACP, AEL, ARI et ACA.
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

1. le comportement du code et les types partagés priment ;
2. les ADR priment pour les décisions structurelles ;
3. `PROJECT_STATE.md` et `RISKS.md` priment pour l’état opérationnel ;
4. le README racine reste une introduction, pas une spécification.

Les fichiers sous `settings.json`, `conversations/` et `agents/` sont des
données d’exécution locales et ne font pas partie de la base de connaissance.
