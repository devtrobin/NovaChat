# AEL — Spécification technique

## Lecture et statut

Ce fichier complète le [cahier fonctionnel](AEL_SPECIFICATION.md).
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

## Outil d’action : le terminal local

AEL agit sur la machine uniquement par le shell local. Il ne possède ni
navigateur, ni automatisation graphique, ni connecteur distant direct.
L’appel au modèle pour préparer une commande et le stockage de son historique
sont assurés par les services de NovaChat dans le main.

Une commande locale peut elle-même demander un accès réseau ; elle reste
soumise à la policy. « Terminal local » ne signifie donc pas que toutes les
commandes possibles sont hors ligne.

```text
Nova -> tâche AEL -> commande exacte ou génération par le modèle
     -> profil terminal agent -> décision de permission
     -> shell local -> sortie bornée -> résultat -> Nova
```

## Inventaire des outils

| Outil ou service | Usage | Statut |
| --- | --- | --- |
| Provider commun, cible `generateAelAgentCommand` | Transformer un objectif en commande adaptée au shell | Existant, renommage décidé |
| `fetch` OpenAI dans le main | Génération de texte avec modèle/configuration de Nova | Existant |
| `node:child_process.spawn` | Démarrer le shell sélectionné par le main | Existant |
| `cmd.exe` ou `ComSpec` sous Windows | Exécution `/d /s /c`, préfixe interne UTF-8 | Existant |
| `$SHELL`, fallback `/bin/zsh` sur macOS/Linux | Exécution via `-lc` | Existant |
| `stdin`, `stdout`, `stderr` du processus | Entrées utilisateur et progression de commande | Existant |
| `taskkill /pid … /t /f` sous Windows | Arrêt de l’arbre de processus | Existant |
| Signal `SIGTERM` au groupe de processus sous Unix | Arrêt du groupe, avec traitement de secours | Existant |
| Policy et profil terminal internes, cibles `ael.policy.*` et `ael.agent-command-profile.ts` | Classification, restrictions et permissions | Existant, renommage décidé |
| Buffer de sortie interne | Taille bornée, troncature et décodage UTF-8 | Existant |
| Registre de tour, timers et `AbortController` | Annulation provider, permissions et commandes | Existant |
| Stockage agent commun | Contexte, permissions exactes, historique et conversations | Existant |
| Routage ARI | Obtenir une documentation avant de préparer une commande | Décidé pour 6.2, absent en 6.1 |

Aucun terminal graphique supplémentaire ni pseudo-terminal n’est utilisé.
Aucune nouvelle dépendance n’est prévue pour le renommage. Les programmes
appelables sont ceux présents sur la machine et reconnus par la policy ; AEL
ne dispose pas implicitement de tous les exécutables ou d’un installateur.

## Exécution et contrat

Le main résout le shell réel et transmet cette information aux prompts.
Le répertoire courant d’exécution du socle est `process.cwd()` ; la phase 6.1
ne le transforme pas en API arbitraire de choix de répertoire.

Une commande exacte peut éviter l’appel de génération. Une commande produite
par l’agent passe par le profil terminal avant toute permission : au plus
trois segments, aucune commande inconnue, aucun wrapper de shell, utilitaire
interactif connu, interface graphique ou console secondaire.

Les décisions restent :

- `allow` : exécution sans demande de permission ;
- `ask` : règle exacte mémorisée ou décision utilisateur ;
- `ask-always` : décision ponctuelle, non mémorisable.

Les refus, limites et erreurs reviennent à Nova. Les nouvelles permissions
commencent vides après le reset. Le profil et la policy ne sont pas un sandbox.

Le résultat cible `AelCommandResult` contient notamment identifiant, commande
normalisée, shell, répertoire courant, sortie, durée, code de sortie, signal,
état de réussite et catégorie d’erreur. Le flux adapte ce résultat en messages
Nova avec rôle `ael`, visibilité et traces structurées.

`/cmd` est une voie explicitement demandée par l’utilisateur qui partage
l’exécuteur terminal, mais ne passe pas par les permissions de l’agent. La
phase 6.1 conserve cette distinction.

## Saisie et annulation

La saisie est détectée par heuristiques sur la sortie ; aucune émulation de
terminal interactif général n’est garantie. Le timeout actif est suspendu
pendant `waiting-input`, puis réarmé après saisie. La sortie reste plafonnée
par `aelExecution.maxOutputCharacters` ; le délai vient de
`aelExecution.timeoutMs`.

L’arrêt global annule génération et attente de permission puis termine les
commandes enregistrées. La stratégie réelle d’arrêt Unix est un signal au
groupe ; le document ne lui attribue pas une garantie absolue d’arrêt de tout
processus qui pourrait s’en détacher.

## Appels aux autres agents

| Destination | Usage | Routage et statut |
| --- | --- | --- |
| ARI | Consulter la documentation d’une commande ou d’un outil | Demande au main, résultat rendu à AEL ; prévu en 6.2 |
| ACP | Aucun appel direct pour replanifier | AEL retourne son blocage à Nova, qui peut consulter ACP |
| ACA | Aucune création, réparation ou installation de connecteur | Nova décide d’une éventuelle création |
| AEL lui-même | Aucune récursion | Refus par le routage |

La recherche ARI ne donne à AEL ni navigateur ni accès au coffre. AEL ne
manipule jamais Credentials par le terminal. Il n’est pas le mécanisme de
compilation ou d’exécution des connecteurs ACA : ceux-ci exigent leur propre
isolation et leur propre courtier de permissions.

Le futur contrat de délégation est décrit dans
[AGENTS_PLAN.md](../AGENTS_PLAN.md#contrat-technique-de-délégation-proposé).

## Modules et vérification

Cibles : `src/main/ael/`, `agent-task.ael.ts`,
`agent-task.ael-command.ts`, `agent-task.ael-permission.ts`, `ai.ael-flow.ts`,
`AelAgentPage.tsx` et `MessageItemAel.tsx`.
Données : `agents/agent-ael/`, créées à neuf en phase 6.1.

Conserver la matrice de tests des séparateurs, expansions, wrappers,
redirections, chemins, options mutantes et lectures sensibles. Vérifier aussi
UTF-8, sortie tronquée, stdin, timeout suspendu, refus ponctuel/permanent,
arrêt des tâches et distinction `/cmd`. La phase 6.2 ajoutera les tests de
recherche ARI sans accès aux secrets ni contournement de permission.

## Décisions restantes

Relire l’inventaire technique. Aucune nouvelle capacité terminal n’est
nécessaire en phase 6.1. La délégation documentaire à ARI et ses budgets
appartiennent à la conception technique 6.2.
