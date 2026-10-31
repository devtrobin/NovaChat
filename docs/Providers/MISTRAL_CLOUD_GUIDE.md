# Mistral — préparation du futur parcours cloud

Révision du 30 octobre 2026. Mistral reste un provider planifié dans NovaChat.
Les formulaires et opérations ci-dessous décrivent le parcours à livrer en
phase 7 ; ils ne sont pas utilisables dans la version actuelle.

## Préparation possible côté utilisateur

Un compte et une clé peuvent être préparés dans
[la console officielle Mistral](https://console.mistral.ai/).
La disponibilité des modèles, leurs capacités, conditions d'utilisation et
tarifs doivent être vérifiés dans ce compte au moment de la qualification.
Aucune liste de modèles ni recommandation de prix n'est figée ici.

Ne pas copier la clé dans les settings, un terminal, une conversation ou un
rapport. Elle sera saisie uniquement dans le futur formulaire de remplacement
ponctuel et chiffrée par le main. Le code actuel ne fournit pas encore de
commande de stockage d'une clé Mistral.

## Parcours NovaChat cible — non implémenté

1. Ouvrir les paramètres providers et choisir la configuration `mistral`.
2. Saisir l'URL HTTPS approuvée et sélectionner un modèle capable de chat.
3. Saisir une nouvelle clé si nécessaire ; la clé déjà stockée n'est jamais
   réaffichée ni remplacée par un blob chiffré dans l'interface.
4. Tester la connexion sur le brouillon sans le sauvegarder ni l'activer.
5. Valider explicitement la configuration, puis choisir le moteur actif.
6. Avant transfert d'un historique à cette destination, confirmer le changement
   de destinataire. La sélection s'applique au prochain tour.
7. Vérifier une réponse Nova, un parcours ACP/AEL et le bouton Arrêter avec
   le modèle qualifié, pas seulement la liste des modèles.

La présence d'une clé dans le coffre ne démontre ni son autorisation sur un
modèle, ni la conformité des sorties aux contrats Nova.

## Réglages réseau de référence

Base URL proposée : `https://api.mistral.ai/v1`.
Le test utilise `/models` et la génération `/chat/completions` ajoutés à cette
base. L'identifiant de modèle provient du catalogue du compte.
Les options, budgets et formats par usage sont définis dans
[la spécification](MISTRAL_SPECIFICATION.md).

L'utilisation de HTTPS ne suffit pas à approuver une nouvelle origine :
un changement d'hôte doit être confirmé avant envoi de credentials.
Il n'y a ni repli automatique depuis un modèle local, ni activation d'un
autre cloud en cas d'échec.

## Erreurs à présenter

| Situation | Comportement cible |
| --- | --- |
| Clé absente, invalide ou droits insuffisants | message explicite, aucun secret dans l'erreur |
| Modèle inaccessible ou inadapté | choisir un modèle compatible, sans substitution automatique |
| Quota ou limitation de débit | attente bornée ou erreur, sans boucle de retry |
| Réseau indisponible ou délai dépassé | arrêter proprement et conserver la conversation |
| JSON invalide ou sortie tronquée | ne pas exécuter une action déduite d'un contenu incomplet |
| Arrêt utilisateur | annuler aussi la lecture du corps et les attentes |

Ne pas promettre une région d'hébergement ou une politique de conservation à
partir du seul nom du provider. Ces garanties doivent être vérifiées auprès
du fournisseur et du compte avant un usage de données confidentielles.

## Sources et statut

[API Chat Mistral](https://docs.mistral.ai/api/endpoint/chat) et
[documentation officielle](https://docs.mistral.ai/).
Voir [la migration additive](MIGRATION_GUIDE.md) et
[la matrice de qualification](TESTING_GUIDE.md).
La documentation ne constitue ni une activation ni une preuve de fonctionnement.
