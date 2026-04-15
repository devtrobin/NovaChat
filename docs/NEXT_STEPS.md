# Next Steps

## Now

Priorites recommandees a court terme :

1. systeme d'agents
2. raffraichissement live de `DeviceAgentPage`
3. conception de commande par le `device-agent`

## Soon

Apres la premiere iteration agents :

1. durcir les actions `device`
2. enrichir la policy de commandes
3. passer des commandes exactes aux patterns
4. etendre le systeme a d'autres agents

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
- nouvelle refacto structurelle globale

## Next Concrete Work Item

Point d'entree recommande :
- consolider le `device-agent`
- afficher ses conversations internes en temps reel

Puis :
- lui donner son propre contexte final
- puis brancher un deuxieme agent si necessaire
