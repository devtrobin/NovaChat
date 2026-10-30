# Spécification technique — ARI, Agent de Recherche Internet

## Statut

Conception arrêtée le **29 octobre 2026**, après relecture du
[cahier fonctionnel ARI](ARI_SPECIFICATION.md), du code et du lockfile à
`6245e7a`. L’utilisateur a délégué les arbitrages techniques et confirmé
explicitement l’exception Google décrite par D01 ci-dessous.

La préparation documentaire est terminée. Le
[découpage de 6.2](../NEXT_STEPS.md#découpage-de-la-phase-62) a été approuvé par
l’utilisateur le même jour, avec demande de continuer. La qualification
runtime/dépendances de 6.2.1 est réussie le 30 octobre 2026 ; voir
[les preuves](../validation/ARI_RUNTIME_6_2_1.md). Le service de recherche ARI
n’est pas encore implémenté. Les preuves de confinement et de sessions restent
des portes distinctes avant activation.

## Registre des décisions

| ID | Décision | Validation et portée |
| --- | --- | --- |
| D01 | Scraper Google local, exception robots limitée à la page de résultats ; aucun repli automatique | confirmation explicite de l’utilisateur, 29/10/2026 |
| D02 | `undici` pour le public ; pile Chromium pour sessions/rendu derrière un canal de sortie contrôlé | retenue par délégation ; preuve Electron obligatoire en 6.2.5 |
| D03 | Connexion épinglée, refus des adresses non publiques, aucun proxy système/PAC ni secours direct | retenue par délégation ; tests réseau obligatoires |
| D04 | Electron 44 et moteurs de construction resserrés avant le rendu distant | qualification Windows x64 réussie en 6.2.1 ; Forge 8/Packager 20 approuvés explicitement |
| D05 | Cheerio, jsdom/Readability, PDF.js, robots-parser, tldts, Ajv et iconv-lite | familles retenues ; versions exactes, transitives et licences qualifiées en 6.2.1 |
| D06 | Profils explicites d’authentification et de lecture ; aucune heuristique de soumission | retenue par délégation ; opération inconnue refusée |
| D07 | Identités main, ACL du demandeur effectif, snapshots de session chiffrés et révocation concurrente | retenue par délégation ; aucun accès Credentials par AEL |
| D08 | Budgets, user-agent et règles de statut fixés ci-dessous | retenue par délégation ; bornes non extensibles par le modèle |
| D09 | Contrats versionnés, faits/citations vérifiés, aucune trace brute, rétention complète | retenue par délégation ; conversations principales préservées |
| D10 | Preuves de sécurité avant activation ; arrêt et nouvel arbitrage si une garantie échoue | retenue par délégation ; aucun assouplissement implicite |

## Objectifs techniques

- rechercher sur Google sans utiliser `web_search` d’OpenAI ni une API de
  recherche hébergée ;
- extraire au plus dix domaines organiques distincts ;
- récupérer d’abord les contenus par HTTP sans exécuter de JavaScript ;
- utiliser un rendu Electron isolé seulement lorsqu’il est nécessaire ;
- lire HTML, texte, JSON public et PDF texte, sans OCR dans la première version ;
- empêcher l’accès aux réseaux locaux et aux schémas d’URL dangereux ;
- traiter tout contenu Web comme une donnée non fiable ;
- ne jamais exposer credentials, cookies ou secrets au modèle ;
- conserver les sources, tentatives, limites et avertissements ;
- permettre l’annulation complète d’un cycle.

## Position dans l’architecture NovaChat

ARI devient un agent système statique :

- identifiant cible : `agent-ari` ;
- définition ajoutée à `src/shared/system-agent.registry.ts` ;
- orchestration, réseau, credentials et persistance pilotés par le process
  Electron `main` ;
- renderer limité aux canaux preload nécessaires à l’affichage, l’annulation et
  la configuration ;
- aucune dépendance privée à ACA ;
- résultat accessible à Nova et aux agents explicitement autorisés.

Le process `main` reste la frontière de confiance. Les parseurs lourds pourront
être placés dans un `utilityProcess` pour isoler consommation mémoire et crash,
mais ce processus Node ne sera pas considéré comme un sandbox de sécurité.

## Composants cibles

| Composant | Responsabilité |
| --- | --- |
| `ARIOrchestrator` | budgets, file des candidats, arrêt et résultat final |
| `ARIQueryBuilder` | requête minimale, langue, région et reformulation future |
| `GoogleSearchScraper` | récupération et parsing d’un résultat Google |
| `SafeHttpClient` | URL, DNS, redirections, délais, taille et types MIME |
| `RobotsPolicyService` | récupération, cache court et application de `robots.txt` |
| `SiteScraper` | stratégie HTTP puis éventuel rendu JavaScript |
| `StaticDocumentExtractor` | HTML, texte et JSON sans script |
| `RenderedPageExtractor` | rendu Electron isolé et extraction du DOM final |
| `PDFTextExtractor` | texte, métadonnées et pages pertinentes d’un PDF |
| `ContentNormalizer` | document canonique, nettoyage et liens internes |
| `ContentChunker` | sections bornées pour analyse provider |
| `SourceClassifier` | source officielle, propriétaire et orientation |
| `SourceClusterer` | doublons, reprises et propriétaires communs |
| `CredentialsService` | registre non sensible global et coffre système |
| `AuthenticatedSessionBroker` | injection contrôlée des secrets dans une session |
| `ChromiumEgressBroker` | connexions du navigateur via proxy interne épinglé, interception et budgets |
| `ARIStorageService` | tâches finales, sources et diagnostics expurgés |

Organisation de sources proposée :

```text
src/main/ari/
├── ari.orchestrator.ts
├── ari.query.ts
├── ari.google-scraper.ts
├── ari.safe-http.ts
├── ari.robots.ts
├── ari.site-scraper.ts
├── ari.rendered-page.ts
├── ari.extract-html.ts
├── ari.extract-pdf.ts
├── ari.content.ts
├── ari.sources.ts
├── ari.egress.ts
├── ari.storage.ts
└── ari.types.ts
```

Les contrats partagés résident dans `src/shared/ari.types.ts`,
`src/shared/credentials.types.ts` et `src/shared/agent-delegation.types.ts`.
Le registre global et le broker de secrets résident sous `src/main/credentials/`,
et non dans un coffre privé d’ARI. Le provider reste sous `src/main/ai/`, les
handlers sous `src/main/ipc/`, les parseurs de payload sous `src/main/validation/`.
Les détails HTTP, DOM, cookies et secrets restent privés au `main`.

## Dépendances techniques retenues et qualification D04/D05

| Besoin | Choix retenu | Justification |
| --- | --- | --- |
| HTTP contrôlé | `undici` direct | streaming, abort, dispatcher et connexion contrôlée |
| Parsing de résultats Google | `cheerio` | sélecteurs DOM sans exécution de scripts |
| Extraction d’article | `jsdom` sans scripts + `@mozilla/readability` | DOM compatible et retrait du bruit éditorial |
| Encodages non UTF-8 | `iconv-lite` | décodage selon le charset HTTP/HTML |
| PDF texte | `pdfjs-dist` | extraction page par page sans OCR |
| `robots.txt` | `robots-parser` | règles user-agent déterministes |
| Domaines enregistrables | `tldts` | déduplication et contrôle de portée |
| Schémas JSON Credentials | `ajv` + formats nécessaires | validation fermée et erreurs structurées |

Ces paquets sont des dépendances directes verrouillées et qualifiées en 6.2.1.
Aucune API de récupération de
Cheerio, jsdom ou PDF.js ne doit ouvrir son propre réseau. Les DOM ne chargent
ni scripts ni sous-ressources ; Readability produit des sections textuelles,
jamais du HTML réinjecté dans l’UI.

Point de départ historique : Electron `39.8.10`, Node embarqué `22.22.1`, Webpack `5.104.1`,
TypeScript strict en résolution `Node16`, Node local `24.18.0`, CI sur Node 22,
moteurs déclarés `^20.0.0 || ^22.0.0 || >=24.0.0`. Ne pas confondre moteur
de construction et moteur livré dans Electron.

Electron **44.10.0**, branche maintenue intermédiaire au 29/10/2026, est
qualifié sous Windows x64 avec Node embarqué `24.22.1`. Le moteur de
construction est `^22.22.2 || ^24.18.0`, la CI principale utilise Node
`24.18.0`, les contrôles passent aussi sous `22.22.2`. Forge `8.0.1`, Packager
`20.3.0`, ASAR `4.3.1` et fuses `2.1.3` sont verrouillés ; le main de production
est `.webpack/main/index.cjs`. La compatibilité du chiffrement 39 vers 44 a été
vérifiée avec un canari synthétique temporaire.

| Paquet | Version verrouillée | Vigilance |
| --- | --- | --- |
| `undici` | 7.30.1 | dispatcher ARI privé ; aucune modification globale de `fetch` |
| `cheerio` | 1.2.0 | manifeste versionné Node >=20.18.1, documentation courante 22.19+ ; vérifier le paquet et toutes ses transitives |
| `jsdom` | 30.1.3 | manifeste Node ^22.22.2 / ^24.15.0 / >=26 ; incompatible avec le Node de l’ancien Electron 39 |
| `@mozilla/readability` | 0.6.0 | limites DOM explicites ; extraction, pas assainisseur de HTML |
| `pdfjs-dist` | 6.4.299 | ESM, worker/ressources à inclure dans ASAR ; dépendance native canvas optionnelle à examiner, pas d’OCR |
| `robots-parser` | 3.0.1 | politique HTTP extérieure au parseur ; `undefined` n’autorise pas une URL |
| `tldts` | 7.4.19 | `URL` puis hostname canonique ; suffixes privés pour les sites, jamais comme ACL |
| `ajv`, `ajv-formats`, `iconv-lite` | 8.20.0 / 3.0.1 / 0.7.3 | formats locaux fermés, aucun chargement de schéma distant |

Les manifestes, licences et transitives ont été inventoriés ; les audits complet
et production sont à zéro au contrôle du 30/10/2026. Imports ESM/CJS, worker PDF
local et N-API canvas passent en développement et dans le harnais packagé. Le
[rapport](../validation/ARI_RUNTIME_6_2_1.md) détaille taille, licences et limites.
Cela ne dispense pas des prochaines preuves réseau ni d’une surveillance des
avis de sécurité. L’override `uuid` reste justifié par SockJS ; les trois autres
overrides historiques ont été retirés.

Les types directs sont `@types/node` `24.19.2` et `@types/jsdom` `30.0.0`.
Ils ne doivent pas autoriser des API absentes du runtime livré. La qualification
couvre aussi les contrôles sous Node 22.22.2, distinct de la cible runtime
Electron Node 24.

Références vérifiées le 29/10/2026 :
[Electron 39](https://releases.electronjs.org/release/v39.8.10),
[Electron 44](https://releases.electronjs.org/release/v44.10.0),
[support Electron](https://www.electronjs.org/docs/latest/tutorial/electron-timelines),
[Undici](https://github.com/nodejs/undici#long-term-support),
[Cheerio versionné](https://raw.githubusercontent.com/cheeriojs/cheerio/v1.2.0/package.json),
[jsdom](https://raw.githubusercontent.com/jsdom/jsdom/main/package.json),
[Readability](https://github.com/mozilla/readability#security),
[manifestes PDF.js générés](https://github.com/mozilla/pdf.js/blob/v6.4.299/gulpfile.mjs).

### Répartition des transports D02

- Google : `undici`, jar éphémère et propre au cycle, aucun compte ou cookie
  importé ; éventuel `Set-Cookie` uniquement dans ce jar borné et non journalisé.
- Pages publiques : `undici` sans cookie d’un compte configuré ; aucun jar
  partagé entre sites. Le dispatcher ne modifie pas le transport OpenAI.
- Rendu public : partition Chromium éphémère sans credential.
- Authentification et lecture authentifiée : partition éphémère par entrée et
  lease de broker autorisée, aucune copie des cookies vers `undici`.
- `session.fetch` est privé au broker Chromium, jamais un raccourci autour du
  canal de sortie ni une API renderer. Les contrôles s’appliquent à toute
  redirection et sous-ressource, pas seulement au document principal.

## Pipeline complet d’une recherche

```text
ARIResearchRequest validée
  -> création du budget et de l’AbortController
  -> URL directe éventuelle placée en tête
  -> sinon construction d’une requête Google minimale
  -> récupération de la page Google dans une session éphémère
  -> détection consentement, captcha ou blocage
  -> extraction des résultats organiques
  -> normalisation et déduplication par domaine
  -> pour chaque candidat, dans l’ordre :
       contrôle URL/DNS/robots
       récupération HTTP bornée
       détection MIME et encodage
       extraction statique
       rendu Electron seulement si contenu utile absent et JavaScript requis
       extraction PDF si applicable
       normalisation et découpage
       sélection/extraction des faits par le provider
       classification et rapprochement des sources
       vérification du niveau de preuve
  -> arrêt dès que la preuve est suffisante ou qu’une limite est atteinte
  -> résultat structuré, persistance expurgée et retour au demandeur
```

Chaque transition vérifie l’annulation et les budgets. Une erreur sur un site
produit une tentative structurée puis passe au suivant, sauf blocage de Google
lui-même ou erreur globale du service.

## Construction de la requête Google

`ARIQueryBuilder` reçoit l’objectif et produit une seule requête par cycle :

- suppression des secrets et données privées non indispensables ;
- conservation des termes métier, versions, dates et contraintes utiles ;
- langue dérivée de la demande ;
- région dérivée du système par défaut ;
- SafeSearch explicitement désactivé ;
- aucun compte Google ni historique persistant.

La synthèse de requête par le modèle est autorisée, mais le résultat passe par
une validation de longueur et un filtre de secrets avant envoi à Google.

La requête est limitée à 512 caractères. Le builder reçoit un objectif minimal,
pas un dump de conversation, une sortie shell, un document authentifié ou les
settings. Un résultat non expurgeable est refusé avec `query-sensitive`.
Demander la désactivation de SafeSearch ne garantit pas que Google ou le réseau
l’honore : un filtrage imposé détecté est signalé, jamais contourné.

## Scraping des résultats Google

`GoogleSearchScraper` effectuera une requête GET vers la page HTML de résultats
avec une session dédiée et éphémère. Il ne tentera aucun contournement de
captcha, blocage ou consentement impossible à traiter automatiquement.

### Exception Google D01

Le [robots.txt actuel de Google](https://www.google.com/robots.txt) interdit
`/search` aux robots génériques. L’utilisateur a choisi explicitement de
conserver le scraper malgré cette règle le 29/10/2026. L’exception porte
uniquement sur le GET de découverte `https://www.google.com/search` et ses
paramètres de recherche validés. Elle n’autorise ni une exploration de Google,
ni d’autres services, ni une usurpation de user-agent, ni une résolution de
captcha, ni le passage outre un `403`/`429` ou un challenge.

Une redirection sortant de cette portée produit `blocked`, sauf variante
strictement équivalente du même endpoint déjà validée dans le code. Aucun
consentement n’est soumis automatiquement. Une seule réponse de recherche est
analysée : pas de pagination, répétition ou seconde requête de découverte. Un
Google exigeant JavaScript produit un diagnostic, sans second chargement pour
dépasser ce budget. Les règles robots normales s’appliquent aux sites cibles,
y compris lorsqu’un résultat cible un autre service Google.

Le parser devra :

1. détecter une page de captcha ou de blocage avant d’extraire des liens ;
2. sélectionner seulement les résultats organiques disposant d’une destination ;
3. ignorer publicités, modules Google, carrousels, fragments sans lien et liens
   internes au moteur ;
4. résoudre les liens de redirection Google sans appeler leur destination ;
5. normaliser les URL HTTP(S), séparer URL de récupération et URL d’affichage ;
   ne pas réécrire des paramètres signés ; masquer les paramètres sensibles
   avant affichage, provider ou persistance ;
6. dédupliquer par domaine enregistrable ;
7. conserver titre, extrait et position d’origine ;
8. s’arrêter après dix sites distincts.

Les sélecteurs Google seront centralisés et testés sur des fixtures HTML
versionnées. Une modification de Google doit produire `blocked` ou une erreur
explicite, jamais une extraction silencieusement vide considérée comme
`not-found`.

La déduplication utilise le site enregistrable avec suffixes privés ; elle
précède la limite de dix. Une URL directe occupe la première place et laisse
au plus neuf nouveaux sites. Les redirections vers un site non candidat sont
refusées ; une forme www/apex du même site est admissible après revalidation.
Les liens internes ne créent jamais un onzième site ni une exploration générale.

## Client HTTP sécurisé

Toute récupération publique passe par `SafeHttpClient`, y compris les
redirections et liens internes. Les récupérations Chromium passent par leur
broker et son canal de sortie, avec la même policy de destination et les mêmes
budgets ; elles ne transfèrent pas leurs cookies dans le client public.

Contrôles obligatoires :

- schémas autorisés : HTTP et HTTPS uniquement ;
- ports de destination initiaux : 80 pour HTTP, 443 pour HTTPS ; les comptes
  et redirections d’authentification exigent HTTPS ;
- rejet des credentials intégrés dans l’URL ;
- rejet de `localhost`, des noms `.local`, des adresses non routables, privées,
  loopback, link-local, multicast et réservées en IPv4 comme en IPv6 ;
- résolution DNS de toutes les adresses avant connexion ;
- connexion épinglée à une adresse validée et conservation du nom d’hôte pour
  TLS afin de réduire le risque de DNS rebinding ;
- répétition complète des contrôles à chaque redirection ;
- nombre de redirections borné ;
- contrôle du domaine autorisé pour une session authentifiée ;
- timeout de connexion, d’en-têtes, de corps et budget global ;
- lecture en streaming avec arrêt dès dépassement de taille ;
- refus des téléchargements forcés et types MIME hors périmètre ;
- taille décompressée bornée pour éviter les bombes de compression ;
- certificat TLS invalide refusé sans option de contournement.

Une requête HTTP ne doit jamais suivre automatiquement une redirection avant
validation de la prochaine URL. Une seule adresse non publique parmi les
résultats DNS suffit à refuser le nom. Couvrir adresses IPv4 mappées en IPv6,
formes IPv4 alternatives normalisées par `URL`, suffixes de noms locaux,
adresses de métadonnées cloud et plages réservées ; ne pas déduire la sécurité
de `tldts.isIp`. Contrôler aussi les redirections de `robots.txt`.

L’adresse validée est fournie au connecteur effectif sans seconde résolution ;
le nom d’origine reste celui du Host, du SNI et de la vérification TLS. Aucune
désactivation de validation TLS. Toute nouvelle socket ou adresse de secours
repasse par cette règle. Un pool ne peut pas survivre à sa lease de cycle.
Un contrôle de l’adresse distante complète les tests, sans remplacer le refus
avant émission de la requête. Aucun header Cookie/Authorization n’est accepté
de l’appelant public.

Les proxies système, variables d’environnement proxy, WPAD et PAC ne sont pas
pris en charge en première version. Leur présence ou une configuration proxy
requise produit `proxy-unsupported` avant récupération, sans secours direct.
Vérifier les deux piles, y compris la configuration système résolue par Chromium.
Une configuration indéterminée est refusée. Le proxy interne décrit ci-dessous
est un mécanisme privé de l’application, pas cette configuration utilisateur.

La lecture utilise des compteurs indépendants d’octets transférés et
décompressés, une liste fermée de content-encodings et un décompresseur borné.
Ne pas se fier à `Content-Length` ni cumuler des couches d’encodage sans borne.
Annuler et détruire corps/socket au dépassement ou à l’arrêt.

## Respect des sites

Avant toute première page ou tout PDF cible, ARI récupère et applique
`robots.txt` pour un user-agent NovaChat clairement identifié. Les statuts
`403` et `429`, une règle
de refus ou une interdiction technique explicite terminent l’examen du candidat.

Le cache `robots.txt` reste en mémoire pendant le cycle seulement. La fréquence
est séquentielle par défaut ; aucune exploration parallèle agressive n’est
autorisée. ARI ne tente pas de masquer son automatisation ni de contourner une
limitation de débit.

Le token robots est `NovaChatARI`, avec user-agent HTTP `NovaChatARI/1.0`.
Chromium conserve son user-agent réel et ajoute ce token, sans imiter un tiers.
Robots est indexé par origine exacte et user-agent, jamais par simple domaine.
`404`/`410` signifie absence de fichier ; `401`/`403`/`429`, erreur réseau,
`5xx`, dépassement ou décision indéterminée bloquent le candidat. Cette politique
est volontairement plus restrictive que les cas 4xx permis par la
[RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html). Appliquer les règles
parseables et `crawl-delay` lorsqu’il est présent ; si son attente dépasse le
temps restant, passer au candidat suivant. Aucune exception authentifiée à une
interdiction robots du site cible. Seule D01 déroge à l’interdiction de Google.

## Extraction HTML statique

Après décodage du charset, le HTML est analysé sans scripts ni chargement de
sous-ressources :

1. suppression de `script`, `style`, `noscript`, `iframe`, formulaires et
   éléments non textuels inutiles ;
2. extraction des métadonnées `title`, canonical, langue, auteur et dates ;
3. extraction du contenu principal avec Readability ;
4. repli conservateur sur les titres et paragraphes visibles lorsque
   Readability échoue ;
5. normalisation des espaces sans perdre titres, listes, tableaux simples ni
   séparation des paragraphes ;
6. collecte des liens internes pertinents sans les ouvrir immédiatement.

Le DOM, les métadonnées et le texte restent des données non fiables. Aucun texte
de page ne peut modifier le prompt système, les permissions, le budget ou
l’identité du demandeur.

## Rendu des pages JavaScript

Le rendu dynamique n’est tenté que si la récupération statique réussit mais ne
contient pas de contenu utile et que la page semble dépendre de JavaScript.

Une `BrowserWindow` invisible dédiée au cycle utilisera :

- `sandbox: true` ;
- `contextIsolation: true` ;
- `nodeIntegration: false` ;
- `webviewTag: false` ;
- une partition de session non persistante ;
- refus de toute nouvelle fenêtre et de tout téléchargement ;
- garde de navigation et de redirection ;
- nettoyage de la session à la fin du cycle.

Le contenu final est récupéré comme une chaîne non fiable puis retraité par le
même extracteur statique. Le rendu public ne reçoit aucun objet Electron, API
preload générique ou secret. Seul le formulaire de connexion déclaré peut
recevoir les valeurs injectées par le broker dans sa fenêtre d’authentification,
sans passage par le modèle ou le renderer principal. Les sous-ressources
dangereuses, schémas non HTTP(S) et navigations hors budget sont bloqués.

### Canal de sortie Chromium D02/D03 : preuve obligatoire

Une partition n’est ni une protection SSRF ni une limite réseau. L’architecture
retenue ajoute un proxy interne HTTP/CONNECT privé au cycle, qui ouvre lui-même
chaque connexion vers une IP publique épinglée avec les mêmes contrôles que le
client HTTP. Chromium utilise uniquement ce proxy fixe : aucun PAC, aucune
exception loopback implicite, aucun chemin `DIRECT`. Le proxy refuse les flux
sans lease valide et ne devient pas un proxy ouvert aux autres processus.
Il ne termine pas TLS et n’installe aucune autorité de certification.

Le tunnel CONNECT ne voit ni méthode métier ni corps HTTPS. Il ne peut donc
assurer seul lecture et budgets décompressés. Une interception HTTP(S) de la
partition, fondée sur `session.protocol.handle` et les handlers de requêtes,
doit vérifier la politique de ressource et borner le corps avant sa restitution.
Le fetch interne est limité au broker, via la même session et le proxy, avec
bypass du handler uniquement pour éviter sa récursion. Tester cookies HttpOnly,
Set-Cookie, redirections manuelles, CORS, origine et conservation des en-têtes
de sécurité. Ne pas transformer l’interception en contournement de CORS/CSP.
[API protocol Electron](https://www.electronjs.org/docs/latest/api/protocol)

La tâche 6.2.5 doit démontrer cette composition dans Electron maintenu, en dev
et packagé, avant toute connexion réelle à un compte. Elle couvre aussi workers,
service workers, WebSocket, WebRTC, QUIC, DNS/préconnexion, cache, sous-frames et
préchargements. Les canaux non prouvés sont désactivés ; si un chemin de sortie
ne peut pas être bloqué ou borné, le rendu et l’authentification restent
indisponibles et la phase ne peut pas être déclarée livrée. Il faut alors
revenir à l’utilisateur pour revoir l’architecture, pas alléger les garanties.

Le loopback du proxy privé n’est pas une URL cible autorisée. Les connexions
vers les serveurs locaux de test sont injectées par un harnais absent du
package de production. Aucun setting ou argument agent ne débride le localhost.

Les permissions navigateur (notifications, presse-papiers, fichiers, caméra,
micro, périphériques, géolocalisation), popups, téléchargements et DevTools
sont refusés. Aucune page distante n’a de preload Nova ni de canal IPC métier.
Les ressources autorisées sont explicites : même origine et dépendances
déclarées ; une URL publique quelconque n’est pas une sous-ressource autorisée.

Chaque événement `webRequest` possède un seul handler central par partition :
Electron ne conserve que le dernier listener attaché. Composer les contrôles
dans ce handler au lieu d’écraser la policy précédente. La partition de collecte
ne partage pas les hooks CSP de la fenêtre principale. Enregistrer URL initiale,
sauts validés et destination depuis le broker ; ne pas déduire la provenance
uniquement d’une URL retournée par un objet `Response` Chromium.

## Captcha et blocages automatisés

La détection combine :

- codes HTTP et en-têtes connus de limitation ;
- URL, titre et marqueurs DOM de reCAPTCHA, hCaptcha et pages de challenge ;
- absence de contenu accompagnée d’un formulaire de vérification humaine ;
- signaux explicites de refus automatisé.

Un captcha sur Google arrête le cycle avec `blocked`. Un captcha sur un site
candidat produit `captcha-required` puis ARI passe au candidat suivant. Aucun
service de résolution, clic automatisé ou réutilisation de session personnelle
n’est autorisé.

## Texte, JSON et PDF

- `text/plain` est décodé, normalisé et borné.
- Le JSON public est parsé avec profondeur, nombre de clés et taille limités,
  puis converti en représentation textuelle structurée.
- Un PDF est chargé en mémoire bornée, vérifié puis traité par `pdfjs-dist` page
  par page.
- Les PDF chiffrés, protégés par mot de passe ou contenant un exécutable
  embarqué sont refusés. Un PDF sans texte est `unsupported-content`, sans OCR.
- Le transfert s’arrête au-delà de 20 000 000 octets. Au-delà de 100 pages
  disponibles, analyser au plus 100 pages pertinentes et signaler la couverture
  partielle ; ne pas présenter le reste comme lu.
- Aucun JavaScript, fichier joint ou exécutable embarqué dans un PDF n’est
  exécuté ni extrait.
- L’OCR, les images, vidéos, podcasts et archives restent hors périmètre.

Le PDF conserve numéro de page, titre, auteur et dates disponibles afin que les
citations puissent désigner une provenance précise.

PDF.js reçoit uniquement un `Uint8Array` déjà récupéré, jamais une URL à charger.
Les ressources auxiliaires sont locales au package ; pas de viewer, action PDF,
XFA, pièce jointe extraite ou chargement de ressource distante. Qualifier le
chemin d’extraction sans rendu canvas et ses dépendances optionnelles. HTML/JSON
et PDF sont traités dans un processus de parsing annulable piloté par le `main`,
sans secret ni cookie transmis ; `utilityProcess` isole crash et consommation,
pas du code arbitraire hostile. Borner nœuds DOM, profondeur JSON, texte extrait,
temps et ressources du processus, puis terminer le processus s’il ne coopère pas.
Si la mémoire ne peut pas être bornée conformément au harnais de qualification,
la capacité concernée reste bloquée ; ne pas annoncer un sandbox inexistant.

## Document normalisé et découpage

Le format interne proposé est :

```ts
type ARIDocument = {
  canonicalUrl: string;
  contentType: "html" | "json" | "pdf" | "text";
  fetchedAt: string;
  language?: string;
  links: Array<{ label: string; url: string }>;
  metadata: {
    author?: string;
    publishedAt?: string;
    title: string;
    updatedAt?: string;
  };
  sections: Array<{
    heading?: string;
    page?: number;
    text: string;
  }>;
  sourceUrl: string;
};
```

Les sections sont découpées sur les limites de titres et paragraphes, avec une
taille maximale configurable et un léger recouvrement. Le modèle reçoit
seulement les fragments pertinents, accompagnés de l’URL, du titre et du numéro
de page éventuel. Le document entier n’est jamais injecté sans borne.

## Usage du provider

OpenAI peut être utilisé pour :

- transformer l’objectif en requête minimale ;
- classer la pertinence des documents ;
- extraire des faits et les relier à des fragments sources ;
- repérer contradictions et dépendances probables ;
- produire la synthèse structurée.

Le provider ne reçoit jamais cookies, mots de passe, jetons, valeurs du coffre
ou HTML brut non réduit. Ses réponses passent par des schémas et validations
déterministes. Une affirmation sans référence à un fragment source ne peut pas
devenir un fait confirmé.

Les appels ARI sont distincts des fonctions génériques qui enregistrent les
payloads provider. Leur trace ne contient que l’ID, la durée, le statut et des
compteurs expurgés ; jamais input/output brut, body, header, URL signée, cookie
ou secret, même si `apiTrace.redactSensitiveData` est désactivé. Appliquer cette
règle aux erreurs, aux conversations internes et au retour dans la boucle Nova.
Les fragments Web sont dans une zone de données, sans outil d’action ni
possibilité de modifier l’objectif. Les réponses JSON sont validées localement
avec schéma fermé, références existantes et tailles bornées. Un refus provider
ou un résultat invalide conserve un bilan partiel ; il n’autorise pas une boucle
de réparation sans budget ni une sortie de texte libre considérée comme valide.

## Sources indépendantes et regroupement

Le rapprochement combine des signaux déterministes :

- URL canonical et domaine enregistrable ;
- propriétaire déclaré ou commun ;
- titre, auteur, date et source citée ;
- hash du texte normalisé pour les copies exactes ;
- similarité de shingles pour les reprises très proches ;
- liens explicites vers une même dépêche, étude ou publication originale.

Un regroupement automatique incertain est signalé. Une source non officielle
ne compte parmi les trois qu’après application des critères fonctionnels de
transparence, financement, affiliation et nature factuelle. ARI ne prétend
jamais prouver mathématiquement la neutralité d’une source.

## Credentials et navigation authentifiée D06/D07

Le registre Credentials est global mais chaque entrée déclare :

- les origines exactes de lecture, connexion et dépendances autorisées ;
- l’URL publique et l’URL de connexion ;
- la méthode d’authentification ;
- les champs non sensibles et `credentialRef` ;
- `allowedAgentIds` ;
- l’état et les dates de session ;
- un profil versionné de connexion, ses sélecteurs et un critère de réussite
  obligatoire pour une connexion automatisée ;
- un profil de lecture : origines, routes, méthodes, paramètres et ressources
  autorisés ; les éléments non classifiables sont refusés.

Le secret est résolu dans le `main` uniquement après vérification du demandeur
initial. Le broker l’injecte directement dans la page de connexion correspondant
exactement au domaine autorisé ; il n’est ni retourné au code ARI, ni journalisé,
ni envoyé au provider.

Le profil de formulaire simple précise l’origine, l’action et la méthode du
formulaire, les sélecteurs uniques utilisateur/mot de passe/soumission et une
condition de réussite vérifiable. Aucune heuristique de soumission n’est retenue.
Une destination, un champ ou un état ambigu produit `configuration-required`.
Le modèle ne fournit jamais les sélecteurs autorisant l’injection du secret.

MFA, OAuth et SSO ouvrent une intervention utilisateur visible dans la session
isolée. ARI ne contourne pas ces mécanismes. Après authentification, seules les
navigations et lectures sont permises ; toute mutation ou soumission métier est
bloquée.

La séparation entre état `authenticating` et `reading` est explicite. Seul le
broker peut autoriser les soumissions de connexion déclarées ; cette permission
cesse après réussite, captcha, échec, délai, arrêt ou révocation. Les GET ne
prouvent pas la lecture : un site aux routes mutantes ou sémantiquement inconnues
n’est pas compatible sans profil plus précis. Les API POST de lecture ne sont
pas activées implicitement. Pas de clic métier, déconnexion automatique,
soumission de consentement ni ajout de domaine par le texte d’un agent.

Les origines OAuth/SSO ne deviennent pas des destinations de recherche. Les
fenêtres nécessaires à l’identité sont créées par le `main` après action
utilisateur, jamais par un `window.open` distant libre. Le broker vérifie le
retour attendu et l’association avec la bonne entrée. Un captcha ferme le
parcours sans proposition de résolution manuelle dans cette version.

### Schéma public et commandes administratives

Le registre versionné réside sous `userData/credentials/registry.json`. Une
entrée contient au minimum `id`, `label`, `siteUrl`, `loginUrl`,
`readOrigins[]`, `authOrigins[]`, `resourceOrigins[]`, `authentication.type`,
`authentication.username`, `credentialRef`, `secretStatus`, `allowedAgentIds[]`,
`enabled`, `profileVersion`, `sessionStatus`, `createdAt`, `updatedAt`. Le profil déclare
ses routes et ses sélecteurs avec limites de taille et valeurs fermées.
`sessionStatus` vaut `unconfigured`, `configured`, `active`, `renewal-required`,
`configuration-required` ou `revoked` ; les états de secret et de session restent
distincts. Pas de champ arbitraire interprété comme code ou expression à évaluer.

Les origines sont HTTPS, sans userinfo, fragment, wildcard ou sous-domaine
implicitement partagé. `https://site.example` n’autorise pas
`https://evil-site.example` ni tous ses sous-domaines. Les cookies restent soumis
à leur portée navigateur et à l’intersection avec le profil. Ne pas utiliser
eTLD+1 ou la chaîne `endsWith` comme autorisation. Aucun domaine d’identité ne
reçoit le mot de passe d’un autre domaine sans profil explicite.

Les créations structurelles issues d’ARI suivent le choix explicite du site par
l’utilisateur : entrée désactivée, aucune session ni secret, demandeur effectif
comme seule ACL initiale (`nova` pour une conversation Nova). Activer un compte,
changer ses origines, ses profils ou partager son ACL relève uniquement de
l’écran Credentials authentifié comme UI locale de confiance. Les appels agents
ne possèdent pas ces champs administratifs. L’API AEL ne voit ni registre, ni
coffre, ni références de secret ; une demande de recherche passe par Nova et le
broker ARI contrôle lui-même les droits effectifs.

### Secrets et état de session

Les valeurs saisies passent par une commande d’écriture séparée ; le résultat
ne contient que l’état configuré. Conserver exactement les caractères d’un
mot de passe, sans `trim()`. Ne pas réutiliser tel quel le store OpenAI,
spécialisé clé API. Réutiliser les primitives de chiffrement, écriture atomique,
vérification de relecture et refus du backend Linux `basic_text`.

Les fichiers chiffrés par entrée résident dans `userData/secrets/credentials/` ;
ils ne sont pas placés dans les chemins de stockage agent configurables.
`credentialRef` est généré par le service et ne peut désigner un chemin fourni
par l’appelant. Les erreurs exposées sont des codes expurgés.

Les partitions sont non persistantes. Un profil de session décrit un snapshot
versionné de cookies et, si nécessaire, de clés de stockage déclarées et prises
en charge. Le snapshot entier est chiffré avec `safeStorage`, borné et isolé par
entrée ; jamais de copie brute de localStorage, IndexedDB ou d’un profil Chrome.
Les types de session non restaurables produisent `renewal-required` et exigent
une intervention, sans export improvisé. Le fuse de chiffrement des cookies
n’est pas présenté comme chiffrement de tous les stockages Web.

L’expiration serveur et un plafond local de 30 jours s’appliquent, à la première
limite atteinte. Ce plafond peut être réduit. Le broker refuse de prolonger un
jeton expiré par un changement d’horloge. Le coffre indisponible bloque la
restauration ; aucun fallback en clair. Authentification et collecte ne
conservent pas de capture d’écran, log DOM ou dump réseau.

### ACL, leases et révocation

L’identité vient exclusivement de l’enveloppe enregistrée par le `main`. Ne pas
utiliser `originatorId` ou `nova` comme repli si le demandeur effectif manque.
Contrôler activation, ACL et profil à l’acquisition puis à chaque utilisation
de la lease. Une recherche exécutée par ARI pour un agent non autorisé ne peut
pas emprunter l’ACL propre d’ARI ou de son parent Nova.

La révocation ou une modification sensible incrémente une génération de session,
invalide les leases, annule fetchs et attentes, détruit les fenêtres, ferme les
connexions et nettoie cookies/cache/stockages en mémoire. Supprimer snapshots
et backups chiffrés concernés. Une écriture en vol portant l’ancienne génération
ne peut pas recréer la session. Supprimer une entrée supprime aussi ses secrets
et backups, sans toucher au coffre OpenAI. La révocation de session peut garder
le mot de passe si l’utilisateur ne demande pas son effacement ; aucune
reconnexion automatique avant une nouvelle action explicite de connexion.
Il s’agit d’une révocation locale, pas d’une garantie de révocation distante.

## Contrats partagés arrêtés D07/D09

```ts
type ARIResearchRequest = {
  schemaVersion: 1;
  directUrl?: string;
  delegationId: string;
  originatorId: RequesterId;
  requesterAgentId: RequesterId;
  parentTaskId: string;
  requestId: string;
  turnId: string;
  conversationId: string;
  triggerMessageId: string;
  objective: string;
  budgetId: string;
};

type RequesterId = "nova" | SystemAgentId; // union fermée issue du registre

type ARIResearchStatus =
  | "blocked"
  | "cancelled"
  | "error"
  | "found"
  | "not-found"
  | "partial";

type ARIResearchResult = {
  schemaVersion: 1;
  answer: string;
  attempts: ARIAttempt[];
  captchaRequired: ARIBlockedSite[];
  confidence: "high" | "medium" | "low";
  credentialsRequired: ARIBlockedSite[];
  limits: ARILimitUsage;
  request: ARIPublicRequestSummary;
  requestId: string;
  delegationId: string;
  claims: ARIClaim[];
  sourceClusters: ARISourceCluster[];
  sources: ARISource[];
  status: ARIResearchStatus;
  warnings: string[];
};
```

Les schémas implémentés seront fermés, versionnés et validés aux frontières IPC et
provider. Les types internes de cookies, DOM et secrets ne seront pas partagés.

Cette requête est construite par le `main`, pas reçue telle quelle du renderer
ou du modèle. Le renderer émet une intention sans identité ni budget choisi ;
les champs privilégiés supplémentaires sont refusés. `request` dans le résultat
contient objectif normalisé expurgé, demandeur effectif et IDs de rattachement,
pas le prompt brut ni une chaîne de secrets.

| Structure | Champs minimaux et contraintes |
| --- | --- |
| `ARIClaim` | `id`, texte borné, `kind` (`fact` ou `inference`), références source/fragment/page, `verification` (`official`, `corroborated`, `unverified` ou `contradicted`) |
| `ARISource` | `id`, URL d’affichage sûre, titre, domaine, éditeur/propriétaire et indices connus, `fetchedAt`, dates publiées éventuelles, `access` (`public` ou `authenticated`), classification et appartenance à un cluster |
| `ARISourceFragment` | ID attribué à la collecte, section/page et extrait court expurgé ; hash de correspondance ; aucun document intégral persistant |
| `ARISourceCluster` | ID, sources membres, origine supposée, signaux et incertitude du regroupement |
| `ARIAttempt` | site/candidat, position, URL sûre, résultat, code de motif, pages consommées ; jamais réponse HTTP brute |
| `ARIBlockedSite` | site, ressource et login éventuel expurgés, étape et motif, sans token d’URL |
| `ARILimitUsage` | pour chaque quota : prévu, consommé, maximum ; durée active/attente et `stopReason` |

Les IDs source/fragment/page doivent appartenir aux documents effectivement
collectés. Le modèle ne peut ni créer une source ni certifier seul son caractère
officiel. Un fait officiel doit provenir de l’organisme compétent pour ce fait ;
trois domaines ne sont pas trois preuves si leur contenu, propriétaire ou source
initiale est commun. Les indices de transparence/financement sont explicités ;
`neutrality-unverified` reste inéligible à une confirmation automatique. Une
inférence conserve ses sources mais n’est pas réétiquetée comme fait confirmé.

### Délégation et cycle de vie

Le `main` tient une chaîne de tâches dont Nova est la racine de profondeur 0.
Maximum initial : profondeur 2 (`Nova -> ACP/AEL -> ARI`), un enfant actif par
parent, aucune destination déjà présente dans la chaîne, aucun enfant d’ARI.
Les futurs ACA/agents spécialisés utiliseront le même contrat sans les
implémenter en 6.2. Le registre ACP/AEL conserve ses IDs et son comportement.

Le parent est `waiting-child` ; ARI passe par `queued`, `working`,
`waiting-authentication`, `finalizing`, puis `terminal`. Une tâche interrompue
au redémarrage est `interrupted` avec résultat `cancelled` et motif `restart` ;
ce n’est ni une réussite ni un rejeu automatique. Une annulation du parent
annule ses enfants, handlers réseau, provider, parseurs et fenêtres. L’attente
utilisateur suspend seulement le compteur de temps actif, pas les contrôles de
révocation ni l’arrêt. Aucun compteur n’est remis à zéro par une délégation.

Un seul cycle ARI peut être lancé automatiquement dans un tour utilisateur,
quel que soit le demandeur. Une reprise après credentials ou reformulation
exige une nouvelle demande explicite. Réutiliser uniquement un résultat dont
le périmètre de données et le demandeur sont autorisés ; un résultat authentifié
n’est pas transféré à un autre agent par simple présence dans le tour.

### Statuts terminaux

| Statut | Condition |
| --- | --- |
| `found` | réponse suffisante et toutes les affirmations centrales vérifiées selon le seuil fonctionnel |
| `partial` | données utiles mais preuve, couverture ou budget insuffisant |
| `not-found` | aucun élément utile après examen normal des candidats accessibles |
| `blocked` | blocage global Google, proxy, identité/ACL ou sécurité ; sources déjà acquises conservées si elles existent |
| `cancelled` | arrêt utilisateur, parent ou interruption au redémarrage |
| `error` | défaillance interne ou protocole invalide empêchant un bilan normal |

Un captcha cible reste une tentative `captcha-required`, pas un blocage global.
Un captcha Google impose `blocked`, même si une URL directe a produit des
éléments utiles. Les résultats disponibles restent dans `sources`/`claims` et
le texte explique la limite. Une limite sans donnée utile après des tentatives
normales donne `not-found` ; un blocage d’accès généralisé donne `blocked`.

## Budgets et concurrence D08

Valeurs par défaut issues du cahier fonctionnel :

- une requête Google par cycle ;
- dix sites candidats distincts ;
- dix pages HTML maximum par site ;
- trente pages HTML au total ;
- vingt mégaoctets et cent pages analysables par PDF ;
- deux minutes pour réseau et modèle, hors intervention utilisateur.

La première version exécute les sites séquentiellement. Cela facilite les
budgets, `robots.txt`, l’arrêt précoce et la limitation de charge. Toute
parallélisation future devra conserver une limite globale et annuler les
requêtes devenues inutiles.

| Quota | Défaut et maximum initial |
| --- | --- |
| Recherche Google | 1 requête logique, sans pagination ni retry |
| Sites / HTML | 10 sites ; 10 pages par site ; 30 pages au total |
| PDF | 3 documents ; 20 000 000 octets par document ; 100 pages analysées par PDF |
| Réseau | 100 requêtes sortantes, robots/redirections/auth/sous-ressources comprises |
| Octets | 50 000 000 transférés ET 50 000 000 décompressés par cycle ; premier plafond atteint |
| Réponse HTML / texte-JSON / robots | 5 000 000 / 2 000 000 / 1 000 000 octets décompressés |
| Redirections | 5 sauts par ressource, tous contrôlés et comptés |
| Temps actif | 120 s pour réseau, parsing et modèle ; réserver les 20 dernières secondes à la finalisation |
| Connexion / en-têtes / inactivité du corps | 5 s / 10 s / 10 s |
| Requête complète / PDF / rendu | 20 s / 30 s / 15 s, toujours borné par le temps global restant |
| Rendus JavaScript | 3 par cycle ; une seule fenêtre de collecte active |
| Appels provider ARI | 6 au total, dont 1 réservé à la synthèse ; aucun retry caché |
| Fragments provider | 8 000 caractères par fragment ; 160 000 caractères cumulés envoyés, répétitions comprises |
| Extraction | 200 000 caractères par document ; 100 000 nœuds DOM ; JSON profondeur 32 et 10 000 clés |
| Parsing par document | 10 s et 256 Mo de mémoire mesurée du processus à qualifier ; dépassement => terminaison contrôlée |
| Session manuelle | 10 minutes d’attente maximum, hors 120 s actives ; ensuite `renewal-required` |

Mo signifie ici 1 000 000 octets. Tous les compteurs sont dans un objet main
commun au cycle ; le modèle ne choisit ni les maxima ni le nombre d’appels.
Les réglages peuvent uniquement réduire ces maxima initiaux. Le corps d’une
réponse, les redirections et sous-ressources consomment le même budget, y
compris lorsqu’ils sont refusés ou échouent. La limite des 30 pages concerne
les documents HTML candidats, pas les CSS/JS, qui consomment cependant réseau
et octets. Les lectures texte/JSON consomment des requêtes et des sites.

Chaque délai vaut le minimum de sa borne locale et du temps actif restant du
parent/cycle. Une synthèse structurée déterministe minimale reste possible si
le provider final expire ; elle ne fabrique pas de réponse confirmée. Après
100 s actives, aucune nouvelle collecte/analyse n’est lancée. Le budget de
120 s ne promet pas de pouvoir visiter tous les candidats.

## Persistance et rétention

Le workspace cible réutilise le modèle des agents système :

```text
agent-ari/
├── contexte.json
├── configuration.json
├── historique.json
├── tasks/
└── conversations/
```

Sont conservés au plus 90 jours et 1 000 tâches finales : demande normalisée,
résultat, URL, sources, tentatives, limites et diagnostics expurgés. Le contenu
intégral des pages, documents et réponses provider brutes reste en mémoire
pendant le cycle seulement. Les sessions restaurables chiffrées relèvent du
coffre séparé, jamais de ce workspace.

Les écritures sont atomiques et sérialisées. Une tâche `working` au redémarrage
devient `interrupted` et n’est pas rejouée automatiquement.

Une tâche possède un fichier propre sous `tasks/<id>/task.json` et un résultat
expurgé sous `tasks/<id>/result.json`. `historique.json` reste un index compact,
pas un regroupement des messages. Les conversations demeurent éclatées par
conversation et message. Un checkpoint ne contient ni page, ni prompt provider,
ni secret ; un état `working` ne devient jamais une reprise réseau implicite.

La purge applique la première limite (âge ou nombre), aux tâches finales,
index, copies de résultats dans les conversations internes ARI et backups
associés, sans pouvoir ressusciter une tâche par récupération de `.bak`.
Les journaux ne contiennent que des codes et IDs expurgés, avec la même limite
d’âge. Un verrou de récupération bloque la purge/écriture jusqu’à traitement
explicite. Les tâches actives ne sont pas purgées par le plafond de tâches finales.

Les messages publics conservent un instantané compact et autonome des citations
utilisées et suivent la rétention de leur conversation. Ne pas supprimer les
conversations principales pour appliquer les 90 jours d’ARI. Les URLs signées,
query tokens, headers et `credentialRef` internes ne deviennent pas des
citations persistantes. Une URL sensible sans lien public expurgeable est
signalée non partageable plutôt que copiée au modèle.

## IPC et interface

Le preload exposera des opérations étroites :

- charger le workspace et les tâches ARI ;
- activer ou désactiver ARI ;
- démarrer ou arrêter une recherche par l’orchestrateur Nova ;
- consulter un résultat et ses sources ;
- créer ou modifier la structure non sensible d’un credential ;
- enregistrer un secret via un canal distinct qui ne le retourne jamais ;
- révoquer une session ou supprimer une entrée après confirmation.

La page ARI comportera Général, Contexte, Tâches, Historique et éventuellement
un accès vers l’écran Credentials global. La conversation affiche une
progression compacte et un panneau repliable Sources et tentatives.

Les schémas IPC distinguent intention utilisateur, configuration administrative,
secret d’écriture et résultats publics. Tout handler sensible vérifie la fenêtre
locale et `senderFrame`, puis l’origine/document attendus ; une frame distante
ou une fenêtre d’authentification ne peut ni invoquer le coffre ni arrêter une
tâche arbitraire. Les IDs et tailles sont contrôlés au-delà du seul typage.

Les statuts métier ARI restent distincts des statuts génériques des messages.
Le panneau Sources utilise les structures validées ; pas de HTML Web, URL
`javascript:` ou parsing de liens arbitraires produits par le modèle. Un clic
de citation passe par un canal main dédié qui vérifie une source existante et
son URL HTTP(S) publique avant `shell.openExternal`, avec geste utilisateur.
Cette ouverture n’est pas une API d’exécution shell ni de navigation générique.
Pendant la collecte, le renderer affiche une progression compacte publique ;
la réponse et les citations finales sont publiques. Les détails d’orchestration
suivent `visibility: internal`.

## Tests obligatoires

La suite devra couvrir sans réseau réel par défaut :

- fixtures Google organiques, publicités, consentement et captcha ;
- normalisation et déduplication d’URL ;
- DNS et SSRF IPv4/IPv6, redirections et rebinding simulé ;
- délais, tailles, compression et types MIME ;
- `robots.txt`, `403` et `429` ;
- HTML statique, bruit éditorial, encodages et page vide ;
- fallback JavaScript avec session Electron locale isolée ;
- texte, JSON, PDF texte, PDF chiffré et limites ;
- injection de prompt contenue dans une page ;
- regroupement de copies et propriétaires communs ;
- seuil officiel ou trois sources indépendantes ;
- captcha, credentials, domaines interdits et absence de fuite de secret ;
- annulation à chaque étape et respect des budgets ;
- persistance, rétention, récupération et rendu React.

Les tests d’intégration utiliseront un serveur HTTP local contrôlé simulant les
sites. Un test Google réel sera manuel ou optionnel, jamais requis pour une CI
reproductible. Le packaging vérifiera les parseurs PDF/DOM et le processus
isolé sur Windows x64.

Ajouter obligatoirement les cas suivants aux fixtures métier ci-dessus :

- aucune seconde résolution avant connexion, retry ou adresse de secours ;
  noms à résultats mixtes public/privé et IPv4 mappée ;
- proxy système/PAC refusé, proxy interne avec arrêt brutal, aucune sortie
  directe si le proxy tombe, aucune adresse interdite jointe même une fois ;
- méthodes, ressources, redirections et corps décompressés réellement contrôlés
  dans Chromium, y compris worker, iframe et requête après fin de tâche ;
- exception robots limitée au seul endpoint de découverte Google, sans
  exemption de `403`/`429`, captcha, consentement ou autre service ;
- `requesterAgentId` absent/usurpé, droits Nova différents du demandeur, ACL
  modifiée pendant une lecture, enfant sans parent, boucle et arrêt concurrent ;
- cookies HttpOnly, séparation de comptes et comptes partageant un domaine,
  snapshot non restaurable, coffre indisponible et backend Linux refusé ;
- révocation pendant connexion/export/écriture, absence de résurrection par
  backup, préservation exacte d’un mot de passe avec espaces ;
- canaris de secrets dans HTML, URL, erreurs et provider : aucune présence dans
  résultats, renderer principal, journaux, fichiers, backups ou traces ;
- purge avec horloge contrôlée, 1 001 tâches, 91 jours, tâche active, récupération
  bloquée et conservation des citations publiques après purge de la tâche ;
- package exécuté dans un `userData` temporaire, jamais sur les comptes, settings,
  conversations ou fichiers ignorés de l’utilisateur.

## Portes de validation avant activation D10

1. **Runtime et dépendances — 6.2.1.** Versions verrouillées, licences et audits
   examinés, tests/TypeScript/lint/package réussis, parsing DOM/PDF exécuté dans
   le package, coffre OpenAI compatible au moyen d’un canari temporaire.
2. **Réseau public — 6.2.3/6.2.4.** Refus prouvé avant connexion, budgets et
   robots appliqués à toutes les ressources concernées ; Google reste fragile
   et cette limite est visible dans les résultats.
3. **Chromium — 6.2.5.** Preuve de la composition proxy/interception, de son
   absence de sortie alternative et de ses limites, en dev et packagé. Aucune
   fenêtre de collecte distante ou de compte n’est activée avant cette porte.
4. **Secrets et authentification — 6.2.9/6.2.10.** ACL, profiles, chiffrement,
   révocation et absence de fuite démontrés ; les sites non compatibles restent
   refusés, sans annoncer une lecture universelle.
5. **Livraison ARI — 6.2.17.** Contrats, routage Nova/ACP/AEL, citations,
   arrêt, rétention, tests et parcours Electron contrôlés passent. La phase
   6.2 reste ouverte si une capacité fonctionnelle obligatoire n’est pas livrée.

Un échec ne peut être résolu par une exception de sécurité, un moteur hébergé,
un appel AEL ou une dépendance à ACA ajoutés sans nouvelle décision.
L’approbation du découpage a été donnée le 29 octobre 2026 ; ne pas la redemander.
Les preuves ci-dessus sont du travail d’implémentation prévu, pas des choix
déclarés déjà validés expérimentalement. Un blocage d’environnement n’autorise
pas à contourner une demande d’accès ou un échec de revue automatique.
