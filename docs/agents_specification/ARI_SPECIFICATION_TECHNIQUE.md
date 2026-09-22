# Spécification technique — ARI, Agent de Recherche Internet

## Statut et portée

**Conception finalisée pour le développement de la phase 6.2, le 22 septembre
2026.** Ce document fixe la cible à implémenter, pas des capacités déjà livrées.
Le [cahier fonctionnel](ARI_SPECIFICATION.md) porte les décisions produit ; le
[découpage 6.2](../NEXT_STEPS.md#phase-62--ari--agent-de-recherche-internet) porte
les dépendances de tâches et les preuves nécessaires à leur clôture.

Obligatoire : Google via curl, lecture publique statique et PDF texte,
Credentials, accords persistants, Outlook personnel **et** Microsoft 365
professionnel/scolaire, intégration Nova/ACP/AEL. Gmail, Orange et les autres
adaptateurs authentifiés sont facultatifs et ne bloquent pas cette livraison.
Le lecteur public traite les forums et sites d’information compatibles ; aucune
compatibilité universelle avec YouTube, le streaming ou leurs comptes n’est promise.

Les vérifications de versions, sécurité des dépendances, packaging et comptes
réels sont des tâches de développement identifiées. Elles ne sont ni présumées
réussies ni des questions produit encore ouvertes.

## Architecture retenue

- `agent-ari`, registre partagé, contexte, configuration et espace agent dédiés.
- Orchestration, provider, décisions de droits et stockage dans Electron main.
- Runner curl dédié à ARI : exécutable fixe et arguments construits par le code,
  sans shell et sans passage par AEL. La policy AEL n’est pas élargie.
- Parseurs HTML/PDF dans un `utilityProcess`, sans secrets ni accès au coffre,
  borné et tuable. Ce processus limite les crashs et blocages ; ce n’est pas
  un sandbox contre une vulnérabilité native du parseur.
- Renderer uniquement via preload : configuration, tâches, consentements et
  résultats. Aucune primitive réseau, commande, URL OAuth arbitraire ou lecture
  du coffre n’est exposée.
- Les providers restent appelés par `src/main/ai`. Les droits sont indépendants
  du provider, mais seul le provider déjà implémenté peut être sélectionné.

Organisation cible (fichiers à créer pendant le développement) :

```text
src/main/ari/        orchestration, budgets, curl, réseau, robots, extraction,
                    classement des sources, adaptateurs, tâches et stockage
src/main/credentials/ registre global, coffre, OAuth, accords et révocation
src/main/ai/         routage ARI et contrôle des contenus privés avant provider
src/main/ipc/        handlers validés, sans logique métier dupliquée
src/shared/         ari.types, ari.schemas, credentials.types, access-grant.types
src/renderer/       page ARI, Credentials, Accès accordés et citations
```

Réutiliser les écritures atomiques, récupération JSON, contexte agent et
registre d’arrêt existants. Ne pas créer un stockage monolithique du chat.
Le shell générique demeure dans `src/main/ael` ; le runner ARI est un transport
à capacités fixes, pas un second outil de commande libre.

## Outils et dépendances retenus

| Besoin | Choix | Usage borné |
| --- | --- | --- |
| Transport | curl CLI | HTTP(S), commandes construites par le main |
| URL/DNS/IP | `URL`, `node:dns`, `ipaddr.js` | validation, résolution et épinglage |
| HTML Google et repli texte | `cheerio` | `load` sur octets reçus ; aucun `fromURL` |
| Article | `jsdom` + `@mozilla/readability` | scripts et ressources désactivés ; sortie texte |
| Charset | `iconv-lite` | encodages déclarés autorisés ; repli UTF-8 signalé |
| PDF texte | `pdfjs-dist`, entrée legacy compatible Node | données en mémoire, aucune action/ressource distante |
| Robots | `robots-parser` | parse local, cache par cycle |
| Domaines | `tldts` | domaines enregistrables, suffixes privés inclus |
| Schémas | `ajv` + `ajv-formats` | JSON Schema fermé, aucune coercition silencieuse |
| OAuth Microsoft | `@azure/msal-node` | client public PKCE, cache chiffré, réseau via curl |
| Coffre | `electron.safeStorage` du runtime actuel | chiffrement dans le main ; pas de repli en clair |

La tâche 6.2.1 sélectionne et verrouille des versions exactes compatibles avec
Electron `39.8.10`, les moteurs Node déclarés par `package.json` et Webpack.
Aucun `latest` implicite ni hausse silencieuse du minimum Node. La documentation
Cheerio courante exige Node 22.19 : choisir une version compatible et auditée,
ou documenter le blocage de dépendance au lieu d’ignorer `engines`.
Les choix de bibliothèques sont arrêtés ; les numéros de version et empreintes
sont produits par la qualification reproductible de 6.2.1.

Références : [Cheerio](https://cheerio.js.org/docs/intro/),
[Readability](https://github.com/mozilla/readability),
[jsdom](https://github.com/jsdom/jsdom),
[PDF.js](https://mozilla.github.io/pdf.js/getting_started/),
[Ajv](https://ajv.js.org/json-schema.html).

## Distribution de curl et contrat du runner

### Disponibilité

Le package embarque son curl qualifié hors ASAR, sous
`resources/ari/curl/<platform>-<arch>/`, avec CA, licences et manifeste
(version, provenance, SHA-256 de chaque artefact, protocoles et fonctionnalités).
Aucun téléchargement au premier lancement ni recherche de binaire dans le PATH.
En développement, un chemin absolu de préparation équivalent est utilisé et
vérifié contre le même manifeste. `curl --version` est exécuté sans réseau au
prévol ; binaire absent, altéré ou incompatible => `configuration-required`.

La qualification obligatoire de 6.2 est Windows x64, comme le socle. macOS et
Linux conservent des builds explicitement non validés tant que leurs tests
natifs ne sont pas réalisés ; pas d’annonce de support basée sur Windows seul.
Les installateurs `make` restent dans la phase finale de distribution.
Un CA bundle explicite, distribué et mis à jour avec l’app, évite de dépendre
d’une configuration utilisateur curl. Version, licences et avis de sécurité
sont vérifiés lors du verrouillage et à chaque mise à jour.

### Exécution

Le runner accepte une requête typée du main, jamais une chaîne de commande.
`spawn(executableAbsolutePath, args, { shell: false, windowsHide: true })` avec
pipes et environnement minimal contrôlé. Le modèle, le renderer et les contenus
Web ne choisissent ni l’exécutable, ni les options, ni les fichiers d’entrée.

- Désactiver la configuration curl par défaut (`--disable` en première option),
  le globbing d’URL, le netrc, les proxies implicites et tout tracing.
- Une seule URL par processus. Protocoles HTTP/HTTPS seuls pour le client Web,
  pas de `--location`, `--retry`, `--insecure`, fichier distant ou substitution
  de shell. Ne jamais utiliser un alias PowerShell de curl.
- Méthodes et destinations issues d’une capacité interne : GET public, GET
  Graph, GET/POST d’authentification Microsoft. Pas de verbe libre depuis l’IPC.
- Les valeurs sensibles et URL privées passent dans une configuration stdin
  sérialisée par le code (`--config -`), jamais dans argv ou l’environnement.
  Refuser CR/LF/NUL, échapper quotes/backslashes, encoder les valeurs de query
  et formulaire ; seuls les noms d’options constants sont autorisés.
- Un en-tête Bearer ne provient que du broker et n’est attaché qu’à Graph.
  Pas de fichiers temporaires contenant tokens ou cookies.
- Recevoir en-têtes et corps par pipe avec `--include` et HTTP/1.1. Le parser
  borné gère les blocs provisoires 1xx puis les en-têtes finaux, sans mélanger
  corps binaire et texte. curl décode le framing HTTP ; aucun `--raw`.
- `--silent` sans verbose ; résultat technique `--write-out` JSON sur stderr,
  traité en mémoire et expurgé. Aucun stderr/stdout brut n’entre dans les logs.
  Le résultat interne contient status, en-têtes multivalués, IP effective,
  octets et code de sortie ; seuls les champs utiles sont exposés au demandeur.
- Annulation : fermer stdin, arrêter le processus puis forcer son arrêt après
  une seconde ; attendre sa sortie avant de libérer la tâche. Pas d’enfant shell.

Contrat `CurlRequest` interne : URL validée, méthode, en-têtes constants/du
broker, corps optionnel borné, adresse épinglée, limite d’octets, délai,
capacité et signal d’annulation. `CurlResponse` : status, en-têtes, IP, flux de
corps borné, métriques et erreur typée. Aucun de ces objets n’est un payload IPC.

Références : [manuel curl](https://curl.se/docs/manpage.html),
[Node child_process](https://nodejs.org/api/child_process.html),
[CA distribués](https://curl.se/docs/caextract.html).

## Réseau, destinations et robots

Chaque requête, pagination et redirection repasse par `SafeHttpClient` :

1. Normaliser l’URL ; refuser userinfo, schéma non HTTP(S), port autre que
   80/443 pour le Web public, nom local et formes d’adresse ambiguës.
2. Résoudre toutes les adresses A/AAAA ; refuser si l’une est privée, loopback,
   link-local, multicast, réservée, non routable ou IPv4 encapsulée interdite.
3. Choisir une adresse validée, l’épingler avec `--resolve`, conserver le nom
   d’hôte pour SNI/TLS et vérifier l’IP effective. Aucun DNS secondaire curl.
4. Répéter après chaque redirection, cinq sauts au maximum. Aucun transfert
   de cookie/Bearer vers une autre origine, aucun déclassement HTTPS vers HTTP.
5. Compter le temps et les octets, y compris erreurs et redirections.

V1 : connexion directe seulement, proxies non pris en charge. Le runner ne
hérite pas de `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` ou de configuration curl.
Une configuration exigeant un proxy produit un état non pris en charge ; un
proxy ne doit pas contourner les contrôles de destination.

Les callbacks OAuth loopback sont des **récepteurs locaux**, hors client Web ;
ils ne rendent jamais une URL locale accessible au scraper. Les serveurs de
test locaux ne sont admis que par un transport injecté en test, jamais par un
interrupteur de production.

`robots.txt` : cache uniquement en mémoire pour le cycle, user-agent
`NovaChat-ARI/1.0`, règles appliquées dès la première page. `404`/`410` signifient
absence de règle ; `401`/`403`/`429`, erreur réseau, fichier non exploitable ou
5xx interrompent la tentative, sans supposer un accès libre. Un crawl-delay
reconnu est respecté dans le budget ; s’il l’épuise, retourner la limite.

L’exception produit couvre seulement un GET de recherche construit par ARI,
à l’origine `https://www.google.com` et au chemin exact `/search`. Elle ne
couvre aucun autre chemin, lien, redirection ou service. Captcha/403/429 restent
bloquants. Les endpoints d’API Graph/OAuth relèvent de leur contrat d’accès
authentifié et non d’un crawl HTML ; la règle robots n’y est pas une permission.

## Extraction et pipeline public

```text
requête publique validée -> budgets -> URL directe si présente
  -> contrôle destination/robots -> curl -> validation MIME/encodage
  -> extraction texte/PDF -> faits et preuve suffisante ? fin
sinon -> une recherche Google (q encodé, ie=UTF-8, langue/région, safe=off)
  -> détecter captcha/consentement/blocage/changement de structure
  -> liens organiques ordonnés -> domaines dédupliqués
  -> chaque candidat et ses liens internes, dans les budgets
  -> faits, regroupements, niveau de preuve -> résultat structuré
```

Pas de compte/cookie Google persistant. Une page de consentement non exploitable
produit `blocked`, sans clic simulé ni navigateur de repli. Distinguer les
marqueurs « aucun résultat » d’un DOM inattendu : ce dernier vaut
`source-format-changed`. Les sélecteurs et fixtures sont versionnés.

Décoder les wrappers de liens Google localement, sans requête intermédiaire,
puis valider la destination. Retirer fragments et paramètres de tracking connus,
jamais arbitrairement les paramètres métier. Dix domaines candidats au plus ;
les liens internes restent dans le domaine enregistrable du candidat et toutes
les origines sont revalidées. Une redirection vers un autre site n’autorise pas
son exploration : l’inscrire dans le budget de candidats ou refuser si plein.

Le parseur travaille uniquement sur les octets reçus. jsdom sans `runScripts`,
chargement de ressources ou navigation ; Readability sur un DOM éphémère,
sortie `textContent`. Repli Cheerio titres/paragraphes/listes/tableaux. Ne pas
rendre le HTML extrait par `dangerouslySetInnerHTML`. Supprimer scripts,
iframes, formulaires, styles et ressources ; liens conservés comme données.

PDF.js reçoit un buffer, pas une URL, avec évaluation dynamique désactivée et
sans chargement de ressources distantes ni exécution d’actions/pièces jointes.
Refuser les PDF chiffrés ; lire jusqu’à 100 pages et signaler une troncature.
Conserver les numéros de page. Le worker est arrêté à son plafond de temps ;
une erreur de parseur n’arrête pas les autres candidats.

HTML, texte, JSON et PDF seulement. Décompression dans le main en flux borné ;
le runner demande `Accept-Encoding: identity`, mais contrôle aussi une réponse
compressée non sollicitée. MIME, signatures et taille concordent. Les archives,
exécutables et téléchargements forcés du Web sont refusés. Exception typée :
une pièce jointe Outlook explicitement choisie et autorisée peut être lue en
mémoire via son adaptateur, sans écriture sur disque ni exécution.

## Budgets normatifs

Les valeurs publiques déjà confirmées sont conservées. Les compléments sont
des choix techniques pour une exécution bornée. Le modèle ne peut les augmenter.
Configuration utilisateur validée : diminuer les valeurs ou les augmenter
jusqu’aux maxima ci-dessous ; chaque enfant reçoit le minimum avec son parent.

| Budget | Défaut | Maximum configurable |
| --- | --- | --- |
| Recherche Google par cycle | 1 | 1 |
| Sites candidats | 10 | 10 |
| Pages HTML par site / au total | 10 / 30 | 10 / 30 |
| Temps actif réseau, extraction et modèle | 120 s | 300 s |
| Attente utilisateur par tâche | 10 min | 10 min |
| Connexion / requête réseau entière | 5 s / 20 s | 10 s / 30 s |
| Requête provider | 30 s, bornée au temps restant | 60 s |
| Requêtes réseau totales, robots/OAuth/pagination inclus | 80 | 120 |
| Redirections par requête | 5 | 5 |
| En-têtes par réponse / metadata stderr | 64 Kio / 128 Kio | identique |
| Corps HTML/texte/JSON décompressé | 5 Mio | 10 Mio |
| PDF par document / pages analysées | 20 Mo / 100 | identique |
| Octets reçus et décompressés par cycle, compteurs séparés | 50 Mio chacun | 100 Mio chacun |
| Pages de résultats mail / messages candidats | 4 × 25 / 100 | 8 × 25 / 200 |
| Corps de mails lus | 20 | 50 |
| Pièces jointes lues par cycle | 3 | 5 |
| Texte normalisé par document | 100 000 caractères | 200 000 |
| Fragments transmis au provider par cycle, tous appels confondus | 60 000 caractères | 120 000 |
| Appels modèle internes ARI | 12 | 20 |
| Réponse finale / nombre de sources | 12 000 caractères / 50 | identique |
| Extraction d’un document / heap worker V8 | 10 s / 256 Mio | 20 s / 256 Mio |

Mo = 1 000 000 octets ; Mio/Kio = puissances de 1024. Tous les compteurs sont
vérifiés avant chaque opération et lors du streaming. Le heap V8 ne borne pas
toute allocation native : watchdog de durée, taille d’entrée et isolation de
crash complètent la limite, sans promesse de sandbox mémoire complète.

Les attentes utilisateur suspendent le temps actif, pas les quotas consommés.
À épuisement : `partial` si éléments utiles, sinon `blocked` et motif précis.
Une recherche complète sans résultat est seule `not-found`. Au plus une
requête réseau active et un parseur actif par tâche ; deux tâches ARI actives
au maximum dans l’app, autres requêtes en file bornée à vingt.

Pas de retry automatique de 403/429/captcha. Un rafraîchissement OAuth silencieux
sur 401 est permis une fois, puis `renewal-required`. Les autres tentatives et
relances manuelles consomment leurs budgets ; un nouveau cycle exige une
nouvelle demande explicite.

## Outlook : comptes personnels et professionnels/scolaires

### Identité et OAuth

Microsoft Graph v1.0, cloud public `graph.microsoft.com`, accès délégué à la
boîte principale de l’utilisateur connecté. Pas de permissions application,
Exchange on-premises, cloud souverain ni boîte partagée dans le lot obligatoire.

Retenir `@azure/msal-node` PublicClientApplication, flux code avec PKCE,
authority `https://login.microsoftonline.com/common`. Enregistrement Microsoft
acceptant les comptes personnels et les comptes de toute organisation.
Scopes : `openid`, `profile`, `offline_access`, `User.Read`, `Mail.Read`.
Pas de `Mail.ReadWrite`, `Mail.Send` ou droit partagé.

Le `clientId` public provient d’un enregistrement appartenant au projet ;
valeur configurable pour développement/tenant, jamais un secret embarqué.
Sa création et la configuration du redirect sont des prérequis de 6.2.6.
Sans clientId valide, afficher `configuration-required`, pas de valeur fictive.
L’organisation peut refuser le consentement : `tenant-policy-blocked`.

MSAL gère PKCE, cache et renouvellement. Son `INetworkModule` passe les appels
backchannel par le runner curl avec allowlist des endpoints Microsoft publics.
Aucun HTTP caché via une pile concurrente. Le navigateur système est ouvert
uniquement pour la connexion interactive initiée par l’utilisateur. Le callback
loopback MSAL doit écouter localement, vérifier la transaction/state, accepter
une seule réponse puis fermer ; 10 minutes au maximum. Utiliser une URI
loopback enregistrée selon les contraintes Microsoft, pas un port fixe global.
Aucun cookie navigateur n’est exporté ; ARI utilise les tokens du cache MSAL.
Les changements d’authority/clientId invalident sessions et droits du compte.

Les références account/tenant stables MSAL et `/me` lient l’entrée au compte
réel ; l’adresse e-mail affichée seule n’est pas une preuve d’identité. Un
renouvellement ne peut pas remplacer silencieusement le compte autorisé.

Références : [flux Microsoft](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow),
[redirect loopback](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url),
[configuration MSAL](https://learn.microsoft.com/en-us/entra/msal/javascript/node/configuration),
[API MSAL](https://azuread.github.io/microsoft-authentication-library-for-js/ref/classes/_azure_msal_node.PublicClientApplication.html).

### Opérations admises

| Opération interne | Graph autorisé |
| --- | --- |
| Identifier le compte | GET `/v1.0/me` avec champs d’identité minimaux |
| Dossiers | GET `/v1.0/me/mailFolders` et descendants bornés |
| Rechercher/lister | GET `/v1.0/me/messages` ou `/me/mailFolders/{id}/messages` |
| Lire | GET `/v1.0/me/messages/{id}` avec `$select` minimal et corps texte |
| Pièces jointes | GET `/v1.0/me/messages/{id}/attachments`, puis `/{attachmentId}/$value` pour le fichier choisi |

Tous les chemins Graph ci-dessus sont relatifs à la même origine et version
`https://graph.microsoft.com/v1.0` (sans doubler le préfixe). Les IDs proviennent
de réponses validées ou de références persistées du même
compte, jamais d’un chemin ou endpoint libre fourni par le modèle. Refuser
PATCH/DELETE/PUT/POST métier, `$batch`, `/users/{autre}` et envois. Les POST
OAuth restent une capacité distincte, réservée au broker.

Construire `$search` à partir de critères structurés, jamais de KQL/OData libre.
Filtres simples supportés : texte, sujet, expéditeur, dates ISO, `isRead`,
dossier. Ne pas combiner aveuglément `$search`, `$filter` et `$orderby` : utiliser
un plan compatible Graph, puis filtrer localement dans le budget et signaler
si la couverture est partielle. Aucune promesse de balayage exhaustif.

Utiliser `Prefer: IdType="ImmutableId"` pour les références et
`Prefer: outlook.body-content-type="text"` pour les corps. Une réponse HTML est
assainie localement. Un `@odata.nextLink` est opaque mais revalidé : HTTPS,
hôte Graph exact, chemin admis, même compte, budget et absence de boucle.
Ne pas reconstruire arbitrairement son `$skip`. Pas de synchronisation de fond.

Les pièces jointes ne sont lues que si utiles à l’objectif ; noms et type sont
vérifiés avant les octets. Accepter les `fileAttachment` texte/PDF dans les
budgets, refuser archives/exécutables, pièces jointes imbriquées, liens de
stockage externe et références non prises en charge. Aucun pixel de suivi ni
lien d’un mail n’est chargé automatiquement. Lire ne marque pas comme lu.

Références : [messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0),
[recherche](https://learn.microsoft.com/en-us/graph/search-query-parameter),
[IDs immuables](https://learn.microsoft.com/en-us/graph/outlook-immutable-id),
[pièces jointes](https://learn.microsoft.com/en-us/graph/api/attachment-get?view=graph-rest-1.0).

### Extensions facultatives

Gmail : API officielle OAuth `gmail.readonly` via curl. Orange : adaptateur
IMAPS distinct (port 993, TLS vérifié), commandes de lecture bornées, ouverture
en lecture seule et lecture de corps sans positionner le flag Seen. Aucun
élargissement des protocoles du client Web. Pas de SMTP ni POP destructif.
Chaque extension exige sa configuration, ses fixtures, budgets, absence de
mutation et test de compte réel ; sans cela, elle reste désactivée/non livrée.

Les adaptateurs de forums/sites authentifiés sont du code livré et testé,
jamais du code généré par ARI, un script utilisateur ou des sélecteurs arbitraires
suffisant à accorder des actions. Leurs domaines, parcours et lectures sont
fermés. Sans adaptateur, conserver seulement le brouillon sans permettre de login.
YouTube/streaming : métadonnées et textes accessibles seulement, aucun lecteur
vidéo ni extraction DRM. Une session ne garantit pas l’accès aux sous-titres.

## Contrats partagés et validation

Schémas JSON Schema version 1, `additionalProperties: false`, Ajv sans coercition
ni insertion silencieuse de valeurs. Defaults appliqués par le main après
validation. UUID créés côté main, dates ISO UTC, compteurs entiers positifs,
URL <= 4 096 caractères, objectif <= 8 000, texte de recherche <= 2 000.
Une entrée inconnue produit une erreur structurée, pas un cast TypeScript.

```ts
type ARIInput =
  | { mode: "public"; objective: string; directUrl?: string }
  | { mode: "account"; objective: string; credentialId: string;
      query: { text?: string; subject?: string; sender?: string;
        after?: string; before?: string; unreadOnly?: boolean;
        folderRef?: string; messageRefs?: string[];
        includeAttachments: boolean } };

type ARIEnvelope = {
  schemaVersion: 1;
  requestId: string; delegationId: string; turnId: string;
  conversationId: string; messageId: string; parentTaskId?: string;
  originatorId: string; requesterId: string; targetAgentId: "agent-ari";
  chain: string[]; input: ARIInput;
  providerTarget: { providerId: string; endpointKey: string };
  budgetId: string; createdAt: string;
};

type ARIResult = {
  schemaVersion: 1; requestId: string; delegationId: string;
  status: "found" | "partial" | "not-found" | "blocked" | "cancelled" | "error";
  answer: string; confidence: "high" | "medium" | "low";
  sources: ARISource[]; facts: ARIFact[]; sourceClusters: ARISourceCluster[];
  attempts: ARIAttempt[]; credentialsRequired: ARIAccessNeed[];
  captchaRequired: ARICaptcha[]; warnings: ARIWarning[];
  limits: ARILimitReport; privacy: ARIPrivacy;
};
```

Le renderer/modèle ne fournit que l’intention `ARIInput`. L’enveloppe, le
provider, l’identité et les budgets sont construits depuis le registre main.
En mode account, au moins un critère ou une référence de message est requis ;
`messageRefs` <= 20, compte unique, dates ordonnées, dossier rattaché au compte.
`includeAttachments` vaut false si absent dans l’intention initiale ; le main
le normalise explicitement. Un objectif mentionnant les pièces jointes permet
à Nova de le demander, dans le droit de lecture accordé.

Définitions normatives des sous-objets, mêmes contraintes de schéma :

| Type | Champs et invariants |
| --- | --- |
| `ARISource` | `id`, `kind` (web/pdf/mail/attachment), `title` <= 500, `locator`, `consultedAt`, `publishedAt?`, `owner?`, `access` (public/private), `credentialId?`, `excerpt` <= 2 000, `page?`, `neutrality` (official/admissible/neutrality-unverified/position-only) |
| `locator` | union URL HTTP(S) publique validée ou référence privée opaque `{credentialId, itemId, attachmentId?}` ; pas d’URL contenant un token |
| `ARIFact` | `id`, `text` <= 2 000, `sourceIds[]`, `basis` (official/independent-three/private-document/inference), `supported` boolean |
| `ARISourceCluster` | `id`, `sourceIds[]`, `reason` (original/copy/common-owner/shared-study/uncertain) ; source connue uniquement |
| `ARIAttempt` | `id`, `targetRef`, `stage`, `outcome` (used/skipped/blocked/failed), `reasonCode?`, `elapsedMs`, `bytes` ; <= 200 entrées |
| `ARIAccessNeed` | `credentialId?`, `domain?`, `reasonCode`, `loginActionId?` ; pas d’URL de login exécutable depuis le résultat modèle |
| `ARICaptcha` | `targetRef`, `stage` ; information seulement, jamais action de résolution |
| `ARIWarning` | `code`, `message` <= 1 000, `sourceIds?` ; <= 100 |
| `ARILimitReport` | `configured` et `used` : mêmes clés numériques que les budgets ; `exhausted[]` limité à ces clés |
| `ARIPrivacy` | `classification` (public/private-derived), `credentialIds[]`, `originatorId`, `requesterId`, `executorId: agent-ari` ; généré par le main |

Les collections sources/faits/clusters sont bornées à 50/100/50. Références
inconnues, faits sans source hors inférence explicite et statut incompatible
sont refusés. `stage` est limité à discovery/fetch/extract/analyze/auth/permission ;
`targetRef` est une URL publique validée, un ID de source connu ou une référence
privée opaque. `messageRefs` et `folderRef` sont des IDs de références résolus
par le main dans le même compte, jamais des chemins Graph fournis par le modèle.
Le main calcule le statut et les compteurs ; le modèle propose
faits et synthèse, pas le verdict de permission ou l’état d’exécution.

Un changement de provider/destination pendant une tâche annule ses analyses
privées en attente ; une reprise utilise une nouvelle enveloppe et recontrôle
les accords, sans mélanger deux configurations dans le même résultat.
Le contenu extrait est fourni comme donnée non fiable et ne peut ni choisir un
outil, modifier les droits, ni donner une instruction système. Les traitements
internes ARI ne disposent d’aucune capacité d’exécution issue du texte collecté.

Les documents normalisés internes contiennent type, titre, sections avec page,
URL/référence, provenance, dates et liens. Fragments de 8 000 caractères maximum,
recouvrement 400, avec IDs stables par tâche ; seuls les fragments utiles sont
soumis au provider. Le main vérifie les citations contre ces IDs.

## États, délégation et appels aux autres agents

Exécution : `queued -> running -> waiting-user -> running -> terminal` ; le
terminal porte le statut du résultat. `interrupted` est réservé à une tâche
non terminale retrouvée sur disque au redémarrage. Le parent passe à
`waiting-agent` ; cela ne remet aucun compteur ni délai à zéro.

- Une sous-tâche active par parent, une recherche ARI par tour racine.
- Profondeur maximale : deux arêtes depuis Nova (`Nova -> ACP/AEL -> ARI`).
  Refuser ARI déjà dans la chaîne et tout enfant lancé par ARI.
- Le budget de deux minutes appartient à la recherche, partagé avec tout
  contexte parent plus contraignant ; attente utilisateur bornée séparément.
- Même `requestId` dans le même tour : retourner l’état existant, pas relancer.
  Refuser une intention différente réutilisant cet identifiant.
- Arrêter le tour, désactiver ARI ou révoquer le droit concerné annule les
  enfants et attentes, ferme curl/workers, puis résout chaque tâche une seule fois.
- Après redémarrage : aucune relance automatique ; nouvelle demande utilisateur.

Nova reçoit l’action structurée `request-ari-research`. ACP peut retourner
`needs-research` et un `ARIInput` avant son plan ; le main attend ARI puis
reprend le cadrage avec le résultat. AEL peut demander cette même recherche
pendant la résolution de l’objectif, **avant** toute permission/exécution de
commande, en mode objectif seulement ; le mode commande exacte ne déclenche
pas de recherche. Son parser distingue une demande de recherche d’une commande.
Une seule reprise par parent, pas de boucle ARI. Si ARI bloque, Nova explique
et ne fabrique pas une commande à partir de documents absents.

Contrats normalisés de l’action : Nova remet
`{ type: "request-ari-research", input: ARIInput }` ; ACP remet
`{ status: "needs-research", researchRequest: ARIInput }` sans étape AEL
simultanée ; la résolution d’objectif AEL remet
`{ kind: "research", researchRequest: ARIInput }` au lieu d’une commande.
Les adaptateurs de sortie provider convertissent vers ces unions fermées,
sans rechercher du JSON arbitraire au milieu d’une commande. Le format existant
hors recherche continue à être accepté ; une sortie ambiguë est refusée.

Ce sont des extensions ciblées des contrats ACP/AEL en 6.2 ; leurs commandes,
permissions et comportement hors demande ARI restent inchangés. ACA n’est pas
implémenté par ce lot ; le contrat garde le demandeur d’origine pour son usage
futur sans accepter les IDs d’agents inexistants.

## Credentials, coffre et registre des accords

### Schémas persistés version 1

`CredentialEntry` : UUID, `adapterId`, `label`, `serviceOrigins[]`, `accountRef?`,
`authKind` (oauth/password), `secretRef?`, `status`
(draft/configured/renewal-required/unsupported), `enabled`, `revision`,
`createdAt`, `updatedAt`. Les domaines et authKind doivent correspondre à
l’adaptateur ; le modèle ne les transforme pas en destinations autorisées.
`accountRef` inclut l’identité stable du fournisseur, pas seulement un nom.

`AccessGrant` : UUID, `credentialId`, `credentialRevision`, `originatorId`,
`requesterId`, `executorId`, `capability` (read-account/analyze-private-content),
`providerTarget?` (providerId/endpointKey, requis seulement pour analyse),
`status` (active/revoked), `createdAt`, `revokedAt?`, `revision`.
Un changement de secret renouvelant le même compte ne change pas sa portée ;
un changement d’identité, domaines, authority ou clientId invalide les accords.
Les ACL `allowedAgentIds` affichées sont une projection des accords de lecture,
pas une deuxième source d’autorité éditable contradictoire.

Le registre est global, indépendant d’OpenAI. `endpointKey` identifie la base
URL normalisée effective, chemin inclus, et la configuration provider, sans
clé API ni nom de modèle. Aucun provider inactif du catalogue n’est utilisable.
Un endpoint différent exige un accord distinct, y compris chez le même provider.

### Cycle de permission

Le main contrôle lecture **avant** accès au compte, analyse **avant** envoi au
provider. Il contrôle origine, demandeur réel et ARI exécutant ; un agent ne
peut pas emprunter l’accord de Nova en changeant un champ de son texte.
Les deux droits manquants sont regroupés dans une demande utilisateur claire.
Une fois accordés, réutilisation jusqu’à révocation, y compris après redémarrage.
Demandes concurrentes de même portée dédupliquées ; refus valable pour la tâche,
pas de relance automatique du dialogue.

La révocation est d’abord persistée, puis invalide les caches et les opérations
concernées. Un verrou de génération des droits protège la vérification et la
mise en file d’envoi : aucun nouvel appel n’est lancé après validation de la
révocation. Les appels déjà transmis sont annulés au mieux, sans prétendre
retirer les données déjà reçues par le fournisseur.

Supprimer un accord invalide également les travaux en attente ; déconnecter un
compte invalide tous ses accords et détruit son cache de tokens local. La
suppression d’une entrée ne supprime pas les conversations. Les backups de
secrets de cette entrée sont également supprimés pour ne pas ressusciter une
session. Une récupération de registre d’accords depuis backup remet les
accords à confirmer, jamais actifs automatiquement après une corruption.

### Propagation de provenance privée

Tous les résultats issus d’un compte, les résumés et les réponses qui les
utilisent portent `ARIPrivacy`. La provenance est l’union des entrées ; le
modèle ne peut pas la retirer en déclarant sa réponse publique.
Le main ajoute au message chat une référence de provenance persistée sous son
contrôle. `chat.save` ne peut ni retirer ni falsifier ce marquage des messages
existants ; les messages associés à ARI sont réconciliés avec le registre main.
Un cas ambigu après récupération est bloqué pour l’envoi, pas déclassé public.

Avant **tout** appel provider ultérieur (Nova, ACP, AEL, résumé), filtrer chaque
message privé selon ses comptes et le provider destinataire. Sans accord,
remplacer par un marqueur sans contenu et proposer l’autorisation seulement si
la tâche en a besoin. Ne pas recopier le passage dans un titre, query Google,
log ou trace brute. La visibilité UI et la permission d’export sont distinctes.
Le texte saisi volontairement par l’utilisateur reste soumis au contrat du chat ;
cette protection suit les données récupérées automatiquement et leurs dérivés.

### Stockage et récupération

```text
<userData>/credentials/entries/<id>.json       métadonnées expurgées
<userData>/credentials/grants/<id>.json        accords et versions
<userData>/credentials/provenance/<messageId>.json  marquage privé main
<userData>/secrets/credentials/<id>.json       cache/secret chiffré safeStorage
<agentsDirectory>/agent-ari/contexte.json
<agentsDirectory>/agent-ari/configuration.json
<agentsDirectory>/agent-ari/historique.json    index expurgé
<agentsDirectory>/agent-ari/tasks/<id>.json    tâche et résultat bornés
<agentsDirectory>/agent-ari/conversations/    modèle éclaté existant
```

Écritures atomiques et sérialisées, dossiers/IDs validés, règles de récupération
existantes ; aucune migration destructive des données actuelles. Aucun secret
dans settings, entrées, grants, logs ou git. safeStorage indisponible ou backend
Linux `basic_text` => accès authentifié désactivé, jamais sauvegarde en clair.
Un cache MSAL est séparé par credential et chiffré en bloc, verrouillé durant
son renouvellement. Référence :
[safeStorage Electron 39](https://github.com/electron/electron/blob/v39.8.10/docs/api/safe-storage.md).

Les résultats privés ARI sont chiffrés ; index uniquement IDs/états/dates. Les
résultats publics sont du JSON borné. Dans le chat, préserver le stockage par
conversation/message et le marquage ; ne pas prétendre que tout le chat est
chiffré par cette phase. Les traces provider impliquant des données privées
sont limitées à des métriques et motifs expurgés, même si apiTrace est activé.

Purge ARI : 90 jours ou 1 000 tâches finales, première limite atteinte ; garder
les tâches actives. Pas de HTML brut, corps intégraux ou tokens en historique.
Le chat a sa propre rétention ; conserver les références de provenance tant
que le message existe même après purge de la tâche ARI. Au redémarrage, marquer
les tâches non terminales `interrupted`, vider les attentes et ne rien rejouer.

## IPC et interface

Contrats étroits, validés main et contrôlés par la fenêtre émettrice :

| Opération preload cible | Entrée | Sortie |
| --- | --- | --- |
| `ari.getWorkspace` | aucune | configuration, disponibilité, tâches paginées |
| `ari.updateConfiguration` | valeurs bornées, revision | configuration publique |
| `ari.cancelTask` | taskId | acquittement idempotent |
| `ari.getResult` | taskId | résultat autorisé pour l’UI locale, sans secret |
| `credentials.list` | curseur | métadonnées expurgées |
| `credentials.upsertDraft` | description + revision | entrée inactive validée |
| `credentials.connect` | credentialId | état OAuth/action utilisateur ; pas de token |
| `credentials.setSecret` | credentialId + secret ponctuel | état uniquement ; extensions password |
| `credentials.disconnect` / `delete` | credentialId | état et révocation |
| `accessGrants.list` | filtre compte | accords sans contenu privé |
| `accessGrants.resolve` | permissionRequestId + allow/deny | acquittement unique |
| `accessGrants.revoke` / `delete` | grantId + revision | nouvel état |

Les préfixes sont logiques : noms concrets intégrés aux conventions IPC
existantes, pas d’accès générique à un service. Une recherche est démarrée via
le tour Nova, pas par une API IPC acceptant une enveloppe d’identité forgée.
Les événements progress/task/permission restent rattachés à taskId/turnId,
diffusés sans secrets et intégrés aux actions de chat existantes.

Une citation publique s’ouvre après revalidation HTTP(S), sans ressources
embarquées. Une citation mail ouvre un détail local avec le droit de lecture ;
un lien fournisseur optionnel doit venir de Graph, être validé et être ouvert
seulement sur clic, jamais réinterrogé comme URL de scraping authentifié.

ARI est désactivé par défaut. Son activation autorise la lecture publique et
les brouillons, pas les comptes privés. Afficher séparément la disponibilité
curl, configuration Microsoft et accords. Aucun secret enregistré n’est renvoyé.

## Erreurs, tests et critères de sortie

Motifs fermés : `configuration-required`, `unsupported-service`,
`credentials-required`, `permission-denied`, `grant-revoked`, `renewal-required`,
`tenant-policy-blocked`, `captcha-required`, `robots-denied`, `http-forbidden`,
`rate-limited`, `unsafe-destination`, `proxy-unsupported`, `source-format-changed`,
`javascript-required`, `unsupported-content`, `size-limit`, `budget-exhausted`,
`network-error`, `parse-error`, `provider-error`, `interrupted`.
Ils sont distincts du statut terminal et des états d’attente. Diagnostics UI
courts ; détails main expurgés, aucun dump de tokens/URL privée/en-têtes.

| Groupe | Preuves requises |
| --- | --- |
| Contrats | schémas fermés, bornes, IDs privés invalides, références de citation, doubles résolutions |
| Runner/réseau | injection options/config, environnement, DNS/rebinding IPv4/IPv6, redirections, arrêt, tailles, compression, TLS et proxy |
| Robots/Google | exception exacte et non propagée, captcha/403/429, consentement, HTML changé, zéro résultat réel, déduplication |
| Parseurs | HTML sans scripts/requêtes, PDFs valides/chiffrés/tronqués, encodages, crash, timeout et package worker |
| Outlook | OAuth/state/PKCE, cache, renouvellement, identité du compte, pagination, aucune mutation, pièces jointes, tenant refusé |
| Accords | mémorisation, concurrence, endpoint/modèle, révocation pendant envoi, backups, contenu privé repris dans le chat |
| Routage | Nova/ACP/AEL, identités main, attente parent, profondeur, un cycle, annulation et interruption |
| UX/stockage | activation, pages, citations privées, récupération, purge, provenance après purge, absence de traces privées |

Tests déterministes par défaut : fixtures expurgées et services simulés, aucun
compte réel ni settings de la machine. Tests Google réels manuels, non requis
pour une CI stable. Contrôle réel de 6.2 : un compte Microsoft personnel et un
compte Microsoft 365 professionnel/scolaire autorisé, avec message/pièce jointe
de test et vérification que les états ne changent pas.

Passer Vitest, TypeScript, ESLint, audit des dépendances, packaging Windows x64
et prévol curl des artefacts produits. Les parcours réels ARI sont vérifiés
en développement ; le lancement complet du binaire distribué, `make` et les
installateurs restent réservés à la phase finale de distribution.
Une indisponibilité externe est consignée comme telle : elle ne vaut pas test
réussi. La documentation est prête pour développer ; la clôture du code exige
les preuves ci-dessus.

## Prérequis d’exécution et points non bloquants pour la conception

- Produire en 6.2.1 les versions exactes, empreintes et licences curl/CA/npm.
- Enregistrer/configurer le client public Microsoft et son redirect en 6.2.6 ;
  disposer des deux comptes de test pour 6.2.11. Aucune création externe pendant
  cette préparation documentaire.
- Un tenant peut demander une approbation administrateur ; expliquer ce cas,
  sans demander un droit applicatif global en remplacement.
- Gmail, Orange et les autres adaptateurs sont des tâches facultatives après
  le socle. Aucun placeholder actif ne compte comme intégration fonctionnelle.

Aucune décision produit restante n’empêche de commencer les tâches ordonnées.
Les contrôles de qualification peuvent révéler un blocage technique concret ;
il devra alors être documenté et résolu avant de déclarer le lot livré.
