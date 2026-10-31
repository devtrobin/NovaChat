# Plan de travail Providers — phase 7

Préparation documentaire du 30 octobre 2026. Les tâches ci-dessous sont
toutes à réaliser. La correction de ce dossier n'autorise pas à démarrer
l'implémentation avant les phases ARI 6.2 et ACA 6.3.
Le [plan global](../NEXT_STEPS.md) reste la référence.

## Périmètre

Livrer un socle commun conservant OpenAI, un connecteur Mistral et un
connecteur Ollama générique. Les modèles sont sélectionnés dans le connecteur.
Streaming, serveur Ollama distant, installation automatique de modèles,
nouveaux agents, compaction d'historique et autres providers sont séparés.

Les identifiants P7-Pxx sont des tâches du chantier providers, pas de nouvelles
phases 1 à 7. Aucune durée ou couverture de code n'est déclarée acquise.

## Tâches ordonnées

| Tâche | Dépendances | Travail et fichiers cibles | Critère de sortie et preuves |
| --- | --- | --- | --- |
| P7-P01 — Réauditer le socle livré | ARI et ACA validés | `src/main/ai/`, settings, registre de tour, coffre, contrats des agents alors présents | liste complète des appels, formats de sortie, droits, budgets, annulations et traces ; sources API revérifiées |
| P7-P02 — Fermer les contrats | P7-P01 | futurs types main sous `src/main/ai/providers/`, types publics et validators partagés | distinguer transport et messages Nova ; contrats fermés, signal obligatoire, résultat tronqué/refus explicite, snapshot par tour ; aucune activation |
| P7-P03 — Adapter OpenAI | P7-P02 | `openai.service.ts`, builders/parsers existants, adaptateur de transport | réponses et traces conservées pour Nova, ACP, AEL, ARI et ACA livrés ; `write-file`, arrêt et permissions inchangés |
| P7-P04 — Ajouter les settings et secrets | P7-P02, P7-P03 | `settings.types.ts`, service settings, validators, coffre main, migrations | extension additive versionnée, reprise explicite, seconde exécution sans effet ; coffre et chemins OpenAI intacts ; aucune clé renvoyée au renderer |
| P7-P05 — Implémenter Mistral | P7-P03, P7-P04 | futur adaptateur Mistral, client HTTP et fixtures | URLs sans double préfixe, texte/JSON par usage, filtrage de modèles, erreurs et délais bornés, redaction des secrets ; tests synthétiques |
| P7-P06 — Implémenter Ollama local | P7-P03, P7-P04 | futur adaptateur Ollama, client et fixtures | boucle locale validée, `num_predict`, conversion des durées, modèle absent distinct du serveur arrêté, formats qualifiés ; aucun téléchargement ni cloud implicite |
| P7-P07 — Intégrer les réglages | P7-P05, P7-P06 | `SettingsPanel/`, contrôleur, `src/preload.ts`, handlers IPC | projections expurgées, remplacement/effacement ponctuels, test sans sauvegarde, activation réservée aux connecteurs qualifiés |
| P7-P08 — Stabiliser le routage des tours | P7-P07 | `ai.orchestrator.*`, registre de tour et usages agents | sélection immuable pendant un tour, changement au tour suivant, confirmation avant nouveau destinataire de l'historique ; aucune relaxation des permissions |
| P7-P09 — Qualifier les parcours complets | P7-P08 | tests Vitest et futur harnais Electron de providers, données synthétiques | matrice du guide de test satisfaite ; arrêt pendant génération/corps/retry, migration et redémarrage ; parcours Nova et tous les agents présents |
| P7-P10 — Documenter et clôturer | P7-P09 | docs d'état, architecture, contrats, guides et rapport de validation | versions/modèles et résultats réels consignés, validation utilisateur ; package isolé vérifié ; aucun installateur ni publication anticipés |

P7-P05 et P7-P06 sont techniquement indépendantes après leurs prérequis ;
leur parallélisation n'est pas une obligation de processus.

## Portes de revue

1. Après P7-P02 : aucun conflit avec `ChatMessage`, `ProviderResponse`, les
   schémas ARI/ACA ou le registre de permissions.
2. Après P7-P04 : migration atomique par fichier, idempotente et récupérable,
   secrets lisibles uniquement par le main, version inconnue refusée avant écriture.
3. Avant P7-P07 : chaque connecteur prouve génération, formats métier, arrêt,
   limites réseau et absence de fuite de secret dans fixtures et erreurs.
4. Avant clôture : harnais Electron isolé, régression OpenAI, test utilisateur
   et rapport avec limitations réelles. Un nom dans un catalogue ne vaut pas
   qualification du modèle.

Si une garantie échoue, corriger avant activation ; ne pas déclarer la phase
terminée grâce à un simple test de connexion ou à un pourcentage de couverture.

## Validation

Les contrôles existants sont `npm.cmd run check`, les audits npm et le
packaging dans une copie de qualification. Le
[guide de test](TESTING_GUIDE.md) distingue ces contrôles des futurs tests
providers, qui n'existent pas encore.

Les scénarios réseau déterministes utilisent des fournisseurs simulés.
Un essai Mistral réel et un modèle Ollama téléchargé restent des étapes
manuelles explicites de qualification. Les données et credentials personnels
ne servent jamais de fixtures. Les installateurs `make`, l'installation et
la diffusion restent la dernière phase globale du projet.

## Arbitrages restant liés à l'implémentation

- Vérifier les capacités des versions et modèles alors disponibles.
- Fixer, par mesures, délais, limites de corps et budgets de contexte/sortie.
- Qualifier les schémas JSON réellement supportés et les erreurs de troncature.
- Définir les libellés UI de consentement au transfert de l'historique.
- Démontrer la coexistence des nouveaux coffres et du registre Credentials
  livré par ARI, sans accès supplémentaire pour les agents.

Le principe retenu pour la préparation est une extension additive des
settings. Une migration destructrice ou un déplacement de la clé OpenAI
ne font pas partie de ce plan.
