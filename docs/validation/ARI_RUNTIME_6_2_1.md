# Qualification du runtime ARI — 6.2.1

Préparation le 29 octobre, qualification Windows x64 le 30 octobre 2026.
Qualification technique réussie ; ARI reste inactif.

## Périmètre autorisé

L’utilisateur a approuvé les 17 tâches de 6.2 puis l’extension de 6.2.1 à
Electron Forge 8 et Packager 20 avec contrôles de régression. ARI reste inactif.
Cette qualification ne prouve ni le confinement réseau de 6.2.5 ni la sécurité
des sessions de 6.2.10.

La copie de validation contient les sources suivies et les nouveaux fichiers
de qualification, sans settings, conversations, agents ou coffre utilisateur.
Les sorties Webpack et `out/` de ce dossier sont distinctes des artefacts locaux
du projet. Aucun installateur `make` n’est produit.

## Cibles

- Electron 44.10.0 ; Node embarqué 24.22.1.
- Construction sous Node 24.18.0 ; contrôle sous Node 22.22.2.
- Forge 8.0.1, Packager 20.3.0, ASAR 4.3.1, fuses 2.1.3.
- Point d’entrée de production `.webpack/main/index.cjs` ; configuration Forge
  avec hooks asynchrones de Packager 20.

Les versions exactes des parseurs et de leurs transitives sont verrouillées
dans `package-lock.json`. Le copieur `forge.runtime-assets.ts` conserve les
paquets runtime et leurs notices dans l’archive, avec les ressources ESM/PDF.
Les modules natifs restent décompactés par le plugin existant.

Le contrôle des types Webpack utilise directement `ts-loader` et supprime
`fork-ts-checker-webpack-plugin` ainsi que sa dépendance `deepmerge` sans
correctif. La commande `typecheck` couvre séparément les sources, la
configuration de construction et le harnais. Le résolveur TypeScript du lint
est limité aux configurations Forge/Webpack pour comprendre leurs exports ESM.
Les appels CommonJS nécessaires sont explicitement bornés au harnais et au
drapeau de démarrage Squirrel existant.

Les anciens overrides ont été retirés séparément puis audités. `tar`, `tmp`
et `webpack-dev-server` se résolvent désormais sans override vers des versions
corrigées. `uuid: 11.1.1` reste requis par la chaîne SockJS du serveur Webpack 5.
Il est conservé avec validation, sans imposer Webpack Dev Server 6 à Forge.

## Contrôles

```powershell
npm.cmd run ci
npm.cmd audit
npm.cmd audit --omit=dev
npm.cmd run test:ari-runtime -- --baseline-electron C:/chemin/de/test/electron-39/electron.exe --production-executable out/nova-chat-win32-x64/nova-chat.exe
```

Le harnais distinct crée un `userData` temporaire. Electron 39 écrit un canari
synthétique ; Electron 44 le relit et teste ses propres écritures chiffrées.
Le coffre OpenAI réel n’est jamais ouvert. Le rapport distingue la preuve
inter-version d’un simple round-trip effectué sans ancien runtime.

Le smoke DOM/PDF s’exécute en développement et dans un paquet de test ASAR :
scripts jsdom désactivés, extraction Readability/Cheerio, transport Undici mocké,
robots, suffixes privés, encodage, schéma Ajv fermé, PDF texte et worker local.
Un petit encodage PNG vérifie le chargement du module N-API canvas optionnel.
PDF.js utilise son mode Node : le chargement local du module worker ne prouve
pas encore l’isolation du futur processus de parsing.
Les six fuses sont relus dans les exécutables. Le paquet de production est
inspecté pour vérifier les ressources et l’absence du harnais.

## Résultats

Les audits complet et production sont à zéro après migration. `npm.cmd run ci`
passe sous Node 24.18.0 : 285 tests dans 42 fichiers, trois contrôles TypeScript,
lint sans avertissement et packaging Windows x64.

Le harnais complet a réussi avec Electron 44.10.0 / Node 24.22.1, en
développement puis dans l’ASAR : les dix contrôles de bibliothèques passent et
le canari écrit par Electron 39.8.10 est lisible dans les deux cas. Les six
fuses d’intégrité, la structure ASAR, les entrées main/preload `.cjs`, les
assets et le décompactage des modules natifs sont vérifiés. Le harnais est
absent de l’application de production.

Les RSS ponctuels du dernier passage sont de 201 449 472 octets en
développement et 225 644 544 octets dans le paquet ; ces mesures ne prouvent
pas le plafond du futur processus de parsing. Le PDF de test est une page
ASCII synthétique, sans qualification d’OCR ni de corpus documentaire réel.

Sous Node 22.22.2, les 285 tests, les trois contrôles TypeScript, le lint et
l’inspection du paquet de production passent. Le premier passage simultané
avait dépassé le délai d’un test de stockage ; le passage isolé n’a pas
reproduit cet échec, sans hausse du délai.

Deux défauts du harnais ont été corrigés avant son passage complet : retrait
du séparateur initial exigé par `statFile` sur Windows, puis alignement du
glob de décompactage natif sur Forge pour les chemins contenant `.codex`.
Le paquet de production utilisait déjà le bon glob. Le dernier
`npm.cmd run test:ari-runtime` s’est terminé avec un code de sortie 0.

Après qualification isolée, le manifeste et le lockfile ont été adoptés dans
le projet. `npm.cmd ci` réussit avec 860 paquets installés et un audit à zéro ;
le binaire Electron 44.10.0 est présent. Le dernier `npm.cmd run check` dans
le projet réussit : 285 tests, trois contrôles TypeScript et lint sans
avertissement. Les 268 fichiers source et les 18
fichiers de construction/qualification comparés sont identiques à la copie
testée. Les sorties locales préexistantes du projet sont conservées.

| Sortie Windows x64 | Octets | Mo décimaux |
| --- | ---: | ---: |
| Dossier applicatif complet | 520 716 916 | 520,7 |
| `resources/app.asar` | 107 082 592 | 107,1 |
| `resources/app.asar.unpacked` | 28 806 656 | 28,8 |
| Ancien dossier local observé, conservé | 342 148 279 | 342,1 |

La hausse observée de 178,6 Mo comprend Electron 44, les bibliothèques runtime
et les ressources PDF/N-API. La première qualification conserve l’arbre
runtime verrouillé complet, y compris ses peers optionnels, pour préserver
la résolution ESM et les assets relatifs. Aucun plafond de distribution n’est
annoncé et les installateurs ne sont pas mesurés ici.

L’inventaire runtime installé comprend 98 paquets, sans dépendance obligatoire
manquante : MIT (65), MIT-0 (2), Apache-2.0 (5), ISC (2), BSD-2-Clause (19),
BSD-3-Clause (3), BlueOak-1.0.0 (1), CC0-1.0 (1). Les notices présentes dans les
paquets sont conservées par la copie complète des dépendances runtime.

## Limites

Windows x64 uniquement. Les parcours applicatifs manuels ACP/AEL avec provider,
les plateformes macOS/Linux, la signature, les installateurs et la migration
d’une installation réelle restent dans leurs validations dédiées. Le canari
ne remplace pas ces parcours.
Electron 44 demande macOS 13 au minimum et ne fournit plus de binaires Windows
x86 ou Linux ARM 32 bits. Aucune qualification native de ces plateformes n’est
annoncée par le paquet Windows.

npm 11 laisse deux scripts d’installation hors de sa liste autorisée :
`electron-winstaller` et `unrs-resolver`. Leur approbation n’a pas été ajoutée ;
les contrôles qualifiés fonctionnent avec les paquets installés. Le script de
sélection 7-Zip de l’installateur reste à examiner lors de la phase finale
`make`. ESLint 8 reste compatible avec la configuration actuelle mais sa fin
de support est signalée par npm ; une migration de configuration reste un
travail d’entretien distinct, sans alerte dans l’audit présent.
