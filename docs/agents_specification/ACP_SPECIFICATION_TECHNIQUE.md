# ACP — Spécification technique

## Lecture et statut

Ce fichier complète le [cahier fonctionnel](ACP_SPECIFICATION.md).
Il décrit les outils, leurs responsabilités, les contrats et les dépendances.
Les exigences métier restent dans le cahier fonctionnel.

- **Existant** : comportement ou bibliothèque constaté dans le dépôt.
- **Décidé** : exigence déjà retenue, même si elle n’est pas encore codée.
- **Proposé** : solution technique soumise à relecture, non installée et non
  validée implicitement par ce document.
- **À préciser** : décision nécessaire avant de considérer la conception
  technique comme terminée.

Les noms et chemins ACP/AEL sont ceux de la cible de phase 6.1. Le code actuel
reste sous ses anciens noms, répertoriés dans
[l’ADR 005](../decisions/005-acp-ael-breaking-reset.md).
Aucune implémentation, installation de dépendance ni suppression de données
n’est déclenchée par cette documentation.

## Chaîne technique

```text
Nova -> tâche ACP -> contexte + règles internes
     -> transport OpenAI du main -> parser du plan
     -> résultat ACP -> Nova décide de la prochaine étape
```

ACP est un agent d’analyse. Il ne possède aucun outil d’exécution locale,
aucun scraper et aucun connecteur métier. Les accès réseau et fichiers décrits
ci-dessous sont des services de NovaChat, pas des pouvoirs libres du modèle.

## Inventaire des outils

| Outil ou service | Utilisation par ACP | Statut |
| --- | --- | --- |
| Provider OpenAI commun, `generateAgentTextReply` | Analyse de la demande et production du plan | Existant |
| Transport `fetch` vers `<baseUrl>/responses` dans le main | Appel modèle avec `store: false`, sans SDK supplémentaire | Existant |
| `AbortController` et registre de tour | Annulation de l’appel et rattachement au tour Nova | Existant |
| Parser interne, cible `ai.acp.ts` | Validation du format textuel et construction du plan typé | Existant, renommage décidé |
| Prompts internes + `contexte.json` | Règles obligatoires et préférences complémentaires | Existant |
| `agent-storage.service.ts`, écritures atomiques et queue | Contexte, historique et conversation interne | Existant |
| Registre partagé des agents | Identité `agent-acp`, capacités et activation | Centralisation décidée en 6.1 |
| Routage partagé vers ARI | Recherche documentaire pour éclairer le cadrage | Décidé pour 6.2, absent en 6.1 |

Aucune nouvelle bibliothèque n’est nécessaire pour le renommage ACP. Le
provider et le modèle sont ceux configurés pour Nova ; il n’existe pas de
modèle distinct par agent dans le socle.

## Entrées, sorties et validation

Entrée actuelle à renommer : `AgentTaskRequest`, avec demande, mode, tour,
message déclencheur et conversation utilisateur d’origine. Le main ajoute le
contexte agent et le runtime réel ; le modèle ne les définit pas lui-même.

La sortie du modèle utilise les sections `STATUS`, `SUMMARY`, `AGENT`, `MODE`,
`GOAL`, `REQUEST`, `SUCCESS`, `MISSING`, `COMPLETED` et `DEBUG`. Le parser
contrôle notamment :

- statut `ready`, `needs-info` ou `blocked` ;
- résumé présent et au plus une prochaine étape ;
- agent recommandé `agent-ael` ou `none` en phase 6.1 ;
- objectif, requête et critère de succès lorsque requis ;
- absence d’exécution si le plan est invalide.

Une étape AEL est transmise comme objectif : AEL reste propriétaire de la
syntaxe shell. L’acceptation de formats historiques sera supprimée avec la
rupture de compatibilité ; cela ne supprime pas les commandes exactes envoyées
à AEL par ses autres voies autorisées.

La validation est locale et déterministe. Le respect de `SUCCESS` reste une
évaluation du résultat par Nova, pas une preuve automatique de réussite.

## Appels aux autres agents

| Destination | Usage | Qui lance réellement la tâche ? | Disponibilité |
| --- | --- | --- | --- |
| AEL | Recommander une étape locale atomique | Nova, après lecture du plan ACP | Socle existant, renommé en 6.1 |
| ARI | Vérifier une documentation ou une information avant de cadrer | Orchestrateur commun, pour le compte d’ACP | Extension de phase 6.2 |
| ACA | Aucune création directement demandée par ACP en V1 | Nova garde la décision de création | Non prévu dans ACP |
| ACP lui-même | Aucune récursion | Refus par le routage | Non autorisé |

Une demande ACP vers ARI sera une demande structurée au main, jamais un appel
direct d’ACP à un service réseau. Le contrat partagé est proposé dans
[AGENTS_PLAN.md](../AGENTS_PLAN.md#contrat-technique-de-délégation-proposé).
Le résultat ARI revient au travail ACP d’origine ; Nova garde le contrôle de
la reprise et des budgets. Aucun credential n’est accordé par héritage.

## Modules et données

Points d’intégration cibles : `agent-task.acp.ts`, `ai.acp.ts`,
`ai.orchestrator.acp-handoff.ts`, `ai.orchestrator.acp-step.ts`,
`agent-prompt.service.ts` et `AcpAgentPage.tsx`.

Données : `agents/agent-acp/contexte.json`, historique et conversations internes.
Le reset de phase 6.1 les crée à neuf. Les règles système restent dans le code.
Les traces suivent la rétention et la redaction communes.

## Limites et vérification

Le socle borne un tour à huit cycles assistant et six exécutions AEL, avec une
synthèse finale réservée. ACP ne peut pas recréer un budget en déléguant ; les
budgets de recherche ARI seront ajoutés séparément en phase 6.2.

Les tests doivent couvrir plans valides/invalides, statuts sans action,
recommandation d’un agent désactivé, annulation, préservation des traces et
refus des anciens identifiants. En 6.2 s’ajoutent retour ARI, maintien de
l’identité demandeur, arrêt du parent et prévention des boucles.

## Décisions restantes

Aucun nouvel outil requis en phase 6.1. Relire cet inventaire technique.
Le format et les budgets exacts de la délégation ACP vers ARI seront validés
avec la conception technique de phase 6.2, sans étendre ACP pendant le
renommage.
