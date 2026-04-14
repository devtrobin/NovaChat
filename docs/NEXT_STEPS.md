# Next Steps

## Now

Priorites recommandees a court terme :

1. systeme d'agents
2. workflow de permissions autour de l'agent `device`
3. construction de la vue `Agents`

## Soon

Apres la premiere iteration agents :

1. durcir les actions `device`
2. mieux visualiser les details d'execution
3. enrichir la policy de commandes
4. formaliser les permissions sensibles

## Later

Sujets utiles mais non prioritaires :

1. provider local reel
2. support multi-provider plus large
3. resume intelligent de conversation
4. streaming provider
5. recherche plus large a l'echelle de plusieurs conversations

## Explicit Non-Goals For Now

Ne pas repartir tout de suite sur :
- grosse refacto globale
- redesign complet du shell
- migration de stockage
- systeme de permissions complet avant le systeme d'agents

## Next Concrete Work Item

Point d'entree recommande :
- definir les premiers agents
  - assistant principal
  - device agent

Puis :
- afficher ces agents dans `AgentsPage`
- brancher une premiere orchestration simple cote `main`
