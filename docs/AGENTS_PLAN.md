# Agents Plan

## Goal

Le but est d'introduire un vrai systeme d'agents specialises, sans casser l'architecture actuelle.

L'idee generale :
- un agent principal parle a l'utilisateur
- un agent specialise `device` gere les actions machine
- plus tard, un workflow de permissions se branchera dessus

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
- plus tard demander une autorisation explicite si necessaire

Ne doit pas :
- prendre le controle de la conversation utilisateur
- decider seul de politiques sensibles hors workflow etabli

## Current Reality

Aujourd'hui il n'y a pas encore de vrai systeme multi-agents.

Ce qui existe deja et servira de base :
- `assistant -> device`
- `device -> assistant`
- `/cmd`
- events de chat structures
- types partages `from` / `to`
- UI `AgentsPage` deja presente comme placeholder

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
- potentiellement des permissions et regles propres a chaque agent

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

## Do Later, Not Now

Ne pas melanger tout de suite avec :
- resume LLM de conversation
- multi-provider complet
- policy tres complexe
- UX avancée des permissions

L'objectif du prochain chantier est :
**poser proprement le premier workflow agent sans reouvrir une refacto globale.**
