# État du projet

## Snapshot

- Date d’audit : 18 juillet 2026.
- Branche : `main`.
- Commit audité :
  `3595d2fa72f3da83b7673459c621f3365f908084`.
- `origin/main` pointait sur le même commit avant la mise à jour documentaire.
- Des données locales non suivies existaient déjà sous `agents/`. Elles ne
  font pas partie du code source.

## Résumé

NovaChat est un prototype fonctionnel avancé d’assistant desktop local. Le
chat, OpenAI, la persistance, les deux agents internes, les permissions et
l’exécution locale sont branchés. Le projet compile et se package.

Il n’est toutefois pas prêt à être considéré comme une frontière de sécurité
pour l’exécution de commandes, ni comme une application de production :
l’absence de tests, la policy shell contournable, la robustesse du stockage et
la gestion des secrets sont les principaux bloqueurs.

## Matrice fonctionnelle

| Capacité | État | Notes |
| --- | --- | --- |
| Chat multi-conversation | Fonctionnel | drafts, renommage, suppression, non-lus |
| Recherche dans la conversation | Fonctionnel | `Ctrl/Cmd+F`, navigation et surlignage |
| Persistance locale | Fonctionnel avec risques | JSON éclaté, non atomique |
| OpenAI Responses API | Fonctionnel | seul provider réel |
| Streaming | Non implémenté | type et UI préparés uniquement |
| `/cmd` utilisateur | Fonctionnel | exécution directe sans permission agent |
| Device agent | Fonctionnel | commande exacte ou générée depuis un objectif |
| Planner agent | Fonctionnel | plan textuel structuré, étape atomique |
| Permissions Device | Fonctionnel avec limites | règles exactes, policy non sûre |
| Saisie interactive | Partielle | heuristique stdout, timeout 15 s |
| Arrêt global d’un tour | Fonctionnel | abort provider, permission, commandes |
| Activité agents | Fonctionnel | polling 1 s + rafraîchissement sur événement |
| Contexte agent éditable | Fonctionnel | `contexte.json` |
| Historique agent | Fonctionnel | stockage et vue |
| Conversations directes agent | Backend seulement | IPC exposé, aucune UI active |
| Providers alternatifs | Placeholder | sélection possible mais non exécutée |
| Internationalisation | Partielle | écran de boot seulement |
| Tests automatisés | Absent | fichiers placeholders |
| Packaging Windows x64 | Vérifié | `npm.cmd run package` réussi |

## Agents actuels

### Planner

Le Planner est activé par défaut. Nova le sollicite explicitement ou force un
handoff heuristique au premier cycle pour certaines demandes non triviales.

Il renvoie :

- un statut `ready`, `needs-info` ou `blocked` ;
- un résumé ;
- au plus une prochaine étape ;
- `device-agent` ou `none` ;
- un mode `goal`, `command`, `analysis` ou `none`.

Le parser est déterministe, mais le respect du format dépend du modèle.

### Device

Le Device est activé par défaut. Il peut :

- recevoir une commande déjà formée ;
- transformer un objectif en commande via un second appel OpenAI ;
- exécuter dans le shell de la plateforme ;
- émettre progression et demande de saisie ;
- demander une permission ;
- conserver historique et conversation interne.

## Provider

Configuration réellement utilisée :

```text
settings.openai.apiKey
settings.openai.model
settings.openai.baseUrl
```

La requête cible `<baseUrl>/responses`, avec `store: false`.

Les IDs Anthropic, Google, Mistral, Ollama et LM Studio sont visibles en mode
preview, mais aucune implémentation provider correspondante n’existe.

## Validation technique

Réussites :

```text
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run package
```

Le package vérifié est `win32-x64`.

Non vérifié :

- installateur `make` ;
- lancement du binaire packagé ;
- macOS et Linux ;
- comportement avec un vrai appel OpenAI pendant l’audit ;
- tests automatisés, car ils n’existent pas.

## Écarts avec l’ancienne documentation

Les documents précédents indiquaient notamment que :

- seul `device-agent` existait ;
- le Device ne concevait pas encore sa commande ;
- le rafraîchissement live restait à faire ;
- les fichiers principaux étaient peu denses.

Ces points ne sont plus exacts. Le Planner, la génération de commande, le
polling d’activité et plusieurs écrans agents sont présents. En revanche,
plusieurs fichiers dépassent 250 à 600 lignes.

## État du dépôt

Le code source audité ne présentait pas de modification suivie avant le
chantier documentaire. Le dossier `agents/` était déjà non suivi. Les
artefacts `.webpack/` et `out/` sont ignorés.

La capture `docs/screenshot.png` représente une ancienne version de
l’interface et ne montre pas les écrans Agents actuels.

## Verdict de reprise

Le projet est reprenable sans refonte globale. Les frontières de domaines sont
lisibles et les flux principaux sont opérationnels.

La prochaine phase ne devrait toutefois pas ajouter de nouveaux agents ou
providers. Elle devrait sécuriser et tester le socle existant dans l’ordre
décrit par [NEXT_STEPS.md](NEXT_STEPS.md).
