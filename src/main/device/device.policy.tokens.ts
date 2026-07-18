import {
  GIT_DESTRUCTIVE_SUBCOMMANDS,
  SHELL_CONTROL_TOKENS,
} from "./device.policy.constants";
import { isSystemLikePath } from "./device.policy.paths";

export type CommandToken = {
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

export function findCommandToken(tokens: string[]): CommandToken | null {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (isShellControlToken(token) || isVariableAssignment(token)) continue;
    return { index, name: normalizeExecutableName(token) };
  }
  return null;
}

export function findGitSubcommand(tokens: string[]): CommandToken | null {
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

export function findOptionValue(
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

export function normalizeSensitiveCommandName(commandName: string, tokens: string[]): string {
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

export function extractWriteTargetPaths(commandName: string, tokens: string[]): string[] {
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

export function isShellControlSegment(tokens: string[]): boolean {
  return tokens.every((token) => isShellControlToken(token) || token === "[" || token === "]");
}

export function isAssignmentOnlySegment(tokens: string[]): boolean {
  return tokens.every((token) => isVariableAssignment(token));
}

export function isVariableAssignment(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token);
}

export function hasExplicitExecutablePath(value: string): boolean {
  return value.includes("/") || value.includes("\\");
}

function isShellControlToken(token: string): boolean {
  return SHELL_CONTROL_TOKENS.has(token);
}

function normalizeExecutableName(value: string): string {
  const basename = value.split(/[\\/]/).pop() ?? value;
  return basename.replace(/\.(?:bat|cmd|exe)$/i, "").toLowerCase();
}
