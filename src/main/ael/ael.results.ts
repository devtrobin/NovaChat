import { AELCommandResult, StartedAELCommand } from "../../shared/chat.types";

export function createStartedCommand(
  commandId: string,
  cwd: string,
  normalizedCommand: string,
  shell: string,
): StartedAELCommand {
  return {
    commandId,
    cwd,
    normalizedCommand,
    shell,
  };
}

export function createMissingCommandResult(commandId: string): AELCommandResult {
  return {
    code: 1,
    commandId,
    cwd: process.cwd(),
    durationMs: 0,
    errorType: "not-found",
    normalizedCommand: "",
    ok: false,
    output: "Commande introuvable ou deja terminee.",
    shell: process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : (process.env.SHELL || "/bin/zsh"),
    signal: null,
  };
}

export function createPendingCommandResult(
  commandId: string,
  cwd: string,
  normalizedCommand: string,
  shell: string,
): AELCommandResult {
  return {
    code: 1,
    commandId,
    cwd,
    durationMs: 0,
    normalizedCommand,
    ok: false,
    output: "",
    shell,
    signal: null,
  };
}
