import path from "node:path";
import { DevicePolicyError } from "./device.types";

export type DeviceCommandPermissionPolicy =
  | {
      kind: "allow";
      reason: string;
    }
  | {
      kind: "ask";
      reason: string;
    }
  | {
      kind: "ask-always";
      reason: string;
    };

const READ_ONLY_COMMANDS = new Set([
  "[",
  "basename",
  "awk",
  "cat",
  "command",
  "cut",
  "date",
  "df",
  "diff",
  "dirname",
  "du",
  "env",
  "find",
  "free",
  "git",
  "grep",
  "head",
  "hostname",
  "id",
  "ls",
  "more",
  "pgrep",
  "printenv",
  "printf",
  "ps",
  "pwd",
  "readlink",
  "realpath",
  "rg",
  "sed",
  "sort",
  "stat",
  "sw_vers",
  "sysctl",
  "tail",
  "top",
  "tr",
  "uname",
  "uptime",
  "vm_stat",
  "wc",
  "which",
  "whoami",
  "xargs",
]);

const DELETE_COMMANDS = new Set([
  "del",
  "git-clean",
  "git-rm",
  "git-restore",
  "git-reset",
  "rm",
  "rmdir",
  "trash",
  "unlink",
]);

const ALWAYS_CONFIRM_COMMANDS = new Set([
  "apt",
  "apt-get",
  "brew",
  "chflags",
  "chmod",
  "chown",
  "chgrp",
  "defaults",
  "dnf",
  "launchctl",
  "npm-global",
  "pkgutil",
  "pmset",
  "profiles",
  "scutil",
  "softwareupdate",
  "spctl",
  "sudo",
  "systemctl",
  "tee-system",
  "yum",
]);

const SAFE_WRITE_COMMANDS = new Set([
  "cp",
  "echo",
  "mkdir",
  "tee",
  "touch",
]);

const DESTRUCTIVE_PATH_NAMES = new Set([
  ".bash_profile",
  ".bashrc",
  ".gitconfig",
  ".zprofile",
  ".zshenv",
  ".zshrc",
]);

const SHELL_CONTROL_TOKENS = new Set([
  "case",
  "do",
  "done",
  "elif",
  "else",
  "esac",
  "fi",
  "for",
  "if",
  "in",
  "then",
  "while",
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
  const segments = splitCommandSegments(normalizedCommand);

  let shouldAsk = false;
  let askReason = "Commande non classee automatiquement.";

  for (const segment of segments) {
    const evaluation = evaluateSegment(segment, allowedWriteRoots);
    if (evaluation.kind === "ask-always") {
      return evaluation;
    }
    if (evaluation.kind === "ask") {
      shouldAsk = true;
      askReason = evaluation.reason;
    }
  }

  if (shouldAsk) {
    return {
      kind: "ask",
      reason: askReason,
    };
  }

  return {
    kind: "allow",
    reason: "Commande autorisee par la policy device.",
  };
}

function evaluateSegment(segment: string, allowedWriteRoots: string[]): DeviceCommandPermissionPolicy {
  const tokens = tokenize(segment);
  if (tokens.length === 0) {
    return { kind: "allow", reason: "Segment vide." };
  }

  if (isShellControlSegment(tokens) || isAssignmentOnlySegment(tokens)) {
    return {
      kind: "allow",
      reason: "Segment de controle shell ou affectation locale autorise.",
    };
  }

  const commandName = normalizeCommandName(tokens);
  const redirectedPaths = extractRedirectedPaths(tokens);
  if (redirectedPaths.some((targetPath) => isCriticalWritePath(targetPath, allowedWriteRoots))) {
    return {
      kind: "ask-always",
      reason: "La commande ecrit en dehors des zones applicatives autorisees.",
    };
  }

  if (commandName && DELETE_COMMANDS.has(commandName)) {
    return {
      kind: "ask-always",
      reason: "Les suppressions demandent toujours une confirmation utilisateur.",
    };
  }

  if (commandName && ALWAYS_CONFIRM_COMMANDS.has(commandName)) {
    return {
      kind: "ask-always",
      reason: "La commande touche a des zones ou droits critiques.",
    };
  }

  if (redirectedPaths.length > 0) {
    return { kind: "allow", reason: "Ecriture locale autorisee dans les zones applicatives." };
  }

  if (!commandName) {
    return {
      kind: "ask",
      reason: "Commande impossible a classifier automatiquement.",
    };
  }

  if (READ_ONLY_COMMANDS.has(commandName)) {
    return {
      kind: "allow",
      reason: "Commande de lecture autorisee par defaut.",
    };
  }

  if (SAFE_WRITE_COMMANDS.has(commandName)) {
    return evaluateSafeWriteCommand(commandName, tokens, allowedWriteRoots);
  }

  return {
    kind: "ask",
    reason: "Commande non repertoriee dans la policy automatique.",
  };
}

function evaluateSafeWriteCommand(
  commandName: string,
  tokens: string[],
  allowedWriteRoots: string[],
): DeviceCommandPermissionPolicy {
  const targetPaths = extractWriteTargetPaths(commandName, tokens);
  if (targetPaths.length === 0) {
    return {
      kind: "ask",
      reason: "Impossible de determiner les cibles d'ecriture de la commande.",
    };
  }

  if (targetPaths.some((targetPath) => isCriticalWritePath(targetPath, allowedWriteRoots))) {
    return {
      kind: "ask-always",
      reason: "La commande modifie un chemin critique ou hors application.",
    };
  }

  return {
    kind: "allow",
    reason: "Modification locale non critique autorisee par defaut.",
  };
}

function normalizeCommandName(tokens: string[]): string | null {
  const command = tokens.find((token) => !isShellControlToken(token) && !isVariableAssignment(token));
  if (!command) return null;
  if (command === "sudo") return "sudo";
  if (command === "git") {
    const subcommand = tokens.find((token, index) => index > 0 && !token.startsWith("-"));
    if (subcommand === "clean") return "git-clean";
    if (subcommand === "rm") return "git-rm";
    if (subcommand === "reset") return "git-reset";
    if (subcommand === "restore") return "git-restore";
    return "git";
  }
  if (command === "npm" && tokens.includes("-g")) return "npm-global";
  if (command === "tee" && tokens.some((token) => isSystemLikePath(token))) return "tee-system";
  return command;
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

function splitCommandSegments(command: string): string[] {
  const segments: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    const next = command[index + 1];
    if (quote) {
      current += char;
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if ((char === "&" && next === "&") || (char === "|" && next === "|")) {
      if (current.trim()) segments.push(current.trim());
      current = "";
      index += 1;
      continue;
    }
    if (char === ";" || char === "\n") {
      if (current.trim()) segments.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) segments.push(current.trim());
  return segments;
}

function tokenize(segment: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index];
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(stripWrappingQuotes(current));
        current = "";
      }
      continue;
    }
    if ((char === ">" || char === "<") && !current) {
      const next = segment[index + 1];
      if (next === char) {
        tokens.push(`${char}${next}`);
        index += 1;
      } else {
        tokens.push(char);
      }
      continue;
    }
    current += char;
  }

  if (current) tokens.push(stripWrappingQuotes(current));
  return tokens;
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function extractRedirectedPaths(tokens: string[]): string[] {
  const results: string[] = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index] === ">" || tokens[index] === ">>") {
      results.push(tokens[index + 1]);
    }
  }
  return results.filter(Boolean);
}

function extractWriteTargetPaths(commandName: string, tokens: string[]): string[] {
  const args = tokens.slice(1);
  if (commandName === "touch" || commandName === "mkdir") {
    return args.filter((token) => token && !token.startsWith("-"));
  }
  if (commandName === "cp") {
    const candidates = args.filter((token) => token && !token.startsWith("-"));
    return candidates.length > 1 ? [candidates[candidates.length - 1]] : [];
  }
  if (commandName === "tee") {
    return args.filter((token) => token && !token.startsWith("-"));
  }
  if (commandName === "echo") {
    return extractRedirectedPaths(tokens);
  }
  return [];
}

function isCriticalWritePath(targetPath: string, allowedWriteRoots: string[]): boolean {
  const expanded = path.resolve(process.cwd(), targetPath);
  if (DESTRUCTIVE_PATH_NAMES.has(path.basename(expanded))) {
    return true;
  }
  if (isSystemLikePath(expanded)) {
    return true;
  }
  return !allowedWriteRoots.some((root) => isInsideRoot(expanded, root));
}

function isSystemLikePath(value: string): boolean {
  const normalized = value.replace(/^~\//, `${process.env.HOME ?? "~"}/`);
  return [
    "/Applications",
    "/Library",
    "/System",
    "/bin",
    "/etc",
    "/sbin",
    "/usr",
    path.join(process.env.HOME ?? "~", "Library"),
  ].some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

function isInsideRoot(candidatePath: string, rootPath: string): boolean {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedCandidate = path.resolve(candidatePath);
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`);
}
