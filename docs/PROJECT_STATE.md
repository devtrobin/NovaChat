# État du projet

## Snapshot

- Date d’audit : 18 juillet 2026.
- Branche : `main`.
- État du code audité jusqu’au commit :
  `d589ae1` (`Security: store OpenAI key in OS vault`).
- Des données locales non suivies existaient déjà sous `agents/`. Elles ne
  font pas partie du code source.

## Résumé

NovaChat est un prototype fonctionnel avancé d’assistant desktop local. Le
chat, OpenAI, la persistance, les deux agents internes, les permissions et
l’exécution locale sont branchés. Le projet compile et se package.

Il n’est toutefois pas prêt à être considéré comme une frontière de sécurité
pour l’exécution de commandes, ni comme une application de production. La
phase 3 de fiabilisation des données est terminée, mais la policy Device reste
un contrôle de permission et non un sandbox ; le durcissement Electron, les
surfaces provider et les parcours end-to-end restent incomplets.

## Matrice fonctionnelle

| Capacité | État | Notes |
| --- | --- | --- |
| Chat multi-conversation | Fonctionnel | drafts, renommage, suppression, non-lus |
| Recherche dans la conversation | Fonctionnel | `Ctrl/Cmd+F`, navigation et surlignage |
| Persistance locale | Fiabilisée | JSON éclaté, atomique par fichier, backups, journal et reprise explicite |
| OpenAI Responses API | Fonctionnel | seul provider réel |
| Streaming | Non implémenté | aucune surface inactive conservée |
| Commandes slash locales | Fonctionnel | aide, état, agents et paramètres sans appel provider |
| `/cmd` utilisateur | Fonctionnel | exécution directe sans permission agent |
| Device agent | Fonctionnel | commande exacte ou générée depuis un objectif |
| Planner agent | Fonctionnel | plan textuel structuré, étape atomique |
| Permissions Device | Durci avec limites | syntaxe restrictive, pas un sandbox |
| Saisie interactive | Partielle | heuristique stdout ; timeout configurable suspendu pendant la saisie |
| Arrêt global d’un tour | Fonctionnel | abort provider, permission, commandes |
| Activité agents | Fonctionnel | polling 1 s + rafraîchissement sur événement |
| Contexte agent éditable | Fonctionnel | `contexte.json` |
| Historique agent | Fonctionnel | stockage et vue |
| Providers alternatifs | Placeholder | sélection possible mais non exécutée |
| Internationalisation | Partielle | écran de boot seulement |
| Tests automatisés | Socle fonctionnel | 191 réussites dans 23 fichiers, aucun échec attendu |
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
coffre système OpenAI (runtime main uniquement)
settings.openai.model
settings.openai.baseUrl
```

La clé est chiffrée avec `electron.safeStorage`, n’est ni persistée dans
`settings.json` ni renvoyée au renderer. La requête cible
`<baseUrl>/responses`, avec `store: false`.

Les IDs Anthropic, Google, Mistral, Ollama et LM Studio sont visibles en mode
preview, mais aucune implémentation provider correspondante n’existe.

## Validation technique

Réussites :

```text
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run package
npm.cmd run check
npm.cmd run ci
npm.cmd audit
npm.cmd audit --omit=dev
```

Le package vérifié est `win32-x64`.
Le démarrage de développement a également atteint le lancement de
l’application et du serveur renderer sur `http://localhost:9000`.

La suite comprend 191 cas répartis dans 23 fichiers. Elle couvre la policy
Device, les parsers OpenAI/Planner, les commandes slash, les handoffs
assistant-agent, la conservation des traces, les messages de tâche agent, le
formatage de la page Device, les stockages chat/agents, les frontières IPC,
les chemins confinés, le cycle de vie Device, les reducers d’événements, les
écritures atomiques, les reprises sur backup, les queues agents, les
migrations `userData`/Planner et le coffre de secrets. La matrice Device
comporte 88 cas et tous les anciens
contournements connus sont des tests de régression normaux.

Non vérifié :

- installateur `make` ;
- lancement du binaire packagé ;
- macOS et Linux ;
- comportement avec un vrai appel OpenAI pendant l’audit ;
- composants React et parcours end-to-end.

L’audit initial signalait 57 vulnérabilités dans l’arbre complet, dont
2 critiques, et aucune dans les dépendances de production. Après mises à jour
ciblées et résolutions transitives, les audits complet et production
signalent tous les deux 0 vulnérabilité.

Les résolutions `tar`, `tmp`, `uuid` et `webpack-dev-server` de `package.json`
compensent des contraintes amont trop anciennes d’Electron Forge 7. Elles ont
été validées par les tests, le typage, le lint, un démarrage de développement
et le packaging Windows x64. Elles doivent être réévaluées lors de chaque mise
à jour d’Electron Forge.

## Écarts avec l’ancienne documentation

Les documents précédents indiquaient notamment que :

- seul `device-agent` existait ;
- le Device ne concevait pas encore sa commande ;
- le rafraîchissement live restait à faire ;
- les fichiers principaux étaient peu denses.

Ces points ne sont plus exacts. Le Planner, la génération de commande, le
polling d’activité et plusieurs écrans agents sont présents. Les anciens
fichiers monolithiques explicitement recensés en P2 ont été découpés selon
leurs frontières métier.

## État du dépôt

Le code source audité ne présentait pas de modification suivie avant le
chantier documentaire. Le dossier `agents/` était déjà non suivi. Les
artefacts `.webpack/` et `out/` sont ignorés. La capture historique obsolète a
été retirée de la documentation.

## Verdict de reprise

Le projet est reprenable sans refonte globale. Les frontières de domaines sont
lisibles et les flux principaux sont opérationnels.

La phase 3 est close. La prochaine priorité est la phase 4 : clarifier les
providers réellement utilisables, corriger le masquage des résultats `/cmd`
et décider de l’objectif i18n, dans l’ordre décrit par
[NEXT_STEPS.md](NEXT_STEPS.md).
