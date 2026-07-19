import { ParsedCommandSegment } from "./device.command-parser";
import {
  ALWAYS_CONFIRM_COMMANDS,
  DELETE_COMMANDS,
  INSTALLATION_OR_SYSTEM_COMMANDS,
  NETWORK_COMMANDS,
  READ_ONLY_COMMANDS,
  SAFE_WRITE_COMMANDS,
  SHELL_WRAPPERS,
  WORKSPACE_MUTATION_COMMANDS,
} from "./device.policy.constants";
import {
  evaluateCommandWrapper,
  evaluateFindCommand,
  evaluateGitCommand,
  evaluateOutputOptionCommand,
  evaluateSafeWriteCommand,
  evaluateSedCommand,
} from "./device.policy.command-rules";
import { getUnsafeWriteRiskCategory } from "./device.policy.paths";
import {
  findCommandToken,
  hasExplicitExecutablePath,
  isAssignmentOnlySegment,
  isShellControlSegment,
  isVariableAssignment,
  normalizeSensitiveCommandName,
} from "./device.policy.tokens";
import {
  allow,
  ask,
  askAlways,
  DeviceCommandPermissionPolicy,
  mergePolicyDecisions,
} from "./device.policy.types";
import { evaluateWindowsCommand } from "./device.policy.windows";
import { evaluateSensitiveRead } from "./device.policy.read";

export function evaluateSegment(
  segment: ParsedCommandSegment,
  allowedWriteRoots: string[],
): DeviceCommandPermissionPolicy {
  const { tokens, writeTargets } = segment;
  const unsafeRedirectCategory = getUnsafeWriteRiskCategory(writeTargets, allowedWriteRoots);
  if (unsafeRedirectCategory) {
    return askAlways(unsafeRedirectCategory, "La commande ecrit en dehors des zones applicatives autorisees.");
  }

  if (tokens.length === 0) {
    return writeTargets.length > 0
      ? ask("workspace-write", "Une redirection sans commande modifie un fichier.")
      : askAlways("unclassified", "Le segment ne contient aucune commande analysable.");
  }
  if (isShellControlSegment(tokens) || isAssignmentOnlySegment(tokens)) {
    return writeTargets.length > 0
      ? ask("workspace-write", "Le segment de controle contient une redirection en ecriture.")
      : allow("read-local", "Segment de controle shell ou affectation locale autorise.");
  }

  const commandToken = findCommandToken(tokens);
  if (!commandToken) {
    return askAlways("unclassified", "Commande impossible a classifier automatiquement.");
  }
  if (tokens.slice(0, commandToken.index).some((token) => isVariableAssignment(token))) {
    return askAlways("unclassified", "Une variable d'environnement peut modifier le comportement de l'executable.");
  }

  const commandName = commandToken.name;
  const commandTokens = tokens.slice(commandToken.index);
  const normalizedName = normalizeSensitiveCommandName(commandName, commandTokens);

  if (DELETE_COMMANDS.has(normalizedName)) {
    return askAlways("destructive", "Les suppressions demandent toujours une confirmation utilisateur.");
  }
  if (ALWAYS_CONFIRM_COMMANDS.has(normalizedName)) {
    return askAlways("system", "La commande touche a des zones ou droits critiques.");
  }
  if (hasExplicitExecutablePath(tokens[commandToken.index])) {
    return askAlways("unclassified", "Un executable designe par un chemin explicite n'est pas dans l'allowlist.");
  }
  if (SHELL_WRAPPERS.has(commandName)) {
    return askAlways("unclassified", "Les interpreteurs et commandes d'evaluation ne sont pas analyses recursivement.");
  }

  const sensitiveReadDecision = evaluateSensitiveRead(commandName, commandTokens);
  if (commandName === "git") return evaluateGitCommand(commandTokens, allowedWriteRoots);
  if (commandName === "find") return evaluateFindCommand(commandTokens, allowedWriteRoots);
  if (commandName === "sed") return evaluateSedCommand(commandTokens, allowedWriteRoots);
  if (commandName === "sort" || commandName === "diff") {
    const outputDecision = evaluateOutputOptionCommand(
      commandName,
      commandTokens,
      allowedWriteRoots,
    );
    return sensitiveReadDecision
      ? mergePolicyDecisions(sensitiveReadDecision, outputDecision)
      : outputDecision;
  }
  const windowsDecision = evaluateWindowsCommand(commandName, commandTokens);
  if (windowsDecision) {
    return sensitiveReadDecision
      ? mergePolicyDecisions(sensitiveReadDecision, windowsDecision)
      : windowsDecision;
  }
  const systemMutationDecision = evaluateSystemMutation(commandName, commandTokens);
  if (systemMutationDecision) return systemMutationDecision;
  if (
    commandName === "rg"
    && commandTokens.some((token) => (
      token === "--hostname-bin"
      || token === "--pre"
      || token.startsWith("--hostname-bin=")
      || token.startsWith("--pre=")
    ))
  ) {
    return askAlways("unclassified", "Le preprocesseur rg peut executer une commande externe.");
  }
  if (commandName === "awk" || commandName === "xargs") {
    return askAlways("unclassified", "Cette commande peut executer ou construire une autre commande.");
  }
  if (commandName === "env" || commandName === "command") {
    return sensitiveReadDecision
      ?? evaluateCommandWrapper(commandName, commandTokens);
  }
  if (sensitiveReadDecision) return sensitiveReadDecision;

  if (READ_ONLY_COMMANDS.has(commandName)) {
    return allow(
      writeTargets.length > 0 ? "workspace-write" : "read-local",
      writeTargets.length > 0
        ? "Sortie ecrite dans une zone applicative autorisee."
        : "Commande de lecture autorisee par defaut.",
    );
  }
  if (SAFE_WRITE_COMMANDS.has(commandName)) {
    return evaluateSafeWriteCommand(commandName, commandTokens, writeTargets, allowedWriteRoots);
  }
  if (NETWORK_COMMANDS.has(commandName)) {
    return ask("network", "Cette commande peut contacter le reseau.");
  }
  if (INSTALLATION_OR_SYSTEM_COMMANDS.has(commandName)) {
    return ask("system", "Cette commande peut installer, construire ou executer des dependances.");
  }
  if (WORKSPACE_MUTATION_COMMANDS.has(commandName)) {
    return ask("workspace-write", "Cette commande peut deplacer ou renommer des fichiers locaux.");
  }

  return askAlways("unclassified", "Commande inconnue ou non analysable par la policy automatique.");
}

function evaluateSystemMutation(
  commandName: string,
  tokens: string[],
): DeviceCommandPermissionPolicy | null {
  if (
    commandName === "date"
    && tokens.slice(1).some((token) => (
      token === "--set"
      || token === "-s"
      || token.startsWith("-s")
      || token.startsWith("--set=")
      || /^\d{4,}(?:\.\d+)?$/.test(token)
    ))
  ) {
    return askAlways("system", "La modification de l'horloge systeme exige toujours une confirmation.");
  }
  if (
    commandName === "hostname"
    && tokens.slice(1).some((token) => (
      !token.startsWith("-")
      || token === "--file"
      || token === "-F"
      || token.startsWith("--file=")
      || token.startsWith("-F")
    ))
  ) {
    return askAlways("system", "La modification du nom de machine exige toujours une confirmation.");
  }
  if (
    commandName === "sysctl"
    && tokens.slice(1).some((token) => (
      token === "--load"
      || token === "--system"
      || token === "--write"
      || token === "-p"
      || token === "-w"
      || token.includes("=")
      || token.startsWith("--load=")
      || token.startsWith("-p")
      || token.startsWith("-w")
    ))
  ) {
    return askAlways("system", "La modification de parametres systeme exige toujours une confirmation.");
  }
  return null;
}
