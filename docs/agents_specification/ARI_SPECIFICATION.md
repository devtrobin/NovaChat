# Cahier des charges — ARI — Agent de Recherche Internet

## Statut

**Cahier fonctionnel finalisé pour le développement de la phase 6.2 le
22 septembre 2026.** Les décisions utilisateur sont consolidées ; les détails
techniques sont fixés dans le [compagnon technique](ARI_SPECIFICATION_TECHNIQUE.md).
Le [découpage 6.2](../NEXT_STEPS.md#phase-62--ari--agent-de-recherche-internet)
porte les tâches et les validations à réaliser. ARI n’est pas encore implémenté.
La finalisation documentaire ne signifie pas que les tests ou le packaging
ont déjà réussi.

## Mission et place dans NovaChat

ARI recherche et lit des informations publiques ou accessibles à un compte
explicitement autorisé. Il retourne un dossier sourcé à Nova ou à l’agent
qui l’a sollicité, via l’orchestrateur du main.

- Agent système `agent-ari`, non supprimable et non librement remplaçable.
- Capacité transversale disponible à Nova, ACP et AEL en 6.2, puis à ACA et
  aux agents spécialisés lorsqu’ils seront implémentés et autorisés.
- ARI ne génère pas de connecteur et ne réalise aucune action métier d’écriture.
- Nova reste l’unique orchestrateur ; les agents ne s’appellent pas directement.
- La validation d’ARI précède ACA en 6.3. Leur livraison produit reste prévue
  dans la même version ; les autres capacités sont reportées à la phase 7.

## Décisions de cohérence du 22 septembre 2026

1. **Collecte en CLI avec curl.** Google est interrogé par récupération de son
   HTML, puis les destinations pertinentes sont contrôlées et lues. Aucune API
   de recherche hébergée ni outil de recherche du provider n’est utilisé.
2. **Exception robots limitée à Google.** L’utilisateur autorise la recherche
   sur `https://www.google.com/search` malgré la règle du
   [fichier robots de Google](https://www.google.com/robots.txt). L’exception ne
   se propage ni aux résultats ni aux autres chemins/origines. Captcha, `403`
   et `429` restent des arrêts ; aucun contournement n’est effectué.
3. **Credentials.** ARI peut préparer un brouillon inactif sans secret pour un
   site pertinent demandant un compte. Seul l’utilisateur active le compte,
   fournit ses secrets et accorde les droits. ARI poursuit les alternatives
   publiques sans attendre.
4. **Lecture authentifiée par adaptateurs.** Les parcours et opérations admis
   sont explicites. Un service ou une action non pris en charge est signalé.
5. **API officielles et IMAP autorisés.** Les API des services via curl et
   l’IMAP chiffré sont admis pour les comptes ; cela ne modifie pas le choix
   Google pour la découverte publique.
6. **Autorisations mémorisées.** Lecture des comptes et analyse d’extraits
   privés par un provider nécessitent des droits consultables et révocables.
   Ils sont réutilisés sans nouvelle demande à chaque opération.
7. **Outlook obligatoire, pour les deux types de comptes.** Outlook.com,
   Hotmail et Live, ainsi que Microsoft 365 professionnel/scolaire, doivent
   fonctionner. Gmail et Orange sont des compléments si possible.

HTTPS protège le transport, pas la véracité ou l’innocuité du contenu. Le choix
curl ne garantit pas la disponibilité de Google ni la stabilité de son HTML.
Une page dépendant d’un rendu JavaScript n’entraîne aucun lancement automatique
de navigateur ; ARI signale la limite et poursuit sur un autre candidat.

## Couverture de la première livraison

| Niveau | Capacité | Critère de périmètre |
| --- | --- | --- |
| Obligatoire | Google et URL directe | HTML public récupéré par curl ; résultats organiques et exploration bornée |
| Obligatoire | Documents | HTML, texte, JSON lisible et PDF texte ; citations précises |
| Obligatoire | Credentials et Accès accordés | brouillons, OAuth Outlook, secrets chiffrés, droits persistants et révocation |
| Obligatoire | Outlook personnel | recherche et lecture dans la boîte principale du compte connecté |
| Obligatoire | Outlook professionnel/scolaire | mêmes opérations pour une boîte Exchange Online autorisée par l’organisation |
| Obligatoire | Intégration Nova/ACP/AEL | demandes tracées, retour au demandeur, annulation et affichage |
| Obligatoire | Forums et information publics | extraction des pages textuelles compatibles avec la collecte statique |
| Conditionnel | Gmail et Orange | ajout possible après le socle obligatoire, avec tests propres ; ne bloque pas 6.2 |
| Conditionnel | Forums et information authentifiés | seulement si un adaptateur de site explicite est livré et testé |
| Limité au texte accessible | YouTube et streaming | titres, descriptions, métadonnées et transcriptions accessibles ; aucune promesse universelle |

« Tous les sites du quotidien » décrit la direction du produit. La première
livraison ne garantit pas un accès universel. L’écran indique les adaptateurs
réellement disponibles ; un brouillon de compte ne crée pas un adaptateur.

Outlook inclut recherche par texte, expéditeur, sujet, période, dossier et état
lu/non lu, lecture du corps et des pièces jointes textuelles/PDF pertinentes.
Plusieurs comptes peuvent être configurés ; une recherche privée cible un seul
compte. Si le compte ne peut pas être déterminé, Nova le fait choisir.

Sont exclus du lot obligatoire : comptes Exchange hébergés sur site, boîtes
partagées ou déléguées, calendriers, contacts, envoi/réponse, suppression,
déplacement, changement lu/non lu, abonnement, publication, OCR, analyse
vidéo/audio et téléchargement de flux. Le refus d’une organisation ou d’un
fournisseur est expliqué, jamais contourné.

## Parcours public

1. ARI reçoit un objectif borné et, éventuellement, une URL directe.
2. L’URL directe est examinée en premier et compte parmi les dix sites. Si elle
   suffit, aucune recherche Google n’est effectuée.
3. Sinon, une seule requête Google minimale est construite : termes utiles,
   langue de la demande, région système, paramètre SafeSearch désactivé, sans
   contenu privé ni compte Google. Aucun profil navigateur n’est réutilisé.
4. Les résultats organiques sont conservés dans leur ordre et dédupliqués par
   domaine enregistrable. Publicités, carrousels, liens internes au moteur et
   extraits sans destination sont exclus. Avec une URL directe déjà examinée,
   neuf autres sites au plus sont retenus.
5. Chaque candidat est contrôlé, lu et analysé. Les liens internes pertinents
   peuvent être suivis dans les budgets ; un domaine inaccessible ou demandant
   un compte compte quand même comme candidat examiné.
6. Une connexion nécessaire sans accès utilisable produit `credentials-required`
   et, si pertinent, un brouillon inactif. Les autres sources sont examinées.
7. La recherche s’arrête quand la preuve est suffisante ou qu’un plafond est
   atteint. Les sources insuffisantes et les comptes nécessaires restent visibles.

Pour une recherche publique, ARI privilégie le public avant un accès privé.
Il ne présente une invitation à configurer un compte qu’après insuffisance des
alternatives. Une entrée déjà autorisée peut être utilisée si un adaptateur
existe, après contrôle du droit d’analyse du provider.

Un captcha Google ou un `403`/`429` Google arrête la découverte avec `blocked`.
Sur un site candidat, il termine cette tentative et ARI poursuit. Aucun captcha
n’est résolu, automatiquement ou par une fenêtre proposée par ARI en V1.
L’exception robots ne dispense jamais des contrôles réseau.

## Parcours privé Outlook

Une demande visant la boîte mail passe directement à son adaptateur, sans
Google ni recherche publique de substitution. Le contenu et la requête privés
ne sont pas utilisés pour construire une recherche Internet.

1. Résoudre le compte choisi et vérifier l’activation d’ARI et du compte.
2. Obtenir les droits locaux manquants et, si nécessaire, la connexion Microsoft.
3. Rechercher et lire uniquement les messages utiles, sans modifier leur état.
4. Extraire les passages et pièces jointes pertinents dans les budgets.
5. Vérifier l’accord pour le provider réellement sélectionné avant tout envoi.
6. Retourner une réponse avec références aux messages/documents consultés.

Si l’accord d’analyse est refusé, aucune donnée du compte n’est envoyée au
modèle ; ARI explique le blocage. L’utilisateur peut conserver séparément son
droit de lecture. Aucune indexation permanente de toute la boîte n’est créée.

## Credentials et connexion

L’écran **Credentials** est commun à tous les agents. Une table éditable
présente une projection JSON expurgée : identifiant stable, service/adaptateur,
libellé du compte, domaines, méthode d’authentification, état, activation et
références opaques de secrets. Les secrets sont saisis par des champs dédiés,
puis extraits vers le coffre ; ils ne réapparaissent jamais dans le JSON.

- Un brouillon automatique n’a aucun secret, aucun droit et ne remplace pas
  une entrée active. Les suggestions sont dédupliquées par site.
- Outlook utilise une connexion OAuth Microsoft ; NovaChat ne demande pas le
  mot de passe Microsoft dans un formulaire local.
- La connexion utilisateur s’effectue dans le navigateur système pour OAuth.
  Cette interaction n’est pas un navigateur de scraping : aucun cookie de ce
  navigateur n’est importé dans ARI.
- MFA et SSO sont accomplis par l’utilisateur chez le fournisseur. Un refus ou
  une session expirée produit une action de renouvellement identifiable.
- Pour de futurs sites simples, un mot de passe peut être utilisé seulement
  par un adaptateur explicite ; aucun formulaire inconnu n’est deviné.
- Désactiver/déconnecter un compte bloque ses usages, annule les tâches
  concernées et supprime ses sessions locales. La suppression du compte est
  distincte de la suppression des conversations.

L’authentification fournisseur et les permissions NovaChat sont distinctes.
L’accord mémorisé évite les demandes répétées de NovaChat ; il ne garantit pas
qu’un fournisseur ou une organisation ne redemandera jamais une connexion.

## Registre des accès accordés

L’écran **Accès accordés**, à côté de Credentials, affiche compte/service,
demandeur, agent exécutant, droit, provider destinataire, date et état. Il
permet de révoquer ou supprimer chaque accès.

Deux droits sont distingués, regroupables dans une même demande :

- `read-account` : connecter et lire le compte ;
- `analyze-private-content` : envoyer les extraits utiles à un provider précis.

Une autorisation couvre le compte, les identités concernées et, pour l’analyse,
le provider et sa configuration de destination. OpenAI est le seul provider
actuel ; le registre est conçu pour les futurs providers sans les activer.
Un autre modèle chez le même provider et à la même destination ne redemande pas
l’accord. Un autre compte, demandeur, provider ou endpoint ne l’hérite pas.

L’accord est conservé entre les sessions jusqu’à révocation. Une nouvelle
demande n’apparaît que si sa portée manque. Un refus n’est pas redemandé en
boucle pendant la même tâche. La révocation interdit les nouveaux appels et
annule autant que possible ceux en cours ; un envoi déjà effectué ne peut pas
être rappelé. Supprimer un droit ne supprime pas les messages locaux.

Les réponses privées conservées dans le chat gardent leur provenance. Leur
réutilisation dans un tour ultérieur, une synthèse ou par un autre provider est
soumise au même contrôle. `visibility: public` signifie visible dans l’UI,
pas autorisé à être transmis à n’importe quel provider.

## Sources et niveau de preuve

Pour une affirmation factuelle publique, ARI exige :

- une donnée officielle de l’organisme compétent établissant directement le fait ;
- ou trois sources indépendantes admissibles qui concordent.

Copies, dépêches reprises, propriétaires communs, mêmes études ou publications
originelles sont regroupés. Les sources politiques, militantes et éditoriales
peuvent documenter leur propre position, mais ne comptent pas automatiquement
comme confirmations indépendantes. Une déclaration officielle établit qu’elle
a été faite, pas nécessairement la véracité de son contenu.

Pour compter parmi les trois, une source non officielle doit exposer son
propriétaire et son financement, ses données ou sa méthode, un contenu factuel
et aucune affiliation politique/militante identifiée. Ce sont des indices,
pas une garantie de neutralité. Une source incertaine reçoit
`neutrality-unverified` et ne compte pas sans justification vérifiable.

Une recherche « retrouve mon message » est étayée par le message lui-même,
sans trois confirmations publiques. ARI distingue le contenu du document de
la vérité des affirmations de son auteur. Aucun passage privé n’est divulgué
pour tenter une corroboration publique.

Les déductions restent explicitement séparées des faits sourcés. Si le seuil
n’est pas atteint, le résultat est `partial`, jamais une certitude inventée.

## Résultats, budgets et erreurs

Le dossier commun contient : statut, réponse, niveau de confiance, faits reliés
aux sources, sources et regroupements, tentatives, comptes nécessaires,
captchas, budgets consommés et avertissements. Une citation indique titre,
source et date de consultation ; date de publication et page PDF si connues.
Une référence mail est privée et ne devient pas une requête Google.

| Statut | Sens |
| --- | --- |
| `found` | objectif atteint avec preuve adaptée au mode public ou privé |
| `partial` | éléments utiles mais couverture/preuve incomplète ou contradictoire |
| `not-found` | parcours pris en charge terminé sans élément pertinent |
| `blocked` | aucun résultat utile et obstacle d’accès, permission ou configuration |
| `cancelled` | arrêt demandé, révocation ou désactivation ; pas de reprise automatique |
| `error` | défaillance interne ou réponse fournisseur inexploitable non prévue |

Une page Google changée ou vide de structure exploitable n’est pas `not-found`.
Un plafond interrompant une recherche sans résultat produit `blocked` avec son
motif ; si des éléments existent, ils sont retournés comme `partial`.

Valeurs publiques par défaut confirmées : une requête Google, dix sites,
dix pages HTML par site, trente au total, deux minutes réseau/modèle hors
attente utilisateur, PDF de 20 Mo et 100 pages analysables au maximum.
Les budgets techniques privés et les maxima configurables sont fixés dans le
compagnon. Un plafond est un maximum, pas une promesse de parcours complet.
Une reformulation Google ou une reprise après ajout de compte ouvre un nouveau
cycle explicitement demandé, sans remise à zéro cachée pendant une tâche.

## Interface et conservation

- Page ARI : Général, Contexte, Tâches et Historique, état d’activation et liens
  vers Credentials et Accès accordés. ARI est désactivé à sa première introduction.
- Pendant une recherche : progression compacte et bouton Arrêter, sans commande
  curl, prompt interne ou secret dans le parcours utilisateur.
- Résultat : réponse et citations, panneau **Sources et tentatives**, limites
  et actions utiles (« connecter Outlook », « autoriser », « nouvelle recherche »).
- Les informations détaillées de routage restent internes ; les demandes
  d’autorisation et résultats destinés à l’utilisateur sont visibles.

L’historique ARI conserve résultats et métadonnées pendant 90 jours au maximum,
et au plus 1 000 tâches finales. Les tâches actives ne sont pas purgées. Aucun
HTML complet, corps intégral de boîte mail, cookie, token ou réponse brute du
provider n’est conservé dans les traces ARI. Les extraits utiles et réponses
privées conservés comme résultats sont chiffrés dans l’espace ARI.

Les réponses présentes dans le chat suivent la persistance éclatée et la
rétention des conversations, avec provenance privée conservée. Effacer une
tâche ARI n’efface pas implicitement le chat ; supprimer une permission n’efface
ni une tâche ni un message. Au redémarrage, une tâche interrompue est signalée,
sans nouvelle connexion ni recherche automatique.

## Scénarios d’acceptation obligatoires

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| F01 | URL directe suffisante | réponse sourcée sans requête Google |
| F02 | Google normal, captcha, HTML changé | extraction organique ou blocage explicite ; aucun contournement |
| F03 | Site privé rencontré au cours d’une recherche publique | brouillon inactif, poursuite publique, aucun secret demandé prématurément |
| F04 | Outlook personnel puis professionnel/scolaire | connexion, recherche, corps et pièce jointe texte/PDF, sans mutation |
| F05 | Même accès après redémarrage | accord réutilisé, aucune demande NovaChat répétée |
| F06 | Autre provider/destination ou droit révoqué | aucun nouvel envoi privé sans accord, y compris depuis l’historique du chat |
| F07 | Arrêt pendant réseau, permission ou analyse | fin unique, ressources arrêtées, pas de relance automatique |
| F08 | Sources copiées ou preuve insuffisante | regroupement et résultat partiel, aucune fausse confirmation |
| F09 | Limite de taille, pages, messages ou temps | arrêt borné avec explication et conservation des éléments utiles |
| F10 | Demande ACP/AEL via Nova | droits du véritable demandeur, retour au parent, aucun appel direct ni boucle |
| F11 | Tenant Microsoft refusant l’application | diagnostic exploitable, aucun élargissement de droits ou contournement |
| F12 | Gmail/Orange absents | Outlook et recherche publique restent livrables ; état non pris en charge explicite |

Ces scénarios et les tests techniques constituent les critères de fin du code.
L’enregistrement de l’application Microsoft et les comptes de test sont des
prérequis d’exécution, recensés dans le compagnon ; ils ne sont pas créés par
la présente rédaction.
