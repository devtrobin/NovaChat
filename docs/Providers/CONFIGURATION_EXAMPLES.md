# Exemples de configuration — état actuel et proposition phase 7

Révision du 30 octobre 2026. Les blocs sont des fragments JSON valides pour
illustrer les champs, pas des fichiers complets à copier sur des settings.
Les schémas futurs ne sont pas pris en charge par la version actuelle.

## Fragment actuel OpenAI

~~~json
{
  "activeProvider": "openai",
  "openai": {
    "apiKeyConfigured": false,
    "baseUrl": "https://api.openai.com/v1",
    "model": "modele-compatible-selectionne",
    "provider": "openai"
  }
}
~~~

Les autres champs obligatoires restent ceux de `AppSettings` :
`agents`, `apiTrace`, `aelExecution`, `hideInternalConversations`,
`localFiles` et `previewMode`.
`apiKeyConfigured` est recalculé par le main ; modifier cet indicateur ne crée
pas de credential. Une nouvelle clé est transmise ponctuellement via le champ
de remplacement existant, puis retirée des settings persistés.
La clé stockée reste dans le coffre séparé.

## Fragment cible avec Ollama — non implémenté

~~~json
{
  "activeProvider": "ollama",
  "providers": {
    "version": 1,
    "ollama": {
      "baseUrl": "http://127.0.0.1:11434",
      "model": "mistral:7b-instruct"
    }
  }
}
~~~

`settings.openai` reste présent et inchangé, avec les autres paramètres.
Le modèle est un exemple de tag à installer et qualifier explicitement ;
sa présence dans cet exemple ne prouve pas sa compatibilité avec les agents.
Le connecteur Ollama n'est pas limité à la famille Mistral.

## Fragment cible avec Mistral — non implémenté

~~~json
{
  "activeProvider": "mistral",
  "providers": {
    "version": 1,
    "mistral": {
      "baseUrl": "https://api.mistral.ai/v1",
      "model": "modele-chat-selectionne"
    }
  }
}
~~~

Aucun champ de clé, même chiffrée, n'est ajouté dans ces fragments.
Le main exposera une projection publique indiquant la présence d'un credential
et des opérations dédiées de remplacement/effacement. Le client réseau reçoit
la valeur déchiffrée seulement dans son contexte runtime privé.

## Configurer sans activer — cible future

~~~json
{
  "activeProvider": "openai",
  "providers": {
    "version": 1,
    "mistral": {
      "baseUrl": "https://api.mistral.ai/v1",
      "model": "modele-chat-selectionne"
    },
    "ollama": {
      "baseUrl": "http://127.0.0.1:11434",
      "model": "tag-local-selectionne"
    }
  }
}
~~~

La présence d'une configuration ne déclenche ni test réseau, ni téléchargement,
ni activation. L'utilisateur choisit explicitement le moteur du prochain tour.
Le transfert d'un historique à une nouvelle destination est confirmé selon
[l'architecture cible](PROVIDERS_PLAN.md).

## Paramètres de génération

Les fragments ci-dessus ne définissent pas encore leur persistance.
Les champs publics à ajouter devront être fermés, bornés et compatibles avec
le modèle choisi. L'adaptateur effectue le mapping réseau de la
[spécification](MISTRAL_SPECIFICATION.md), notamment `max_tokens` pour Mistral
et `options.num_predict` pour Ollama ; ce ne sont pas deux noms équivalents
à envoyer tels quels à tous les transports.

Les tailles de téléchargement, fenêtres de contexte et prix viennent des
catalogues officiels et des modèles qualifiés. Aucun tableau figé ici ne les
garantit. Le budget de contexte inclut instructions, historique et sortie ;
augmenter un budget de sortie ne configure pas à lui seul la mémoire du modèle.

## Utilisation de ces exemples

Aujourd'hui, conserver les réglages OpenAI dans l'interface disponible.
Après implémentation et qualification, utiliser les nouveaux formulaires et
le test de connexion sans sauvegarde implicite. Ne pas inventer un blob
`[CHIFFRÉ]`, coller une clé dans un JSON ou remplacer un fichier de settings
complet avec ces fragments. Voir [la stratégie de migration](MIGRATION_GUIDE.md).
