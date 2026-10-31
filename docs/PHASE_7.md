# Phase 7 — préparation des nouvelles capacités

Révision documentaire du 30 octobre 2026. Ce document cadre les travaux
futurs ; aucune capacité de phase 7 n'est déclarée livrée par sa rédaction.
La prochaine tâche d'implémentation reste ARI 6.2.2 dans
[NEXT_STEPS.md](NEXT_STEPS.md). ARI doit être validé avant ACA, puis ACA avant
l'ouverture de la phase 7. Les installateurs restent la dernière phase globale.

## Niveau de préparation

| Repère | Capacité | Documentation disponible | État d'implémentation |
| --- | --- | --- | --- |
| 7.1 | Streaming | cadrage et critères ci-dessous | non implémenté |
| 7.2 | Provider local | contrats et tâches détaillés dans [Providers](Providers/INDEX.md) ; Ollama en premier périmètre | non implémenté |
| 7.3 | Autres providers | Mistral préparé dans le même dossier ; autres connecteurs à spécifier | non implémenté |
| 7.4 | Recherche globale | cadrage et critères ci-dessous | non implémentée |
| 7.5 | Agents spécialisés | cadrage ; cas métier à choisir après ACA | non implémentés |
| 7.6 | Résumé/compaction | cadrage et critères ci-dessous | non implémenté |
| 7.7 | Extension i18n | conditionnelle à un besoin bilingue confirmé | partielle : écran de boot seulement |

Les repères identifient des capacités. Leur découpage d'exécution final est
fermé après réaudit du code livré par ARI/ACA ; ils ne sont pas sept chantiers
à lancer en parallèle. Le volet providers dispose de dix tâches P7-P01 à
P7-P10, encore toutes à réaliser. Les autres volets ont ici un cadrage,
pas une spécification technique prétendument complète.

## Prérequis communs

- Réauditer les contrats et consommateurs réellement livrés par ARI et ACA.
- Garder provider, orchestration, stockage, permissions et effets locaux dans
  le main ; exposer seulement des commandes preload étroites et validées.
- Préserver messages Nova, stockage éclaté, récupération des données, coffre
  OpenAI et droits effectifs du demandeur ; aucun reset de budget implicite.
- Distinguer transport, contenu généré et autorisation d'exécuter une action.
- Employer des fixtures et profils de test isolés, sans données personnelles.
- Consigner critères de sortie, résultats mesurés et limites avant activation.

## 7.1 — Streaming

Objectif : afficher progressivement une réponse sans attendre la fin de sa
génération. Le socle actuel attend la réponse complète ; il n'expose pas
encore un protocole de fragments au renderer.

La conception doit séparer fragments de transport, brouillon affiché et
message métier final. Le main reconstruit et valide les réponses complètes.
Un fragment JSON, une commande incomplète ou un aperçu partiel n'exécute
jamais une action AEL, ARI ou ACA. Le signal d'arrêt couvre en-têtes, corps,
flux et attentes ; un message interrompu est distinct d'un succès.

Préserver l'identité, l'ordre et les traces des messages sans réécrire une
conversation entière à chaque token. Définir cadence d'événements, limites
mémoire, sauvegarde d'un brouillon interrompu et comportement après relance.
Un nouveau connecteur peut rester non streamé tant que son flux n'est pas
qualifié ; la première intégration Mistral/Ollama ne revendique pas ce support.

Sortie : reconstruction exacte sur fragments arbitraires, traitement des
caractères UTF-8 fractionnés, erreurs et coupures, Stop effectif, aucune action
avant validation finale, données récupérables après crash et UI réactive.
Les tests utilisent des flux synthétiques, puis un parcours Electron isolé.

## 7.2 et 7.3 — Providers

Le [plan détaillé](Providers/MISTRAL_IMPLEMENTATION_PLAN.md) couvre un socle
conservant OpenAI, un connecteur Ollama générique et un connecteur Mistral.
Les identifiants cibles restent `openai`, `ollama` et `mistral` ; les modèles
sont choisis à l'intérieur de chaque connecteur. LM Studio, Anthropic et
Google demeurent au catalogue tant que leurs contrats ne sont pas spécifiés.

Les décisions préparées sont : transport distinct des messages Nova,
configuration additive sans déplacement de la clé OpenAI, sélection stable
pendant le tour, formats JSON/texte par appel, annulation propagée, redirections
refusées et confirmation avant transfert d'historique vers une nouvelle
destination. Ollama est limité à la boucle locale pour le premier périmètre.

Sortie : [matrice de validation](Providers/TESTING_GUIDE.md) satisfaite pour
Nova et tous les agents présents, migration idempotente, secrets privés au
main, preuves synthétiques puis qualification utilisateur. Une liste de
modèles accessible ne valide pas à elle seule l'orchestration d'un modèle.

## 7.4 — Recherche globale

Objectif : retrouver du contenu dans plusieurs conversations locales.
La recherche actuelle reste limitée à la conversation active. Ce chantier
est distinct de la recherche Internet ARI.

Définir les espaces recherchés, la prise en compte des messages internes,
le classement, les extraits et l'ouverture d'un résultat. L'index est dérivé
et reconstruisible, jamais une nouvelle source canonique remplaçant les
conversations éclatées. Il n'indexe ni coffre, ni settings sensibles, ni
traces API brutes. Aucun service distant de recherche n'est implicitement utilisé.

Les suppressions et règles de rétention doivent enlever les résultats des
index et caches. Un index manquant ou corrompu n'efface pas les conversations.
Les extraits sont du texte échappé, sans HTML exécutable.

Sortie : recherche multi-conversation, navigation vers le bon message,
visibilité respectée, suppression sans résultat fantôme, reconstruction après
corruption et mesures de temps/mémoire sur un jeu synthétique volumineux.

## 7.5 — Agents spécialisés

Objectif : ajouter des compétences métier utiles sur le socle ACA validé.
Les cas métier et agents candidats doivent être choisis avant leur découpage ;
aucune liste arbitraire de nouveaux agents n'est déclarée approuvée ici.

Chaque ajout décrit mission, entrées, sorties, outils, limites et droits,
demandeur effectif, visibilité, stockage et arrêt. Utiliser le registre et les
contrats alors livrés ; ne pas fabriquer un runtime parallèle de code généré.
Un agent spécialisé n'hérite pas automatiquement des credentials ou permissions
de Nova. Aucun accès Node, shell ou réseau supplémentaire ne découle de son nom.

Sortie par agent : cas métier validé, permissions minimales, délégation et
retour au bon parent, arrêt et refus prouvés, tests adversariaux et validation
utilisateur. Une génération de code ne prouve pas son confinement.

## 7.6 — Résumé et compaction

Objectif : gérer le budget de contexte des longues conversations sans changer
leurs messages originaux sur disque ni relancer des actions déjà effectuées.
La troncature actuelle des résultats réinjectés ne constitue pas une compaction.

Définir le budget par modèle, le déclenchement, les fragments conservés, la
provenance et le niveau d'incertitude du résumé. Le résultat généré est une
donnée, pas une instruction privilégiée. Identités, permissions, budgets et
état des actions en attente restent déterminés par le main, hors résumé.
Conserver un lien vers les messages sources pour corriger une erreur.

L'envoi à un autre moteur pour résumer respecte la règle de destinataire des
providers. Ne pas supprimer les originaux ni exporter un historique local
vers un cloud pour économiser du contexte sans choix utilisateur.

Sortie : contexte borné, provenance vérifiable, décisions et actions achevées
conservées, injection de prompt refusée comme autorité, échec/annulation du
résumé récupérables et régression des parcours agents. Qualifier les modèles
et langues utilisés au lieu de présumer une conservation parfaite du sens.

## 7.7 — Internationalisation

L'extension au-delà du boot reste conditionnelle à un besoin bilingue confirmé.
Recenser les chaînes UI et erreurs, langues, formats de dates/nombres et règle
de repli avant le découpage. Réutiliser i18next existant.

Ne pas traduire les identifiants, clés JSON, statuts protocolaires, noms de
paramètres, commandes shell ou contenu exact des fichiers. Une langue UI ne
change pas le shell réel ni les validations. Les messages métier affichés
doivent rester compréhensibles après changement de langue et relance.

Sortie : écrans et erreurs concernés couverts, clés manquantes et langue de
repli testées, mise en page vérifiée, formats locaux corrects et contrats
Nova inchangés. Ne pas annoncer une application bilingue complète sur la
base de la seule traduction de l'écran de démarrage.

## Reprise et clôture

À l'ouverture de chaque volet, fermer les choix restant ouverts et le découper
en tâches avec fichiers, dépendances et tests. Les contrats détaillés providers
servent de préparation, sans remplacer le réaudit du socle ARI/ACA.

La clôture exige code, vérifications automatisées adaptées, parcours Electron
isolés, documentation d'état exacte et validation utilisateur. Aucune durée
estimée, couverture fictive ou mention « complet » ne tient lieu de preuve.
La validation de distribution (`make`, installation, mise à jour et diffusion)
reste après l'ensemble des capacités retenues, selon le plan global.
