# Agents Plan

## Goal

Le but est d'introduire un vrai systeme d'agents specialises, sans casser l'architecture actuelle.

L'idee generale :
- un assistant principal parle a l'utilisateur
- un agent specialise `device-agent` gere les actions machine
- les permissions utilisateur passent par un message systeme structure

## Why Agents

Benefices attendus :
- separation nette des responsabilites
- prompts plus courts et plus robustes
- meilleur controle du workflow
- meilleure securite autour des commandes `device`
- meilleure lisibilite produit

## Planned Agents

### 1. Assistant principal

Mission :
- comprendre la demande utilisateur
- garder le fil de la conversation
- decider quoi faire ensuite
- deleguer quand une action specialisee est necessaire
- produire la reponse finale visible par l'utilisateur

Ne doit pas :
- executer directement la logique shell detaillee
- contourner le workflow de permissions

### 2. Device agent

Mission :
- preparer ou executer les commandes locales
- interpreter les retours machine
- demander une autorisation explicite si necessaire

Ne doit pas :
- prendre le controle de la conversation utilisateur
- decider seul de politiques sensibles hors workflow etabli

## Current Reality

Aujourd'hui, une premiere iteration fonctionnelle existe deja.

Ce qui existe :
- `assistant -> device-agent`
- `device-agent -> assistant`
- `/cmd`
- messages systeme structures pour les permissions
- page `Agents`
- `DeviceAgentPage` avec onglets `General`, `Conversation`, `Contexte`
- stockage local dedie :
  - `contexte.json`
  - `permissions.json`
  - `historique.json`
  - `conversations/`

## Likely Target Architecture

```text
user
  -> main assistant
  -> optional handoff
  -> device agent
  -> result back to main assistant
  -> final answer to user
```

## UI Direction

La navigation `Agents` existe deja dans `AppSidebar`.

Ce qui est prevu plus tard :
- une liste d'agents
- une fiche de configuration par agent
- une vue du role / mission / tools / statut
- des permissions et regles plus fines par agent

## Data Needed Per Agent

Format cible probable :
- `id`
- `name`
- `description`
- `mission`
- `instructions`
- `capabilities`
- `tools`
- `handoffTargets`
- `requiresApprovalFor`

## Constraints

Le systeme d'agents devra respecter les decisions deja prises :
- orchestration dans le `main`
- renderer simple et declaratif
- messages Nova structures
- workflow `device` tracable dans les logs

## Current Device Workflow

Workflow actuel :
1. l'utilisateur parle a l'assistant principal
2. l'assistant peut repondre avec `to:"device"`
3. Nova cree une nouvelle conversation `assistant <-> device-agent`
4. le `device-agent` verifie `permissions.json`
5. si la commande est inconnue, Nova injecte un message systeme dans la conversation principale
6. l'utilisateur choisit `Oui`, `Oui permanent` ou `Non`
7. le resultat est renvoye a l'assistant principal
8. l'execution est enregistree dans `historique.json`

## Do Later, Not Now

Ne pas melanger tout de suite avec :
- resume LLM de conversation
- multi-provider complet
- permissions par pattern
- agent device autonome avec son propre appel LLM

Les prochaines etapes naturelles sont :
- donner au `device-agent` sa propre generation de commande
- rafraichir `DeviceAgentPage` en live
- etendre ensuite le systeme a d'autres agents
