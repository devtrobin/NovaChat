# Base de connaissance NovaChat

Cette base décrit l’état réellement observé du projet, et non uniquement
l’intention historique. Elle a été vérifiée le **18 juillet 2026** sur la
branche `main`, pour le code allant jusqu’au commit `d589ae1`.

Le fichier [../AGENTS.md](../AGENTS.md) fournit la version courte destinée aux
outils et agents qui ouvrent le dépôt.

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
8. [HANDOFF.md](HANDOFF.md) — reprise express après une interruption.

## Documents normatifs

- [DEV_RULES.md](DEV_RULES.md) et
  [../CODING_GUIDELINES.md](../CODING_GUIDELINES.md) définissent les
  conventions de contribution.
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
