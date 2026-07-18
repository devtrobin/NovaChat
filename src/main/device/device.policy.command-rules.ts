import {
  GIT_DESTRUCTIVE_SUBCOMMANDS,
  GIT_NETWORK_SUBCOMMANDS,
  GIT_READ_ONLY_SUBCOMMANDS,
  GIT_WORKSPACE_WRITE_SUBCOMMANDS,
} from "./device.policy.constants";
import {
  getUnsafeWriteRiskCategory,
  looksLikePath,
} from "./device.policy.paths";
import {
  extractWriteTargetPaths,
  findGitSubcommand,
  findOptionValue,
} from "./device.policy.tokens";
import {
  allow,
  ask,
  askAlways,
  DeviceCommandPermissionPolicy,
} from "./device.policy.types";

const FIND_EXECUTION_OPTIONS = new Set([
  "-delete",
  "-exec",
  "-execdir",
  "-ok",
  "-okdir",
]);

const FIND_WRITE_OPTIONS = new Set([
  "-fls",
  "-fprint",
  "-fprint0",
  "-fprintf",
]);

export function evaluateGitCommand(
  tokens: string[],
  allowedWriteRoots: string[],
): DeviceCommandPermissionPolicy {
  if (
    tokens.some((token) => (
      token === "--config-env"
      || token === "--exec-path"
      || token === "--ext-diff"
      || token === "--open-files-in-pager"
      || token === "-c"
      || token.startsWith("--config-env=")
      || token.startsWith("--exec-path=")
      || token.startsWith("--open-files-in-pager=")
      || (token.startsWith("-c") && token.length > 2)
    ))
  ) {
    return askAlways("unclassified", "Cette option Git peut charger une configuration ou une commande externe.");
  }
  const subcommand = findGitSubcommand(tokens);
  if (!subcommand) return allow("read-local", "Invocation Git sans sous-commande mutante.");
  if (GIT_DESTRUCTIVE_SUBCOMMANDS.has(subcommand.name)) {
    return askAlways("destructive", "Cette sous-commande Git peut supprimer ou restaurer des donnees.");
  }
  const outputTarget = findOptionValue(tokens, "--output");
  const outputRisk = outputTarget
    ? getUnsafeWriteRiskCategory([outputTarget], allowedWriteRoots)
    : null;
  if (outputRisk) {
    return askAlways(outputRisk, "La sortie Git cible un chemin hors des zones autorisees.");
  }
  if (GIT_READ_ONLY_SUBCOMMANDS.has(subcommand.name)) {
    if (outputTarget) {
      return ask("workspace-write", "Cette sous-commande Git ecrit sa sortie dans un fichier.");
    }
    return allow("read-local", "Sous-commande Git de lecture autorisee par defaut.");
  }

  const args = tokens.slice(subcommand.index + 1);
  if (
    subcommand.name === "remote"
    && args.every((token) => token === "-v" || token === "--verbose")
  ) {
    return allow("read-local", "Consultation des remotes Git autorisee par defaut.");
  }
  if (
    subcommand.name === "branch"
    && args.every((token) => [
      "--all",
      "--list",
      "--no-color",
      "--remotes",
      "--show-current",
      "--verbose",
      "-a",
      "-r",
      "-v",
      "-vv",
    ].includes(token))
  ) {
    return allow("read-local", "Consultation des branches Git autorisee par defaut.");
  }

  if (GIT_NETWORK_SUBCOMMANDS.has(subcommand.name)) {
    return ask("network", "Cette sous-commande Git peut contacter un depot distant.");
  }
  if (GIT_WORKSPACE_WRITE_SUBCOMMANDS.has(subcommand.name)) {
    return ask("workspace-write", "Cette sous-commande Git peut modifier le depot local.");
  }
  return askAlways("unclassified", "Cette sous-commande Git n'est pas classifiee assez finement.");
}

export function evaluateFindCommand(
  tokens: string[],
  allowedWriteRoots: string[],
): DeviceCommandPermissionPolicy {
  const normalizedTokens = tokens.map((token) => token.toLowerCase());
  if (normalizedTokens.includes("-delete")) {
    return askAlways("destructive", "L'option find -delete peut supprimer des fichiers.");
  }
  if (normalizedTokens.some((token) => FIND_EXECUTION_OPTIONS.has(token))) {
    return askAlways("unclassified", "Les options find d'execution ne sont pas analysees recursivement.");
  }

  for (let index = 0; index < normalizedTokens.length; index += 1) {
    if (!FIND_WRITE_OPTIONS.has(normalizedTokens[index])) continue;
    const targetPath = tokens[index + 1];
    const targetRisk = targetPath
      ? getUnsafeWriteRiskCategory([targetPath], allowedWriteRoots)
      : "unclassified";
    if (targetRisk) {
      return askAlways(targetRisk, "La cible d'ecriture de find est absente ou hors des zones autorisees.");
    }
    return ask("workspace-write", "Cette option find ecrit dans un fichier.");
  }

  return allow("read-local", "Recherche locale find autorisee par defaut.");
}

export function evaluateSedCommand(
  tokens: string[],
  allowedWriteRoots: string[],
): DeviceCommandPermissionPolicy {
  const inPlace = tokens.slice(1).some((token) => (
    token === "--in-place"
    || token.startsWith("--in-place=")
    || /^-[^-]*i/.test(token)
  ));
  if (!inPlace) {
    return askAlways("unclassified", "Les scripts sed ne sont pas analyses assez finement pour etre autorises.");
  }

  const possibleTargets = tokens.slice(1).filter((token) => token && !token.startsWith("-"));
  const targetPath = possibleTargets[possibleTargets.length - 1];
  const targetRisk = targetPath && looksLikePath(targetPath)
    ? getUnsafeWriteRiskCategory([targetPath], allowedWriteRoots)
    : null;
  if (targetRisk) {
    return askAlways(targetRisk, "sed tente de modifier un fichier hors des zones autorisees.");
  }
  return ask("workspace-write", "La modification en place avec sed exige une permission.");
}

export function evaluateOutputOptionCommand(
  commandName: "diff" | "sort",
  tokens: string[],
  allowedWriteRoots: string[],
): DeviceCommandPermissionPolicy {
  if (
    commandName === "sort"
    && tokens.some((token) => token === "--compress-program" || token.startsWith("--compress-program="))
  ) {
    return askAlways("unclassified", "Le programme de compression sort peut executer une commande externe.");
  }
  const shortOption = commandName === "sort" ? "-o" : null;
  const targetPath = findOptionValue(tokens, "--output", shortOption);
  if (!targetPath) {
    return allow("read-local", `Commande ${commandName} de lecture autorisee par defaut.`);
  }
  const targetRisk = getUnsafeWriteRiskCategory([targetPath], allowedWriteRoots);
  if (targetRisk) {
    return askAlways(targetRisk, `La sortie de ${commandName} cible un chemin hors des zones autorisees.`);
  }
  return allow("workspace-write", `La sortie de ${commandName} reste dans une zone applicative autorisee.`);
}

export function evaluateCommandWrapper(
  commandName: string,
  tokens: string[],
): DeviceCommandPermissionPolicy {
  if (commandName === "env" && tokens.length === 1) {
    return allow("read-local", "Lecture de l'environnement autorisee par defaut.");
  }
  if (
    commandName === "command"
    && tokens.length >= 3
    && tokens.slice(1, -1).every((token) => token === "-v" || token === "-V")
  ) {
    return allow("read-local", "Resolution de commande autorisee par defaut.");
  }
  return askAlways("unclassified", "Cette commande enveloppe une autre commande qui n'est pas analysee recursivement.");
}

export function evaluateSafeWriteCommand(
  commandName: string,
  tokens: string[],
  writeTargets: string[],
  allowedWriteRoots: string[],
): DeviceCommandPermissionPolicy {
  if (
    commandName === "cp"
    && tokens.some((token) => token === "-t" || token === "--target-directory" || token.startsWith("--target-directory="))
  ) {
    return askAlways("unclassified", "Cette forme de cp ne permet pas d'identifier la cible de facon sure.");
  }
  const targetPaths = [
    ...writeTargets,
    ...extractWriteTargetPaths(commandName, tokens),
  ];
  if (commandName === "echo" && targetPaths.length === 0) {
    return allow("read-local", "Affichage echo sans ecriture autorise.");
  }
  if (targetPaths.length === 0) {
    return askAlways("unclassified", "Impossible de determiner les cibles d'ecriture de la commande.");
  }
  const targetRisk = getUnsafeWriteRiskCategory(targetPaths, allowedWriteRoots);
  if (targetRisk) {
    return askAlways(targetRisk, "La commande modifie un chemin critique ou hors application.");
  }
  return allow("workspace-write", "Modification locale non critique autorisee par defaut.");
}
