# Prochaines étapes

## Principe

Le système d’agents existe déjà. La priorité n’est plus de le créer, mais de
fiabiliser les capacités qu’il possède avant de l’élargir.

## Phase 1 — Filet de sécurité — terminée

- Vitest ajouté avec `npm test` et `npm run test:watch`.
- Policy Device testée avec cas sûrs et cas adversariaux.
- Parsers OpenAI et Planner testés.
- Sérialisation, round-trip du stockage et reducers d’événements testés.
- 112 tests réussissent, dont 74 cas de policy Device.

La priorité active reste la phase 2. Les anciens `it.fails` sont désormais des
tests de régression normaux.

## Phase 2 — Sécuriser Device

1. ~~Refuser par défaut les commandes non analysables.~~ Terminé :
   elles sont classées `ask-always`.
2. Traiter pipes, substitutions, sous-commandes, redirections et options
   mutantes. La matrice actuelle est couverte ; maintenir cette règle à chaque
   extension.
3. Séparer explicitement :
   - lecture locale ;
   - écriture limitée au workspace ;
   - accès réseau ;
   - installation/système ;
   - suppression/destruction.
4. Corriger la sémantique `Non` vs refus permanent.
5. Valider les payloads IPC et les chemins.
6. Ajouter limites de sortie, timeout configurable, kill d’arbre et stratégie
   d’input interactive.

Critère de sortie : aucun contournement connu de la matrice de tests et une UX
de permission non ambiguë.

## Phase 3 — Fiabiliser les données

1. Écritures JSON atomiques.
2. Backups et journalisation des erreurs de lecture.
3. Détection d’état partiellement récupéré avant auto-sauvegarde.
4. Queue ou verrou par espace agent.
5. Migration vers `app.getPath("userData")`.
6. Migration idempotente de `diagnostic-agent` vers `agent-planner`.
7. Politique de rétention/redaction de `apis.json`.
8. Stockage sécurisé de la clé API.

Critère de sortie : arrêt brutal ou JSON corrompu sans perte silencieuse.

## Phase 4 — Clarifier les surfaces produit

1. Désactiver la sélection des providers non implémentés, ou implémenter une
   abstraction provider réelle.
2. Décider du sort des conversations directes agent :
   - remettre une UI ;
   - ou retirer IPC et code orphelin.
3. Corriger `hideInternalConversations` pour conserver les résultats `/cmd`.
4. Réduire le délai artificiel du boot.
5. Mettre à jour la capture d’écran.
6. Étendre i18n au reste de l’interface si le bilingue est un objectif.

## Phase 5 — Maintenabilité ciblée

Découper sans refonte globale :

1. `agent-orchestrator.service.ts` par agent et par phase ;
2. `agent-storage.service.ts` entre chemins, migrations et écritures ;
3. `device.policy.ts` entre parsing et règles ;
4. `DeviceAgentPage.tsx` en vues d’onglets ;
5. déplacer les types de chat transversaux vers `src/shared`.

Corriger aussi la mutation du tableau de règles Webpack.

## Phase 6 — Nouvelles capacités

Seulement après les phases précédentes :

1. streaming provider ;
2. provider local Ollama ou LM Studio ;
3. autres providers ;
4. recherche globale ;
5. nouveaux agents spécialisés ;
6. résumé/compaction des longues conversations.

## Non-objectifs immédiats

- redesign complet du workspace ;
- remplacement global de React/Electron ;
- migration vers une base de données sans besoin mesuré ;
- autonomie illimitée des agents ;
- extension de l’allowlist Device avant tests ;
- nouveau méga-refactor transversal.
