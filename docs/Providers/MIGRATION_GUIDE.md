# Migration Providers — stratégie future à qualifier

Statut : préparation de phase 7 au 30 octobre 2026. Aucun outil de migration
multi-provider n'est livré. Ne pas transformer manuellement les settings
actuels pour appliquer les fragments de conception de ce dossier.

## État actuel vérifié

- `settings.activeProvider` vaut `openai`.
- `settings.openai` contient le modèle, l'URL et des champs publics de gestion
  de clé ; il ne contient pas la clé déjà stockée.
- Le coffre est `<userData>/secrets/openai-api-key.json`, privé au main.
- Le fichier de référence est `<userData>/settings.json`. Ne pas ajouter un
  sous-dossier littéral `userData` à `app.getPath("userData")`.
- Des chemins personnalisés sont possibles via `localFiles`.
- Conversations et agents utilisent leurs stockages séparés, pas des tableaux
  à déplacer depuis les settings.

Ces faits sont implémentés dans `src/main/settings/settings.service.ts`,
`src/main/credentials/electron-credential.service.ts` et
`src/main/chat/`.

## Cible additive proposée

Conserver `settings.activeProvider`, `settings.openai`, le coffre OpenAI et
tous les autres champs existants. Ajouter uniquement le champ optionnel
`settings.providers` version 1 défini dans
[PROVIDERS_PLAN.md](PROVIDERS_PLAN.md), pour `mistral` et `ollama`.
Un accesseur main présente un format uniforme au transport sans déplacer
physiquement la configuration OpenAI.

Les anciens identifiants suggérés dans les premiers brouillons n'ont pas été
activés par NovaChat ; aucune migration automatique de ces noms n'est nécessaire.
Une valeur inconnue ou une version future provoque une erreur explicite,
sans repli vers un fournisseur cloud et sans réécriture de la configuration.

## Procédure à implémenter dans le main

1. Lire les fichiers avec les primitives de stockage récupérable existantes.
   En cas de corruption ou reprise partielle, conserver le blocage et demander
   l'acquittement du stockage avant toute écriture.
2. Vérifier le schéma courant et l'état de migration. Une absence d'extension
   providers est une ancienne configuration valide, pas une erreur.
3. Préparer l'extension en mémoire en préservant valeurs inconnues à l'extension
   mais connues du schéma existant, chemins, flags agents, paramètres AEL et traces.
   Ne pas remplacer URL ou modèle OpenAI personnalisés par des défauts.
4. Vérifier le schéma cible et les invariants avant publication. Ne pas activer
   un connecteur parce que sa configuration est présente.
5. Sauvegarder selon les primitives atomiques et backups existants. Répertorier
   les fichiers de référence/personnalisés touchés et les étapes achevées :
   une atomicité par fichier ne prouve pas une transaction entre deux settings.
6. Relire les valeurs enregistrées, vérifier les références nécessaires, puis
   enregistrer la réussite versionnée. En cas d'échec, signaler la reprise
   nécessaire ; ne pas effacer une copie valide.
7. Rejouer la procédure : elle doit conserver exactement la configuration
   et les secrets, y compris après une interruption entre deux étapes.

Le coffre OpenAI n'est ni déchiffré pour être copié dans des settings, ni déplacé,
ni réinitialisé par cette extension. Les nouveaux secrets sont chiffrés et
vérifiés dans le main via une commande dédiée. Une ancienne copie en clair
éventuellement découverte relève du mécanisme de migration de secrets existant,
pas d'un script copiant `openai.apiKey` dans une autre section JSON.

## Retour arrière et données personnelles

La qualification doit prouver le retour à l'état antérieur sur des copies
synthétiques, sans supprimer une conversation ni un credential. Une ancienne
version de NovaChat peut ignorer les nouveaux champs puis les perdre à la
sauvegarde : le retour de version n'est pas promis avant ce test.
Aucun script ad hoc ne doit remplacer les settings en place pendant que
l'application les écrit.

Ne jamais afficher une valeur de clé ou le contenu des backups dans un terminal.
Le journal de migration décrit des versions, opérations et références, jamais
des secrets. Le succès d'une sauvegarde ne suffit pas : le redémarrage et
l'accès OpenAI avec un canari de test font partie de la qualification.

## Validation attendue

| Cas synthétique | Résultat attendu |
| --- | --- |
| settings actuels sans extension | OpenAI et tous les chemins conservés |
| configuration OpenAI personnalisée | aucune substitution par des défauts |
| seconde exécution | aucun changement fonctionnel |
| settings corrompus ou version inconnue | arrêt explicite avant écriture |
| arrêt entre référence et copie personnalisée | reprise déterministe, copie valide conservée |
| coffre indisponible | aucun succès ni secret en clair |
| ajout d'un provider non actif | aucune requête envoyée à ce provider |
| relance et retour arrière | données et credentials récupérables selon le scénario qualifié |

Le script historique de transformation directe a été retiré : son chemin,
son hypothèse de clé dans les settings et sa suppression de `settings.openai`
ne correspondaient pas au projet actuel.
