# Validation Providers — matrice de phase 7

Révision du 30 octobre 2026. Les scénarios de ce document sont à implémenter.
Ils ne constituent pas des tests exécutés ni un rapport de couverture.

## Preuves existantes

Le socle de référence dispose de 337 tests dans 47 fichiers, validés sous
Node 22.22.2 et 24.18.0, avec TypeScript, lint et packaging Windows x64.
Le test Electron AEL utilise un fournisseur synthétique ; l'utilisateur a
validé la création de fichier AEL. Ces résultats ne qualifient pas des
adaptateurs Mistral ou Ollama encore absents.

Commandes réellement présentes :

~~~powershell
npm.cmd run check
npm.cmd run test:ael-ui
npm.cmd run test:ari-runtime
~~~

Les deux derniers harnais ont leurs propres prérequis et objectifs, décrits
dans `tests/electron/ael/smoke.cjs` et `tests/electron/ari/README.md`.
Le packaging s'exécute dans une copie isolée pour préserver les artefacts
locaux. Ni `build`, ni `test:coverage`, ni un script de test providers ne sont
actuellement définis. Ne pas les présenter comme des commandes opérationnelles.

## Matrice de transport à construire

| Scénario | Assertion attendue |
| --- | --- |
| URL Mistral par défaut | exactement une occurrence de `/v1`, routes correctes |
| Credential Mistral | Bearer résolu par le main, aucun préfixe artificiel exigé |
| Liste des modèles | filtrage par capacité de chat ; pas de modèle d'embeddings pour Nova |
| Formats | JSON Nova, texte ACP et AEL terminal, JSON `write-file` valides |
| Réponse textuelle ou en blocs | extraction validée ; refus des contenus non pris en charge |
| Réponse tronquée ou refus | aucun succès opérationnel complet, aucune action exécutée |
| Outils natifs inattendus | rejet ; aucun appel shell ou fichier implicite |
| Ollama | `stream:false`, `options.num_predict`, mapping des métriques |
| Durées Ollama | nanosecondes converties ou temps client mesuré |
| Serveur arrêté / modèle absent | erreurs distinctes, sans téléchargement automatique |
| Erreurs HTTP 400/401/403/404/429/5xx | catégorie et message cohérents, détails expurgés |
| JSON invalide, corps vide ou trop grand | échec borné et exploitable, sans contournement du parser |
| Annulation avant envoi et pendant attente/corps | signal propagé, aucune réponse tardive exécutée |
| Délai après les en-têtes | lecture du corps interrompue et timer nettoyé |
| Retry éventuel | plafond et budget conservés, arrêt immédiat sur Stop |
| Changement d'origine ou redirection | aucun credential ni historique envoyé à une origine non approuvée |
| URL Ollama hors boucle locale | refus dans le premier périmètre |
| Modèle Ollama cloud | pas de qualification confidentielle comme s'il s'agissait d'une inférence locale |

Tester aussi les modes de génération propres aux agents ARI/ACA une fois
ceux-ci livrés. Une réponse « Bonjour » ne valide pas leur orchestration.

## Matrice settings et coffre

- Configuration actuelle sans extension : OpenAI, chemins et paramètres conservés.
- Migration versionnée, seconde exécution et arrêt entre deux fichiers :
  reprise déterministe, aucune substitution silencieuse de modèle ou URL.
- Configuration corrompue ou version inconnue : aucune écriture avant décision
  de récupération ; une copie valide reste disponible.
- Ajout d'un provider inactif : aucune requête réseau implicite.
- Clé remplacée ou effacée : relecture main contrôlée, indicateur public
  correct, aucune valeur renvoyée au renderer.
- Coffre indisponible, redaction et backups : aucun secret en clair dans
  settings, événements, traces, erreurs HTTP ou rapport de test.
- Conservation du coffre OpenAI : aucun déplacement ni re-chiffrement
  nécessaire à l'ajout de Mistral/Ollama.
- Brouillon et test de connexion : pas de sauvegarde ni changement du provider
  actif ; secret ponctuel effacé du formulaire selon le parcours.
- Bascule pendant un tour : sélection stable jusqu'à sa fin.
- Passage local vers cloud ou nouvelle origine : destination visible et
  consentement avant transfert de l'historique.

## Parcours Electron à préparer

Créer un harnais de test dédié, avec renderer et preload réels, profil,
sessions, settings, conversations et coffre dans une racine temporaire neuve.
Les fixtures contiennent des canaris synthétiques ; aucun compte réel.
Le bootstrap doit imposer ces chemins avant de charger les services main
ou les migrations. Ne pas lancer un hypothétique `main.js` avec le profil
normal pour exécuter des tests de réglages.

1. Ouvrir paramètres et navigation, configurer sans activer puis tester.
2. Sauvegarder explicitement, relancer et vérifier les valeurs non sensibles.
3. Converser avec chaque fournisseur simulé, puis vérifier ACP et AEL.
4. Créer un fichier avec `write-file`, refuser une seconde demande et arrêter
   un tour en attente ; vérifier les fichiers et historiques effectifs.
5. Changer le moteur pendant un tour et reprendre une conversation existante.
6. Injecter les erreurs, délais, troncatures et annulations de la matrice.
7. Attendre la fin des sauvegardes avant fermeture, puis vérifier les données
   sur disque et l'absence de canaris dans les sorties interdites.
8. Qualifier dans un paquet de test distinct avec les garanties de production.

Les tests ne dépendent ni de l'ordre d'exécution ni d'un Ollama personnel déjà
démarré. Les serveurs synthétiques et instances de test ont un cycle de vie
borné et sont arrêtés proprement. Les screenshots, vidéos ou traces de test
ne doivent pas capturer une vraie clé ou des données personnelles.
Si Playwright est retenu, qualifier sa dépendance, son API Electron et sa
compatibilité avec les fuses ; aucune nouvelle bibliothèque n'est installée
par cette correction documentaire.

## Qualification réelle et clôture

Les essais réseau réels sont manuels et explicitement choisis : compte Mistral
de qualification ou modèle Ollama local identifié par tag/digest, versions et
capacités observées. Consigner matériel, paramètres, taille du contexte, temps
de chargement et temps de génération ; ne pas promettre moins de cinq secondes
sur tout matériel.

Le rapport final doit donner commit, versions, commandes exactes, tests réussis
et échoués, parcours couverts et limites. La couverture éventuelle sera mesurée,
pas illustrée par un tableau fictif. Les tests de refus, de secrets et d'arrêt
priment sur un seuil de couverture arbitraire.
Un test de connexion réussi ne clôt pas le chantier.
