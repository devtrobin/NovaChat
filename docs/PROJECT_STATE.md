# État du projet

## Snapshot

- Revue du socle : 21 septembre 2026 ; documentation cible 6.2 finalisée le
  22 septembre, sans réexécution des checks du code.
- Code de référence : `6245e7a`, intégration du 19 septembre 2026.
- Réorganisation 6.1 : commit `ebb9b03` du 19 septembre 2026.
- Branche de travail : `docs/phase-6-agent-specifications`.
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
| AEL — Agent d’Exécution Locale | Fonctionnel | profil terminal non interactif, commande exacte ou générée depuis un objectif |
| ACP — Agent de Cadrage et de Planification | Fonctionnel | plan textuel structuré, étape atomique |
| Permissions AEL | Durci avec limites | lectures sûres sans prompt, syntaxe restrictive, pas un sandbox |
| Saisie interactive | Partielle | heuristique stdout ; timeout configurable suspendu pendant la saisie |
| Arrêt global d’un tour | Fonctionnel | abort provider, permission, commandes |
| Activité agents | Fonctionnel | polling 1 s + rafraîchissement sur événement |
| Contexte agent éditable | Fonctionnel | `contexte.json` versionné, règles internes non éditables |
| Historique agent | Fonctionnel | stockage et vue |
| Providers alternatifs | Catalogue planifié | visibles comme « à venir », non sélectionnables et refusés par le main |
| ARI 6.2 | Documentation prête, non implémenté | tâches 6.2.1–11, Outlook personnel et professionnel/scolaire obligatoires |
| Internationalisation | Partielle | écran de boot seulement |
| Tests automatisés | Renforcés | 281 réussites dans 41 fichiers, aucun échec attendu |
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

Sous Windows, le runtime communiqué aux agents est désormais le même
`cmd.exe` que celui réellement utilisé. Les commandes générées ne doivent plus
émettre de syntaxe PowerShell ou Unix, ni dépendre de `wmic`. Un profil
déterministe les refuse avant toute permission si elles lancent un wrapper,
une interface graphique, une console secondaire ou un utilitaire interactif
tel que DiskPart. Ce profil s’applique également aux commandes exactes confiées
à une tâche AEL, contrairement à la voie utilisateur `/cmd`. Il borne aussi
une inspection à trois segments et refuse les
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

## Validation technique

Dernier bilan enregistré avec la phase 6.1 (résultats rapportés, non rejoués
pendant la revue documentaire du 21 septembre 2026) :

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

La suite comprend 281 cas répartis dans 41 fichiers. Elle couvre la policy
AEL, les parsers OpenAI/ACP, les commandes slash, les handoffs
assistant-agent, la conservation des traces, les messages de tâche agent, le
formatage de la page AEL, les stockages chat/agents, les frontières IPC,
les chemins confinés, le cycle de vie AEL, les reducers d’événements, les
écritures atomiques, les reprises sur backup, les queues agents, les
migrations `userData`, le registre ACP/AEL et le coffre de secrets. Elle couvre désormais
aussi les permissions asynchrones, l’arrêt des tours, la reprise des queues,
le timeout OpenAI, la sécurité de la fenêtre, la visibilité structurée et des
composants React critiques. La matrice AEL comporte 119 cas et tous les
anciens contournements connus sont des tests de régression normaux.

Non vérifié :

- installateur `make` ;
- lancement du binaire packagé ;
- macOS et Linux ;
- comportement avec un vrai appel OpenAI pendant l’audit ;
- parcours Electron end-to-end réels.

L’audit initial signalait 57 vulnérabilités dans l’arbre complet, dont
2 critiques, et aucune dans les dépendances de production. Après mises à jour
ciblées et résolutions transitives, les audits complet et production
signalaient tous les deux 0 vulnérabilité dans le bilan conservé. Aucun audit
npm n’a été relancé lors de cette revue ; ce chiffre ne décrit pas une mesure
actualisée des avis de sécurité.

Les résolutions `tar`, `tmp`, `uuid` et `webpack-dev-server` de `package.json`
compensent des contraintes amont trop anciennes d’Electron Forge 7. Elles ont
été validées par les tests, le typage, le lint, un démarrage de développement
et le packaging Windows x64. Elles doivent être réévaluées lors de chaque mise
à jour d’Electron Forge.

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
réussi. Les cahiers ARI et le découpage de 6.2 sont finalisés le 22 septembre
2026 et prêts pour le développement, qui commence par 6.2.1. La cible comprend
curl, recherche publique, comptes et accords persistants, Outlook personnel et
Microsoft 365 professionnel/scolaire. Gmail et Orange sont facultatifs.
Aucun composant ARI n’est encore livré et ses validations restent à exécuter.
Les artefacts curl et la configuration Microsoft seront qualifiés pendant le
code. ACA conserve son blocage de runtime ; sa documentation sera finalisée
séparément. ARI reste transversal et doit être validé avant ACA. Les
installateurs restent la dernière phase absolue.
