# État du projet

## Snapshot

- Date d’audit : 27 août 2026.
- Branche de référence : `main`.
- Base historique de l’audit : `d589ae1`
  (`Security: store OpenAI key in OS vault`), complétée par les phases 3 à 5
  et la réorganisation technique de la phase 6.1.
- Les données locales sous `/agents/` sont explicitement ignorées sans masquer
  les nouveaux fichiers source de `src/main/agents/`.

## Résumé

NovaChat est un prototype fonctionnel avancé d’assistant desktop local. Le
chat, OpenAI, la persistance, les deux agents internes, les permissions et
l’exécution locale sont branchés. Le projet compile et se package.

Le socle de code est propre, strictement typé et packagé, mais l’application ne
doit toujours pas être considérée comme une frontière de sécurité pour
l’exécution de commandes ni comme une distribution de production. La policy
AEL reste un contrôle de permission, pas un sandbox. Les parcours réels
avec clé OpenAI, le binaire installé et les plateformes non Windows restent à
valider avant une diffusion.

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
| AEL — Agent d’Exécution Locale | Fonctionnel | profil terminal non interactif et création structurée de fichiers avec permission ponctuelle |
| ACP — Agent de Cadrage et de Planification | Fonctionnel | plan textuel structuré, étape atomique |
| Permissions AEL | Durci avec limites | lectures sûres sans prompt, syntaxe restrictive, pas un sandbox |
| Saisie interactive | Partielle | heuristique stdout ; timeout configurable suspendu pendant la saisie |
| Arrêt global d’un tour | Fonctionnel | abort provider, permission, commandes |
| Activité agents | Fonctionnel | polling 1 s + rafraîchissement sur événement |
| Contexte agent éditable | Fonctionnel | `contexte.json` versionné, règles internes non éditables |
| Historique agent | Fonctionnel | stockage et vue |
| Providers alternatifs | Catalogue planifié | visibles comme « à venir », non sélectionnables et refusés par le main |
| Internationalisation | Partielle | écran de boot seulement |
| Tests automatisés | Renforcés | 337 cas dans 47 fichiers ; voir les validations ARI et AEL pour les runtimes testés |
| Packaging Windows x64 | Vérifié | `npm.cmd run package` réussi |

## Agents actuels

### ACP

L’ACP est activé par défaut. Nova le sollicite explicitement ou force un
handoff heuristique au premier cycle pour certaines demandes non triviales.

Il renvoie :

- un statut `ready`, `needs-info` ou `blocked` ;
- un résumé ;
- au plus une prochaine étape ;
- `agent-ael` ou `none` ;
- un mode `goal`, `analysis` ou `none` dans le contrat courant.

Le parser conserve la compatibilité avec l’ancien mode `command`, mais toute
étape AEL issue d’ACP est exécutée comme un objectif : seul AEL
choisit la syntaxe du shell.

### AEL

L’AEL est activé par défaut. Il peut :

- recevoir une commande déjà formée ;
- transformer un objectif en commande via un second appel OpenAI ;
- exécuter dans le shell de la plateforme ;
- émettre progression et demande de saisie ;
- demander une permission ;
- conserver historique et conversation interne.

Le correctif du 30 octobre 2026 ajoute `write-file` à AEL : Nova fournit une
cible `desktop` ou `workspace`, un nom simple et le contenu UTF-8 exact
(128 Kio maximum). Le main résout le Bureau via Electron, affiche le chemin
et le contenu pour une permission ponctuelle, puis crée et relit le fichier
sans shell. Les fichiers existants, sous-dossiers et données internes sont
refusés. Le code créé n'est pas exécuté. Un objectif transmis par ACP peut
aboutir à la même action. Voir [la validation](validation/AEL_FILE_WRITE.md).
L'utilisateur a confirmé le bon fonctionnement du correctif le 30 octobre 2026.

Sous Windows, le runtime communiqué aux agents est désormais le même
`cmd.exe` que celui réellement utilisé. Les commandes générées ne doivent plus
émettre de syntaxe PowerShell ou Unix, ni dépendre de `wmic`. Un profil
déterministe les refuse avant toute permission si elles lancent un wrapper,
une interface graphique, une console secondaire ou un utilitaire interactif
tel que DiskPart. Il borne aussi une inspection à trois segments et refuse les
commandes que la policy ne sait pas classifier. Les commandes terminal sûres
restent exécutables sans confirmation ; `/cmd` conserve son comportement
d’exécution explicite par l’utilisateur.

Les anciennes valeurs par défaut de `contexte.json` sont migrées vers le
schéma courant. Une personnalisation utilisateur est conservée et complétée
par les instructions internes obligatoires au moment de construire le prompt.

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

Les IDs Anthropic, Google, Mistral, Ollama et LM Studio restent visibles comme
catalogue planifié, mais aucune implémentation provider correspondante
n’existe. Ils sont désactivés dans l’UI et rejetés par la validation main.
`ActiveAIProviderId` ne contient donc qu’OpenAI.

Le 30 octobre 2026, la préparation documentaire des providers a été corrigée :
connecteur `ollama` indépendant des modèles, connecteur `mistral`, préservation
des messages Nova, extension additive proposée des settings et du coffre,
annulation et transfert d'historique encadrés. Les schémas, migrations et tests
de ces nouveaux connecteurs ne sont pas implémentés. Voir
[le dossier Providers](Providers/INDEX.md) et [le cadre de phase 7](PHASE_7.md).

## Validation technique

Réussites :

```text
npm.cmd test
npm.cmd exec tsc -- --noEmit
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run package
npm.cmd run check
npm.cmd run ci
npm.cmd audit
npm.cmd audit --omit=dev
npm.cmd run test:ari-runtime
```

Le package vérifié est `win32-x64`.
Le démarrage de développement a également atteint le lancement de
l’application et du serveur renderer sur `http://localhost:9000`.

La suite comprend 337 cas répartis dans 47 fichiers. Elle couvre la policy
AEL, les parsers OpenAI/ACP, les commandes slash, les handoffs
assistant-agent, la conservation des traces, les messages de tâche agent, le
formatage de la page AEL, les stockages chat/agents, les frontières IPC,
les chemins confinés, le cycle de vie AEL, les reducers d’événements, les
écritures atomiques, les reprises sur backup, les queues agents, les
migrations `userData`, le registre ACP/AEL et le coffre de secrets. Elle couvre désormais
aussi les permissions asynchrones, l’arrêt des tours, la reprise des queues,
le timeout OpenAI, la sécurité de la fenêtre, la visibilité structurée et des
composants React critiques. La matrice AEL comporte 119 cas et tous les
anciens contournements connus sont des tests de régression normaux. Les quatre
cas ajoutés en 6.2.1 vérifient la copie des ressources runtime et les chemins du
package. Un harnais Electron distinct qualifie DOM/PDF, N-API, fuses et canari
chiffré entre Electron 39 et 44 en développement et dans un ASAR de test.

Non vérifié :

- installateur `make` ;
- parcours applicatif du binaire de production ; le harnais packagé distinct
  est exécuté et le paquet de production est inspecté ;
- macOS et Linux ;
- comportement avec un vrai appel OpenAI pendant l’audit ;
- autres parcours Electron réels ; le correctif de création de fichier AEL
  a reçu une validation utilisateur le 30 octobre 2026.

L’audit initial signalait 57 vulnérabilités dans l’arbre complet, dont
2 critiques, et aucune dans les dépendances de production. Après mises à jour
ciblées et résolutions transitives, les audits complet et production
signalent tous les deux 0 vulnérabilité.

Le 30 octobre 2026, la qualification de 6.2.1 met à jour Electron vers 44.10.0,
Forge vers 8.0.1 et Packager vers 20.3.0. Les overrides historiques ont été
réévalués séparément : seul `uuid: 11.1.1` reste nécessaire à SockJS. Les audits
complet et production sont à zéro. Le [rapport](validation/ARI_RUNTIME_6_2_1.md)
consigne versions, licences, taille, limites et preuves. Les contrôles doivent
être rejoués à chaque évolution de l’arbre.

## Écarts avec l’ancienne documentation

Les documents précédents indiquaient notamment que :

- un seul agent d’exécution locale existait ;
- l’AEL ne concevait pas encore sa commande ;
- le rafraîchissement live restait à faire ;
- les fichiers principaux étaient peu denses.

Ces points ne sont plus exacts. L’ACP, la génération de commande, le
polling d’activité et plusieurs écrans agents sont présents. Les anciens
fichiers monolithiques explicitement recensés en P2 ont été découpés selon
leurs frontières métier.

## État du dépôt

Le dossier `agents/`, les settings et conversations locales ainsi que les
artefacts `.webpack/` et `out/` sont ignorés. La capture historique obsolète a
été retirée de la documentation.

## Verdict de reprise

Le projet est reprenable sans refonte globale. Les frontières de domaines sont
lisibles et les flux principaux sont opérationnels.

Les phases 3 et 4 sont closes : données récupérables, fenêtre durcie, provider
actif borné, settings indépendants du réseau, visibilité structurée,
TypeScript strict, erreurs asynchrones contrôlées et modules denses découpés.

La réorganisation technique d’ACP et d’AEL en phase 6.1 est close : validation
automatisée, packaging, nettoyage local confirmé et test manuel commun ont
réussi. La préparation d’ARI a été consolidée le 29 octobre 2026 : les cahiers
ont été relus, D01 (exception robots pour la seule page de résultats Google)
confirmée par l’utilisateur, les choix techniques D02 à D10 arrêtés par
délégation et 17 tâches préparées dans `NEXT_STEPS.md`. L’utilisateur a approuvé
ce découpage le même jour puis demandé de continuer. La qualification de 6.2.1
est réussie le 30 octobre : audits, 285 tests, typage, lint, packaging Windows,
contrôles Node 22/24 et harnais DOM/PDF packagé avec canari 39 vers 44. Les
majeures Forge 8/Packager 20 sont approuvées ; voir
[le dossier de qualification](validation/ARI_RUNTIME_6_2_1.md).
La prochaine tâche est 6.2.2, contrats et provenance des délégations.
ARI n’est pas livré ; les preuves réseau et sessions restent à faire.
L’accord sur le découpage reste acquis à la reprise. ACA garde son cahier technique
initial et son runtime généré bloquant. ARI demeure transversal et doit être
validé avant ACA. Les installateurs restent la toute dernière tâche absolue.
