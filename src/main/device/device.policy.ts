import path from "node:path";
import { parseCommand, ParsedCommandSegment } from "./device.command-parser";
import {
  ALWAYS_CONFIRM_COMMANDS,
  DELETE_COMMANDS,
  DESTRUCTIVE_PATH_NAMES,
  GIT_DESTRUCTIVE_SUBCOMMANDS,
  GIT_NETWORK_SUBCOMMANDS,
  GIT_READ_ONLY_SUBCOMMANDS,
  GIT_WORKSPACE_WRITE_SUBCOMMANDS,
  INSTALLATION_OR_SYSTEM_COMMANDS,
  NETWORK_COMMANDS,
  READ_ONLY_COMMANDS,
  SAFE_WRITE_COMMANDS,
  SHELL_CONTROL_TOKENS,
  SHELL_WRAPPERS,
  WORKSPACE_MUTATION_COMMANDS,
} from "./device.policy.constants";
import { DevicePolicyError } from "./device.types";

export type DeviceCommandRiskCategory =
  | "destructive"
  | "network"
  | "read-local"
  | "system"
  | "unclassified"
  | "workspace-write";

export type DeviceCommandPermissionPolicy = {
  category: DeviceCommandRiskCategory;
  kind: "allow" | "ask" | "ask-always";
  reason: string;
};

export const DEVICE_RISK_CATEGORY_LABELS: Record<DeviceCommandRiskCategory, string> = {
  destructive: "suppression ou action destructive",
  network: "accès réseau",
  "read-local": "lecture locale",
  system: "installation ou modification système",
  unclassified: "action non classifiable automatiquement",
  "workspace-write": "écriture locale limitée au workspace",
};

type CommandToken = {
  index: number;
  name: string;
};

const GIT_OPTIONS_WITH_VALUE = new Set([
  "-c",
  "-C",
  "--config-env",
  "--git-dir",
  "--namespace",
  "--super-prefix",
  "--work-tree",
]);

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

export function normalizeCommand(command: string): string {
  return command.replace(/\r\n/g, "\n").trim();
}

export function assertCommandAllowed(command: string): void {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new DevicePolicyError("La commande device est vide.");
  }
  if (/\0/.test(trimmed)) {
    throw new DevicePolicyError("La commande device contient un caractere interdit.");
  }
}

export function evaluateCommandPermissionPolicy(
  command: string,
  allowedWriteRoots: string[],
): DeviceCommandPermissionPolicy {
  const normalizedCommand = normalizeCommand(command);
  assertCommandAllowed(normalizedCommand);

  const parseResult = parseCommand(normalizedCommand);
  if (parseResult.kind === "unsafe") {
    return {
      category: "unclassified",
      kind: "ask-always",
      reason: parseResult.reason,
    };
  }

  let finalDecision: DeviceCommandPermissionPolicy | null = null;
  for (const segment of parseResult.segments) {
    const decision = evaluateSegment(segment, allowedWriteRoots);
    finalDecision = mergePolicyDecisions(finalDecision, decision);
  }

  return finalDecision ?? allow("read-local", "Commande de lecture autorisee par la policy device.");
}

function evaluateSegment(
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

  if (commandName === "git") return evaluateGitCommand(commandTokens, allowedWriteRoots);
  if (commandName === "find") return evaluateFindCommand(commandTokens, allowedWriteRoots);
  if (commandName === "sed") return evaluateSedCommand(commandTokens, allowedWriteRoots);
  if (commandName === "sort" || commandName === "diff") {
    return evaluateOutputOptionCommand(commandName, commandTokens, allowedWriteRoots);
  }
  if (
    commandName === "date"
    && commandTokens.slice(1).some((token) => (
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
    && commandTokens.slice(1).some((token) => (
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
    && commandTokens.slice(1).some((token) => (
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
    return evaluateCommandWrapper(commandName, commandTokens);
  }

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

function evaluateGitCommand(
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

function evaluateFindCommand(
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

function evaluateSedCommand(
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

function evaluateOutputOptionCommand(
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

function evaluateCommandWrapper(
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

function evaluateSafeWriteCommand(
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

function findCommandToken(tokens: string[]): CommandToken | null {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (isShellControlToken(token) || isVariableAssignment(token)) continue;
    return { index, name: normalizeExecutableName(token) };
  }
  return null;
}

function findGitSubcommand(tokens: string[]): CommandToken | null {
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (GIT_OPTIONS_WITH_VALUE.has(token)) {
      index += 1;
      continue;
    }
    if (token.startsWith("-")) continue;
    return { index, name: token.toLowerCase() };
  }
  return null;
}

function findOptionValue(
  tokens: string[],
  longOption: string,
  shortOption?: string | null,
): string | null {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === longOption || (shortOption && token === shortOption)) {
      return tokens[index + 1] ?? "";
    }
    if (token.startsWith(`${longOption}=`)) return token.slice(longOption.length + 1);
    if (shortOption && token.startsWith(shortOption) && token.length > shortOption.length) {
      return token.slice(shortOption.length);
    }
  }
  return null;
}

function normalizeSensitiveCommandName(commandName: string, tokens: string[]): string {
  if (commandName === "git") {
    const subcommand = findGitSubcommand(tokens)?.name;
    return subcommand && GIT_DESTRUCTIVE_SUBCOMMANDS.has(subcommand)
      ? `git-${subcommand}`
      : "git";
  }
  if (
    (commandName === "npm" || commandName === "pnpm" || commandName === "yarn")
    && (
      tokens.some((token) => token === "-g" || token === "--global" || token === "--location=global")
      || tokens.some((token, index) => token === "--location" && tokens[index + 1] === "global")
      || (commandName === "yarn" && tokens[1] === "global")
    )
  ) {
    return "npm-global";
  }
  if (commandName === "tee" && tokens.slice(1).some((token) => isSystemLikePath(token))) {
    return "tee-system";
  }
  return commandName;
}

function extractWriteTargetPaths(commandName: string, tokens: string[]): string[] {
  const args = tokens.slice(1);
  if (commandName === "touch" || commandName === "mkdir" || commandName === "tee") {
    return args.filter((token) => token && !token.startsWith("-"));
  }
  if (commandName === "cp") {
    const candidates = args.filter((token) => token && !token.startsWith("-"));
    return candidates.length > 1 ? [candidates[candidates.length - 1]] : [];
  }
  return [];
}

function isShellControlSegment(tokens: string[]): boolean {
  return tokens.every((token) => isShellControlToken(token) || token === "[" || token === "]");
}

function isAssignmentOnlySegment(tokens: string[]): boolean {
  return tokens.every((token) => isVariableAssignment(token));
}

function isShellControlToken(token: string): boolean {
  return SHELL_CONTROL_TOKENS.has(token);
}

function isVariableAssignment(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token);
}

function normalizeExecutableName(value: string): string {
  const basename = value.split(/[\\/]/).pop() ?? value;
  return basename.replace(/\.(?:bat|cmd|exe)$/i, "").toLowerCase();
}

function hasExplicitExecutablePath(value: string): boolean {
  return value.includes("/") || value.includes("\\");
}

function looksLikePath(value: string): boolean {
  return /[\\/]/.test(value) || value.startsWith(".") || path.isAbsolute(value);
}

function getUnsafeWriteRiskCategory(
  targetPaths: string[],
  allowedWriteRoots: string[],
): DeviceCommandRiskCategory | null {
  let finalCategory: DeviceCommandRiskCategory | null = null;
  for (const targetPath of targetPaths) {
    const category = classifyUnsafeWriteTarget(targetPath, allowedWriteRoots);
    if (!category) continue;
    if (category === "unclassified") return category;
    if (category === "system") finalCategory = category;
    else if (!finalCategory) finalCategory = category;
  }
  return finalCategory;
}

function classifyUnsafeWriteTarget(
  targetPath: string,
  allowedWriteRoots: string[],
): DeviceCommandRiskCategory | null {
  if (hasDynamicPath(targetPath)) return "unclassified";
  const expandedPath = expandHomePath(targetPath);
  const resolvedPath = path.resolve(process.cwd(), expandedPath);
  if (DESTRUCTIVE_PATH_NAMES.has(path.basename(resolvedPath).toLowerCase())) return "system";
  if (isSystemLikePath(resolvedPath)) return "system";
  return allowedWriteRoots.some((root) => isInsideRoot(resolvedPath, root))
    ? null
    : "workspace-write";
}

function expandHomePath(value: string): string {
  if (value !== "~" && !value.startsWith("~/") && !value.startsWith("~\\")) return value;
  const home = process.env.HOME ?? process.env.USERPROFILE;
  return home ? path.join(home, value.slice(2)) : value;
}

function hasDynamicPath(value: string): boolean {
  return /[$%*?[\]{}]/.test(value);
}

function isSystemLikePath(value: string): boolean {
  const normalizedValue = path.resolve(value);
  const prefixes = [
    "/Applications",
    "/Library",
    "/System",
    "/bin",
    "/etc",
    "/sbin",
    "/usr",
    process.env.ProgramData,
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.SystemRoot,
  ].filter((prefix): prefix is string => Boolean(prefix));

  return prefixes.some((prefix) => isInsideRoot(normalizedValue, prefix));
}

function isInsideRoot(candidatePath: string, rootPath: string): boolean {
  const normalizedRoot = normalizePathForComparison(path.resolve(rootPath));
  const normalizedCandidate = normalizePathForComparison(path.resolve(candidatePath));
  return normalizedCandidate === normalizedRoot
    || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`);
}

function normalizePathForComparison(value: string): string {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function mergePolicyDecisions(
  current: DeviceCommandPermissionPolicy | null,
  candidate: DeviceCommandPermissionPolicy,
): DeviceCommandPermissionPolicy {
  if (!current) return candidate;

  const kindPriority: Record<DeviceCommandPermissionPolicy["kind"], number> = {
    allow: 0,
    ask: 1,
    "ask-always": 2,
  };
  if (kindPriority[candidate.kind] !== kindPriority[current.kind]) {
    return kindPriority[candidate.kind] > kindPriority[current.kind] ? candidate : current;
  }

  const categoryPriority: Record<DeviceCommandRiskCategory, number> = {
    destructive: 5,
    network: 2,
    "read-local": 0,
    system: 3,
    unclassified: 4,
    "workspace-write": 1,
  };
  return categoryPriority[candidate.category] > categoryPriority[current.category]
    ? candidate
    : current;
}

function allow(
  category: DeviceCommandRiskCategory,
  reason: string,
): DeviceCommandPermissionPolicy {
  return { category, kind: "allow", reason };
}

function ask(
  category: DeviceCommandRiskCategory,
  reason: string,
): DeviceCommandPermissionPolicy {
  return { category, kind: "ask", reason };
}

function askAlways(
  category: DeviceCommandRiskCategory,
  reason: string,
): DeviceCommandPermissionPolicy {
  return { category, kind: "ask-always", reason };
}
