# Spécification HTTP cible — Mistral et Ollama

Préparation de phase 7, révisée le 30 octobre 2026. Aucun des connecteurs
décrits ici n'est actuellement activé. Les contrats métier restent ceux de
[l'architecture cible](PROVIDERS_PLAN.md).

## Périmètre de qualification

La première livraison vise Mistral Chat Completions et Ollama natif en boucle
locale, sans streaming. Elle préserve OpenAI Responses. Aucun téléchargement
de modèle, lancement de serveur, shell de recherche ni appel d'outil distant
n'est implicitement autorisé par la sélection d'un provider.

## Mistral — identifiant cible mistral

La Base URL inclut une fois le préfixe API : `https://api.mistral.ai/v1`.
Ajouter `/models` pour lister les modèles et `/chat/completions` pour générer.
Ne pas ajouter une seconde fois `/v1`. Supprimer les slashs finaux avant
concaténation ; refuser userinfo, fragment et paramètres de requête dans la
Base URL. Un endpoint personnalisé nécessite une origine HTTPS approuvée.

L'authentification est un header Bearer construit dans le main avec la clé
déchiffrée. La clé est opaque : aucun préfixe `mst_` n'est imposé.

Exemple de corps réseau, distinct des messages Nova persistés :

~~~json
{
  "model": "modele-chat-selectionne",
  "messages": [
    { "role": "system", "content": "Instructions métier de l'appel." },
    { "role": "user", "content": "Entrée métier sérialisée." }
  ],
  "stream": false,
  "max_tokens": 1024,
  "response_format": { "type": "json_object" }
}
~~~

L'adaptateur traduit le rôle d'instruction du builder actuel vers le rôle
accepté par ce transport, en conservant la priorité des consignes.
`json_object` est destiné aux appels qui exigent du JSON, avec une instruction
JSON explicite ; les appels textuels omettent ce format. Le mode
`json_schema` demande une qualification du modèle et du schéma choisi.

Extraire le texte de `choices[].message.content`, contrôler `finish_reason`
et normaliser l'usage. Un contenu sous forme de blocs doit être validé ;
ne pas convertir aveuglément tout objet en chaîne. Refus, sortie tronquée,
tool calls ou contenu non pris en charge ne deviennent pas une action Nova.

Les modèles proviennent de la liste accessible au compte et sont filtrés par
capacité de chat. Un modèle d'embeddings n'est pas proposé pour Nova.
Ne pas figer une liste de noms, prix ou fenêtres de contexte sans contrôle.
L'endpoint Responses Mistral reste hors du premier adaptateur ; sa présence
dans une documentation ne démontre pas sa compatibilité avec tous nos appels.

Sources officielles :
[Chat](https://docs.mistral.ai/api/endpoint/chat),
[modèles](https://docs.mistral.ai/api/endpoint/models),
[sorties JSON](https://docs.mistral.ai/studio/conversations/structured-output/json_mode).

## Ollama — identifiant cible ollama

Le modèle est un champ de configuration, par exemple un tag Mistral installé.
La Base URL par défaut proposée est `http://127.0.0.1:11434`, sans `/api`.
Ajouter `/api/tags` pour la liste, `/api/show` pour les détails et `/api/chat`
pour générer. Seules les adresses de boucle locale sont admises dans cette
première livraison ; aucun port n'est ouvert par NovaChat.

Exemple de corps réseau :

~~~json
{
  "model": "tag-local-selectionne",
  "messages": [
    { "role": "system", "content": "Instructions métier de l'appel." },
    { "role": "user", "content": "Entrée métier sérialisée." }
  ],
  "stream": false,
  "options": {
    "num_predict": 1024
  }
}
~~~

Le champ `format: "json"` ou un schéma est ajouté seulement pour un appel JSON
compatible. Le nombre de tokens de sortie utilise `options.num_predict`,
pas `options.max_tokens`. La fenêtre de contexte relève de `num_ctx` :
elle doit être qualifiée indépendamment du budget de sortie.

Extraire `message.content` et contrôler la fin de génération. Normaliser
`prompt_eval_count` et `eval_count` lorsqu'ils existent.
Les durées réseau Ollama sont exprimées en nanosecondes : diviser par
1 000 000 pour exposer des millisecondes, ou mesurer le temps côté client.
Ne pas mapper directement `total_duration` vers un champ en millisecondes.

Une connexion refusée indique un problème réseau/service, pas une réponse
HTTP 404. Un modèle absent est un cas distinct. La version du serveur se
récupère par `/api/version`, pas par un hypothétique champ de `/api/tags`.
La liste locale ne suffit pas à qualifier le format JSON ou le rôle système.

Sources officielles :
[Chat](https://docs.ollama.com/api/chat),
[Modelfile et paramètres](https://docs.ollama.com/modelfile),
[API](https://docs.ollama.com/api),
[tags Mistral](https://ollama.com/library/mistral/tags).

## Paramètres et compatibilité

| Intention | Mistral | Ollama |
| --- | --- | --- |
| Budget de sortie | `max_tokens` | `options.num_predict` |
| Température | `temperature` | `options.temperature` |
| Top P | `top_p` | `options.top_p` |
| Mode JSON | `response_format.type = json_object` | `format = json` |
| Texte ACP/AEL terminal | mode texte | absence de `format` JSON |
| Streaming initial | `stream: false` | `stream: false` |

Les plages, paramètres supportés et limites de contexte sont vérifiés pour
chaque modèle. Aucune valeur générique ne doit casser OpenAI ou être transmise
à un moteur qui la refuse. Des paramètres identiquement nommés n'impliquent
pas un comportement identique entre modèles.

## Annulation et erreurs

Les appels prennent un `AbortSignal` du tour et un délai main explicite.
Le `fetch` natif ne propose pas d'option `timeout` : combiner le signal du tour
avec un signal de délai, et borner aussi la lecture du corps de réponse.
Nettoyer les timers et distinguer annulation utilisateur, expiration, erreur
réseau, authentification, quota, modèle absent et réponse mal formée.

Le test de connexion liste les modèles sans sauvegarder la configuration.
Il ne garantit pas qu'un modèle respecte les contrats Nova : une génération
synthétique de qualification vérifie séparément JSON Nova, ACP, AEL et arrêt.
Ne pas qualifier toutes les erreurs HTTP comme des erreurs d'authentification.

Aucun retry après annulation, aucune réinitialisation de budget et aucun
repli automatique vers un autre modèle ou service. Une sortie partielle n'est
pas présentée comme un succès complet, même si le HTTP est 200.

## Réseau et confidentialité

HTTPS obligatoire pour Mistral, redirections refusées, credentials liés à
l'origine validée. Pour Ollama, un nom comme `localhost` doit être résolu et
contrôlé comme boucle locale ; l'adresse littérale par défaut évite cette
ambiguïté. Les URL fournies par le modèle ne configurent jamais le transport.

L'API Ollama sur la boucle locale peut aussi desservir des modèles cloud.
La confidentialité exige donc un modèle réellement local et un serveur
configuré en conséquence, pas seulement une URL locale.
Voir [authentification](https://docs.ollama.com/api/authentication) et
[FAQ officielle](https://docs.ollama.com/faq).
Les prompts, réponses et logs peuvent être sensibles même sans clé API.
