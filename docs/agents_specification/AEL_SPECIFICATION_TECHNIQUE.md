# Spécification technique — AEL, Agent d’Exécution Locale

## Statut

Référence technique de l’implémentation existante, auditée contre le code le
27 août 2026. Cette spécification décrit le comportement livré à la clôture de
la phase 6.1. Elle complète le
[cahier fonctionnel AEL](AEL_SPECIFICATION.md), qui reste la source de vérité
pour la mission et les règles métier.

## Identité technique

- identifiant canonique : `agent-ael` ;
- type partagé : `SystemAgentId` puis `AgentId` ;
- registre : `src/shared/system-agent.registry.ts` ;
- activation par défaut : active ;
- provider utilisé pour convertir un objectif : OpenAI Responses API ;
- modes de tâche : `command` ou `goal` ;
- dossier de données : `<agentsDirectory>/agent-ael/` ;
- shell réel : `cmd.exe` sous Windows, shell POSIX configuré ailleurs.

## Composants existants

| Responsabilité | Fichier principal |
| --- | --- |
| Définition système | `src/shared/system-agent.registry.ts` |
| Orchestration de tâche | `src/main/agents/agent-task.ael.ts` |
| Résolution objectif → commande | `src/main/agents/agent-task.ael-command.ts` |
| Profil des commandes générées | `src/main/ael/ael.agent-command-profile.ts` |
| Policy de permission | `src/main/ael/ael.policy*.ts` |
| Parser shell | `src/main/ael/ael.command-parser.ts` |
| Demande de permission | `src/main/agents/agent-task.ael-permission.ts` |
| Service d’exécution | `src/main/ael/ael.service.ts` |
| Processus et timeout | `src/main/ael/ael.runtime.ts` |
| Shell de plateforme | `src/main/ael/ael.shell.ts` |
| Arrêt de l’arbre de processus | `src/main/ael/ael.process-tree.ts` |
| Progression et saisie | `src/main/ael/ael.progress.ts` |
| Buffer de sortie | `src/main/ael/ael.output-buffer.ts` |
| Adaptation en messages Nova | `src/main/ai/ai.ael-flow*.ts` |
| Persistance commune | `src/main/agents/agent-storage.*.ts` |
| Interface AEL | `src/renderer/pages/AgentsPage/AELAgentPage/` |

## Flux d’exécution

```text
Nova ou ACP délègue une demande à AEL
  -> mode command : conserver une commande reconnue
     ou mode goal : demander une commande au provider
  -> profil terminal des commandes générées
  -> parsing et classification par la policy
  -> lecture sûre : autorisation automatique
     action classée : règle mémorisée ou confirmation
     action non analysable/critique : confirmation obligatoire
  -> spawn du shell dans le process main
  -> progression stdout/stderr
  -> éventuelle saisie utilisateur
  -> résultat, erreur, timeout ou interruption
  -> persistance et retour à Nova
```

AEL reste propriétaire de la syntaxe terminal. ACP et Nova doivent lui fournir
un objectif lorsqu’ils ne disposent pas déjà d’une commande exacte et fiable.

## Résolution de la commande

En mode `command`, une demande reconnue comme commande shell est utilisée telle
quelle après normalisation. Dans les autres cas, AEL charge son contexte et
appelle le provider avec :

- la plateforme et le shell réellement exécutés ;
- le contexte AEL versionné ;
- l’objectif délégué et le prompt utilisateur d’origine ;
- des règles fermées imposant une commande courte, non interactive et adaptée
  à une seule plateforme.

Le provider doit retourner uniquement la commande, sans JSON, Markdown ni
explication. Les wrappers de shell, scripts multilignes, interfaces graphiques,
consoles secondaires et outils interactifs connus sont interdits par le prompt
et vérifiés ensuite par le profil terminal.

## Profil terminal des commandes générées

`evaluateAELAgentCommandProfile` s’applique avant la policy de permission. Il
refuse notamment :

- une syntaxe que le parser classe comme dangereuse ou non analysable ;
- plus de trois segments, redirections et pipes compris ;
- les wrappers de shell ou de script ;
- les consoles secondaires et applications graphiques ;
- les utilitaires interactifs, obsolètes ou bloquants ;
- une commande inconnue qui finirait en `ask-always/unclassified`.

Ce profil réduit les commandes que l’IA peut proposer. Il ne remplace pas la
policy de permission et ne s’applique pas à la commande spéciale utilisateur
`/cmd`, qui constitue un canal explicite distinct avec son propre avertissement.

## Parser et policy de permission

Le parser découpe la commande en segments, tokens et redirections sans exécuter
la chaîne. Une syntaxe non comprise est classée `ask-always`.

Les catégories sont :

| Catégorie | Comportement général |
| --- | --- |
| `read-local` | autorisée pour une allowlist fermée, sauf cible sensible |
| `workspace-write` | confirmation, avec contrôle des chemins autorisés |
| `network` | confirmation |
| `system` | confirmation ou confirmation obligatoire |
| `destructive` | confirmation obligatoire |
| `unclassified` | confirmation obligatoire |

La policy combine la décision la plus restrictive de tous les segments. Elle
analyse notamment :

- séparateurs, pipes, redirections et expansions ;
- wrappers et exécutables désignés par chemin ;
- commandes de lecture, réseau, installation, mutation et suppression ;
- options capables de transformer une lecture en écriture ou exécution ;
- chemins de sortie confinés aux racines applicatives autorisées ;
- fichiers et variables d’environnement susceptibles de contenir des secrets ;
- cas Windows ciblés, dont les lectures système autorisées.

Les racines d’écriture proposées au flux agent sont le workspace courant et les
chemins configurés de settings, conversations et agents. Une écriture hors de
ces racines devient `ask-always`.

## Permissions mémorisées

Pour une décision `ask`, AEL recherche une règle correspondant exactement à la
chaîne de commande dans `permissions.json` :

- `allow` mémorisé exécute la commande ;
- `deny` mémorisé la refuse ;
- absence de règle affiche la demande à l’utilisateur ;
- « Toujours autoriser » ou « Toujours refuser » écrit une règle exacte ;
- une décision `ask-always` n’est jamais contournée par une règle mémorisée.

La demande affiche la catégorie, un résumé de l’objectif et la première ligne
de commande. Un refus produit un résultat structuré et une entrée d’historique.
Une annulation arrête le tour complet.

## Exécution du processus

`startAELCommand` normalise la commande, vérifie qu’elle n’est ni vide ni
porteuse d’un octet nul, résout le shell puis lance un processus enfant masqué :

- Windows : `cmd.exe /d /s /c`, avec passage préalable du code page à UTF-8 ;
- POSIX : shell configuré avec `-lc` ;
- répertoire de travail : `process.cwd()` ;
- `stdin`, `stdout` et `stderr` reliés par des pipes ;
- aucune nouvelle fenêtre sous Windows ;
- groupe de processus détaché sur POSIX pour permettre l’arrêt récursif.

Le registre des commandes actives est uniquement en mémoire. Chaque commande
reçoit un UUID et expose une promesse de résultat contenant code, durée, shell,
sortie et type d’erreur.

## Sortie, progression et saisie

`stdout` et `stderr` sont fusionnés chronologiquement dans un buffer UTF-8
borné. La limite par défaut est de 200 000 caractères.

La progression est envoyée au renderer via les événements du tour. Une
détection heuristique reconnaît certains prompts interactifs :

- la tâche passe à `waiting-input` ;
- le timeout est suspendu ;
- l’interface affiche le libellé et masque la valeur si le prompt est secret ;
- la valeur est écrite sur `stdin` puis le timeout reprend.

Le timeout d’exécution par défaut est de 15 secondes, hors attente de saisie.
La détection interactive n’utilise pas de pseudo-terminal et reste donc une
heuristique limitée aux sorties reconnues.

## Arrêt et annulation

Une tâche peut être arrêtée depuis la conversation ou la page AEL. Le registre
du tour :

- annule les appels provider ;
- annule une permission en attente ;
- termine toutes les commandes rattachées au tour ;
- marque la commande comme interrompue.

Sous Windows, AEL utilise `taskkill /pid <pid> /t /f` avec repli sur
`child.kill()`. Sous POSIX, il envoie `SIGTERM` au groupe de processus.
L’annulation reste une opération au mieux : un effet déjà produit par le shell
ne peut pas être annulé automatiquement.

## Persistance

Le workspace AEL utilise :

```text
agent-ael/
├── contexte.json
├── permissions.json
├── historique.json
└── conversations/
    ├── conversations.json
    └── <conversation-id>/<message-id>/...
```

Chaque exécution conserve l’objectif assistant, la commande résolue, le
résultat, le statut, les liens vers le tour d’origine et les traces provider
autorisées. Les conversations internes utilisent le même stockage éclaté et
les mêmes protections atomiques que le chat principal.

Les contextes sont migrés vers le schéma version 3 sans remplacer une
personnalisation. Un incident de récupération empêche toute nouvelle écriture
avant acquittement explicite.

## IPC et interface

Le renderer n’accède jamais directement au shell. Les canaux IPC publics
permettent seulement :

- l’envoi ou l’arrêt d’un tour IA ;
- la réponse à une permission ;
- la saisie destinée à une commande identifiée ;
- le chargement du workspace AEL ;
- la modification du contexte et des règles exactes ;
- l’affichage et l’arrêt des tâches actives.

La page AEL contient les onglets Général, Contexte, Permissions et Historique.
Les messages de progression, permission, saisie et résultat sont structurés ;
les détails d’orchestration peuvent rester internes sans masquer qu’une
commande est en cours.

## Frontières de confiance

- Le shell appartient exclusivement au process `main`.
- Le preload n’expose qu’une API minimale et validée à l’exécution.
- Le profil terminal réduit les commandes générées par l’IA.
- La policy décide d’une UX de consentement ; elle n’est pas un sandbox.
- Une commande explicitement autorisée est toujours interprétée par le shell de
  la plateforme et peut employer une syntaxe que l’analyse statique ne comprend
  pas complètement.
- Les données de page, credentials et futurs connecteurs ne devront jamais
  transiter par AEL pour contourner leurs propres frontières.

## Validation existante

La couverture automatisée comprend notamment :

- 119 cas normaux et adversariaux de policy ;
- séparateurs, expansions, wrappers, redirections, chemins et options mutantes ;
- profil terminal des commandes générées ;
- commandes Windows de lecture ciblée ;
- buffer UTF-8 avec caractères multioctets séparés entre chunks ;
- détection de saisie et suspension du timeout ;
- exécution, erreurs, timeout et arrêt d’arbre de processus ;
- permissions ponctuelles et mémorisées ;
- annulation atomique du tour ;
- persistance, récupération, visibilité et composants React AEL.

Les validations communes restent Vitest, TypeScript, ESLint et packaging
Electron.

## Limites techniques connues

- La policy n’est pas une frontière de sécurité complète.
- Le parser ne couvre pas toute la grammaire des shells pris en charge.
- La saisie interactive est heuristique et ne repose pas sur un PTY.
- Les tâches actives et processus ne sont pas repris après redémarrage.
- La prise en charge hors Windows est codée mais moins validée manuellement.
- Le canal `/cmd` utilisateur exécute directement une commande et ne réutilise
  pas le workflow de permission AEL.
- OpenAI est le seul provider capable de transformer un objectif en commande.

Toute extension doit lire `docs/RISKS.md` et conserver la matrice restrictive
avant d’élargir une allowlist ou un canal d’exécution.
