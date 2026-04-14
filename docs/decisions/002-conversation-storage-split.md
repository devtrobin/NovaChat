# ADR 002 - Conversation Storage Is Split By Conversation And Message

## Status

Accepted

## Context

Un seul gros fichier de conversations etait peu pratique pour :
- diagnostiquer un bug message par message
- isoler les logs
- conserver les traces API
- inspecter un seul message sans parser toute la conversation

## Decision

Le stockage est eclate :
- un index global `conversations.json`
- un dossier par conversation
- un dossier par message

Dans chaque dossier message :
- `message.json`
- `log.json`
- `apis.json`

## Consequences

Positives :
- meilleure observabilite
- meilleur debug
- separation claire entre contenu, logs et traces API
- plus simple a auditer localement

Negatives :
- plus de fichiers a lire/ecrire
- logique de persistence plus riche

## Follow-Up

Conserver cette structure sauf raison produit forte.
