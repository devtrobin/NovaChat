# ADR 003 - Global UI Uses WorkspaceLayout And AppSidebar

## Status

Accepted

## Context

L'application n'est plus un simple chat unique :
- il y a une navigation gauche
- il y a plusieurs sections
  - conversations
  - agents
  - parametres

L'ancien nommage centre sur `ChatPage` et `ConversationSidebar` ne correspondait plus a la realite du produit.

## Decision

La structure globale de l'application est :
- `WorkspaceLayout`
- `AppSidebar`
- `ChatPage`
- `AgentsPage`
- `SettingsPage`

Le concept `SettingsModal` est abandonne au profit de :
- `SettingsPanel`
- `SettingsPage`

## Consequences

Positives :
- architecture UI plus lisible
- meilleure separation entre shell et contenu
- plus facile d'ajouter la vue agents
- vocabulaire plus coherent avec le produit

Negatives :
- migration initiale un peu lourde

## Follow-Up

Toute nouvelle section principale du produit doit s'integrer dans ce shell plutot que recréer une structure parallele.
