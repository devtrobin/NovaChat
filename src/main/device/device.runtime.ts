import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { DeviceCommandResult } from "../../renderer/types/chat.types";
import { buildProgress, detectInputRequest } from "./device.progress";
import { registerRunningCommand, unregisterRunningCommand } from "./device.registry";
import { createPendingCommandResult } from "./device.results";
import { getKillSignal } from "./device.shell";
import { RunningCommand } from "./device.types";

export function spawnDeviceProcess(file: string, args: string[], cwd: string): ChildProcess {
  return spawn(file, args, {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function createRunningCommand(
  child: ChildProcess,
  cwd: string,
  normalizedCommand: string,
  shell: string,
  commandId: string,
  onProgress?: RunningCommand["onProgress"],
): RunningCommand {
  return {
    awaitingInput: false,
    child,
    cwd,
    normalizedCommand,
    onProgress,
    output: "",
    promise: Promise.resolve(createPendingCommandResult(commandId, cwd, normalizedCommand, shell)),
    shell,
    startedAt: Date.now(),
    timedOut: false,
    wasKilled: false,
  };
}

export function bindProgressTracking(commandId: string, runningCommand: RunningCommand): void {
  const notify = () => {
    runningCommand.onProgress?.(buildProgress(commandId, runningCommand));
  };

  const appendOutput = (chunk: Buffer | string) => {
    runningCommand.output += chunk.toString();
    const nextState = detectInputRequest(runningCommand.output);
    runningCommand.awaitingInput = nextState.awaitingInput;
    runningCommand.inputPlaceholder = nextState.inputPlaceholder;
    runningCommand.inputSecret = nextState.inputSecret;
    notify();
  };

  runningCommand.child.stdout?.on("data", appendOutput);
  runningCommand.child.stderr?.on("data", appendOutput);
}

export function bindCommandLifecycle(commandId: string, runningCommand: RunningCommand): void {
  runningCommand.promise = new Promise<DeviceCommandResult>((resolve) => {
    runningCommand.child.on("close", (code, signal) => {
      unregisterRunningCommand(commandId);
      const output = runningCommand.output.trim()
        || (runningCommand.wasKilled ? "Commande interrompue." : "Commande terminee sans sortie.");
      const durationMs = Date.now() - runningCommand.startedAt;
      const resolvedCode = typeof code === "number" ? code : (runningCommand.wasKilled ? 130 : 1);

      resolve({
        code: resolvedCode,
        commandId,
        cwd: runningCommand.cwd,
        durationMs,
        errorType: runningCommand.timedOut
          ? "timeout"
          : runningCommand.wasKilled
            ? "killed"
            : resolvedCode === 127
              ? "not-found"
              : resolvedCode === 0
                ? undefined
                : "shell",
        normalizedCommand: runningCommand.normalizedCommand,
        ok: !runningCommand.wasKilled && code === 0,
        output,
        shell: runningCommand.shell,
        signal,
      });
    });

    runningCommand.child.on("error", (error: Error) => {
      unregisterRunningCommand(commandId);
      resolve({
        code: 1,
        commandId,
        cwd: runningCommand.cwd,
        durationMs: Date.now() - runningCommand.startedAt,
        errorType: "shell",
        normalizedCommand: runningCommand.normalizedCommand,
        ok: false,
        output: error.message,
        shell: runningCommand.shell,
        signal: null,
      });
    });
  });

  const timeout = globalThis.setTimeout(() => {
    if (runningCommand.child.killed) return;
    runningCommand.timedOut = true;
    runningCommand.wasKilled = true;
    runningCommand.child.kill(getKillSignal());
  }, 15000);

  runningCommand.promise.finally(() => globalThis.clearTimeout(timeout));

  const originalKill = runningCommand.child.kill.bind(runningCommand.child);
  runningCommand.child.kill = ((signal?: NodeJS.Signals | number) => {
    runningCommand.wasKilled = true;
    return originalKill(signal);
  }) as ChildProcess["kill"];

  registerRunningCommand(commandId, runningCommand);
}
