# ADR 005 — Renommage complet ACP/AEL et rupture bornée des données agents

## Statut

Décision acceptée le 16 septembre 2026, puis mise en œuvre et validée dans la
phase 6.1.

La décision initiale envisageait une remise à zéro de toutes les données
NovaChat. Le périmètre final a été resserré pendant l’implémentation : les
espaces agents incompatibles ont été supprimés après confirmation explicite,
mais les paramètres généraux, les conversations principales et le secret
OpenAI ont été conservés.

## Décision

ACP et AEL remplacent intégralement les anciennes identités dans le code actif
et la documentation. Les noms techniques ne bénéficient d’aucune exception :
fichiers, dossiers, symboles, contrats, settings agents, prompts, UI, styles,
tests, scripts et métadonnées concernés suivent le renommage.

Les identifiants canoniques sont `agent-acp` et `agent-ael`. Les préfixes de
code sont `acp`/`Acp`/`ACP` et `ael`/`Ael`/`AEL` selon la convention du support.
Le domaine d’exécution locale est `src/main/ael/`, son paramétrage
`aelExecution` et son rôle de message `ael`.

Cette évolution est une rupture pour les opérations, les settings agents et
les espaces de stockage agents. Aucun alias actif, import automatique ou
lecteur de compatibilité n’est conservé pour ces surfaces.

Une seule tolérance est maintenue à la frontière IPC des conversations : un
ancien identifiant déjà présent dans un message historique chargé est
normalisé vers ACP ou AEL afin que la conversation puisse encore être
sauvegardée. Cette normalisation ne permet ni d’exécuter une ancienne tâche,
ni de rouvrir un ancien workspace, ni de réutiliser un ancien setting.

## Correspondances historiques

Les anciens noms restent recensés ici uniquement pour expliquer la rupture.
Ils ne constituent pas des identifiants acceptés par la cible.

| Ancienne surface | Cible |
| --- | --- |
| Planner, `planner`, `Planner*`, `PLANNER` | ACP, `acp`, `Acp*`, `ACP` |
| Device, `device`, `Device*`, `DEVICE` | AEL, `ael`, `Ael*`, `AEL` |
| `agent-planner`, `diagnostic-agent` | `agent-acp` |
| `device-agent` | `agent-ael` |
| `src/main/device/` | `src/main/ael/` |
| `deviceExecution`, rôle de message `device` | `aelExecution`, rôle `ael` |
| `PLANNER_SPECIFICATION.md`, `DEVICE_SPECIFICATION.md` | `ACP_SPECIFICATION.md`, `AEL_SPECIFICATION.md` |

## Traitement des données locales

Les trois anciens dossiers agents observés pendant le développement ont été
supprimés après confirmation explicite. Aucun backup ni migration de leurs
contextes, permissions, tâches, historiques ou conversations internes n’a été
créé. Les nouveaux workspaces ACP/AEL repartent de leurs valeurs par défaut.

Sont restés hors de cette suppression :

- les paramètres généraux sans rapport avec les anciennes identités agents ;
- les conversations principales, avec la normalisation bornée des messages
  historiques décrite plus haut ;
- le secret OpenAI déjà stocké dans le coffre système ;
- les projets, documents et autres données de l’utilisateur.

Les chemins configurés partagés ne doivent jamais être effacés globalement.
Toute future opération de nettoyage doit prouver l’appartenance des cibles à
NovaChat, rester confinée aux sous-arbres concernés et ne jamais afficher de
secret.

## Garanties maintenues

- orchestration, provider et shell dans le process `main` ; preload minimal ;
- Nova orchestrateur, ACP consultatif et AEL atomique ;
- profil terminal, catégories et workflow de permission inchangés ;
- messages structurés, visibilité et arrêt des tours ;
- persistance éclatée, écritures atomiques, queues et récupération des
  nouvelles données ;
- coffre système et redaction des secrets.

La rupture de compatibilité ne transforme pas la policy AEL en sandbox et ne
doit pas servir à assouplir les contrôles existants.

## Conséquences

- le registre partagé est la source de vérité des identités système ;
- tout ancien identifiant est refusé hors de la normalisation de messages ;
- une future migration destinée à une version distribuée exigera un contrat
  séparé, des tests de reprise et une décision explicite sur les données ;
- ARI et ACA adoptent la convention `agent-<acronyme>` sans dépendre d’alias
  historiques ACP/AEL.
