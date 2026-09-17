# ADR 005 — Renommage complet ACP/AEL et remise à zéro

## Statut

Décision acceptée le 16 septembre 2026 sur demande de l’utilisateur.
Documentation en préparation ; implémentation et suppression de données
reportées jusqu’à finalisation de la documentation. Le découpage documentaire
de la phase 6.1 est autorisé dès maintenant.

## Décision

ACP et AEL remplacent intégralement les anciennes identités dans la
documentation puis dans le code. Les noms techniques ne bénéficient d’aucune
exception : fichiers, dossiers, symboles, contrats, settings, prompts, UI,
styles, tests, scripts et métadonnées concernés devront suivre le renommage.

Les identifiants canoniques sont `agent-acp` et `agent-ael`. Les préfixes de
code sont `acp`/`Acp`/`ACP` et `ael`/`Ael`/`AEL` selon la convention existante.
Le domaine d’exécution locale devient `src/main/ael/`, son paramétrage
`aelExecution` et son rôle de message `ael`.

Cette évolution est un breaking change. Aucun alias, migration de données,
fusion, import des anciennes conversations ou lecteur de compatibilité ne
sera conservé pour l’ancien état. L’application repartira avec des valeurs
par défaut et des espaces ACP/AEL neufs. Ses capacités et protections restent
identiques.

## Inventaire historique pour le retrait uniquement

Les seules mentions des anciens noms dans la documentation active servent
ici à identifier ce qui devra être supprimé ou renommé. Elles ne constituent
pas des alias acceptés par la cible.

| Ancienne surface | Cible |
| --- | --- |
| Planner, `planner`, `Planner*`, `PLANNER` | ACP, `acp`, `Acp*`, `ACP` |
| Device, `device`, `Device*`, `DEVICE` | AEL, `ael`, `Ael*`, `AEL` |
| `agent-planner`, `diagnostic-agent` | `agent-acp`, sans conversion de données |
| `device-agent` | `agent-ael`, sans conversion de données |
| `src/main/device/` | `src/main/ael/` |
| `deviceExecution`, rôle de message `device` | `aelExecution`, rôle `ael` |
| `PLANNER_SPECIFICATION.md`, `DEVICE_SPECIFICATION.md` | `ACP_SPECIFICATION.md`, `AEL_SPECIFICATION.md` |

## Périmètre de la remise à zéro différée

La remise à zéro concerne les données d’exécution appartenant à NovaChat :

- settings de référence et personnalisés, activation et préférences ;
- contextes, permissions, tâches et historiques de tous les anciens espaces ;
- conversations principales et internes, index, messages, journaux et traces API ;
- backups `.bak`, archives de corruption et `.migration-backups` ;
- marqueurs de migration et anciennes copies proches de l’application ;
- secrets NovaChat, dont le coffre de la clé OpenAI, et caches persistants
  NovaChat susceptibles de restaurer l’ancien état.

Les paramètres, la clé OpenAI et les préférences devront être renseignés à
nouveau. Le code du coffre sécurisé reste utilisé pour les nouvelles valeurs.

Avant la suppression, l’implémentation devra inventorier les emplacements
réels : `userData`, anciens chemins du dépôt ou de l’exécutable et chemins
personnalisés. Elle supprimera uniquement les fichiers et sous-arbres dont
l’appartenance à NovaChat est établie. Un répertoire configuré partagé ne doit
jamais être effacé globalement. Les projets, documents et autres données de
l’utilisateur restent hors périmètre ; aucune valeur secrète ne doit être
imprimée pendant cet inventaire.

Le reset est une opération de transition unique, application arrêtée et
écritures suspendues. Il doit pouvoir reprendre après interruption avant la
création du nouvel état. Une fois terminé, les nouveaux démarrages conservent
les nouvelles données : aucune purge générale à chaque lancement.

Les mécanismes d’import automatique de l’ancien état seront retirés avant le
premier démarrage de la nouvelle version. Aucun ancien dossier ni backup ne
doit repeupler les espaces neufs. Un ancien payload ou identifiant doit être
refusé explicitement plutôt que normalisé silencieusement.

## Garanties maintenues

- orchestration, provider et shell dans le main ; preload minimal ;
- Nova orchestrateur, ACP consultatif et AEL atomique ;
- profil terminal, catégories et workflow de permission inchangés ;
- messages structurés, visibilité et arrêt des tours ;
- persistance éclatée, écritures atomiques, queues et récupération des nouvelles
  données ;
- coffre système et redaction des secrets.

Les garanties de récupération s’appliquent à la nouvelle base. Elles ne
réintroduisent aucune reprise des données antérieures au breaking change.

## Portée documentaire

Les documents utilisent dès maintenant les noms et chemins cibles ACP/AEL.
Le code reste sous ses anciens noms jusqu’à l’implémentation. Une référence
technique cible dans les docs n’atteste donc pas que le fichier a déjà été
renommé. Les bilans des phases terminées restent des faits historiques ; leurs
noms sont harmonisés pour la lecture, et leurs anciennes migrations ne sont
pas des exigences de compatibilité de la phase 6.1.

Cette décision remplace les précédentes propositions de conservation des noms
techniques, de migration sans perte et de lecture des anciens identifiants.
Elle ne valide pas les cahiers ARI/ACA à leur place et ne déclenche aucune
implémentation pendant la préparation documentaire.
