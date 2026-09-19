# Spécifications des agents NovaChat

Chaque agent système possède deux documents distincts :

- le **cahier fonctionnel** décrit la mission, les scénarios, les permissions et
  les critères métier ;
- la **spécification technique** décrit les composants, contrats, données,
  dépendances, frontières de sécurité et stratégie de test.

En cas de contradiction, le cahier fonctionnel validé exprime l’intention
produit. La spécification technique doit être corrigée avant implémentation ; le
code existant reste la référence factuelle pour ACP et AEL.

Tous les cahiers doivent préserver les consignes de [AGENTS.md](../../AGENTS.md),
les frontières d’[ARCHITECTURE.md](../ARCHITECTURE.md), les contrats de
[DATA_MODEL.md](../DATA_MODEL.md) et les blocages de [RISKS.md](../RISKS.md).

## État des documents

| Agent | Cahier fonctionnel | Spécification technique | État |
| --- | --- | --- | --- |
| ACP | [ACP_SPECIFICATION.md](ACP_SPECIFICATION.md) | [ACP_SPECIFICATION_TECHNIQUE.md](ACP_SPECIFICATION_TECHNIQUE.md) | implémenté et validé en 6.1 |
| AEL | [AEL_SPECIFICATION.md](AEL_SPECIFICATION.md) | [AEL_SPECIFICATION_TECHNIQUE.md](AEL_SPECIFICATION_TECHNIQUE.md) | implémenté et validé en 6.1 |
| ARI | [ARI_SPECIFICATION.md](ARI_SPECIFICATION.md) | [ARI_SPECIFICATION_TECHNIQUE.md](ARI_SPECIFICATION_TECHNIQUE.md) | fonctionnel complet, technique à valider en 6.2 |
| ACA | [ACA_SPECIFICATION.md](ACA_SPECIFICATION.md) | [ACA_SPECIFICATION_TECHNIQUE.md](ACA_SPECIFICATION_TECHNIQUE.md) | études fonctionnelle et technique à valider en 6.3 |

## Ordre de validation

1. relire et valider le cahier fonctionnel ;
2. résoudre les points bloquants de la spécification technique ;
3. vérifier la cohérence entre les deux documents et les invariants globaux ;
4. découper la sous-phase dans `NEXT_STEPS.md` ;
5. implémenter puis mettre la spécification technique à jour selon le code
   réellement livré ;
6. exécuter les validations automatisées et manuelles prévues.

ARI doit être implémenté et validé avant ACA. Les choix partagés de credentials,
routage et tâches sont conçus dans ARI puis réutilisés par ACA sans rendre ARI
dépendant du créateur d’agents.
