# Nova Chat - Regles de codage et bonnes pratiques

Ce document sert de reference rapide pour garder un code lisible, maintenable et coherent.

## 1) Principes generaux

- Faire simple: preferer des fonctions courtes avec une responsabilite claire.
- Ecrire pour le prochain lecteur: noms explicites, logique previsible.
- Eviter les effets de bord caches: rendre les flux de donnees evidents.
- Corriger le probleme a la source, pas uniquement le symptome.
- Limiter la taille:
  - pas de fichier de plus de 100 lignes,
  - pas de fonction de plus de 100 lignes,
  - exceptions autorisees: fichiers `*.fonctions.ts`, `*.types.ts` et `*.css`.

## 2) TypeScript

- Toujours typer les entrees/sorties publiques (props, types partages, API preload).
- Eviter `any` (le projet utilise deja `noImplicitAny`).
- Preferer des unions de types explicites pour les etats (ex: `pending | loading | success | error`).
- Centraliser les types dans des fichiers `*.types.ts` quand ils sont partages.
- Compartimenter le code metier en petites fonctions testables (une tache claire par fonction).

## 3) React (Renderer)

- Garder les composants focalises: UI, et logique metier extraite dans des helpers.
- Utiliser `useMemo`/`useCallback` seulement quand cela apporte une valeur claire (stabilite reference/perf).
- Toujours gerer les etats asynchrones: annulation, timeout, erreurs affichees.
- Eviter de relancer des effets critiques sans intention (attention aux dependances des `useEffect`).

## 4) Electron (Main / Preload / Renderer)

- Ne jamais exposer directement des API sensibles dans le renderer.
- Passer par `preload` pour exposer une API minimale et explicite (`window.nova.*`).
- Valider et gerer les erreurs cote main, puis renvoyer des messages exploitables cote UI.

## 5) Gestion d'erreurs et UX

- Chaque tache asynchrone importante doit avoir:
  - un timeout raisonnable,
  - un message metier clair,
  - un detail technique exploitable (logs/debug).
- En cas d'echec de demarrage: afficher l'erreur + proposer une action (ex: `Reessayer`).

## 6) CSS / UI

- Garder des classes simples et stables, proches du composant.
- Eviter les styles "magiques" non documentes; preferer des valeurs lisibles et consistantes.
- Tester les ecrans critiques sur differents formats de fenetre.

## 7) Qualite et verification

- Linter avant validation:
  - `npm run lint`
- En review, verifier en priorite:
  - regressions comportementales,
  - cas d'erreur,
  - impact sur la stabilite du demarrage.

## 8) Convention de nommage

- Fichiers React: `PascalCase.tsx` (ex: `LoadingScreen.tsx`).
- Types: `*.types.ts`.
- Helpers/fonctions utilitaires: nom explicite en anglais ou francais, mais rester coherent dans un meme module.
- Eviter de melanger plusieurs langues dans les memes identifiants.
- Garder des noms de fonctions simples, courts et explicites.

## 9) Checklist rapide avant merge

- Le code est-il lisible sans explication orale ?
- Les erreurs importantes sont-elles gerees et affichables ?
- Les types sont-ils explicites ?
- Le lint passe-t-il sans nouvelle alerte liee au changement ?
- L'UX degradee (timeout/echec) est-elle acceptable ?
