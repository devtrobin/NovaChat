# Architecture cible des providers — phase 7

Statut : conception préparée le 30 octobre 2026, non implémentée.
Lire [l'état disponible](README.md) avant d'utiliser les exemples.

## Point de départ

Le code actuel appelle OpenAI depuis `src/main/ai/openai.service.ts` pour
trois usages : réponse Nova, réponse textuelle ACP et génération AEL.
Les settings publics et runtime sont séparés dans `src/shared/settings.types.ts`.
La clé est résolue dans le main depuis
`src/main/credentials/electron-credential.service.ts`.

La cible ajoute des adaptateurs dans `src/main/ai/providers/`, sans créer un
autre orchestrateur ni déplacer la logique métier dans les composants React.
Un registre fixe de connecteurs suffit ; une classe globale avec un provider
actif mutable pendant un tour n'est pas nécessaire.

## Identité du connecteur et choix du modèle

| Identifiant cible | Transport | Choix du modèle |
| --- | --- | --- |
| `openai` | Responses API existante | modèle compatible configuré |
| `mistral` | Chat Completions Mistral | modèle autorisé pour le compte et capable de chat |
| `ollama` | API native Ollama, boucle locale pour la première livraison | modèle installé et qualifié pour l'usage demandé |

Ne pas fusionner `ollama` avec une famille de modèles. Les autres identifiants
du catalogue restent planifiés ; les connecteurs absents demeurent désactivés
et refusés par la validation main.

## Frontière entre transport et messages Nova

`ChatMessage` reste le type de `src/shared/chat.types.ts`, avec `from`, `to`,
`agentId`, `status`, les traces et l'aperçu de fichier. Le `ProviderResponse`
Nova actuel reste une union de réponse utilisateur et de délégations, dont
`write-file`. Aucun de ces types n'est remplacé par un message `role/content`.

L'adaptateur traduit seulement l'enveloppe réseau. Le contenu des messages
Nova est sérialisé par les builders de prompts existants ; leur représentation
interne n'est pas réduite à une alternance de rôles conversationnels.

Contrat de travail proposé, à finaliser dans les types main :

~~~typescript
type TransportRequest = {
  instructions: string;
  input: unknown;
  output: "text" | "json";
  signal: AbortSignal;
};

type TransportResult = {
  text: string;
  apiRecords: import("../../../shared/chat.types").ApiRequestRecord[];
  finishReason: "completed" | "length" | "refusal" | "other";
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};
~~~

Le chemin d'import ci-dessus correspond à un futur fichier situé sous
`src/main/ai/providers/`. Ces types ne constituent pas une API preload.
Le client est construit dans le main avec la configuration et les credentials
du tour ; la requête ne laisse pas le modèle choisir un endpoint ou une clé.

| Usage | Sortie attendue | Traitement main |
| --- | --- | --- |
| Nova | JSON Nova | parser et validation des destinataires/actions existants |
| ACP | texte à sections | parser ACP existant |
| AEL terminal | commande courte en texte | profil et permission shell existants |
| AEL création | JSON de création | validation `write-file`, permission ponctuelle et relecture |
| ARI/ACA après leur livraison | contrats propres à chaque appel | préserver leurs validateurs, droits, budgets et isolation |

Le mode de sortie est décidé par l'appel métier, pas globalement par le
provider. La génération AEL peut retourner du texte ou un JSON de fichier :
ne pas lui imposer un schéma JSON excluant les commandes. Ne pas forcer ACP
à produire du JSON. Un JSON syntaxiquement valide n'autorise aucune action
sans validation main. Un résultat tronqué ou un appel d'outil inattendu est
refusé comme résultat opérationnel complet.

## Configuration et secrets

La cible conserve `settings.activeProvider` et `settings.openai`.
Les paramètres supplémentaires sont proposés sous :

~~~typescript
type AdditionalProvidersSettingsV1 = {
  version: 1;
  mistral?: { baseUrl: string; model: string };
  ollama?: { baseUrl: string; model: string };
};
~~~

Ce type formerait le nouveau champ optionnel `settings.providers`.
La validation actuelle ne le prend pas en charge. Les paramètres de génération
seront ajoutés comme champs fermés et bornés lors de la qualification ; aucun
sac `providerSpecific: Record<string, unknown>` transmis directement à l'API.

Une projection publique par provider expose un indicateur de clé configurée.
Une commande de remplacement ponctuel et une commande d'effacement passent
au main. La clé déchiffrée est réservée au client réseau runtime ; ni valeur
en clair, ni blob chiffré ne sont renvoyés dans les settings publics.
Le coffre OpenAI reste à son emplacement existant. Les nouveaux secrets
reçoivent des espaces distincts via les primitives de coffre du main.

Réutiliser les primitives de Credentials livrées en 6.2 lorsque pertinent,
sans confondre clés de modèles et sessions de lecture de sites ARI.
Aucun IPC général de lecture de secrets n'est ajouté.
Voir [la migration](MIGRATION_GUIDE.md) et
[les fragments de configuration](CONFIGURATION_EXAMPLES.md).

## Tour, annulation et changement de provider

Le main capture au début du tour le provider, le modèle, l'endpoint, les
paramètres et la référence de credential. Les appels Nova/agents du même tour
gardent cette sélection ; un changement UI s'applique au tour suivant.
Un credential révoqué ne doit pas être rechargé implicitement pour continuer.

Avant d'envoyer l'historique à une nouvelle destination, l'UI indique cette
destination et demande confirmation si l'historique change de destinataire
ou passe d'un traitement local à un cloud. Aucun repli automatique vers un
autre provider, modèle ou endpoint ne transmet les messages à l'insu de
l'utilisateur. Un échec d'un provider produit un résultat exploitable pour Nova.

Chaque appel reçoit le signal du registre de tour. Arrêter annule la requête,
la lecture de son corps et toute attente de retry. Délais et tailles de réponse
sont bornés, y compris après réception des en-têtes. Les timers sont nettoyés.
Les retries éventuels restent explicites et bornés par le budget du tour ;
ils ne relancent jamais une action AEL déjà effectuée.

## Réseau, traces et intégration UI

- Mistral utilise HTTPS et une origine explicitement configurée. Une modification
  d'origine est confirmée avant de lui envoyer une clé.
- Ollama est limité à la boucle locale dans le premier périmètre ; serveur
  distant et authentification distante attendent une spécification séparée.
- Les redirections sont refusées pour ces appels. Aucun header, URL ou secret
  privilégié ne vient du texte généré par le modèle.
- Un serveur sur la boucle locale ne prouve pas à lui seul une inférence locale.
  Le mode confidentiel demande un modèle local et un serveur sans fonctions cloud.
- Les traces passent par la politique existante : activation, rétention,
  plafonds et redaction. Le masquage doit couvrir les nouvelles clés sans
  supposer un préfixe particulier ; les erreurs HTTP peuvent contenir des secrets.

Les formulaires existants sous `src/renderer/components/SettingsPanel/`
sont étendus avec leur contrôleur. Le preload garde des méthodes étroites et
des projections expurgées. Tester une connexion depuis un brouillon ne
sauvegarde pas le brouillon et ne modifie pas le provider actif.
Le changement de moteur n'affaiblit aucune permission AEL ni aucun droit ARI/ACA.

## Conditions avant activation

Schémas publics/runtime validés, migration additive et idempotente qualifiée,
régression OpenAI, sorties Nova/ACP/AEL valides, arrêt effectif, secrets absents
du renderer et des traces, origine stable pendant le tour et parcours isolés
validés. Après ARI/ACA, leurs appels doivent aussi figurer dans cette matrice.
Le calendrier global reste [NEXT_STEPS.md](../NEXT_STEPS.md).
