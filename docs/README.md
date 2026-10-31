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
préparation d’ARI a été consolidée le 29 octobre 2026 : cahiers relus,
arbitrages techniques retenus et 17 tâches décrites dans `NEXT_STEPS.md`.
L’utilisateur a approuvé ce découpage le même jour. La qualification de 6.2.1
est réussie le 30 octobre 2026 : Electron 44, Forge 8, Packager 20, audits,
tests Node 22/24 et harnais DOM/PDF packagé avec canari chiffré. Les preuves sont
consignées dans [le dossier de qualification](validation/ARI_RUNTIME_6_2_1.md).
La prochaine tâche est 6.2.2, contrats et délégations. Les preuves réseau et
sessions restent à exécuter en 6.2 ; ARI
n’est pas livré. ACA attend sa validation complète en 6.3. Les autres nouvelles
capacités restent reportées en phase 7.

Le correctif AEL du 30 octobre ajoute une création de fichier structurée avec
permission ponctuelle et relecture, sans shell ni exécution du code produit.
Voir [sa validation et ses limites](validation/AEL_FILE_WRITE.md). Le travail
ARI reste ordonné selon les 17 tâches approuvées.

La [préparation de phase 7](PHASE_7.md) et le dossier
[Providers](Providers/INDEX.md) ont été corrigés le 30 octobre 2026 contre le
code et les références API officielles. Ils distinguent état actuel, contrats
proposés et preuves à produire. Seul OpenAI est actif ; cette révision reste
documentaire et ne modifie pas l'ordre ARI, ACA, puis phase 7.

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
10. [PHASE_7.md](PHASE_7.md) — cadrage des capacités futures et accès au dossier Providers.

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
