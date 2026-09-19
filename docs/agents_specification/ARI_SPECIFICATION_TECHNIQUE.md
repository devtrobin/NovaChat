# Spécification technique — ARI, Agent de Recherche Internet

## Statut

Proposition technique à relire et valider avant le découpage de la phase 6.2.
ARI n’est pas encore implémenté. Ce document complète le
[cahier fonctionnel ARI](ARI_SPECIFICATION.md) en décrivant comment la recherche,
le scraping, la lecture de documents et l’authentification pourront être
réalisés concrètement.

Les exigences fonctionnelles confirmées restent prioritaires. Les bibliothèques
et structures proposées ici ne deviennent définitives qu’après validation de ce
cahier et audit de leurs licences, vulnérabilités et conséquences de packaging.

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
| `CredentialService` | registre non sensible et coffre système |
| `AuthenticatedSessionBroker` | injection contrôlée des secrets dans une session |
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
├── ari.credentials.ts
├── ari.storage.ts
└── ari.types.ts
```

Les contrats partagés destinés au renderer ou aux autres agents résideront dans
`src/shared`. Les détails HTTP, DOM, cookies et secrets resteront privés au
`main`.

## Dépendances techniques proposées

| Besoin | Choix proposé | Justification |
| --- | --- | --- |
| HTTP contrôlé | `undici` direct | streaming, abort, dispatcher et connexion contrôlée |
| Parsing de résultats Google | `cheerio` | sélecteurs DOM sans exécution de scripts |
| Extraction d’article | `jsdom` sans scripts + `@mozilla/readability` | DOM compatible et retrait du bruit éditorial |
| Encodages non UTF-8 | `iconv-lite` | décodage selon le charset HTTP/HTML |
| PDF texte | `pdfjs-dist` | extraction page par page sans OCR |
| `robots.txt` | `robots-parser` | règles user-agent déterministes |
| Domaines enregistrables | `tldts` | déduplication et contrôle de portée |
| Schémas JSON Credentials | `ajv` + formats nécessaires | validation fermée et erreurs structurées |

Ces paquets ne sont pas encore présents comme dépendances directes. Leur version
sera verrouillée au moment de l’implémentation après audit npm. Les parseurs ne
devront jamais activer une option d’exécution de script ou de chargement de
ressource implicite.

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

## Scraping des résultats Google

`GoogleSearchScraper` effectuera une requête GET vers la page HTML de résultats
avec une session dédiée et éphémère. Il ne tentera aucun contournement de
captcha, blocage ou consentement impossible à traiter automatiquement.

Le parser devra :

1. détecter une page de captcha ou de blocage avant d’extraire des liens ;
2. sélectionner seulement les résultats organiques disposant d’une destination ;
3. ignorer publicités, modules Google, carrousels, fragments sans lien et liens
   internes au moteur ;
4. résoudre les liens de redirection Google sans appeler leur destination ;
5. normaliser les URL HTTP(S), retirer les fragments et paramètres de tracking
   connus sans modifier les paramètres métier ;
6. dédupliquer par domaine enregistrable ;
7. conserver titre, extrait et position d’origine ;
8. s’arrêter après dix sites distincts.

Les sélecteurs Google seront centralisés et testés sur des fixtures HTML
versionnées. Une modification de Google doit produire `blocked` ou une erreur
explicite, jamais une extraction silencieusement vide considérée comme
`not-found`.

## Client HTTP sécurisé

Toute récupération passe par `SafeHttpClient`, y compris les redirections et
les liens internes.

Contrôles obligatoires :

- schémas autorisés : HTTP et HTTPS uniquement ;
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
validation de la prochaine URL. Les proxies système devront respecter les mêmes
règles de destination.

## Respect des sites

Avant les pages internes, ARI récupère et applique `robots.txt` pour un
user-agent NovaChat clairement identifié. Les statuts `403` et `429`, une règle
de refus ou une interdiction technique explicite terminent l’examen du candidat.

Le cache `robots.txt` reste en mémoire pendant le cycle seulement. La fréquence
est séquentielle par défaut ; aucune exploration parallèle agressive n’est
autorisée. ARI ne tente pas de masquer son automatisation ni de contourner une
limitation de débit.

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
même extracteur statique. Aucun objet Electron, API preload générique ou secret
n’est exposé à la page. Les sous-ressources dangereuses, schémas non HTTP(S) et
navigations hors budget sont bloqués.

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
- Les PDF chiffrés, protégés par mot de passe, sans texte ou dépassant 20 Mo ou
  100 pages analysables sont refusés ou retournés partiellement.
- Aucun JavaScript, fichier joint ou exécutable embarqué dans un PDF n’est
  exécuté ni extrait.
- L’OCR, les images, vidéos, podcasts et archives restent hors périmètre.

Le PDF conserve numéro de page, titre, auteur et dates disponibles afin que les
citations puissent désigner une provenance précise.

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

## Navigation authentifiée

Le registre Credentials est global mais chaque entrée déclare :

- les domaines autorisés ;
- l’URL publique et l’URL de connexion ;
- la méthode d’authentification ;
- les champs non sensibles et `credentialRef` ;
- `allowedAgentIds` ;
- l’état et les dates de session ;
- facultativement les sélecteurs du formulaire et le critère de réussite.

Le secret est résolu dans le `main` uniquement après vérification du demandeur
initial. Le broker l’injecte directement dans la page de connexion correspondant
exactement au domaine autorisé ; il n’est ni retourné au code ARI, ni journalisé,
ni envoyé au provider.

Pour un formulaire simple, des sélecteurs explicitement configurés sont
préférés. Une heuristique générique peut reconnaître un unique champ utilisateur,
un unique champ mot de passe et un unique bouton de soumission. Toute ambiguïté
produit `configuration-required` au lieu de tenter une soumission hasardeuse.

MFA, OAuth et SSO ouvrent une intervention utilisateur visible dans la session
isolée. ARI ne contourne pas ces mécanismes. Après authentification, seules les
navigations et lectures sont permises ; toute mutation ou soumission métier est
bloquée.

## Contrats partagés proposés

```ts
type ARIResearchRequest = {
  directUrl?: string;
  requesterAgentId?: string;
  requestId: string;
  turnId: string;
  userPrompt: string;
};

type ARIResearchStatus =
  | "blocked"
  | "cancelled"
  | "error"
  | "found"
  | "not-found"
  | "partial";

type ARIResearchResult = {
  answer: string;
  attempts: ARIAttempt[];
  captchaRequired: ARIBlockedSite[];
  confidence: "high" | "medium" | "low";
  credentialsRequired: ARIBlockedSite[];
  limits: ARILimitUsage;
  requestId: string;
  sourceClusters: ARISourceCluster[];
  sources: ARISource[];
  status: ARIResearchStatus;
  warnings: string[];
};
```

Les schémas exacts seront fermés, versionnés et validés aux frontières IPC et
provider. Les types internes de cookies, DOM et secrets ne seront pas partagés.

## Budgets et concurrence

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
intégral des pages, documents, cookies et réponses provider brutes reste en
mémoire pendant le cycle seulement.

Les écritures sont atomiques et sérialisées. Une tâche `working` au redémarrage
devient `interrupted` et n’est pas rejouée automatiquement.

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

## Points techniques à valider

1. Valider ou remplacer la liste de dépendances proposée.
2. Confirmer l’usage de `undici` avec connexion épinglée pour la protection
   SSRF, y compris en présence d’un proxy système.
3. Confirmer `jsdom` + Readability pour l’extraction principale et Cheerio pour
   le résultat Google.
4. Confirmer `pdfjs-dist` et les limites PDF déjà décidées.
5. Valider le schéma de formulaire authentifié, notamment les sélecteurs et le
   critère de réussite.
6. Définir le user-agent NovaChat et les délais HTTP précis par requête.
7. Vérifier licences, taille du bundle, compatibilité Webpack/Electron et audit
   npm avant installation.
8. Accepter explicitement la fragilité d’un scraper Google sans moteur de
   repli automatique : une évolution du HTML pourra bloquer temporairement ARI.

La phase 6.2 ne sera techniquement spécifiée qu’après résolution de ces points,
validation de ce document et découpage en tâches testables dans
`NEXT_STEPS.md`.
