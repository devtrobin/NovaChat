# Qualification du runtime ARI — phase 6.2.1

Ce harnais est une application de test distincte. Il n’importe jamais
`src/index.ts`, ne lance aucune migration et ne lit pas les données NovaChat.
Il ne prouve pas le confinement réseau requis en 6.2.5 et n’active pas ARI.

Après installation depuis le lockfile et packaging de production :

```powershell
npm.cmd run ci
npm.cmd run test:ari-runtime -- --production-executable out/nova-chat-win32-x64/nova-chat.exe
```

Pour qualifier la compatibilité avec le coffre de l’ancien runtime, fournir
explicitement un exécutable Electron 39.8.10 conservé dans un environnement de
test séparé :

```powershell
npm.cmd run test:ari-runtime -- --baseline-electron C:/chemin/de/test/electron-39/electron.exe --production-executable out/nova-chat-win32-x64/nova-chat.exe
```

Le chemin doit désigner le runtime Electron de test, pas le binaire NovaChat
installé. Ce runtime ne lance que `canary.cjs`. Sans cette option, le rapport
indique une écriture par le runtime courant : c’est un round-trip, pas une
preuve de compatibilité inter-version.

Le runner crée un dossier `novachat-ari-qualification-*` neuf sous le dossier
temporaire. `userData`, session, ciphertext synthétique, rapports, bundle et
package de test restent dans ce dossier. Aucun fichier préexistant n’est
réinitialisé et le runner n’effectue pas de nettoyage récursif. Le chemin des
artefacts est imprimé pour inspection ; il ne contient aucune clé réelle.
Electron s’exécute sans fenêtre visible et avec un délai de 60 secondes.

Le bundle Webpack ne contient que l’entrée du harnais et sa logique de test.
Les bibliothèques ESM/CJS et ressources PDF sont conservées dans `app.asar`,
avec les dépendances natives N-API décompactées. Le même copieur de dépendances
runtime est utilisé après la copie Webpack de production. Les six fuses
déclarés dans la configuration de production sont vérifiés dans les binaires
de test et, si fourni, de production.

Le smoke test vérifie parsing statique sans scripts, Readability, requête Undici
mockée sans connexion, robots, suffixes privés, encodage, schémas fermés et PDF
texte synthétique avec worker local et encodage PNG par le module N-API canvas.
Le worker PDF.js utilise le mode Node, sans qualification d’une isolation de
processus. Le test s’exécute en développement puis dans
l’application de test packagée. Le binaire de production fourni est inspecté
(fuses, archive, assets, absence du harnais), sans démarrer son flux applicatif.

La qualification est actuellement Windows x64. macOS/Linux et installateurs
restent dans les validations natives/de distribution prévues par la roadmap.

Les résultats du 30 octobre 2026 sont consignés dans
[le rapport 6.2.1](../../../docs/validation/ARI_RUNTIME_6_2_1.md).
