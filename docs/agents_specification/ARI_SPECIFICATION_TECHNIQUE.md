# ARI — Spécification technique

## Lecture et statut

Ce fichier complète le [cahier fonctionnel](ARI_SPECIFICATION.md).
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

## État et solution proposée

ARI n’est pas implémenté. Le scraper Google local, la récupération HTTP avant
rendu JavaScript et la session Electron isolée sont décidés fonctionnellement.
Les bibliothèques ci-dessous sont une proposition technique concrète, pas des
dépendances déjà installées.

Le scraper sera un composant NovaChat dédié, `GoogleSearchScraper`, composé
d’un transport HTTP contrôlé et d’un parseur HTML. Le terme « scraper local »
ne désigne donc pas à lui seul une bibliothèque déjà choisie.

## Inventaire des outils

| Besoin | Solution proposée | Rôle et limite |
| --- | --- | --- |
| Formuler la requête et synthétiser | Transport OpenAI commun du main | Texte et résultat structuré ; aucun outil `web_search` |
| Construire l’URL de recherche | `URL` et `URLSearchParams`, adaptateur `GoogleSearchScraper` | Requête minimisée, langue/région et SafeSearch selon le cahier |
| Requêter Google et les pages | `session.fetch` d’Electron dans une partition dédiée | Réseau contrôlé par le main ; ni shell, ni session principale |
| Parser la page de résultats | `cheerio` | Sélecteurs HTML pour résultats organiques et liens ; pas de rendu JS |
| Lire le contenu principal | `@mozilla/readability` avec `jsdom` | Texte et métadonnées, sans exécution de scripts ni chargement de ressources |
| Lire les pages de référence peu adaptées à Readability | Extracteur Cheerio interne | Titres, paragraphes, tableaux et blocs de code ; même limite de volume |
| Rendre une page qui nécessite JavaScript | `BrowserWindow` + `session` Electron isolées | Repli contrôlé pour pages cibles, sans Node ni preload privilégié |
| Décompter les sites | `tldts` et normalisation `URL` | Domaine enregistrable, avec suffixes privés, pour dédupliquer |
| Lire `robots.txt` | `robots-parser` derrière le même transport contrôlé | Décision d’accès, pas un téléchargeur autonome |
| Extraire les PDF texte | `pdfjs-dist` (PDF.js) | `getDocument`, pages et `getTextContent`, sans OCR |
| Valider requêtes/résultats | Types partagés et validateurs runtime internes | Même convention que les IPC actuels ; aucune confiance dans le JSON modèle |
| Connexions et comptes | `CredentialsService`, courtier d’authentification, `electron.safeStorage` | Service global à construire, références opaques et ACL par demandeur |
| Historique et annulation | Stockage atomique, queue, registre de tour, `AbortController` | Réutilisation du socle, adaptation ARI à construire |

Les primitives réseau sont fournies par Electron. `session.fetch` utilise
la pile Chromium dans la session choisie ; ses limites documentées, dont les
métadonnées de réponse, imposent de tracer nous-mêmes les redirections et URL
finales. Référence : [API session](https://www.electronjs.org/docs/latest/api/session).

Cheerio est un parseur HTML, pas un navigateur. Il est proposé pour garder
l’extraction des résultats déterministe ; Readability sert au contenu utile.
Références : [Cheerio](https://cheerio.js.org/docs/intro/),
[Readability](https://github.com/mozilla/readability).

`jsdom` sera créé sans `runScripts` ni chargement de ressources. Readability
n’est pas un assainisseur de sécurité : seuls texte normalisé, liens validés
et métadonnées sélectionnées sortent vers le modèle ; aucun HTML collecté
n’est rendu tel quel dans NovaChat. Références :
[jsdom](https://github.com/jsdom/jsdom),
[sécurité Readability](https://github.com/mozilla/readability/security/policy).

PDF.js fournit l’extraction de texte par page. La couche NovaChat reste
responsable des limites de taille/pages et du refus des PDF chiffrés ou avec
contenu interdit ; cette vérification doit être prouvée par des fixtures avant
validation du choix. Référence :
[PDFPageProxy](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html).

`tldts` et `robots-parser` sont des aides au parsing ; ils ne fournissent ni
classification de neutralité ni protection réseau complète. Références :
[tldts](https://github.com/remusao/tldts),
[robots-parser](https://github.com/samclarke/robots-parser).

## Pipeline proposé

1. Recevoir la tâche et l’identité d’origine fixée par l’orchestrateur ; valider
   l’objectif, les URLs éventuelles et les budgets.
2. Lire d’abord l’URL explicitement fournie, si présente et autorisée.
3. Si nécessaire, demander au modèle une seule requête minimisée ; construire
   l’URL Google dans le code de confiance, sans données privées inutiles.
4. Vérifier les règles d’accès puis récupérer une page de résultats Google
   dans une session éphémère ; extraire les premiers résultats organiques.
5. Dédupliquer et constituer au plus dix sites candidats, URL directe comprise.
6. Pour chaque candidat, vérifier URL, robots, limites et droits d’accès,
   récupérer le contenu public puis utiliser le rendu isolé si nécessaire.
7. Si un compte est nécessaire, appliquer la stratégie du cahier : compte déjà
   autorisé ou tentative recensée, puis poursuite sur les alternatives publiques.
8. Extraire texte, provenance et métadonnées ; conserver les extraits en
   mémoire, regroupés par source et sans instructions exécutables.
9. Faire produire une synthèse dont chaque fait renvoie à des identifiants de
   sources collectées. Valider le résultat et signaler les preuves insuffisantes.
10. Retourner au demandeur via Nova, enregistrer seulement le résultat et les
    métadonnées autorisés, puis libérer pages, sessions éphémères et buffers.

Une seule requête Google est autorisée. Proposition V1 : aucun deuxième
chargement de la recherche pour essayer un autre moteur, reformuler ou lancer
un repli navigateur ; si le HTML reçu est inutilisable, retourner un diagnostic
partiel ou bloqué. Le rendu Electron de repli concerne les pages des sites
candidats. Cette borne doit être validée avec le cahier.

## Réseau, rendu et authentification

Proposition de composants : `AriNetworkGateway`, `GoogleSearchScraper`,
`SiteScraper`, `HtmlTextExtractor`, `PdfTextExtractor`, `AriEvidenceService` et
`AriResearchService`, tous contrôlés par le main. Les noms sont indicatifs.
Les parseurs coûteux peuvent tourner dans un processus de travail piloté par
le main ; cela ne donne pas une autorité indépendante à ARI.

La passerelle doit vérifier HTTP(S), destination publique, redirections,
volumes, durée et domaines autorisés sur toute requête, y compris sous-ressource,
robots et PDF. Elle refuse protocoles locaux, téléchargements forcés et contenu
interdit. Captcha, `403`, `429` ou interdiction robots arrêtent la tentative,
sans contournement. Une interdiction sur Google peut rendre la recherche
indisponible : le choix du scraper ne garantit pas son accessibilité.

**À préciser avant validation :** protection effective contre DNS rebinding,
accès aux réseaux privés et échappement par proxy, WebSocket ou sous-ressource.
Un simple test de chaîne URL ou une résolution DNS avant `fetch` ne suffit pas.
Le montage réseau Electron devra démontrer le refus à la connexion réelle ;
si ce n’est pas possible avec les API retenues, choisir une passerelle réseau
isolée adaptée avant d’autoriser cette capacité.

Les fenêtres de rendu utilisent une partition distincte, `sandbox: true`,
`contextIsolation: true`, `nodeIntegration: false`, aucune API preload de
NovaChat, permissions refusées par défaut et navigation bornée. La fenêtre
principale ne change pas de politique. Référence :
[sandbox Electron](https://www.electronjs.org/docs/latest/tutorial/sandbox).

Les connexions utilisent le courtier de confiance, jamais AEL. Les secrets
restent hors prompts, extraits et historiques. Le courtier vérifie le demandeur
initial et les domaines avant de résoudre `credentialRef`. Les sessions
persistées doivent être chiffrées et révocables ; une partition `persist:`
ne constitue pas à elle seule une preuve que tous les tokens sont protégés.
Le format d’export/restauration des cookies et tokens est à spécifier.

L’utilisateur termine MFA/OAuth/SSO dans une fenêtre dédiée ; captcha signifie
abandon. Après connexion, seuls les accès classifiés en lecture sont possibles.
**À préciser :** adaptateurs autorisés par site et reconnaissance des opérations
mutantes, car la méthode HTTP seule ne garantit pas une lecture sans effet.
Un site sans classification suffisante reste bloqué.

## Contrat et plafonds

Entrée proposée : enveloppe de délégation commune, objectif, URLs initiales,
langue/région et budget. Les références d’accès sont vérifiées par le main,
jamais déduites du texte du modèle.

Sortie : contrat fonctionnel `status`, `request`, `answer`, `confidence`,
`sources`, `sourceClusters`, `attempts`, `credentialsRequired`,
`captchaRequired`, `limits` et `warnings`. Proposition : chaque source possède
un `sourceId` stable dans la tâche et chaque fait liste ses `sourceIds`.
Une URL absente de la collecte ne peut pas être inventée dans une citation.

Les plafonds confirmés restent dix sites, une requête Google, dix pages HTML
par site, trente pages HTML au total, deux minutes hors attente utilisateur,
20 Mo et cent pages par PDF. Historique : 90 jours ou 1 000 tâches finales,
sans archive intégrale des pages ni réponses brutes du provider.

À fixer techniquement : nombre total de PDF, volume HTML maximum, budget de
sous-requêtes, tokens, concurrence et timeout par requête. Les limites globales
s’appliquent aussi aux pages de vérification des sources et au rendu JS.
Aucune bibliothèque ne certifie la neutralité ; la qualification reste fondée
sur des éléments traçables, et l’insuffisance de preuve produit `partial`.

## Appels aux autres agents

| Relation | Usage autorisé | Statut |
| --- | --- | --- |
| Nova, ACP, AEL, ACA ou agent spécialisé vers ARI | Recherche documentaire, avec demandeur et droits conservés | Décidé, routage de phase 6.2 à construire |
| ARI vers demandeur initial | Retour du dossier sourcé et éventuelle demande d’information via Nova | Décidé |
| ARI vers AEL | Aucun shell, téléchargement CLI ou accès Credentials | Non autorisé dans le périmètre initial |
| ARI vers ACA | Aucune création ou réparation de connecteur | Non autorisé dans le périmètre initial |
| ARI vers ACP ou lui-même | Aucune sous-planification ou recherche récursive nécessaire en V1 | Non prévue ; Nova arbitre la suite |

Le retour de résultat n’est pas une nouvelle délégation. Une reprise demandée
par l’utilisateur ouvre un nouveau cycle, sans boucle automatique. Voir le
[contrat partagé](../AGENTS_PLAN.md#contrat-technique-de-délégation-proposé).

## Versions, alternatives et validation

Proposition : Cheerio + Readability/jsdom + PDF.js, Electron pour le réseau et
le rendu, sans Puppeteer/Playwright ni service de scraping hébergé en première
intention. Electron fournit déjà le moteur navigateur ; ajouter une seconde
pile demanderait une justification et une validation distinctes.

Aucune version n’est figée ici. Les versions compatibles devront être choisies
et verrouillées après vérification du Node embarqué par Electron 39.8.10, du
Node de développement, du bundling Webpack et du packaging. La documentation
Cheerio consultée demande Node 22.19 ou ultérieur, alors que le projet déclare
encore Node 20 : cette compatibilité doit être résolue explicitement, sans
modifier silencieusement les prérequis. Voir [Cheerio](https://cheerio.js.org/docs/intro/).

Validation attendue : fixtures Google organiques/captcha/HTML modifié,
robots/refus HTTP, extraction d’articles et docs techniques, PDF limites et
contenus interdits, redirections et adresses privées, permissions de session,
annulation et budgets, injection d’instructions dans une page, citations
inventées et fuites inter-agents de credentials.

Les sources externes liées ci-dessus ont été consultées le 16 septembre 2026 ;
leurs pages courantes ne prouvent pas à elles seules la compatibilité avec la
version Electron du projet.

## Points à trancher pendant la relecture

- Valider la pile proposée, ses versions et le traitement des résultats Google
  qui nécessiteraient un second chargement.
- Définir la protection réseau effective, les adaptateurs de lecture
  authentifiée et le format chiffré des sessions.
- Fixer les plafonds techniques complémentaires et les critères de rejet PDF.
- Clarifier la création structurelle de Credentials : le cahier l’autorise
  avec ARI actif mais décrit aussi un choix préalable du site par l’utilisateur.
  Proposition : structure inactive autorisée automatiquement ; choix du compte,
  secret et partage toujours explicites. Cette interprétation reste à valider.
