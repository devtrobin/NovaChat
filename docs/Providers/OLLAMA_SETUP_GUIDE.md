# Ollama — préparation locale et futur parcours NovaChat

Révision du 30 octobre 2026. Ollama n'est pas encore un provider actif de
NovaChat. Sa préparation manuelle peut être faite séparément ; l'intégration
décrite ensuite attend la phase 7.

## Installation et modèle

Utiliser [le téléchargement officiel](https://ollama.com/download) et les
instructions de la plateforme choisie. Sous Windows, l'installation standard
fournit une application en arrière-plan et une CLI ; elle ne crée pas
nécessairement un service nommé `OllamaService`.
Les versions de système, pilotes et chemins d'installation dépendent de la
version téléchargée : consulter
[la page Windows](https://docs.ollama.com/windows) ou
[la page Linux](https://docs.ollama.com/linux).

Vérifier la CLI et les modèles présents :

~~~powershell
ollama --version
ollama list
~~~

Un modèle se choisit avec sa version, sa quantification, sa licence et les
capacités requises. Le poids du modèle et son contexte influencent les besoins
mémoire ; une famille « Mistral » ne définit pas à elle seule une taille ou
une quantité de RAM. Vérifier les
[tags officiels](https://ollama.com/library/mistral/tags) au moment du choix.

Exemple de téléchargement explicite d'un tag, à exécuter seulement si choisi :

~~~powershell
ollama pull mistral:7b-instruct
~~~

Ce téléchargement peut être volumineux. NovaChat ne doit pas l'installer ni
lancer un serveur au simple changement de provider.

## Vérifier le serveur local

Pour une instance volontairement démarrée sur le port par défaut :

~~~powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags'
~~~

Un refus de connexion est différent d'une liste vide ou d'un modèle absent.
Vérifier l'application Ollama et son adresse réelle avant toute autre action.
Il n'est pas nécessaire d'ouvrir le pare-feu entrant pour une utilisation
sur la même machine.

Pour choisir un autre port avec un serveur lancé manuellement, quitter
d'abord l'application en arrière-plan afin de ne pas confondre les instances :

~~~powershell
$env:OLLAMA_HOST = '127.0.0.1:11435'
ollama serve
~~~

Le port est inclus dans `OLLAMA_HOST` ; ne pas utiliser une variable
`OLLAMA_PORT` supposée équivalente. Garder l'écoute sur la boucle locale,
sans `0.0.0.0`. Arrêter cette instance au premier plan avec Ctrl+C.
Ces commandes ne configurent pas un serveur déjà lancé par une autre session.

## Confidentialité

Une API joignable sur une adresse locale peut aussi transmettre des demandes
à des modèles cloud. Pour un usage réellement local, choisir un modèle local
et désactiver les fonctions cloud du serveur selon
[la FAQ officielle](https://docs.ollama.com/faq).
L'option `OLLAMA_NO_CLOUD=1` doit être appliquée au serveur puis celui-ci
redémarré ; la définir seulement dans le terminal du client ne reconfigure
pas une application déjà en cours.

L'API locale n'exige pas d'authentification par défaut :
[référence officielle](https://docs.ollama.com/api/authentication).
Ne pas élargir son écoute réseau pour résoudre un conflit de port.
Le premier connecteur NovaChat prévu ici accepte uniquement la boucle locale ;
un serveur distant nécessitera une conception distincte.

## Parcours NovaChat cible — non implémenté

1. Configurer le provider `ollama`, puis choisir un tag installé.
2. Tester le brouillon sans sauvegarde, activation ni téléchargement implicites.
3. Sauvegarder explicitement et sélectionner le moteur du prochain tour.
4. Vérifier texte Nova, sorties structurées, ACP, AEL et Arrêter avec le modèle
   retenu. « Bonjour » ne suffit pas à qualifier l'orchestration.
5. Confirmer tout transfert ultérieur de cet historique vers une destination
   différente ou un cloud.

Le modèle Mistral n'est qu'un choix du connecteur Ollama. Ne pas créer un
second provider `mistral-ollama`. Aucun menu de la version actuelle ne permet
encore ces opérations. Voir [les contrats](PROVIDERS_PLAN.md) et
[la validation](TESTING_GUIDE.md).
