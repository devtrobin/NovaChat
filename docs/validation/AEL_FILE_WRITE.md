# Création structurée de fichiers par AEL

Correctif demandé le 30 octobre 2026 après l'échec de création de `coucou.py`.
Les six tentatives shell de la conversation observée ont été refusées avant
exécution : expansions, syntaxe complexe ou interpréteur non classifié.
Le contrat proposait uniquement des commandes shell, alors qu'une création
de fichier ne nécessite pas de shell.

## Comportement livré

- Nova délègue une action `write-file` à AEL, avec cible logique, nom et contenu.
- ACP reste consultatif ; un objectif transmis à AEL peut produire le même JSON.
- Cibles : Bureau réel résolu par Electron, ou dossier de travail du processus.
- Nouveau fichier seulement, nom simple sans sous-dossier, UTF-8 jusqu'à 128 Kio.
- Aperçu intégral du contenu et du chemin ; accord ou refus ponctuel uniquement.
- Le main crée un temporaire exclusif, le synchronise, publie sans remplacement
  par lien physique et vérifie les octets relus, la taille et le SHA-256.
- Résultat et historique décrivent une action de fichier, sans faux résultat
  terminal. Aucun lancement du code créé, aucun changement de policy shell.
- Un refus ou un arrêt avant publication ne crée pas le fichier. Un arrêt
  tardif ou une vérification défaillante signale l'effet déjà produit ; une
  erreur d'historique n'efface pas la preuve de création retournée à Nova.

Les données internes configurées et les artefacts NovaChat sont protégés,
y compris une cible absente sous un alias de dossier. Une cible existante,
un lien ou un répertoire n'est pas remplacé. Une préparation du main est
consommable une seule fois ; le renderer ne reçoit aucune API d'écriture.

## Validation

Commandes, avec `npm.cmd` sous PowerShell :

```text
npm.cmd run check
npm.cmd run package
npm.cmd run test:ael-ui
```

La suite passe avec 337 tests dans 47 fichiers sous Node 22.22.2 et 24.18.0
(Windows x64). TypeScript et ESLint passent sous Node 24. Elle couvre les
contrats invalides, traversées et noms Windows, le contenu exact, les fichiers
vides, deux créations concurrentes, le changement du dossier après aperçu,
les liens, l'annulation, la vérification défaillante après publication,
le refus d'une permission permanente, la résolution immédiate pendant
l'émission, les objectifs ACP, le stockage réel de l'action et le rendu HTML
échappé du contenu. Les commandes AEL existantes gardent leurs régressions.

Le packaging est réalisé dans une copie isolée ; les `.webpack/` et `out/`
du dossier de travail restent intacts. Le harnais d'interface
`tests/electron/ael/smoke.cjs` utilise les modules main de production, le
renderer et le preload construits, un profil et un Bureau temporaires, une
fenêtre hors écran et un fournisseur synthétique sans réseau ni clé réelle.
Il vérifie l'ouverture des paramètres, la navigation de la sidebar et de la
page AEL, la saisie utilisateur, l'aperçu exact, les boutons d'accord/refus,
Arrêter, les octets créés, l'historique agent réel et l'absence de permissions
mémorisées. Il attend les sauvegardes IPC avant de fermer, puis écrit un
rapport et une capture dans son dossier temporaire.

Le packaging final Windows x64 et le parcours Electron 44.10.0 passent.
L'archive finale contient l'action AEL compilée et exclut le harnais de test.
Une tentative Forge a rencontré un `EPERM` de déplacement de `.webpack.tmp` ;
la reprise avec un `TEMP` réservé dans la copie de qualification a réussi,
sans modification des dépendances ni des hooks de construction.

Ce parcours a révélé des `EPERM` de renommage lors de sauvegardes JSON sous
Windows. Le writer réessaie maintenant le même renommage atomique au plus
cinq fois sur `EPERM`, `EACCES` et `EBUSY`, pendant moins d'une seconde
d'attente cumulée. Les tests injectent un verrou transitoire, un refus durable
et une erreur non réessayable ; la cible précédente reste préservée.

## Limites

La création exige des liens physiques sur le système de fichiers cible ; une
erreur n'entraîne aucun repli qui pourrait écraser un fichier. Il n'y a ni
remplacement, ni création de sous-dossier, ni écriture binaire. Les contrôles
d'identité Node ne constituent pas un sandbox contre un processus local
hostile ; ils réduisent les courses sans prétendre les éliminer au niveau OS.
Un temporaire dont le nettoyage échoue est signalé.

Le test d'interface synthétique valide le raccordement effectif, pas la
capacité d'un modèle OpenAI réel à choisir systématiquement le contrat. Le
30 octobre 2026, après relance et essai du correctif, l'utilisateur a confirmé
son bon fonctionnement : « ça fonctionne bien ».
ARI reste inactif et sa prochaine tâche reste 6.2.2 ; ACA n'est pas activé.
