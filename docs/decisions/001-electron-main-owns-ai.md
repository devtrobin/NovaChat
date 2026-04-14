# ADR 001 - Electron Main Owns AI Orchestration

## Status

Accepted

## Context

Le projet doit :
- appeler un provider IA
- gerer des credentials
- executer des commandes locales via `device`
- boucler entre assistant et machine

Si cette logique reste dans le renderer, on expose trop de logique sensible et on rend l'application plus fragile.

## Decision

L'orchestration IA reste dans le process `main` Electron.

Le renderer :
- collecte l'input utilisateur
- affiche l'etat des conversations
- applique les events reçus

Le `main` :
- charge les settings
- appelle le provider
- orchestre la boucle `assistant -> device -> assistant`
- renvoie des events au renderer

## Consequences

Positives :
- clés API non exposees au renderer
- logique centrale plus testable
- meilleure separation UI / metier
- meilleure base pour le futur systeme d'agents

Negatives :
- plus de logique IPC
- le `main` devient un centre d'orchestration plus complexe

## Follow-Up

Le futur systeme d'agents doit aussi rester centre dans le `main`.
