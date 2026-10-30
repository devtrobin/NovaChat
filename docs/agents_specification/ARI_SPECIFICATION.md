# Cahier des charges — ARI — Agent de Recherche Internet

## Statut

Cadrage fonctionnel relu et consolidé le **29 octobre 2026**. L’utilisateur a
confirmé explicitement le maintien du scraper Google avec une exception limitée
à son `robots.txt` pour la page de résultats. Les autres arbitrages techniques
ont été confiés à l’agent et sont consignés dans la
[spécification technique ARI](ARI_SPECIFICATION_TECHNIQUE.md).

La préparation documentaire est terminée ; le
[découpage de la phase 6.2](../NEXT_STEPS.md#découpage-de-la-phase-62) a été
approuvé par l’utilisateur le 29 octobre 2026, avec demande de continuer.
La qualification du runtime et des dépendances en 6.2.1 est réussie le
30 octobre 2026 ; voir [les preuves](../validation/ARI_RUNTIME_6_2_1.md).
Le service de recherche ARI reste à implémenter ; la phase 6.2 n’est pas close.
La qualification des bibliothèques ne démontre pas encore les garanties réseau
et sessions des prochaines portes de validation.

## Position dans la feuille de route

ARI constitue la phase 6.2 de [NEXT_STEPS.md](../NEXT_STEPS.md). Il sera livré
dans la même version qu’ACA, mais devra être implémenté et validé avant la
phase 6.3. ARI est une capacité de recherche documentaire transversale de
NovaChat ; ACA sera l’un de ses consommateurs, pas son unique destinataire.

## Objectif

Créer un agent système spécialisé dans la recherche Internet, capable de
rechercher et lire des informations publiques ou accessibles depuis un compte
autorisé par l’utilisateur, de privilégier les sources officielles et de
retourner un dossier de recherche structuré et sourcé à l’assistant ou à
l’agent qui l’a sollicité.

## Décisions confirmées

- Nom : **ARI — Agent de Recherche Internet**.
- ARI est un agent système construit directement dans NovaChat.
- Il n’est ni supprimable ni librement éditable.
- Il ne peut pas être créé ou remplacé par ACA.
- Il est implémenté et validé avant ACA.
- ARI et ACA appartiennent à la même phase et à la même version.
- ARI est un service système partagé, indépendant d’ACA.
- Nova, ACP, AEL, ACA et les agents spécialisés pourront solliciter ARI
  lorsqu’ils ont besoin d’informations publiques disponibles sur Internet.
- Le résultat est retourné au demandeur initial afin qu’il puisse poursuivre
  sa propre tâche.
- Son périmètre initial est limité à la recherche et à la lecture de pages
  publiques ou de contenus authentifiés explicitement configurés par
  l’utilisateur.
- Un écran **Credentials** commun sera ajouté aux paramètres.
- Cet écran présentera une configuration générique sous la forme d’un tableau
  d’objets JSON décrivant les sites et comptes utilisables par ARI.
- L’authentification par nom d’utilisateur et mot de passe sera la méthode
  initiale préférée lorsqu’elle est compatible avec le site.
- ARI privilégiera toujours l’accès public avant de solliciter un compte.
- Une recherche s’arrêtera dès qu’une réponse suffisamment étayée est trouvée
  ou, par défaut, après dix sites candidats examinés.
- La découverte Internet n’utilisera pas l’outil `web_search` d’OpenAI ni une
  API de recherche hébergée.
- ARI interrogera Google avec un scraper local, dédupliquera les résultats
  organiques puis retiendra au plus dix sites candidats, dans leur ordre
  d’apparition, pour y chercher l’information.
- Si Google ou un site cible présente un captcha, ARI ne tentera jamais de le
  résoudre : il classera la tentative comme `captcha-required` et passera à la
  suite lorsqu’un autre candidat reste disponible.
- Une URL fournie directement sera examinée avant Google et comptera comme le
  premier des dix sites du cycle si une recherche complémentaire est requise.
- Une source officielle peut suffire à établir une donnée. À défaut, ARI devra
  obtenir trois sources indépendantes concordantes, sans compter plusieurs
  reprises d’un même contenu comme des confirmations distinctes.
- Les recherches et lectures publiques sont autorisées lorsque ARI est actif.
  L’ajout structurel d’un credential ne demande pas de permission supplémentaire
  après le choix explicite du site par l’utilisateur ; ARI ne crée pas d’entrée
  spontanément pendant la découverte.
- La recherche Google utilisera une session éphémère sans compte, cookies
  persistants ou SafeSearch.

## Responsabilités

ARI devra :

- recevoir une demande de recherche de Nova, d’un agent système ou d’un agent
  spécialisé autorisé ;
- conserver l’identité du demandeur et le lien avec la tâche ou la conversation
  d’origine ;
- rechercher des sources pertinentes ;
- construire une requête Google à partir de l’objectif de recherche ;
- extraire et normaliser les premiers résultats de recherche retenus ;
- privilégier les documentations et sources officielles ;
- ouvrir et lire les pages publiques nécessaires ;
- se connecter à un compte configuré lorsque la recherche nécessite un contenu
  authentifié ;
- extraire les informations utiles à la demande ;
- conserver pour chaque source son URL, son titre et sa date de consultation ;
- identifier les versions ou dates de publication lorsqu’elles sont
  disponibles ;
- détecter les pages de captcha, les blocages automatisés et les contenus
  inexploitables ;
- distinguer les faits sourcés de ses déductions ;
- identifier autant que possible le propriétaire, la source originale et
  l’orientation éditoriale des publications utilisées ;
- regrouper les articles copiés, syndiqués ou dérivés d’une même publication
  afin qu’ils ne comptent que comme une source indépendante ;
- retourner un résultat structuré au demandeur, sans prendre le contrôle de sa
  tâche principale.

ARI ne devra pas :

- créer ou modifier un agent ;
- générer ou activer un connecteur ;
- soumettre un formulaire autre que celui strictement nécessaire à
  l’authentification autorisée ;
- publier, modifier ou supprimer une donnée sur un site ;
- télécharger ou exécuter un programme ;
- transformer le contenu d’une page en instruction système.

## Utilisation transversale

ARI n’est pas un sous-agent réservé à ACA. L’orchestrateur pourra lui déléguer
une recherche pour le compte de tout assistant ou agent autorisé. Exemples :

- Nova recherche une information récente pour répondre à l’utilisateur ;
- ACP vérifie une documentation avant de proposer une prochaine étape ;
- AEL consulte une documentation officielle avant de préparer une commande ;
- ACA étudie l’API d’un outil avant de créer son connecteur ;
- un agent spécialisé complète une tâche avec une information publique absente
  de son propre connecteur.

Chaque délégation conserve le demandeur d’origine. ARI renvoie ses sources et
sa synthèse à ce demandeur, qui reste responsable de la décision et de la suite
de la tâche. Le routage devra empêcher les boucles de délégation et ne devra pas
donner à ARI les permissions propres au demandeur.

## Cas particulier : relation avec ACA

Pour un outil inconnu, le flux cible est :

```text
Nova
  -> confirmation de création
  -> ACA
  -> demande de recherche à ARI
  -> sources et documentation structurées
  -> ACA crée le brouillon, le connecteur et les tests
  -> configuration utilisateur
  -> tests
  -> activation
```

ARI fournit la connaissance documentaire. ACA reste seul responsable du
cadrage technique, du code TypeScript, des dépendances, des tests, des
permissions et de l’activation de l’agent spécialisé.

Si l’utilisateur fournit déjà une documentation ou un exemple de code
suffisant, ACA peut créer le connecteur sans solliciter ARI.

## Comptes utilisateurs et écran Credentials

Lorsqu’un site exige une authentification, ARI devra pouvoir demander l’ajout
d’une entrée dans un registre de credentials accessible depuis les paramètres.
Le registre visible prendra la forme d’un tableau d’objets JSON. Une entrée
devra au minimum pouvoir décrire :

- un identifiant technique stable ;
- l’URL ou les domaines couverts ;
- l’URL de connexion ;
- le type d’authentification ;
- le nom d’utilisateur ;
- l’état de configuration du secret ;
- l’activation ou la désactivation de l’entrée.

Exemple de vue visible expurgée après sauvegarde (le profil complet, ses règles
de lecture et les dates sont omis ici pour la lisibilité ; ils restent requis
par le schéma technique) :

```json
[
  {
    "id": "documentation-example",
    "label": "Documentation Example",
    "siteUrl": "https://documentation.example",
    "loginUrl": "https://documentation.example/login",
    "readOrigins": ["https://documentation.example"],
    "authOrigins": ["https://documentation.example"],
    "resourceOrigins": [],
    "authentication": {
      "type": "password",
      "username": "utilisateur@example.com"
    },
    "credentialRef": "credential-c4c3ec21-1239-4958-a48a-04598a34698d",
    "secretStatus": "configured",
    "sessionStatus": "configured",
    "profileVersion": 1,
    "allowedAgentIds": ["nova"],
    "enabled": true
  }
]
```

L’exemple représente une entrée déjà configurée et activée par l’utilisateur.
Une nouvelle entrée structurelle est désactivée, sans secret, sans session et
sans droit de partage implicite avec un autre agent. Nova est le demandeur
initial par défaut uniquement pour une création depuis sa conversation.

Le mot de passe ne devra pas rester dans ce JSON après sa sauvegarde. Le
processus `main` devra l’extraire immédiatement, le chiffrer avec le coffre du
système et le remplacer par une référence opaque. Ni ARI, ni AEL, ni le
renderer, ni les historiques ne devront recevoir sa valeur après cette
extraction.

### Stratégie public d’abord

Sans URL directe, ARI commencera par transformer l’objectif en requête Google.
Un scraper local contrôlé récupérera les premiers résultats utilisables et
constituera une file d’au plus dix sites distincts. ARI les visitera dans
l’ordre du résultat de recherche et tentera d’en extraire le contenu principal.

Si la demande contient une URL explicite, ARI la place en tête de la file sans
effectuer d’abord une recherche Google. Lorsque cette URL suffit à établir la
réponse, le cycle s’arrête. Sinon, ARI interroge Google et complète la file avec
neuf autres domaines au maximum.

La présence d’un écran de connexion ne doit pas interrompre immédiatement une
recherche ni provoquer une demande de credentials. Pour chaque site candidat,
ARI devra d’abord essayer les pages et informations publiquement accessibles.
Si un credential actif est déjà configuré et autorisé pour la lecture de ce
site, ARI pourra ensuite l’utiliser sans nouvelle demande de permission.
Si l’information reste inaccessible sans compte et qu’aucun credential
utilisable n’est déjà configuré, ARI devra :

1. enregistrer le site, l’URL de la ressource et, si elle est identifiable,
   l’URL de connexion ;
2. classer le site comme `credentials-required` avec une explication ;
3. poursuivre la recherche sur un autre site ;
4. répéter ce processus jusqu’à trouver une réponse suffisamment étayée ou
   atteindre la limite de recherche.

Si une page exige un captcha, ARI devra la classer `captcha-required`,
conserver son URL et la raison du blocage, puis passer immédiatement au site
suivant. Un captcha ne déclenchera ni tentative de résolution, ni fenêtre
interactive, ni demande de credential.

La limite confirmée est de **dix sites candidats distincts par cycle de
recherche**. Un site inaccessible, non pertinent ou nécessitant des credentials
compte dans cette limite. Plusieurs pages consultées sur un même domaine
restent une seule tentative de site, dans les plafonds confirmés de dix pages
HTML par site, trente au total et deux minutes actives par cycle.

ARI s’arrête avant la dixième tentative dès qu’il dispose d’une réponse
suffisante. À l’inverse, atteindre la limite ne doit jamais produire une
réponse inventée. ARI retourne alors un résultat partiel ou `not-found`
comprenant :

- les sites effectivement examinés ;
- les sources utiles trouvées ;
- les sites nécessitant des credentials ;
- les URL de connexion identifiées ;
- la raison de l’échec ou de l’insuffisance pour chaque candidat ;
- la proposition d’action suivante.

Même lorsqu’une réponse suffisante est trouvée avant la limite, le résultat
doit mentionner les sites `credentials-required` déjà rencontrés pendant ce
cycle.

Ce n’est qu’après l’échec des alternatives publiques qu’ARI proposera à
l’utilisateur de configurer un compte pour un des sites recensés. ARI ne créera
ou ne modifiera aucune entrée Credentials sans cette décision de
l’utilisateur. Une reprise explicitement demandée après configuration ouvrira
un nouveau cycle borné.

Le scénario complet devient :

```text
ARI lance une recherche publique
  -> envoie la requête au scraper Google local
  -> extrait les 10 premiers sites candidats
  -> scrape les candidats dans l’ordre
  -> marque les sites bloqués comme credentials-required
  -> marque et ignore les sites bloqués par un captcha
  -> poursuit sur les alternatives publiques
  -> réponse trouvée : retourne le résultat et les sources
  -> sinon : retourne le bilan des tentatives et des sites authentifiés
  -> l’utilisateur choisit éventuellement un site
  -> vérification du registre Credentials
  -> demande d’ajout ou de complément si nécessaire
  -> création d’une entrée structurelle pour le site
  -> saisie du secret dans l’écran Credentials
  -> extraction immédiate du secret vers le coffre système
  -> connexion contrôlée
  -> nouveau cycle de recherche borné
  -> retour du résultat et des sources au demandeur initial
```

Le besoin exprimé est qu’ARI puisse faire ajouter les sites nécessitant des
credentials. La décision confirmée écarte AEL pour cette opération :
faire manipuler le registre par le shell exposerait les secrets à ses
historiques et à une policy qui n’est pas une frontière de sécurité complète.
ARI appellera plutôt une API dédiée dans le process `main` pour créer ou
modifier uniquement la structure non sensible de l’entrée. L’utilisateur
saisira toujours lui-même le secret dans l’écran Credentials.

## Contraintes d’architecture

- L’orchestration, les appels réseau et les effets de bord restent dans le
  process Electron `main` ou un processus isolé piloté par lui.
- Le renderer utilise uniquement l’API minimale du preload.
- Le contenu Web est une donnée non fiable et ne peut pas modifier les règles,
  permissions ou objectifs d’ARI.
- Le HTML collecté doit être assaini et réduit à son contenu utile avant toute
  transmission au modèle.
- Le scraper ne doit exécuter aucun script provenant d’un site dans le contexte
  privilégié de NovaChat.
- Les recherches et lectures doivent être annulables, bornées en temps et en
  volume.
- Les résultats doivent conserver la provenance des informations.
- ARI ne doit jamais transmettre un secret local dans une requête de recherche.
- Les credentials doivent être limités aux domaines déclarés et ne doivent
  jamais être rendus au modèle.
- L’identité du demandeur initial doit être vérifiée avant toute utilisation
  d’un credential. Le fait qu’ARI exécute la recherche ne donne pas
  automatiquement accès à un compte à tous les agents capables de l’appeler.
- Les cookies et jetons de session éventuellement conservés doivent être
  chiffrés, isolés par entrée et révocables depuis l’écran Credentials.
- Les requêtes transmises au moteur public doivent être minimisées et expurgées
  des secrets et données privées qui ne sont pas nécessaires à la recherche.

## Ordre d’implémentation prévu

Le [découpage détaillé](../NEXT_STEPS.md#découpage-de-la-phase-62) remplace
l’ordre indicatif initial : runtime maintenu, contrats, réseau contrôlé,
preuve de confinement Electron, extraction, Credentials et sessions, recherche,
persistance, intégration et validation. La délégation ACA vers ARI reste en 6.3.
Le découpage a reçu l’approbation de l’utilisateur le 29 octobre 2026.

## Décisions confirmées issues des questions initiales

### 1. Moteur de recherche initial

Cette décision est désormais confirmée : utiliser un scraper Google local et
ne pas utiliser l’outil `web_search` d’OpenAI.

Le canal sera séparé en trois composants de confiance pilotés par le process
`main` :

- `GoogleSearchScraper` charge un résultat Google et extrait les destinations
  candidates ;
- `SiteScraper` récupère, assainit et extrait le contenu des pages retenues ;
- une session Web isolée gère uniquement les contenus authentifiés ou les
  pages qui nécessitent un rendu contrôlé.

OpenAI pourra encore être utilisé par ARI pour comprendre la demande,
sélectionner les informations utiles et produire la synthèse structurée. Le
modèle ne choisira cependant pas les sources par un outil de recherche hébergé
et ne recevra jamais les credentials ou cookies de navigation.

### 2. Documents PDF

ARI pourra lire les PDF publics et les PDF accessibles depuis une session
autorisée. La première version prendra en charge les PDF contenant du texte,
sans OCR automatique. Une valeur par défaut de 20 Mo et 100 pages analysables
par document sera appliquée ; ARI devra cibler les sections pertinentes plutôt
que transmettre le document entier au modèle. Les PDF chiffrés, exécutables
embarqués ou nécessitant un mot de passe seront refusés. L’OCR restera une
extension ultérieure.

### 3. Contrat de résultat

ARI retournera un objet structuré commun à tous les demandeurs, comprenant au
minimum :

```text
status: found | partial | not-found | blocked | cancelled | error
request: requête normalisée et identité du demandeur
answer: synthèse factuelle
confidence: high | medium | low
sources[]: URL, titre, éditeur, propriétaire, dates, accès et faits appuyés
sourceClusters[]: source originale et reprises détectées
attempts[]: site, état et motif de rejet ou d’insuffisance
credentialsRequired[]: site, ressource et URL de connexion éventuelle
captchaRequired[]: site, URL et étape ayant déclenché le captcha
limits: budgets prévus et consommés
warnings[]: incertitudes, contradictions ou contenu non vérifiable
```

Chaque affirmation importante devra être reliée soit à une donnée officielle,
soit à trois sources réellement indépendantes. Les déductions d’ARI devront
rester séparées des faits directement sourcés.

ARI devra détecter les indices de dépendance entre publications : texte
identique ou très proche, même dépêche ou étude citée, même auteur, liens
canoniques, chronologie de publication et propriétaire commun. Plusieurs sites
reposant sur la même origine seront regroupés dans un seul `sourceCluster` et
ne compteront que pour une confirmation.

Les sites appartenant clairement à un parti, candidat, groupe de pression ou
organisation militante, ainsi que les contenus principalement éditoriaux ou
d’opinion, ne compteront pas parmi les trois confirmations indépendantes. Ils
pourront seulement être cités pour établir leur propre position, avec cette
appartenance explicitement signalée. Une déclaration officielle politique
prouve que la déclaration a été faite ; elle ne prouve pas à elle seule la
véracité factuelle de son contenu.

Si trois confirmations admissibles ne sont pas disponibles et qu’aucune donnée
officielle ne tranche la question, ARI retournera `partial` avec la limite
expliquée au demandeur.

### 4. Limites d’un cycle

Valeurs par défaut confirmées :

- 10 sites candidats distincts ;
- 1 requête Google par cycle ;
- 10 pages HTML utiles au maximum par site ;
- 30 pages HTML analysées au total ;
- 2 minutes d’exécution réseau et modèle, hors attente utilisateur ;
- 20 Mo et 100 pages analysables par PDF ;
- contenu extrait borné et découpé avant envoi au modèle.

Le premier plafond atteint arrête le cycle avec un résultat `partial`,
`not-found` ou `blocked`, jamais avec une réponse inventée. Ces valeurs seront
configurables dans les paramètres d’ARI, avec des maxima techniques empêchant
une recherche illimitée. Une reprise explicitement demandée après ajout d’un
credential ouvre un nouveau cycle disposant des mêmes limites.

### 5. Conservation

Conserver pendant 90 jours au maximum, et au plus 1 000 tâches finales pour
ARI, les métadonnées de recherche, le résultat structuré, les URL et les
diagnostics expurgés. Appliquer la première limite atteinte, comme pour les
tâches ACA.

Le contenu intégral des pages, les cookies, les mots de passe et les réponses
brutes du provider ne seront pas conservés dans l’historique ARI. Les contenus
de page resteront en mémoire pendant le cycle puis seront libérés. La réponse
publique envoyée dans une conversation suivra la politique de rétention propre
aux conversations. L’utilisateur pourra supprimer manuellement les tâches
finales et révoquer séparément les sessions.

### 6. Présentation des sources

La réponse finale affichera des citations cliquables au plus près des faits
qu’elles soutiennent. Chaque citation indiquera au minimum le titre, le domaine
et la date de consultation, ainsi que la date de publication lorsqu’elle est
connue.

Un panneau repliable **Sources et tentatives** présentera :

- toutes les sources retenues ;
- les sites examinés mais insuffisants ;
- les contradictions détectées ;
- les sites `credentials-required` ;
- les limites consommées.

Pendant la tâche, l’interface montrera une progression compacte, par exemple
« ARI recherche — 4/10 sites », sans afficher les prompts internes, secrets ou
contenus techniques inutiles.

### 7. Modification du registre Credentials

Utiliser une API `CredentialsService` dédiée dans le process `main`. ARI
pourra lui demander de créer ou modifier la structure non sensible d’une
entrée, mais AEL ne manipulera ni le fichier, ni le coffre, ni les secrets.

Le service assurera validation de schéma, écriture atomique, chiffrement,
références opaques, contrôle des domaines et journalisation expurgée.
L’utilisateur saisira ou remplacera toujours le secret depuis l’écran
Credentials. Ce choix préserve le principe recherché sans exposer les comptes
au shell et aux historiques d’AEL.

### 8. Périmètre après authentification

ARI restera strictement en lecture. Sont autorisés : navigation, soumission du
formulaire de connexion, redirections d’authentification et lecture des
documents. Les publications, commentaires, achats, envois, modifications de
profil et suppressions seront bloqués.

Une entrée Credentials active constitue une autorisation persistante de
connexion et de lecture pour les agents qu’elle autorise ; ARI ne redemandera
donc pas une permission à chaque page. Une action non classée ou susceptible
de modifier une donnée sera refusée, même si le site la présente comme une
étape de navigation.

### 9. Captcha, MFA, OAuth et SSO

Ne jamais contourner ni automatiser un captcha ou un second facteur. Tout site
ou résultat Google exigeant un captcha sera ignoré et signalé dans le résultat.
ARI ne proposera pas à l’utilisateur de résoudre le captcha dans la première
version.

Lorsqu’une connexion déjà choisie par l’utilisateur exige MFA, OAuth ou SSO
sans captcha, ouvrir une fenêtre d’authentification isolée et contrôlée dans
laquelle l’utilisateur termine l’opération. La session obtenue pourra être
conservée sous forme chiffrée, limitée aux domaines déclarés et révocable depuis
l’écran Credentials.

Le nom d’utilisateur et le mot de passe restent la méthode initiale préférée
pour les sites simples. Lorsqu’un site impose ou recommande OAuth/SSO, NovaChat
utilisera cette méthode au lieu de simuler une connexion par mot de passe.
Une session expirée repassera à l’état `renewal-required`.

### 10. Portée du registre Credentials

Créer un registre global utilisable par ARI et les futurs agents spécialisés,
mais appliquer une liste d’accès par entrée. ARI est l’exécuteur technique ;
le courtier vérifiera également que l’identité du demandeur initial figure dans
`allowedAgentIds`. Une entrée créée depuis une conversation Nova autorisera
Nova par défaut. Le partage avec un autre agent nécessitera une décision
explicite de l’utilisateur et ajoutera son identifiant à cette liste.

Les agents, ACA et les modèles ne recevront que le `credentialRef`, l’état et
les domaines autorisés. Le courtier d’authentification restera le seul composant
capable de résoudre le secret au moment d’un appel autorisé.

### 11. Décompte de la limite de dix

Compter dix **sites candidats distincts** provenant du résultat Google, et non
dix pages internes. Un domaine bloqué, non pertinent, exigeant un credential ou
présentant un captcha compte pour une tentative. Les pages ouvertes disposent
de leur propre plafond décrit plus haut. Ce décompte correspond le mieux à
l’intention de parcourir les premiers résultats sans tourner indéfiniment
autour du même site.

## Décisions confirmées propres au scraping

Les règles suivantes sont confirmées :

1. **Nature des résultats.** Ignorer publicités, carrousels, extraits sans
   destination et modules Google ; dédupliquer les résultats organiques par
   site puis retenir les dix premiers sites distincts de la réponse reçue.
   Ne pas paginer pour remplir une file plus courte.
2. **Captcha Google.** Si Google lui-même présente un captcha, arrêter le cycle
   avec l’état `blocked` et un diagnostic clair, sans basculer implicitement
   vers un autre moteur.
3. **Pages JavaScript.** Essayer d’abord une récupération HTTP sans exécution de
   script ; si le contenu utile dépend de JavaScript, utiliser un rendu dans une
   session Electron isolée, sans accès Node, avec domaines et navigation
   bornés.
4. **Règles des sites.** Respecter `robots.txt`, les statuts `403`/`429` et les
   interdictions techniques explicites des sites cibles. L’utilisateur a validé
   le 29 octobre 2026 une seule exception : l’interdiction de `robots.txt` visant
   la page de résultats Google ne bloque pas sa requête de découverte. Cette
   exception ne couvre ni les autres services Google, ni les sites cibles, ni
   les captchas, refus HTTP ou pages de challenge. Aucun changement d’identité,
   rotation de proxy ou autre contournement n’est autorisé.
5. **Reformulation.** Limiter un cycle à une requête Google. Si les dix
   candidats ne suffisent pas, retourner `partial` ou `not-found` et proposer
   un nouveau cycle avec une requête reformulée.

## Décisions confirmées sur le comportement de recherche

### 1. URL fournie directement

Si l’utilisateur ou l’agent demandeur fournit une URL précise, scraper cette
URL en premier sans passer inutilement par Google. Si elle ne suffit pas, ARI
lance ensuite la requête Google et complète la file avec d’autres domaines.
L’URL directe compte comme le premier des dix sites du cycle.

### 2. Niveau de preuve suffisant

ARI ne doit pas s’arrêter au premier texte qui semble répondre. Il pourra
conclure lorsqu’il dispose soit :

- d’une donnée officielle publiée par l’organisme compétent et qui établit
  directement le fait ;
- de trois sources crédibles, indépendantes et sans appartenance politique ou
  orientation éditoriale identifiée qui concordent.

Les copies, reprises d’une même dépêche, publications issues de la même source
initiale et sites appartenant au même propriétaire comptent comme une seule
source. Si le seuil n’est pas atteint, ARI retournera `partial`. Les
contradictions imposeront de poursuivre tant qu’un candidat et du budget
restent disponibles.

### 3. Autorisation des recherches réseau

Activer ARI constitue une autorisation persistante pour les recherches et
lectures publiques. Après le choix explicite d’un site par l’utilisateur, ARI
peut créer son entrée structurelle sans confirmation supplémentaire. Aucun
secret, changement de domaines ou élargissement d’ACL n’est ainsi autorisé.
L’utilisateur reste seul à saisir le secret et à activer ou partager un compte.
Les requêtes publiques ordinaires montrent une progression sans permission à
chaque page. Toute extension capable de modifier un site aura des règles séparées.

### 4. Confidentialité et personnalisation Google

Utiliser une session Google dédiée et éphémère, sans compte Google, sans cookies
réutilisés entre les cycles et sans historique de navigation persistant. La
requête devra être réduite aux termes nécessaires et ne contenir aucun secret
ou contenu privé inutile.

La langue suivra celle de la demande et la région suivra par défaut celle du
système. SafeSearch sera désactivé. Aucun profil personnel du navigateur de
l’utilisateur ne sera réutilisé.

## Décisions confirmées complémentaires

### 1. Évaluation de la neutralité

Il est impossible de prouver automatiquement qu’une source est absolument
neutre. ARI recherchera le propriétaire, les mentions légales, la page de
présentation, les affiliations déclarées et la nature du contenu. L’absence
d’affiliation détectée ne suffit pas à certifier la neutralité.

Une telle source sera classée `neutrality-unverified`, affichée dans le résultat
avec cet avertissement et ne comptera pas automatiquement parmi les trois
confirmations indépendantes.

### 2. Profondeur sur un site

Analyser la page issue de Google puis, si elle est insuffisante, jusqu’à neuf
liens pertinents supplémentaires du même site. ARI pourra donc lire au plus dix
pages HTML par site, sans exploration générale ni sortie vers un autre domaine
à partir de ces liens internes.

### 3. Contenus non textuels

La première version traitera HTML, texte, JSON public lisible et PDF texte. Les
vidéos, podcasts, images sans texte alternatif et réseaux sociaux seront
ignorés, sauf si une transcription ou une version textuelle publique est
directement disponible.

### 4. Contenus manifestement dangereux malgré l’absence de SafeSearch

Désactiver SafeSearch ne doit pas autoriser l’exécution ou le téléchargement de
contenu dangereux. ARI refusera les exécutables, archives, téléchargements
forcés, schémas d’URL non HTTP(S), adresses locales ou privées et pages
identifiées comme malveillantes, puis passera au candidat suivant.

## Décisions confirmées finales

### 1. Critère permettant à une source de compter parmi les trois

Puisque `neutrality-unverified` ne suffit pas, une source non officielle ne
comptera dans le groupe des trois que lorsque son propriétaire et son
financement sont transparents, qu’aucune affiliation politique ou militante
n’est trouvée, que le contenu est factuel plutôt qu’éditorial et qu’il expose
ses données ou sa méthode. ARI signalera malgré tout que cette qualification
repose sur des indices vérifiables et non sur une garantie absolue de
neutralité.

### 2. Plafond global de pages HTML

La limite est fixée à dix pages maximum sur un même site et trente pages HTML
au total par cycle. ARI s’arrêtera avant dès que le niveau de preuve requis est
atteint.

## Précisions retenues après la revue du 29 octobre 2026

- La lecture authentifiée exige un profil explicite de connexion et de lecture.
  Les ressources et actions non classifiables sont refusées ; la première
  version ne promet pas de fonctionner sur tout site. Une méthode HTTP GET ne
  suffit pas à prouver l’absence de mutation. L’heuristique de soumission de
  formulaire est écartée.
- MFA/OAuth/SSO restent manuels. Les domaines d’identité et les destinations de
  lecture sont déclarés séparément. Un captcha interrompt aussi ce parcours.
- L’expiration ou la révocation locale d’une session interrompt ses opérations.
  La révocation locale ne garantit pas une déconnexion distante ; cette limite
  est affichée sans envoyer automatiquement un formulaire métier.
- Les sessions éventuellement conservées sont chiffrées séparément de
  l’historique de recherche. Une méthode de session non prise en charge est
  signalée ; aucun stockage Web complet n’est exporté implicitement.
- Les proxies système/PAC ne sont pas pris en charge initialement. Si un proxy
  est requis ou détecté, ARI retourne `proxy-unsupported` sans tenter une sortie
  directe de secours. Le proxy interne de confinement n’est pas un proxy
  utilisateur ni un accès générique offert aux agents.
- Les réglages peuvent réduire les plafonds initiaux. Leur augmentation au-delà
  des maxima du cahier technique exige une nouvelle revue.
- Au-delà de 100 pages d’un PDF, seules 100 pages au plus sont analysées, avec
  avertissement de couverture partielle. Au-delà de 20 Mo, le transfert est
  arrêté. Un PDF chiffré, protégé ou contenant un exécutable embarqué est refusé.
- Si Google se bloque après une première lecture utile, le statut de cycle reste
  `blocked` conformément à la règle Google ; les sources déjà obtenues sont
  conservées dans le résultat et leur utilité partielle est expliquée.
- Les réponses publiques conservent leur propre instantané compact de citations
  afin que la purge d’une tâche ARI ne casse pas leurs références.

## Méthode de travail

Les décisions techniques retenues par délégation sont détaillées dans le cahier
technique. La preuve de leurs garanties appartient aux tâches de 6.2 ; elle n’est
pas remplacée par leur validation documentaire. Tout échec d’un contrôle de
sécurité bloque l’activation concernée et exige un nouvel arbitrage si le contrat
ne peut pas être tenu. ACA, le code ARI et les changements de dépendances restent
hors de cette préparation documentaire.
