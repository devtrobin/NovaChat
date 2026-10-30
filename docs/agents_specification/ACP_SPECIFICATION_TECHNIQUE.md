# Spécification technique — ACP, Agent de Cadrage et de Planification

## Statut

Référence technique du code de phase 6.1 intégré le 19 septembre 2026
(`ebb9b03`, puis `6245e7a`). Revue documentaire le 21 septembre 2026 ;
les validations d’exécution rapportées ne sont pas rejouées par cette revue. Cette spécification décrit le comportement réellement livré à la
clôture de la phase 6.1. Elle complète le
[cahier fonctionnel ACP](ACP_SPECIFICATION.md), qui reste la source de vérité
pour la mission et les limites métier.

## Identité technique

- identifiant canonique : `agent-acp` ;
- type partagé : `SystemAgentId` puis `AgentId` ;
- registre : `src/shared/system-agent.registry.ts` ;
- activation par défaut : active ;
- provider actuel : OpenAI Responses API ;
- mode de tâche : `analysis` ;
- dossier de données : `<agentsDirectory>/agent-acp/`.

Le registre partagé fournit l’acronyme, le nom complet, les capacités, les
outils déclaratifs et le contexte par défaut. Le main, les settings et le
renderer dérivent tous l’identité ACP de ce registre.

## Composants existants

| Responsabilité | Fichier principal |
| --- | --- |
| Définition système | `src/shared/system-agent.registry.ts` |
| Types de tâche et de stockage | `src/shared/agent.types.ts` |
| Routage générique d’un agent | `src/main/agents/agent-orchestrator.service.ts` |
| Exécution de la tâche ACP | `src/main/agents/agent-task.acp.ts` |
| Construction du prompt | `src/main/ai/openai.payload.agent.ts` |
| Appel provider | `src/main/ai/openai.service.ts` |
| Parser du plan | `src/main/ai/ai.acp.ts` |
| Déclenchement heuristique | `src/main/ai/ai.orchestrator.acp-handoff.ts` |
| Application de l’étape | `src/main/ai/ai.orchestrator.acp-step.ts` |
| Boucle Nova | `src/main/ai/ai.orchestrator.ts` |
| Persistance commune | `src/main/agents/agent-storage.*.ts` |
| IPC de la page agent | `src/main/ipc/agents.handlers.ts` |
| Interface ACP | `src/renderer/pages/AgentsPage/ACPAgentPage/` |

## Flux d’exécution

```text
Demande utilisateur
  -> Nova appelle le provider principal
  -> handoff ACP explicite ou heuristique
  -> runAgentTask
  -> chargement du workspace agent-acp
  -> construction du prompt ACP
  -> appel OpenAI annulable
  -> réponse textuelle à sections
  -> persistance de l’échange interne
  -> parseACPMessageContent
  -> needs-info / blocked / réponse directe
     ou délégation d’un objectif atomique à AEL
  -> résultat AEL réinjecté dans la boucle Nova
  -> réponse finale de Nova
```

ACP ne contacte jamais AEL lui-même. Il produit une recommandation ;
`ai.orchestrator.acp-step.ts` reste propriétaire de la décision et de la
délégation effective.

## Déclenchement et routage

Deux voies existent :

1. le provider principal émet un handoff structuré vers `agent-acp` ;
2. Nova force ACP au premier cycle d’une demande jugée non triviale lorsque
   l’agent est actif et qu’aucun résultat ACP/AEL n’existe encore dans le tour.

L’heuristique actuelle considère notamment la longueur du prompt et des
signaux tels que analyse, correction, diagnostic, erreur, investigation,
refactor ou workflow. Elle n’est pas un classifieur sémantique et ne constitue
pas un contrat produit stable.

Un même tour ne force ACP qu’au premier cycle. Une recommandation atomique déjà
exécutée est mémorisée par une signature normalisée afin d’éviter une boucle.

## Contrat d’entrée

ACP reçoit un `AgentTaskRequest` contenant :

- `agentId: "agent-acp"` ;
- `mode: "analysis"` ;
- la demande interne dans `request` ;
- le prompt utilisateur d’origine ;
- les identifiants du tour, de la conversation et du message déclencheur.

Le contexte runtime ajouté au prompt expose uniquement la plateforme, le shell
réel, la famille de shell et le provider actif. ACP ne reçoit aucun accès au
shell ni à une API d’exécution.

## Contrat de sortie provider

Le provider doit retourner du texte brut avec les sections suivantes :

```text
STATUS: ready | needs-info | blocked
SUMMARY: résumé court
AGENT: agent-ael | none
MODE: goal | analysis | none
GOAL: objectif court
REQUEST: demande atomique
SUCCESS: critère de réussite
MISSING:
- information manquante
COMPLETED:
- étape déjà traitée
DEBUG: diagnostic interne court
```

Contraintes appliquées par le prompt :

- une seule prochaine action atomique ;
- aucune commande shell ;
- aucune réponse destinée directement à l’utilisateur ;
- aucune délégation directe ;
- aucune arborescence de plan ni alternative parallèle ;
- `needs-info` seulement lorsque l’information ne peut pas être découverte
  localement ;
- recommandation limitée actuellement à `agent-ael` ou `none`.

## Parsing et décisions

`parseACPMessageContent` normalise les fins de ligne, extrait les sections et
refuse un plan incomplet. Les décisions sont les suivantes :

- sortie illisible : Nova explique l’échec et n’exécute rien ;
- `needs-info` : Nova présente les informations manquantes ;
- `blocked` : Nova retourne le résumé du blocage ;
- `ready` avec `none` : Nova utilise le résumé sans délégation ;
- `ready` avec AEL : Nova transmet `REQUEST` en mode `goal` à AEL ;
- recommandation non prise en charge : Nova la refuse ;
- étape déjà exécutée : la boucle passe à la synthèse finale.

Le parser est volontairement fermé. Ajouter ARI ou ACA au registre ne suffit
pas à les rendre recommandables par ACP : l’union `ACPRecommendedAgent`, le
prompt, le parser et le routeur devront évoluer ensemble.

## Budgets et cycle de vie

ACP s’exécute à l’intérieur du tour Nova :

- huit cycles assistant maximum pour le tour global ;
- une étape ACP identique ne peut pas être exécutée deux fois dans le même tour ;
- les appels provider disposent d’un `AbortController` enregistré dans le
  registre du tour ;
- l’arrêt depuis la conversation ou la page agent annule le provider et les
  travaux rattachés au même tour ;
- les tâches actives sont conservées en mémoire seulement et disparaissent à
  la fin du tour ou au redémarrage.

## Persistance

Le workspace ACP réutilise le stockage commun des agents :

```text
agent-acp/
├── contexte.json
├── permissions.json
├── historique.json
└── conversations/
    ├── conversations.json
    └── <conversation-id>/<message-id>/...
```

`contexte.json` suit actuellement le schéma de contexte version 3. Les anciens
contextes par défaut connus sont remplacés par le défaut courant, tandis que
les personnalisations sont conservées et remontées de version.

Chaque appel ACP ajoute une demande assistant → agent et une réponse agent →
assistant à une conversation interne. `historique.json` conserve la demande,
le résultat, la conversation source, le message déclencheur et la conversation
interne. Les écritures d’un même agent sont sérialisées et utilisent les
mécanismes atomiques et de récupération du stockage commun.

`permissions.json` existe par homogénéité du workspace, mais ACP n’exécute
aucune action permissionnée dans l’implémentation actuelle.

## IPC et interface

Le renderer ne communique jamais directement avec le provider. La page ACP
utilise l’API preload limitée pour :

- charger le workspace ;
- activer ou désactiver ACP via les settings ;
- afficher et interrompre les tâches actives ;
- consulter et modifier le contexte ;
- acquitter un incident de récupération du stockage.

La page contient les onglets Général et Contexte. Les conversations ACP restent
internes et sont filtrables dans le chat principal grâce à
`ChatMessage.visibility`.

## Frontières de confiance

- ACP est consultatif et n’a aucun accès direct au shell, aux credentials ou au
  système de fichiers.
- Ses sorties sont des données non fiables : elles passent par un parser fermé
  avant toute décision.
- Seul Nova orchestre une délégation ultérieure.
- Le contexte utilisateur complète le prompt, mais ne peut pas remplacer les
  règles système construites dans le code.
- Les appels provider et la persistance restent dans le process `main`.

## Validation existante

La couverture automatisée comprend notamment :

- parsing des statuts et sections ACP ;
- refus des formats incomplets ;
- handoff explicite et handoff forcé ;
- prévention des étapes répétées ;
- routage ACP → AEL ;
- budgets et synthèse finale ;
- interruption des tâches et appels provider ;
- contexte, stockage, récupération et page agent ;
- cohérence du registre partagé.

Les commandes de validation communes sont celles d’`AGENTS.md` : tests,
TypeScript, ESLint et packaging Electron.

## Limites techniques connues

- Le format textuel à sections est plus fragile qu’un schéma provider natif.
- L’heuristique de déclenchement repose sur des mots-clés et une longueur.
- ACP ne peut recommander qu’AEL ou aucun agent.
- Le succès déclaré par ACP n’est pas validé directement par un moteur de
  critères ; Nova interprète le résultat suivant.
- Les tâches actives ne sont pas reprises après redémarrage.
- OpenAI est le seul provider actif.

Toute extension d’ACP pour ARI ou ACA devra préserver son rôle consultatif et
mettre à jour simultanément registre, types, prompt, parser, routeur et tests.

## Extension documentée pour ARI en 6.2 — non implémentée

La [spécification ARI](ARI_SPECIFICATION_TECHNIQUE.md#délégation-et-cycle-de-vie)
fixe l’action de recherche via Nova/main et la reprise unique du parent.
ACP pourra demander une recherche avec une intention bornée avant son cadrage.
Le main construit l’identité, applique budgets et droits et réinjecte le
résultat au demandeur. Cette extension ciblée appartient à 6.2.14 ; le reste de
ce document décrit le comportement livré en 6.1. La policy et les permissions
terminal ne sont pas assouplies.
